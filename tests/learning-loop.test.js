'use strict';

/**
 * Cross-run learning loop — the system records real decision outcomes, persists
 * them, and demonstrably converges to the higher-reward option over runs.
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CognitiveKernel, ExecutionContext } = require('../src/core/kernel');
const { IRNodeType } = require('../src/core/cognitive-ir');
const { loadLearningStore, meanReward, recordOutcome, preferred, saveLearningStore } = require('../src/runtime/learning-store');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

const storePath = path.join(os.tmpdir(), `noeon-learn-${process.pid}.json`);
function cleanup() { try { fs.unlinkSync(storePath); } catch {} }

(async () => {
  console.log('\n\x1b[36m═══ Cross-Run Learning Loop ═══\x1b[0m\n');
  cleanup();

  // Pure store: explore-then-exploit + persistence.
  const s0 = loadLearningStore(storePath);
  assert(preferred(s0, 'k', ['A', 'B']).reason === 'explore', 'no history → explore');
  recordOutcome(s0, 'k', 'A', 0.2);
  recordOutcome(s0, 'k', 'B', 1.0);
  assert(preferred(s0, 'k', ['A', 'B']).option === 'B', 'after outcomes → exploits best (B)');
  assert(saveLearningStore(s0) === true, 'store persists to disk');
  const s1 = loadLearningStore(storePath);
  assert(meanReward(s1, 'k', 'B') === 1.0, 'reloaded store retains learned reward');
  cleanup();

  // End-to-end through the kernel DECIDE/LEARN handlers across runs.
  const payoff = { A: 0.2, B: 1.0 };
  const chosen = [];
  for (let run = 0; run < 6; run++) {
    const k = new CognitiveKernel({ enable_llm: false });
    const ctx = new ExecutionContext({});
    ctx.learning = loadLearningStore(storePath);
    ctx.feedback = { payoff };
    ctx.confidence = 1.0;
    ctx.broadcast = () => {};
    const dec = await k.handlers.get(IRNodeType.DECIDE)(
      { type: IRNodeType.DECIDE, params: { type: 'cognitive_decision', options: ['A', 'B'], threshold: 0.5, learn_key: 'pick' } }, ctx, k);
    await k.handlers.get(IRNodeType.LEARN)({ type: IRNodeType.LEARN, params: { signal_type: 'reward' } }, ctx, k);
    chosen.push(dec.chosen);
  }
  assert(chosen[0] === 'A' && chosen[1] === 'B', 'first two runs explore both options');
  assert(chosen.slice(2).every((c) => c === 'B'), 'converges to the higher-reward option (B)');
  const sf = loadLearningStore(storePath);
  assert(meanReward(sf, 'pick', 'B') > meanReward(sf, 'pick', 'A'), 'persisted store reflects B > A');
  cleanup();

  // Honesty: with no learning store, behavior is unchanged (default options[0]).
  const k = new CognitiveKernel({ enable_llm: false });
  const ctx = new ExecutionContext({});
  ctx.learning = loadLearningStore(null); // in-memory no-op
  ctx.confidence = 1.0; ctx.broadcast = () => {};
  const dec = await k.handlers.get(IRNodeType.DECIDE)(
    { type: IRNodeType.DECIDE, params: { type: 'cognitive_decision', options: ['A', 'B'], threshold: 0.5 } }, ctx, k);
  assert(dec.chosen === 'A', 'no store → first run still explores (deterministic, no fabrication)');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); cleanup(); process.exit(1); });
