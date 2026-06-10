'use strict';

/**
 * Learning from real execution outcomes — no hand-fed payoff. Reward is derived
 * from actual ACT success / VALIDATE / errors, attributed to the chosen option,
 * and the agent converges to the option that actually works.
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CognitiveKernel, ExecutionContext } = require('../src/core/kernel');
const { IRNodeType } = require('../src/core/cognitive-ir');
const { loadLearningStore, meanReward } = require('../src/runtime/learning-store');
const { outcomeReward, attributeRunOutcome } = require('../src/runtime/outcome-reward');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

const storePath = path.join(os.tmpdir(), `noeon-outcome-${process.pid}.json`);
const clean = () => { try { fs.unlinkSync(storePath); } catch {} };

(async () => {
  console.log('\n\x1b[36m═══ Learning From Real Outcomes ═══\x1b[0m\n');
  clean();

  // Pure outcome scoring.
  assert(outcomeReward({ actStatuses: ['done', 'done'] }) === 1, 'all acts succeed → reward 1');
  assert(outcomeReward({ actStatuses: ['done', 'fail'] }) === 0.5, 'half acts fail → reward 0.5');
  assert(outcomeReward({ actStatuses: ['fail'] }) === 0, 'act fails → reward 0');
  assert(outcomeReward({ validationPassed: false }) === 0, 'validation fail → reward 0');
  assert(outcomeReward({ actStatuses: ['done'], errorCount: 1 }) === 0.5, 'runtime error drags reward down');
  assert(outcomeReward({}) === null, 'no signal → no fabricated reward');

  // Environment: option B's action actually succeeds; A's actually fails.
  // No payoff dict — reward comes only from observed ACT status.
  const ENV = { A: 'fail', B: 'done' };
  const chosen = [];
  for (let run = 0; run < 6; run++) {
    const k = new CognitiveKernel({ enable_llm: false });
    const ctx = new ExecutionContext({});
    ctx.learning = loadLearningStore(storePath);
    ctx.confidence = 1.0;
    ctx.broadcast = () => {};
    const dec = await k.handlers.get(IRNodeType.DECIDE)(
      { type: IRNodeType.DECIDE, params: { type: 'cognitive_decision', options: ['A', 'B'], threshold: 0.5, learn_key: 'route' } }, ctx, k);
    // The chosen option's ACT runs and the environment decides its real status.
    ctx.results = { do_it: { action: 'do_it', status: ENV[dec.chosen] } };
    const learned = attributeRunOutcome(ctx);
    chosen.push(dec.chosen);
    if (run === 0) assert(learned && learned.reward === 0, 'run 1 (A) records real reward 0 from failed act');
    if (run === 1) assert(learned && learned.reward === 1, 'run 2 (B) records real reward 1 from successful act');
  }
  assert(chosen[0] === 'A' && chosen[1] === 'B', 'explores both options first');
  assert(chosen.slice(2).every((c) => c === 'B'), 'converges to the option that actually works (B) — no payoff given');

  const s = loadLearningStore(storePath);
  assert(meanReward(s, 'route', 'B') === 1 && meanReward(s, 'route', 'A') === 0, 'persisted store reflects real outcomes');

  // Honesty: a run with no recorded decision attributes nothing.
  const k2 = new CognitiveKernel({ enable_llm: false });
  const ctx2 = new ExecutionContext({});
  ctx2.learning = loadLearningStore(storePath);
  ctx2.results = { x: { status: 'done' } };
  assert(attributeRunOutcome(ctx2) === null, 'no decision → nothing attributed');

  clean();
  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); clean(); process.exit(1); });
