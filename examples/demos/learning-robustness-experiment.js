'use strict';

/**
 * Controlled experiment: how much does learning recover a MIS-SET threshold?
 *
 * Tests the honest claim behind the refund demo — "learning helps most when the
 * fixed policy is wrong for the environment" — as a reproducible sweep, using
 * the real DECIDE learned-threshold mechanism (no reimplemented logic).
 *
 * Environment (perception is accurate; we isolate threshold calibration):
 *   true break-even confidence = 0.65  → conf ≥ 0.65 is legitimate, below is fraud
 *   approve → +1 on legit, 0 on fraud ; escalate → fixed 0.6
 *   ⇒ the OPTIMAL decision threshold is 0.65.
 *
 * We sweep the agent's *configured* base threshold across the range and compare
 * a fixed-threshold agent against one that adapts via the learned nudge, both on
 * the same deterministic request stream. Reward is measured over the converged
 * (back) half of the stream. Pure, deterministic, no randomness.
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { CognitiveKernel, ExecutionContext } = require(path.join(ROOT, 'src/core/kernel'));
const { IRNodeType } = require(path.join(ROOT, 'src/core/cognitive-ir'));
const { loadLearningStore, recordOutcome } = require(path.join(ROOT, 'src/runtime/learning-store'));
const { recordContextual } = require(path.join(ROOT, 'src/runtime/threshold-learner'));

const GRID = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95];
const TRUE_BREAKEVEN = 0.65;
const ESCALATE_REWARD = 0.6;
const STREAM = 240;

const isLegit = (conf) => conf >= TRUE_BREAKEVEN - 1e-9;
const reward = (chosen, conf) => (chosen === 'approve' ? (isLegit(conf) ? 1 : 0) : ESCALATE_REWARD);

async function runStream(baseThreshold, { learn, contextual = false }) {
  const kernel = new CognitiveKernel({ enable_llm: false });
  const store = loadLearningStore(null); // in-memory; accumulates across the stream
  const rewards = [];
  let lastEff = baseThreshold;

  for (let i = 0; i < STREAM; i++) {
    const conf = GRID[i % GRID.length];
    let chosen;
    if (learn) {
      const ctx = new ExecutionContext({});
      ctx.learning = store;
      ctx.confidence = conf;
      ctx.broadcast = () => {};
      const params = { action: 'approve', threshold: baseThreshold, fallback: 'escalate' };
      if (contextual) params.learn_mode = 'contextual';
      const d = await kernel.handlers.get(IRNodeType.DECIDE)({ type: IRNodeType.DECIDE, params }, ctx, kernel);
      chosen = d.chosen;
      lastEff = d.effective_threshold;
      const r = reward(chosen, conf);
      if (contextual) recordContextual(store, 'decide:approve', conf, chosen, r, { approve: 'approve' });
      else recordOutcome(store, 'decide:approve', chosen, r);
      rewards.push(r);
    } else {
      chosen = conf >= baseThreshold ? 'approve' : 'escalate';
      rewards.push(reward(chosen, conf));
    }
  }
  const back = rewards.slice(Math.floor(STREAM / 2));
  return { avg: back.reduce((a, b) => a + b, 0) / back.length, eff: lastEff };
}

async function runExperiment(bases = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85]) {
  // Optimal reward = a perfectly-set threshold (0.65) with no exploration cost.
  const optimal = (await runStream(TRUE_BREAKEVEN, { learn: false })).avg;
  const rows = [];
  for (const base of bases) {
    const fixed = await runStream(base, { learn: false });
    const learned = await runStream(base, { learn: true });               // global-mean nudge
    const ctx = await runStream(base, { learn: true, contextual: true });  // contextual bucket learner
    rows.push({
      base,
      fixedAvg: fixed.avg,
      learnedAvg: learned.avg,
      learnedEff: learned.eff,
      contextualAvg: ctx.avg,
      contextualEff: ctx.eff,
      gain: learned.avg - fixed.avg,
      contextualGain: ctx.avg - fixed.avg,
      recovered: optimal > fixed.avg ? (learned.avg - fixed.avg) / (optimal - fixed.avg) : null,
      contextualRecovered: optimal > fixed.avg ? (ctx.avg - fixed.avg) / (optimal - fixed.avg) : null
    });
  }
  return { optimal, rows };
}

async function main() {
  const { optimal, rows } = await runExperiment();
  console.log('\n\x1b[36m═══ Learning vs. threshold misconfiguration ═══\x1b[0m\n');
  console.log(`  environment: optimal threshold = ${TRUE_BREAKEVEN}, optimal avg reward = ${optimal.toFixed(3)}\n`);
  const fmtRec = (x) => (x == null ? '  —' : `${(x * 100).toFixed(0)}%`.padStart(4));
  const col = (g) => (g > 0.005 ? '\x1b[32m' : g < -0.005 ? '\x1b[31m' : '');
  console.log('  base   fixed   | nudge(global)        | contextual(bucketed)   regime');
  console.log('                 | avg    gain  recov   | avg    gain  recov');
  console.log('  ' + '─'.repeat(74));
  for (const r of rows) {
    const tag = r.base < TRUE_BREAKEVEN - 1e-9 ? 'too aggressive' : r.base > TRUE_BREAKEVEN + 1e-9 ? 'too cautious' : 'optimal';
    console.log(
      `  ${r.base.toFixed(2)}   ${r.fixedAvg.toFixed(3)}   | ` +
      `${r.learnedAvg.toFixed(3)} ${col(r.gain)}${r.gain >= 0 ? '+' : ''}${r.gain.toFixed(3)}\x1b[0m ${fmtRec(r.recovered)} | ` +
      `${r.contextualAvg.toFixed(3)} ${col(r.contextualGain)}${r.contextualGain >= 0 ? '+' : ''}${r.contextualGain.toFixed(3)}\x1b[0m ${fmtRec(r.contextualRecovered)}  ${tag}`
    );
  }
  console.log('');
}

if (require.main === module) main().catch((e) => { console.error(e.stack); process.exit(1); });

module.exports = { runExperiment, runStream, TRUE_BREAKEVEN };
