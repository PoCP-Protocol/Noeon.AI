'use strict';

const path = require('path');
const {
  discoverServerTools,
  callMcpToolLive,
  closeAllMcpSessions,
  resolveMcpMode
} = require('../src/runtime/mcp-client');
const {
  enrichMcpToolsFromDiscovery,
  executeMcpTool,
  setActiveMcpServers,
  getMcpStatus
} = require('../src/runtime/mcp-bridge');
const { getPlugin } = require('../src/runtime/plugins/registry');

const echoServer = path.join(__dirname, 'fixtures/mcp-echo-server.js');
const serverConfig = {
  name: 'echo',
  command: process.execPath,
  args: [echoServer],
  discover: true
};

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ MCP Client — Live Stdio Session ═══\x1b[0m\n');

(async () => {
  const prevMode = process.env.NOEON_MCP_MODE;
  process.env.NOEON_MCP_MODE = 'live';

  try {
    assert(resolveMcpMode() === 'live', 'resolveMcpMode live');

    const tools = await discoverServerTools(serverConfig, { mode: 'live' });
    assert(tools.length >= 1, 'discoverServerTools returns tools');
    assert(tools[0].name === 'echo', 'echo tool discovered');

    const call = await callMcpToolLive(serverConfig, 'echo', { message: 'hello-mcp' }, { mode: 'live' });
    const text = call?.content?.find((c) => c.type === 'text')?.text;
    assert(text?.includes('hello-mcp'), 'callMcpToolLive returns echoed args');

    setActiveMcpServers([serverConfig]);
    const enriched = await enrichMcpToolsFromDiscovery({ tools: [] }, { mcp: { servers: [serverConfig] } }, { mode: 'live' });
    assert(enriched.discoveredCount >= 1, 'enrichMcpToolsFromDiscovery');
    assert(enriched.tools.some((t) => t.qualifiedName === 'echo/echo'), 'discovered qualified name');

    const liveExec = await executeMcpTool({
      stepName: 'mcp_echo',
      binding: { plugin: 'mcp_call', server: 'echo', tool: 'echo', arguments: { message: 'plugin-live' } }
    });
    assert(liveExec.status === 'done', 'executeMcpTool live');
    assert(liveExec.pluginMeta?.mode === 'live', 'live mode metadata');

    const plugin = getPlugin('mcp_call');
    assert(plugin.version === '0.2.0', 'mcp_call plugin v0.2.0');

    const status = getMcpStatus({ mcp: { servers: [serverConfig] } });
    assert(status.schema === 'noeon.mcp.status/v1', 'mcp status schema');
    assert(status.serverCount === 1, 'status server count');
  } finally {
    closeAllMcpSessions();
    if (prevMode === undefined) delete process.env.NOEON_MCP_MODE;
    else process.env.NOEON_MCP_MODE = prevMode;
  }

  process.env.NOEON_MCP_MODE = 'stub';
  const stubExec = await executeMcpTool({
    stepName: 'mcp_echo',
    binding: { server: 'echo', tool: 'echo' }
  });
  assert(stubExec.pluginMeta?.mode === 'stub', 'stub fallback when mode=stub');
  delete process.env.NOEON_MCP_MODE;

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
