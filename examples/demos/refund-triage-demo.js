'use strict';

/**
 * End-to-end business demo: a refund-triage agent that LEARNS from real outcomes.
 *
 * One watchable scenario stringing the whole Noeon stack together with the real
 * production modules (no reimplemented logic):
 *
 *   DECIDE (confidence gate, learned threshold)  →  ACT (issue refund)
 *      →  real downstream outcome (legit vs. fraud / chargeback)
 *         →  LEARN (attribute reward, persist)  →  next decision is calibrated
 *            →  auditable, tamper-evident provenance report.
 *
 * Each round the agent decides approve vs. escalate for a refund request. When
 * approving high-confidence requests keeps turning out legitimate, the agent
 * lowers its effective threshold (within a bounded, safe band) and serves more
 * customers directly; fraud outcomes push it back toward caution. The learned
 * adaptation is measured against a fixed-threshold baseline on the same stream.
 *
 * Run:  node examples/demos/refund-triage-demo.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { CognitiveKernel, ExecutionContext } = require(path.join(ROOT, 'src/core/kernel'));
const { IRNodeType } = require(path.join(ROOT, 'src/core/cognitive-ir'));
const { loadLearningStore, recordOutcome, saveLearningStore, meanReward } = require(path.join(ROOT, 'src/runtime/learning-store'));
const { buildProvenance } = require(path.join(ROOT, 'src/runtime/provenance'));
const { renderHtml, renderMarkdown } = require(path.join(ROOT, 'src/runtime/provenance-report'));

// Fixed request stream (deterministic): each refund request carries the model's
// confidence that it is legitimate, plus the ground-truth outcome the business
// later observes (legit vs. fraud). The agent does NOT see `legit` when deciding.
// Each request has a textual description (what a real LLM would score from),
// a deterministic fallback confidence `conf` (used when no LLM is configured,
// keeping tests offline/reproducible), and the ground-truth `legit` outcome the
// business later observes (never shown to the agent at decision time).
const REQUESTS = [
  { id: 'RF-001', conf: 0.85, legit: true,  desc: '$40 refund, item arrived damaged with photos, 3-year account, 0 prior refunds' },
  { id: 'RF-002', conf: 0.62, legit: true,  desc: '$120 refund, "changed my mind", 8-month account, 1 prior refund' },
  { id: 'RF-003', conf: 0.78, legit: true,  desc: '$25 refund, wrong size shipped, 2-year account, 0 prior refunds' },
  { id: 'RF-004', conf: 0.58, legit: true,  desc: '$95 refund, "never received" but tracking shows delivered, 1-year account' },
  { id: 'RF-005', conf: 0.90, legit: true,  desc: '$15 refund, duplicate charge confirmed by statement, 4-year account' },
  { id: 'RF-006', conf: 0.55, legit: false, desc: '$480 refund, "item not as described", 6-day-old account, 2 prior refunds this week' },
  { id: 'RF-007', conf: 0.72, legit: true,  desc: '$60 refund, defective on arrival, 18-month account, 0 prior refunds' },
  { id: 'RF-008', conf: 0.64, legit: true,  desc: '$70 refund, late delivery past guarantee, 10-month account, 1 prior refund' },
  { id: 'RF-009', conf: 0.81, legit: true,  desc: '$30 refund, missing part, 3-year account, 0 prior refunds' },
  { id: 'RF-010', conf: 0.60, legit: true,  desc: '$110 refund, "didn\'t fit", 7-month account, 1 prior refund' },
  { id: 'RF-011', conf: 0.88, legit: true,  desc: '$20 refund, billing error confirmed, 5-year account' },
  { id: 'RF-012', conf: 0.66, legit: true,  desc: '$85 refund, item stopped working in 2 days, 1-year account' },
  { id: 'RF-013', conf: 0.74, legit: true,  desc: '$45 refund, wrong color, 2-year account, 0 prior refunds' },
  { id: 'RF-014', conf: 0.61, legit: true,  desc: '$130 refund, "not satisfied", 9-month account, 1 prior refund' }
];

// Risk perception: a real LLM scores legitimacy from the description; otherwise
// fall back to the deterministic confidence (offline / reproducible).
async function scoreLegitimacy(kernel, req) {
  if (kernel.llm && kernel.llm.isConfigured && kernel.llm.isConfigured()) {
    try {
      const prompt = `You are a refund fraud-risk scorer. Refund request: ${req.desc}. `
        + `Output ONLY a number from 0.00 to 1.00 = probability this refund is LEGITIMATE (1.00 = clearly legit, 0.00 = clearly fraud). Number only.`;
      const out = await kernel.llm.reason(prompt, {});
      const m = String(out.conclusion || '').match(/(?:0?\.\d+|1(?:\.0+)?|0)/);
      if (m) return { conf: Math.max(0, Math.min(1, parseFloat(m[0]))), source: 'llm' };
    } catch { /* fall back */ }
  }
  return { conf: req.conf, source: 'fixed' };
}

const BASE_THRESHOLD = 0.70;
const ESCALATE_REWARD = 0.6; // safe but slow: human review catches fraud, costs time
const KEY = 'decide:approve';

// Business outcome → reward. Approving a legit refund is the best result (fast +
// correct); approving fraud is the worst; escalation is a fixed safe payoff.
function rewardFor(chosen, req) {
  if (chosen === 'approve') return req.legit ? 1.0 : 0.0;
  return ESCALATE_REWARD; // escalate
}

async function decideOnce(kernel, store, conf) {
  const ctx = new ExecutionContext({});
  ctx.learning = store;
  ctx.confidence = conf;
  ctx.broadcast = () => {};
  const decision = await kernel.handlers.get(IRNodeType.DECIDE)(
    { type: IRNodeType.DECIDE, params: { action: 'approve', threshold: BASE_THRESHOLD, fallback: 'escalate' } },
    ctx, kernel
  );
  return { decision, ctx };
}

async function runDemo({ storePath, useLlm = false } = {}) {
  const sp = storePath || path.join(os.tmpdir(), `noeon-refund-${process.pid}.json`);
  try { fs.unlinkSync(sp); } catch {}
  const kernel = new CognitiveKernel({ enable_llm: useLlm });
  const store = loadLearningStore(sp);

  const rows = [];
  let learnedReward = 0;
  let baselineReward = 0;
  let approved = 0;
  let llmScored = 0;

  for (let i = 0; i < REQUESTS.length; i++) {
    const req = REQUESTS[i];
    // Perceive: score legitimacy (real LLM or deterministic fallback).
    const { conf, source } = await scoreLegitimacy(kernel, req);
    if (source === 'llm') llmScored++;

    // Learner: decide with the (possibly nudged) threshold, observe outcome, learn.
    const { decision } = await decideOnce(kernel, store, conf);
    const reward = rewardFor(decision.chosen, req);
    recordOutcome(store, KEY, decision.chosen, reward);
    saveLearningStore(store);
    learnedReward += reward;
    if (decision.chosen === 'approve') approved++;

    // Baseline: a fixed-threshold agent (no learning) on the same perceived score.
    const baseChosen = conf >= BASE_THRESHOLD ? 'approve' : 'escalate';
    baselineReward += rewardFor(baseChosen, req);

    rows.push({
      round: i + 1, id: req.id, conf: Number(conf.toFixed(2)), source,
      eff: Number(decision.effective_threshold.toFixed(3)),
      chosen: decision.chosen, outcome: decision.chosen === 'approve' ? (req.legit ? 'legit' : 'FRAUD') : 'reviewed',
      reward, learned: decision.learn_reason ? 'yes' : 'no'
    });
  }

  // Build an auditable provenance record for a representative final decision.
  const lastReq = REQUESTS[REQUESTS.length - 1];
  const { conf: lastConf } = await scoreLegitimacy(kernel, lastReq);
  const { decision: finalDecision } = await decideOnce(kernel, store, lastConf);
  const ast = { agents: [{ goal: `Triage refund requests; approve when confidence ≥ ${BASE_THRESHOLD} (calibrated by experience)`, policy: { require_citation: false } }] };
  const result = {
    success: true, blocked: false, program: 'RefundTriage',
    decisions: [finalDecision],
    canonicalActs: { acts: [{ step: 'issue_refund', action: 'issue_refund', channel: 'ledger', status: 'done', plugin: null }] },
    cognitive: { trace: [{ operation: 'decide', result: { confidence: lastConf } }] }
  };
  const provenance = buildProvenance(result, ast, {});

  return {
    rows, store, storePath: sp,
    summary: {
      rounds: REQUESTS.length,
      approved,
      llmScored,
      scorer: llmScored > 0 ? 'llm' : 'deterministic',
      learnedAvg: learnedReward / REQUESTS.length,
      baselineAvg: baselineReward / REQUESTS.length,
      approveMean: meanReward(store, KEY, 'approve'),
      escalateMean: meanReward(store, KEY, 'escalate'),
      finalThreshold: finalDecision.effective_threshold
    },
    provenance, finalDecision
  };
}

function bar(v, max = 1, width = 18) {
  const n = Math.max(0, Math.round((v / max) * width));
  return '█'.repeat(n) + '·'.repeat(width - n);
}

async function main() {
  const useLlm = process.argv.includes('--llm');
  const reportsDir = path.join(ROOT, 'artifacts', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const out = await runDemo({ storePath: path.join(reportsDir, 'refund-learning.store.json'), useLlm });

  const scorer = out.summary.scorer === 'llm'
    ? `\x1b[32mreal LLM\x1b[0m (Claude scored ${out.summary.llmScored}/${out.summary.rounds} requests)`
    : 'deterministic fallback (run with --llm for live Claude scoring)';
  console.log('\n\x1b[36m═══ Refund Triage — learning from real outcomes ═══\x1b[0m\n');
  console.log(`  risk perception: ${scorer}\n`);
  console.log('  rnd  request  conf   eff.thr  decision   outcome    reward  learned');
  console.log('  ' + '─'.repeat(68));
  for (const r of out.rows) {
    const dc = r.chosen === 'approve' ? '\x1b[32mapprove\x1b[0m ' : '\x1b[33mescalate\x1b[0m';
    const oc = r.outcome === 'FRAUD' ? '\x1b[31mFRAUD\x1b[0m  ' : r.outcome === 'legit' ? 'legit  ' : 'reviewed';
    console.log(`  ${String(r.round).padStart(3)}  ${r.id}  ${r.conf.toFixed(2)}   ${r.eff.toFixed(2)}     ${dc}  ${oc}   ${r.reward.toFixed(1)}     ${r.learned}`);
  }
  const s = out.summary;
  console.log('\n  \x1b[1mLearning outcome\x1b[0m');
  console.log(`    approve mean reward : ${s.approveMean?.toFixed(2)}   ${bar(s.approveMean)}`);
  console.log(`    escalate mean reward: ${s.escalateMean?.toFixed(2)}   ${bar(s.escalateMean)}`);
  console.log(`    effective threshold : ${BASE_THRESHOLD} → ${s.finalThreshold.toFixed(2)}  (calibrated within safe ±0.15 band)`);
  console.log(`    refunds auto-approved: ${s.approved}/${s.rounds}`);
  console.log('\n  \x1b[1mValue vs. fixed-threshold baseline (same request stream)\x1b[0m');
  console.log(`    baseline avg reward : ${s.baselineAvg.toFixed(3)}   ${bar(s.baselineAvg)}`);
  console.log(`    learned  avg reward : ${s.learnedAvg.toFixed(3)}   ${bar(s.learnedAvg)}`);
  const lift = ((s.learnedAvg - s.baselineAvg) / s.baselineAvg * 100);
  console.log(`    improvement         : \x1b[32m${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%\x1b[0m\n`);

  const html = renderHtml(out.provenance);
  const md = renderMarkdown(out.provenance);
  fs.writeFileSync(path.join(reportsDir, 'refund-decision.html'), html);
  fs.writeFileSync(path.join(reportsDir, 'refund-decision.md'), md);
  console.log(`  Auditable decision report → artifacts/reports/refund-decision.html`);
  console.log(`  Final decision now backed by experience: ${out.finalDecision.learn_reason || '(no history)'}\n`);
}

if (require.main === module) {
  main().catch((e) => { console.error(e.stack); process.exit(1); });
}

module.exports = { runDemo, REQUESTS, BASE_THRESHOLD };
