'use strict';

const path = require('path');
const { parseNoeonInput } = require('../src/core/pipeline');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { evaluateAiNative, LENS_SCHEMA } = require('../src/core/ai-native-lens');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ AI-Native Design Lens ═══\x1b[0m\n');

assert(LENS_SCHEMA === 'noeon.ai-native.lens/v1', 'lens schema');

const copilotPath = path.join(__dirname, '../examples/ai_native_copilot.noeon');
const helloPath = path.join(__dirname, '../examples/hello.noeon');

const { ast: copilotAst } = parseNoeonInput(copilotPath, { filename: copilotPath });
const copilotPrep = prepareCanonicalExecution(copilotAst, { filename: copilotPath });
const copilotEval = evaluateAiNative(copilotAst, copilotPrep);

assert(copilotEval.score >= 0.65, `copilot scores AI-native (${copilotEval.score})`);
assert(copilotEval.grade >= 'B', `copilot grade ${copilotEval.grade}`);
assert(copilotEval.dimensions.intent_clarity.score > 0.5, 'copilot has clear intent');
assert(copilotEval.dimensions.governable_autonomy.score > 0.4, 'copilot has governance');
assert(copilotEval.suggestions.length >= 0, 'copilot suggestions array');
assert(copilotEval.brief.includes('goal:'), 'copilot brief for AI consumption');

const helloAst = parseNoeonInput(helloPath, { filename: helloPath }).ast;
const helloPrep = prepareCanonicalExecution(helloAst, { filename: helloPath });
const helloEval = evaluateAiNative(helloAst, helloPrep);

assert(copilotEval.score > helloEval.score, 'copilot more AI-native than hello.noeon');
assert(helloEval.verdict.includes('AI-native') || helloEval.verdict.includes('Partially'), 'hello gets verdict');

(async () => {
  const run = await executeProgram(copilotAst, {
    quiet: true,
    with_protocol: 'off',
    filename: copilotPath
  });
  assert(run.report?.aiNative?.schema === LENS_SCHEMA, 'report embeds aiNative lens');
  assert(run.report?.aiNative?.score >= 0.6, 'report aiNative score after run');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
