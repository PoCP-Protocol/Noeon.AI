#!/usr/bin/env node
'use strict';

/**
 * Minimal MCP echo server for offline tests (JSON-RPC over stdio).
 */

const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

rl.on('line', (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }

  const { id, method, params } = req;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'noeon-echo-mcp', version: '0.1.0' }
      }
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [{
          name: 'echo',
          description: 'Echo arguments as JSON text',
          inputSchema: {
            type: 'object',
            properties: { message: { type: 'string' } }
          }
        }]
      }
    });
    return;
  }

  if (method === 'tools/call') {
    const args = params?.arguments || {};
    send({
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(args) }],
        isError: false
      }
    });
    return;
  }

  if (id != null) {
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } });
  }
});
