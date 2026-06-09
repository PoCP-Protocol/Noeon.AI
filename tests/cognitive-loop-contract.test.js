'use strict';

const path = require('path');
const { runNoeonPipeline } = require('../src/core/pipeline');
const { COGNITIVE_CYCLE } = require('../src/core/cognitive-architecture');
const {
  LOOP_CONTRACT_SCHEMA,
  evaluateCognitiveLoopContract,
  assertCognitiveLoopContract
} = require('../src/core/cognitive-loop-contract');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Cognitive Loop Contract ═══\x1b[0m\n');

const expected = ['perceive', 'attend', 'reason', 'decide', 'act', 'reflect', 'learn'];
assert(COGNITIVE_CYCLE.map((x) => x.phase).join('->') === expected.join('->'), 'standard loop order fixed');
assert(COGNITIVE_CYCLE[1].region === 'thalamus', 'ATTEND maps to thalamus');
assert(COGNITIVE_CYCLE[6].region === 'neuromodulatory', 'LEARN maps to neuromodulatory');

(async () => {
  const helloFile = path.join(__dirname, '../examples/hello.noeon');
  const hello = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true
  });

  const helloContract = evaluateCognitiveLoopContract(hello.ast, {
    architecture: hello.architecture,
    report: hello.report
  });

  assert(helloContract.schema === LOOP_CONTRACT_SCHEMA, 'contract schema');
  assert(helloContract.ready === true, 'hello satisfies cognitive loop contract');
  assert(helloContract.orderValid === true, 'hello loop order valid');
  assert(helloContract.missing.length === 0, 'hello has no missing loop stages');
  assert(helloContract.stages.some((s) => s.phase === 'attend' && s.status === 'implicit'), 'attend can be implicit via routing');
  assert(helloContract.stages.some((s) => s.phase === 'learn' && s.status === 'explicit'), 'learn is explicit in general program');
  assert(hello.report?.cognitiveLoop?.ready === true, 'canonical report embeds loop contract');

  const agentFile = path.join(__dirname, '../examples/ai_native_copilot.noeon');
  const agent = await runNoeonPipeline(agentFile, {
    filename: agentFile,
    with_protocol: 'off',
    quiet: true
  });
  const agentContract = assertCognitiveLoopContract(agent.ast, {
    architecture: agent.architecture,
    report: agent.report
  });

  assert(agentContract.completeness === 1, 'AI-native copilot reaches full loop coverage');
  assert(agentContract.stages.filter((s) => s.status === 'explicit').length >= 5, 'AI-native copilot has mostly explicit loop stages');
  assert(agent.report?.cognitiveLoop?.stages?.length === 7, 'report records seven loop stages');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  failed += 1;
  console.error(error);
  process.exit(1);
});
