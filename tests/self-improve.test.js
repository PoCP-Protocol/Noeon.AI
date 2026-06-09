'use strict';

const path = require('path');
const { parseNoeonInput } = require('../src/core/pipeline');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { attachSelfIntrospection } = require('../src/core/self-introspection');
const { runInlineSelfReflect, runPostRunSelfImprove, SELF_IMPROVE_SCHEMA } = require('../src/core/self-improve');
const { executeProgram } = require('../src/vm/unified-executor');
const { CognitiveKernel } = require('../src/core/kernel');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 2 — SELF-Improve Loop ═══\x1b[0m\n');

const selfPath = path.join(__dirname, '../examples/ai_native_self_reflect.noeon');
const { ast } = parseNoeonInput(selfPath, { filename: selfPath });
const prep = prepareCanonicalExecution(ast, { filename: selfPath });
attachSelfIntrospection(ast, prep);

const inline = runInlineSelfReflect(ast, { confidence: 0.65 });
assert(inline.schema === SELF_IMPROVE_SCHEMA, 'inline self-improve schema');
assert(inline.patches.length >= 1, 'inline emits patches');
assert(inline.brief.includes('SELF-Improve Brief'), 'inline brief');
assert(ast.cognition.context.SELF_IMPROVE?.epoch >= 1, 'epoch bumped');

(async () => {
  const kernel = new CognitiveKernel({ enable_llm: false, enable_metacognition: true });
  const cogResult = await kernel.execute(ast, { verbose: false });
  const reflectStep = (cogResult.trace || []).find((t) => t.phase === 'validate' && t.result?.details?.self_improve);
  assert(Boolean(reflectStep?.result?.details?.self_improve), 'kernel REFLECT triggers self_improve');

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: selfPath
  });

  assert(run.selfImprove?.schema === SELF_IMPROVE_SCHEMA, 'post-run selfImprove');
  assert(run.report?.selfImprove?.patches?.length >= 1, 'report embeds selfImprove patches');
  assert(run.selfImprove.self?.goal?.includes('SELF'), 'selfImprove reads SELF goal');
  assert(typeof run.selfImprove.brief === 'string', 'selfImprove brief');

  const { runGoldenGate } = require('../scripts/golden-gate');
  const gate = await runGoldenGate({
    root: path.join(__dirname, '..'),
    conform: false,
    human_gate_dir: path.join(__dirname, '../artifacts/self-improve-gate')
  });
  assert(gate.schema === 'noeon.golden.gate/v1', 'golden gate schema');
  assert(gate.programs.length >= 2, 'golden gate programs');
  assert(gate.summary.passed >= 1, 'golden gate at least one pass');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
