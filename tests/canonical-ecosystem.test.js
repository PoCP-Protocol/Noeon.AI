'use strict';

const path = require('path');
const { parseAel } = require('../src/parser');
const { executeProgram, executeLegacyProgram } = require('../src/vm/unified-executor');
const { buildEcosystemSnapshot, buildEcosystemStatus } = require('../src/core/canonical-ecosystem');
const { validateCanonicalReport } = require('../src/core/canonical-contract');
const { runActionStep } = require('../src/runtime/action-runner');
const { setActiveMcpServers } = require('../src/runtime/mcp-bridge');

const parityDir = path.join(__dirname, '../examples/parity');
const echoServer = path.join(__dirname, 'fixtures/mcp-echo-server.js');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Phase I — Ecosystem & Legacy Extract ═══\x1b[0m\n');

assert(typeof executeLegacyProgram === 'function', 'executeLegacyProgram exported');

(async () => {
  const ast = parseAel(
    require('fs').readFileSync(path.join(parityDir, 'risk_assess.noeon'), 'utf8'),
    { filename: path.join(parityDir, 'risk_assess.noeon') }
  );
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: path.join(parityDir, 'risk_assess.noeon')
  });

  assert(run.report?.ecosystem?.schema === 'noeon.ecosystem/v1', 'report includes ecosystem');
  assert(run.report?.ecosystem?.runtime?.executor === 'canonical', 'ecosystem executor canonical');
  const contract = validateCanonicalReport(run.report);
  assert(contract.valid, `report contract valid (${contract.missing.join(', ') || 'ok'})`);

  const legacy = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    legacy_profile: true,
    filename: path.join(parityDir, 'risk_assess.noeon')
  });
  assert(legacy.executor === 'legacy', 'legacy_profile uses legacy executor');
  assert(legacy.legacyDeprecation?.active === true, 'legacy deprecation metadata');

  const snapshot = buildEcosystemSnapshot(
    { general: { imports: ['std.demo'] }, mcpTools: [{ qualifiedName: 'echo/echo' }] },
    {},
    { executor: 'canonical', irFirst: true }
  );
  assert(snapshot.packages.imports.includes('std.demo'), 'ecosystem captures imports');
  assert(snapshot.mcp.attached_tools.includes('echo/echo'), 'ecosystem captures mcp tools');

  const status = await buildEcosystemStatus({ cwd: path.join(__dirname, '..') });
  assert(status.conform?.allValid === true, 'ecosystem status conform');
  assert(status.registry?.count >= 1, 'ecosystem status registry');

  process.env.NOEON_MCP_MODE = 'stub';
  setActiveMcpServers([{
    name: 'echo',
    command: process.execPath,
    args: [echoServer]
  }]);

  const step = await runActionStep('fetch_context', {
    task: 'mcp_echo_demo',
    network: 'NoeonNet',
    feedback: {},
    actionBindings: {
      fetch_context: {
        plugin: 'mcp_call',
        server: 'echo',
        tool: 'echo',
        arguments: { message: 'ecosystem-test' }
      }
    }
  });
  assert(step.status === 'done', 'mcp_echo.ael action via mcp_call plugin');
  delete process.env.NOEON_MCP_MODE;

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
