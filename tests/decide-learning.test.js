'use strict';

/**
 * Everyday `DECIDE action=X threshold=Y fallback=Z` is learnable: real outcome
 * history nudges the effective threshold within a bounded band — never bypassing
 * the confidence gate's intent, never touching human/risk gates, and a no-op
 * without a learning store (so default behavior is unchanged).
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const { CognitiveKernel, ExecutionContext } = require('../src/core/kernel');
const { IRNodeType } = require('../src/core/cognitive-ir');
const { loadLearningStore, recordOutcome } = require('../src/runtime/learning-store');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

async function decide(conf, seed) {
  const k = new CognitiveKernel({ enable_llm: false });
  const ctx = new ExecutionContext({});
  ctx.learning = loadLearningStore(null); // in-memory; seeded below
  if (seed) for (const [opt, rewards] of Object.entries(seed)) for (const r of rewards) recordOutcome(ctx.learning, 'decide:approve', opt, r);
  ctx.confidence = conf;
  ctx.broadcast = () => {};
  return k.handlers.get(IRNodeType.DECIDE)({ type: IRNodeType.DECIDE, params: { action: 'approve', threshold: 0.8, fallback: 'escalate' } }, ctx, k);
}

(async () => {
  console.log('\n\x1b[36m═══ Everyday DECIDE Learning ═══\x1b[0m\n');

  const base = await decide(0.7, null);
  assert(base.chosen === 'escalate' && base.effective_threshold === 0.8, 'no history → threshold unchanged, confidence gate rules');

  const good = await decide(0.7, { approve: [1, 1, 1], escalate: [0, 0] });
  assert(good.chosen === 'approve', 'approve-worked-before → acts at same confidence');
  assert(good.effective_threshold < 0.8 && good.effective_threshold >= 0.65, 'threshold lowered within bounded band');

  const bad = await decide(0.7, { approve: [0, 0], escalate: [1, 1] });
  assert(bad.chosen === 'escalate', 'approve-failed-before → stays cautious');
  assert(bad.effective_threshold > 0.8 && bad.effective_threshold <= 0.95 + 1e-9, 'threshold raised within bounded band');

  // Bound check: extreme history can't move the threshold more than the margin.
  const extreme = await decide(0.7, { approve: Array(50).fill(1), escalate: Array(50).fill(0) });
  assert(extreme.effective_threshold >= 0.8 - 0.15 - 1e-9, 'nudge is bounded to ±0.15 (no runaway)');

  // It records the choice so the run outcome can be attributed.
  const k = new CognitiveKernel({ enable_llm: false });
  const ctx = new ExecutionContext({});
  ctx.learning = loadLearningStore(null);
  ctx.confidence = 0.9; ctx.broadcast = () => {};
  await k.handlers.get(IRNodeType.DECIDE)({ type: IRNodeType.DECIDE, params: { action: 'approve', threshold: 0.8, fallback: 'escalate' } }, ctx, k);
  assert(ctx.lastDecisionKey === 'decide:approve' && ctx.lastChosen === 'approve', 'everyday DECIDE records (key, chosen) for outcome attribution');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
