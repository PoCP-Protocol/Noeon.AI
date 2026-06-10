'use strict';

/**
 * Characterizes the learned-threshold mechanism honestly (asserts only what is
 * true): it corrects an over-cautious threshold, stays within the safe ±0.15
 * band, and never approves beyond that bound. It does NOT claim to always help —
 * the over-aggressive regime is a documented limitation (see the experiment).
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const { runExperiment, TRUE_BREAKEVEN } = require('../examples/demos/learning-robustness-experiment');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

(async () => {
  console.log('\n\x1b[36m═══ Learning Robustness ═══\x1b[0m\n');
  const { optimal, rows } = await runExperiment([0.55, 0.65, 0.75, 0.85]);

  assert(optimal > 0.8, 'optimal policy reward computed for the environment');

  const cautious = rows.filter((r) => r.base > TRUE_BREAKEVEN + 1e-9);
  assert(cautious.length > 0 && cautious.every((r) => r.gain > 0), 'learning improves every over-cautious base threshold');
  assert(cautious.every((r) => r.learnedEff < r.base + 1e-9), 'learned threshold moves down from an over-cautious base toward optimal');
  assert(cautious.some((r) => r.recovered >= 0.5), 'recovers a substantial fraction of the loss (≥50%) in the best reachable case');

  assert(rows.every((r) => r.learnedEff >= r.base - 0.15 - 1e-9 && r.learnedEff <= r.base + 0.15 + 1e-9),
    'adaptation stays within the safe ±0.15 band (bounded, never runaway)');

  // Honest guard: learning must not catastrophically degrade a configured agent.
  assert(rows.every((r) => r.learnedAvg >= r.fixedAvg - 0.05), 'learning never degrades reward by more than a small margin');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
