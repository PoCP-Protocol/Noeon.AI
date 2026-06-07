'use strict';

const fs = require('fs');
const path = require('path');
const {
  compileProgram,
  runProgram,
  simulateContract,
  getRuntimeStatus,
  readJsonFileIfExists
} = require('../src/runtime/unified-runtime');
const { parseAel } = require('../src/parser');
const { runGovernancePreflight } = require('../src/core/governance');
const { handlePlaygroundApi, sendJson } = require('../src/playground-api');
const { LLMBridge } = require('../src/runtime/cognitive/llm-bridge');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Unified Runtime v0.8 Tests ═══\x1b[0m\n');

const minimal = fs.readFileSync(path.join(__dirname, '../examples/cognitive_minimal.ael'), 'utf8');
const ast = parseAel(minimal);

assert(getRuntimeStatus().version === '0.9.0', 'runtime status reports v0.9.0');

const ir = compileProgram(ast, 'ir');
assert(ir.format === 'ir', 'compileProgram produces IR');
assert(ir.program.intents.length >= 0, 'IR program has structure');

const ael = compileProgram(ast, 'ael');
assert(ael.format === 'ael', 'compileProgram produces AEL artifact');
assert(ael.artifact.contract, 'AEL artifact has contract block');

const governance = runGovernancePreflight(ast, null, {});
assert(typeof governance.valid === 'boolean', 'governance preflight returns valid flag');

(async () => {
  const runResult = await runProgram(ast, { quiet: true, console: false });
  assert(runResult.success === true, 'runProgram executes minimal example');
  assert(runResult.governance, 'runProgram attaches governance metadata');

  const bridge = new LLMBridge({ mode: 'mock' });
  assert(bridge.isConfigured() === false, 'mock mode disables live LLM');
  const mockReason = await bridge.reason('test query');
  assert(mockReason.conclusion.includes('Analysis') || mockReason.conclusion.includes('Intuition'), 'LLM mock returns content');

  const feedback = readJsonFileIfExists(path.join(__dirname, '../examples/feedback_highrisk.json'));
  const contractAst = parseAel(fs.readFileSync(path.join(__dirname, '../examples/noeon_contract.ael'), 'utf8'));
  const sim = simulateContract(contractAst, feedback, {});
  assert(sim.success === true, 'simulateContract runs protocol path');

  // Playground API smoke test
  const mockRes = { writeHead: () => {}, end: (body) => { mockRes.body = body; } };
  await handlePlaygroundApi({ method: 'GET', url: '/api/status' }, mockRes, '/api/status');
  assert(mockRes.body && JSON.parse(mockRes.body).version, 'playground status API');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
