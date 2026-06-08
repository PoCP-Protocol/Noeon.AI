'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { executeProgram, VM_VERSION } = require('../src/vm/unified-executor');
const { detectProfile, resolveExecutionMode, PROFILES } = require('../src/core/profile');
const { runProtocolCycle } = require('../src/vm/protocol-phase');
const { compileAel } = require('../src/compiler');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Unified VM v1.0-alpha Tests ═══\x1b[0m\n');

assert(VM_VERSION === '1.0.0-alpha', 'VM_VERSION is 1.0.0-alpha');

const minimal = parseAel(fs.readFileSync(path.join(__dirname, '../examples/cognitive_minimal.ael'), 'utf8'));
assert(detectProfile(minimal) === 'ael' || detectProfile(minimal) === 'cognitive', 'detectProfile for minimal');

const hello = parseAel(fs.readFileSync(path.join(__dirname, '../examples/hello.noeon'), 'utf8'));
assert(detectProfile(hello, { filename: 'hello.noeon' }) === PROFILES.GENERAL, 'detectProfile general for .noeon');
assert(hello.cognition.understandings.length === 1, 'general profile parses UNDERSTAND');
assert(hello.cognition.acts.length === 1, 'general profile parses ACT');
assert(hello.cognition.feedback.length === 1, 'general profile parses FEEDBACK');
const helloIr = compileAel(hello);
assert(helloIr.spec.profile === PROFILES.GENERAL, 'compileAel preserves general profile');
assert(helloIr.contract.cognition.understandings.length === 1, 'compileAel preserves UNDERSTAND');

assert(resolveExecutionMode(PROFILES.GENERAL, { with_protocol: 'off' }) === 'cognitive', 'general profile cognitive-only mode');
assert(resolveExecutionMode(PROFILES.AEL, { simulate: true }) === 'protocol', 'ael simulate uses protocol mode');

(async () => {
  const runResult = await executeProgram(minimal, {
    quiet: true,
    with_protocol: 'off',
    filename: 'cognitive_minimal.ael'
  });
  assert(runResult.success === true, 'executeProgram cognitive-only');
  assert(runResult.phases.includes('cognitive'), 'cognitive phase executed');
  assert(runResult.phases.includes('consciousness'), 'consciousness scheduler runs by default');
  assert(runResult.scheduler === 'consciousness', 'default scheduler is consciousness');
  assert(!runResult.phases.includes('protocol'), 'protocol skipped when off');

  const generalResult = await executeProgram(hello, {
    quiet: true,
    with_protocol: 'off',
    filename: 'hello.noeon'
  });
  assert(generalResult.success === true, 'executeProgram general profile cognitive-only');
  assert(generalResult.profile === PROFILES.GENERAL, 'executeProgram keeps general profile');

  const contract = parseAel(fs.readFileSync(path.join(__dirname, '../examples/noeon_contract.ael'), 'utf8'));
  const full = await executeProgram(contract, { quiet: true, with_protocol: 'on', filename: 'noeon_contract.ael' });
  assert(full.phases.includes('cognitive') && full.phases.includes('protocol'), 'full mode runs both phases');
  assert(full.protocol?.execution?.compute != null, 'protocol includes compute block');

  const compiled = compileAel(contract);
  const feedback = JSON.parse(fs.readFileSync(path.join(__dirname, '../examples/feedback_highrisk.json'), 'utf8'));
  const cycle = await runProtocolCycle(compiled, feedback, {});
  assert(cycle.cycleAt && cycle.execution?.compute, 'runProtocolCycle matches simulate shape');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
