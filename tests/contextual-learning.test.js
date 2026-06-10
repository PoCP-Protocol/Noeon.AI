'use strict';

/**
 * Contextual (per-confidence-bucket) threshold learner vs. the global-mean nudge,
 * on the same misconfiguration sweep. Proves the contextual learner fixes the
 * nudge's documented flaws: corrects over-aggression, does not drift off a
 * correct threshold, and dominates the nudge everywhere.
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const { runExperiment, TRUE_BREAKEVEN } = require('../examples/demos/learning-robustness-experiment');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

(async () => {
  console.log('\n\x1b[36m═══ Contextual Threshold Learner ═══\x1b[0m\n');
  const { optimal, rows } = await runExperiment([0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]);

  // Dominance: contextual is at least as good as the nudge for every base.
  assert(rows.every((r) => r.contextualAvg >= r.learnedAvg - 1e-9), 'contextual ≥ global-mean nudge for every configuration');

  // The headline fix: over-aggression. The nudge recovers nothing there; the
  // contextual learner recovers it.
  const aggressive = rows.filter((r) => r.base < TRUE_BREAKEVEN - 1e-9);
  assert(aggressive.every((r) => r.gain <= 1e-9), 'global nudge recovers ~0 on over-aggressive thresholds (the flaw)');
  assert(aggressive.every((r) => r.contextualGain > 0.02), 'contextual learner DOES correct over-aggression');

  // No drift at the optimum (the nudge degraded it; contextual must not).
  const opt = rows.find((r) => Math.abs(r.base - TRUE_BREAKEVEN) < 1e-9);
  assert(opt && opt.contextualAvg >= opt.fixedAvg - 1e-9, 'contextual does not degrade an already-optimal threshold');

  // Within the ±0.15 reach, contextual recovers essentially all the loss.
  const reachable = rows.filter((r) => Math.abs(r.base - TRUE_BREAKEVEN) <= 0.15 + 1e-9 && r.contextualRecovered != null);
  assert(reachable.length > 0 && reachable.every((r) => r.contextualRecovered >= 0.95), 'contextual recovers ≥95% of loss within the safe band');

  assert(optimal > 0.8, 'optimal reward computed');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
