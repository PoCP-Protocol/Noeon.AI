'use strict';

const fs = require('fs');
const path = require('path');
const { mapMcpToolDescriptor, listMcpTools, attachMcpTools, executeMcpToolStub, MCP_PLUGIN } = require('../src/runtime/mcp-bridge');
const { getPlugin } = require('../src/runtime/plugins/registry');
const { loadProjectConfig } = require('../src/core/config');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ MCP Bridge — Tool Descriptor Mapping ═══\x1b[0m\n');

const tool = mapMcpToolDescriptor({
  name: 'search_pages',
  description: 'Search workspace pages',
  inputSchema: { type: 'object', properties: { q: { type: 'string' } } }
}, 'notion');

assert(tool?.schema === 'noeon.tool/v1', 'tool schema v1');
assert(tool?.qualifiedName === 'notion/search_pages', 'qualified tool name');
assert(tool?.modality === 'mcp', 'modality mcp');
assert(tool?.perceive === true, 'default perceive binding');

const config = {
  mcp: {
    servers: [{
      name: 'notion',
      command: 'npx',
      tools: [{ name: 'search_pages', description: 'Search' }]
    }]
  }
};

const tools = listMcpTools(config);
assert(tools.length === 1, 'listMcpTools from config');

const ast = { task: 'demo', tools: [] };
const attached = attachMcpTools(ast, config);
assert(attached.attached === true, 'attachMcpTools mutates ast');
assert(ast.mcpTools?.length === 1, 'ast.mcpTools populated');

const plugin = getPlugin(MCP_PLUGIN);
assert(plugin?.version === '0.2.0', 'mcp_call plugin registered');

const stub = executeMcpToolStub({
  stepName: 'fetch_context',
  binding: { server: 'notion', tool: 'search_pages', latencyMs: 50 }
});
assert(stub.status === 'done', 'mcp stub executes');
assert(stub.pluginMeta?.mode === 'stub', 'stub mode metadata');

const injected = executeMcpToolStub({
  stepName: 'fetch_context',
  binding: { server: 'notion', tool: 'search_pages' },
  feedback: { actionResults: { fetch_context: { status: 'done', result: { pages: 3 } } } }
});
assert(injected.pluginMeta?.result?.pages === 3, 'feedback injection for tests');

const { config: loaded } = loadProjectConfig({ cwd: path.join(__dirname, '..') });
assert(Array.isArray(loaded.mcp?.servers), 'default config includes mcp.servers');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
