'use strict';

const path = require('path');
const fs = require('fs');
const { parseNoeonInput } = require('../src/core/pipeline');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { attachSelfIntrospection, refreshSelfIntrospection, SELF_SCHEMA } = require('../src/core/self-introspection');
const { enforceEpistemicGate, agentRequiresCitation, countEvidence } = require('../src/runtime/epistemic-gate');
const { runGoldenPath, GOLDEN_SCHEMA } = require('../src/core/golden-path');
const { imagineProgram, DREAM_SCHEMA } = require('../src/core/ai-imagination');
const { executeProgram } = require('../src/vm/unified-executor');
const { createPendingGate, approveGate, consumeApprovalToken } = require('../src/runtime/human-gate-store');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Golden Path & AI World Innovations ═══\x1b[0m\n');

const copilotPath = path.join(__dirname, '../examples/ai_native_copilot.noeon');
const selfPath = path.join(__dirname, '../examples/ai_native_self_reflect.noeon');
const gateDir = path.join(__dirname, '../artifacts/golden-path-gate');

if (fs.existsSync(path.join(gateDir, 'pending.json'))) {
  fs.unlinkSync(path.join(gateDir, 'pending.json'));
}

const { ast: copilotAst } = parseNoeonInput(copilotPath, { filename: copilotPath });
const prep = prepareCanonicalExecution(copilotAst, { filename: copilotPath });

const self = attachSelfIntrospection(copilotAst, prep);
assert(self.schema === SELF_SCHEMA, 'SELF attached at prep');
assert(self.read('goal') === prep.canonical?.intent?.goal, 'SELF.read(goal)');

const dream = imagineProgram(copilotAst, prep);
assert(dream.schema === DREAM_SCHEMA, 'AI dream schema');
assert(dream.imagination.priorities.length >= 1, 'dream has priorities');
assert(dream.prompt_brief.includes('epoch:'), 'dream prompt brief');

assert(agentRequiresCitation(copilotAst), 'copilot requires citation');

(async () => {
  const run = await executeProgram(copilotAst, {
    quiet: true,
    with_protocol: 'off',
    filename: copilotPath,
    human_gate_dir: gateDir
  });

  assert(run.self?.schema === SELF_SCHEMA, 'run exposes self');
  assert(run.report?.self?.goal, 'report embeds self');
  refreshSelfIntrospection(copilotAst, run, prep);
  assert(copilotAst.cognition.context.SELF.run?.aiNative?.grade, 'SELF.run.aiNative after refresh');

  const epistemic = enforceEpistemicGate({ ...run, success: true, blocked: false }, copilotAst, { human_gate_dir: gateDir });
  assert(epistemic.enforced === true, 'epistemic gate enforced for require_citation');
  assert(epistemic.blocked === true || epistemic.evidence >= 1, 'epistemic outcome');

  const golden = await runGoldenPath(copilotPath, {
    filename: copilotPath,
    human_gate_dir: gateDir,
    min_grade: 'C'
  });
  assert(golden.schema === GOLDEN_SCHEMA, 'golden path schema');
  assert(golden.steps.length >= 5, 'golden path steps');
  assert(golden.aiNative.pre.grade, 'golden pre lens');
  assert(golden.dream?.epoch >= 1, 'golden includes dream');
  assert(['golden_ready', 'awaiting_human', 'needs_improvement', 'partial', 'blocked'].includes(golden.verdict), 'golden verdict');

  const { ast: selfAst } = parseNoeonInput(selfPath, { filename: selfPath });
  const selfPrep = prepareCanonicalExecution(selfAst, { filename: selfPath });
  assert(selfPrep.canonical?.intent?.goal?.includes('SELF'), 'self_reflect example goal');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
