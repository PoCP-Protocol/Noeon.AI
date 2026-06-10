'use strict';

/**
 * End-to-end: the refund-triage agent learns from real outcomes, improves over a
 * fixed-threshold baseline, stays safe (fraud escalated), and emits a verifiable
 * provenance report. Guards the capstone demo against regression.
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runDemo, BASE_THRESHOLD } = require('../examples/demos/refund-triage-demo');
const { verifyProvenance } = require('../src/runtime/provenance');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

(async () => {
  console.log('\n\x1b[36m═══ Refund Triage E2E ═══\x1b[0m\n');
  const sp = path.join(os.tmpdir(), `noeon-refund-test-${process.pid}.json`);
  const out = await runDemo({ storePath: sp });
  const s = out.summary;

  assert(s.approveMean > s.escalateMean, 'learned that approving this stream beats escalating');
  assert(s.finalThreshold < BASE_THRESHOLD, 'threshold calibrated downward from experience');
  assert(s.finalThreshold >= BASE_THRESHOLD - 0.15 - 1e-9, 'calibration stayed within the safe ±0.15 band');
  assert(s.learnedAvg >= s.baselineAvg, 'learned policy is at least as good as the fixed baseline');
  assert(s.learnedAvg > s.baselineAvg, 'learned policy strictly improves average reward');

  // Safety: the single fraud request (low confidence) is escalated, not approved.
  const fraudRow = out.rows.find((r) => r.outcome === 'FRAUD');
  assert(!fraudRow, 'no fraud was auto-approved (low-confidence fraud stayed escalated)');

  // Persistence + auditability.
  assert(fs.existsSync(sp), 'learning store persisted to disk');
  assert(verifyProvenance(out.provenance).valid === true, 'final decision provenance seal verifies');
  assert(/learned\(/.test(out.finalDecision.learn_reason || ''), 'final decision is backed by learned experience');

  try { fs.unlinkSync(sp); } catch {}
  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
