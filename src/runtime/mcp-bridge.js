'use strict';

/**
 * MCP (Model Context Protocol) bridge — tool descriptor mapping for Noeon runtime.
 * @see docs/spec/NOEON_SPEC_v1.0.md §14.3
 */

const {
  resolveMcpMode,
  shouldUseLive,
  discoverServerTools,
  callMcpToolLive
} = require('./mcp-client');

const TOOL_SCHEMA = 'noeon.tool/v1';
const MCP_PLUGIN = 'mcp_call';

let activeMcpServers = [];

function setActiveMcpServers(servers) {
  activeMcpServers = Array.isArray(servers) ? servers : [];
}

function findMcpServer(name) {
  return activeMcpServers.find((s) => s.name === name) || null;
}

function mapMcpToolDescriptor(tool, serverName) {
  const name = tool?.name;
  if (!name) return null;
  return {
    schema: TOOL_SCHEMA,
    name,
    qualifiedName: `${serverName}/${name}`,
    description: tool.description || '',
    inputSchema: tool.inputSchema || tool.input_schema || { type: 'object' },
    modality: 'mcp',
    server: serverName,
    source: 'mcp',
    perceive: tool.perceive !== false,
    collaborate: tool.collaborate === true
  };
}

function loadMcpConfig(config = {}) {
  const servers = Array.isArray(config.mcp?.servers) ? config.mcp.servers : [];
  return { servers, enabled: servers.length > 0 };
}

function listMcpTools(config = {}) {
  const tools = [];
  for (const server of loadMcpConfig(config).servers) {
    if (!server?.name) continue;
    for (const tool of server.tools || []) {
      const mapped = mapMcpToolDescriptor(tool, server.name);
      if (mapped) tools.push(mapped);
    }
  }
  return tools;
}

function attachMcpTools(ast, config = {}) {
  const tools = listMcpTools(config);
  if (!tools.length) return { ast, tools: [], attached: false };
  ast.mcpTools = tools;
  ast.tools = Array.isArray(ast.tools)
    ? [...new Set([...ast.tools, ...tools.map((t) => t.qualifiedName)])]
    : tools.map((t) => t.qualifiedName);
  return { ast, tools, attached: true };
}

async function enrichMcpToolsFromDiscovery(ast, config = {}, options = {}) {
  const staticTools = listMcpTools(config);
  const merged = [...staticTools];
  const seen = new Set(staticTools.map((t) => t.qualifiedName));
  const mode = resolveMcpMode(options);
  let discoveredCount = 0;

  for (const server of loadMcpConfig(config).servers) {
    if (!server.discover || !shouldUseLive(mode, server)) continue;
    try {
      const remote = await discoverServerTools(server, options);
      for (const tool of remote) {
        const mapped = mapMcpToolDescriptor(tool, server.name);
        if (mapped && !seen.has(mapped.qualifiedName)) {
          merged.push(mapped);
          seen.add(mapped.qualifiedName);
          discoveredCount += 1;
        }
      }
    } catch {
      // discovery is optional
    }
  }

  if (merged.length) {
    ast.mcpTools = merged;
    ast.tools = Array.isArray(ast.tools)
      ? [...new Set([...ast.tools, ...merged.map((t) => t.qualifiedName)])]
      : merged.map((t) => t.qualifiedName);
  }

  return { tools: merged, discoveredCount, attached: merged.length > 0 };
}

function getMcpStatus(config = {}) {
  const { servers } = loadMcpConfig(config);
  const mode = resolveMcpMode(config);
  const staticTools = listMcpTools(config);
  return {
    schema: 'noeon.mcp.status/v1',
    mode,
    enabled: servers.length > 0,
    serverCount: servers.length,
    staticToolCount: staticTools.length,
    servers: servers.map((s) => ({
      name: s.name,
      command: s.command || null,
      discover: s.discover === true,
      toolCount: (s.tools || []).length
    }))
  };
}

function resolveMcpBinding(binding = {}) {
  const server = binding.server || binding.mcp_server;
  const tool = binding.tool || binding.mcp_tool || binding.name;
  return { server, tool, qualifiedName: server && tool ? `${server}/${tool}` : null };
}

function executeMcpToolStub({ stepName, binding, feedback }) {
  const { server, tool, qualifiedName } = resolveMcpBinding(binding);
  const injected = feedback?.actionResults?.[stepName];
  if (injected) {
    return {
      status: injected.status || 'done',
      reason: injected.reason || 'mcp-injected',
      latencyMs: Number(injected.latencyMs || binding.latencyMs || 120),
      failureCategory: injected.failureCategory || null,
      pluginMeta: {
        template: MCP_PLUGIN,
        server,
        tool,
        qualifiedName,
        mode: 'stub',
        result: injected.result ?? injected
      }
    };
  }

  return {
    status: 'done',
    reason: 'mcp-stub-ok',
    latencyMs: Number(binding.latencyMs || 120),
    failureCategory: null,
    pluginMeta: {
      template: MCP_PLUGIN,
      server: server || 'unknown',
      tool: tool || stepName,
      qualifiedName: qualifiedName || stepName,
      mode: 'stub',
      message: binding.message || `MCP stub executed ${qualifiedName || stepName}`
    }
  };
}

async function executeMcpTool({ stepName, binding, feedback, options = {} }) {
  const injected = feedback?.actionResults?.[stepName];
  if (injected) return executeMcpToolStub({ stepName, binding, feedback });

  const { server, tool } = resolveMcpBinding(binding);
  const mode = resolveMcpMode({ ...options, mode: binding.mode });
  const serverConfig = findMcpServer(server) || binding.mcpServer;

  if (!shouldUseLive(mode, serverConfig)) {
    return executeMcpToolStub({ stepName, binding, feedback });
  }

  const toolName = tool || stepName;
  const args = binding.arguments || binding.args || binding.input || {};

  try {
    const started = Date.now();
    const result = await callMcpToolLive(serverConfig, toolName, args, { mode });
    const textPart = Array.isArray(result?.content)
      ? result.content.find((c) => c.type === 'text')?.text
      : null;

    return {
      status: result?.isError ? 'failed' : 'done',
      reason: result?.isError ? 'mcp-tool-error' : 'mcp-live-ok',
      latencyMs: Date.now() - started,
      failureCategory: result?.isError ? 'execution_error' : null,
      errorCode: result?.isError ? 'MCP_TOOL_ERROR' : null,
      pluginMeta: {
        template: MCP_PLUGIN,
        server: serverConfig.name,
        tool: toolName,
        qualifiedName: `${serverConfig.name}/${toolName}`,
        mode: 'live',
        result: textPart ?? result
      }
    };
  } catch (error) {
    if (mode === 'live') {
      return {
        status: 'failed',
        reason: error.message || 'MCP call failed',
        latencyMs: Number(binding.latencyMs || 120),
        failureCategory: 'execution_error',
        errorCode: 'MCP_CALL_FAILED',
        pluginMeta: {
          template: MCP_PLUGIN,
          server: serverConfig?.name,
          tool: toolName,
          mode: 'live'
        }
      };
    }
    return executeMcpToolStub({ stepName, binding, feedback });
  }
}

module.exports = {
  TOOL_SCHEMA,
  MCP_PLUGIN,
  mapMcpToolDescriptor,
  loadMcpConfig,
  listMcpTools,
  attachMcpTools,
  enrichMcpToolsFromDiscovery,
  getMcpStatus,
  setActiveMcpServers,
  findMcpServer,
  resolveMcpBinding,
  executeMcpToolStub,
  executeMcpTool
};
