'use strict';

const { spawn } = require('child_process');
const readline = require('readline');

const DEFAULT_PROTOCOL = '2024-11-05';
const DEFAULT_TIMEOUT_MS = 8000;

const sessions = new Map();
let nextId = 1;

function resolveMcpMode(options = {}) {
  const env = process.env.NOEON_MCP_MODE;
  if (options.mode) return String(options.mode).toLowerCase();
  if (env) return String(env).toLowerCase();
  return 'auto';
}

function shouldUseLive(mode, serverConfig) {
  if (mode === 'stub' || mode === 'off') return false;
  if (mode === 'live') return Boolean(serverConfig?.command);
  return Boolean(serverConfig?.command);
}

class McpStdioSession {
  constructor(serverConfig, options = {}) {
    this.serverConfig = serverConfig;
    this.options = options;
    this.timeoutMs = Number(serverConfig.timeout_ms || options.timeoutMs || DEFAULT_TIMEOUT_MS);
    this.child = null;
    this.pending = new Map();
    this.ready = null;
    this.closed = false;
  }

  start() {
    if (this.ready) return this.ready;

    const { command, args = [], env = {}, cwd } = this.serverConfig;
    if (!command) {
      return Promise.reject(new Error('MCP server command is required'));
    }

    this.ready = new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      this.child = child;

      const fail = (err) => {
        this.closed = true;
        reject(err);
      };

      child.on('error', fail);
      child.stderr.on('data', () => {});

      const rl = readline.createInterface({ input: child.stdout, terminal: false });
      rl.on('line', (line) => {
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
        if (msg.id == null) return;
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        clearTimeout(pending.timer);
        if (msg.error) pending.reject(new Error(msg.error.message || 'MCP error'));
        else pending.resolve(msg.result);
      });

      child.on('exit', (code) => {
        this.closed = true;
        for (const [, pending] of this.pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error(`MCP server exited (${code})`));
        }
        this.pending.clear();
      });

      this.request('initialize', {
        protocolVersion: DEFAULT_PROTOCOL,
        capabilities: {},
        clientInfo: { name: 'noeon', version: '1.0.0-alpha' }
      })
        .then((result) => {
          this.sendNotification('notifications/initialized', {});
          resolve(result);
        })
        .catch(fail);
    });

    return this.ready;
  }

  sendNotification(method, params) {
    if (!this.child?.stdin?.writable) return;
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params: params || {} })}\n`);
  }

  request(method, params = {}) {
    if (this.closed) {
      return Promise.reject(new Error('MCP session closed'));
    }

    const id = nextId++;
    const payload = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      if (!this.child?.stdin?.writable) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error('MCP stdin unavailable'));
        return;
      }

      this.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  async listTools() {
    await this.start();
    const result = await this.request('tools/list', {});
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  async callTool(name, args = {}) {
    await this.start();
    return this.request('tools/call', { name, arguments: args });
  }

  close() {
    this.closed = true;
    if (this.child && !this.child.killed) {
      this.child.kill();
    }
    this.child = null;
    this.ready = null;
  }
}

function sessionKey(serverConfig) {
  return serverConfig.name || `${serverConfig.command}:${(serverConfig.args || []).join(' ')}`;
}

async function getMcpSession(serverConfig, options = {}) {
  const key = sessionKey(serverConfig);
  if (sessions.has(key)) return sessions.get(key);

  const session = new McpStdioSession(serverConfig, options);
  sessions.set(key, session);
  return session;
}

async function discoverServerTools(serverConfig, options = {}) {
  const mode = resolveMcpMode(options);
  if (!shouldUseLive(mode, serverConfig)) return [];

  const session = await getMcpSession(serverConfig, options);
  return session.listTools();
}

async function callMcpToolLive(serverConfig, toolName, args = {}, options = {}) {
  const mode = resolveMcpMode(options);
  if (!shouldUseLive(mode, serverConfig)) {
    throw new Error('MCP live mode unavailable');
  }
  const session = await getMcpSession(serverConfig, options);
  return session.callTool(toolName, args);
}

function closeAllMcpSessions() {
  for (const session of sessions.values()) session.close();
  sessions.clear();
}

process.on('exit', closeAllMcpSessions);

module.exports = {
  McpStdioSession,
  resolveMcpMode,
  shouldUseLive,
  getMcpSession,
  discoverServerTools,
  callMcpToolLive,
  closeAllMcpSessions
};
