'use strict';

/**
 * Contextual threshold learner — a per-confidence-bucket bandit that fixes the
 * one-directional flaw of the global reward-mean nudge (see
 * examples/demos/learning-robustness-experiment.js).
 *
 * Instead of "approve more if approving is good on average" (which is inflated
 * by easy high-confidence wins and only relaxes over-caution), it estimates the
 * MARGINAL value of approving at each confidence level and acts per bucket:
 *
 *   - exploit:  bucket has enough data → approve iff its mean approve-reward
 *               beats the escalate baseline (so a bucket that turns out to be
 *               fraud is dropped — corrects over-AGGRESSION too).
 *   - explore:  bucket is unknown but within the safe ±margin band around the
 *               configured threshold → approve once to learn (bounded risk,
 *               never far below the configured threshold).
 *   - default:  bucket far from the configured threshold → the plain confidence
 *               gate (far-below → escalate; far-above → approve).
 *
 * It converges to the true optimal threshold from above OR below, and does not
 * drift off a correctly-configured threshold.
 */

const { meanReward, sampleCount, recordOutcome } = require('./learning-store');

const BUCKET = 0.05;
function bucketKey(conf) {
  return (Math.round(conf / BUCKET) * BUCKET).toFixed(2);
}
function approveKey(key) { return `${key}#a`; }

/**
 * Decide approve vs fallback for one request using contextual learning.
 * @returns { chosen, reason, bucket, escalateRef }
 */
function contextualDecision(store, key, conf, base, opts = {}) {
  const margin = opts.margin ?? 0.15;
  const minSamples = opts.minSamples ?? 1;
  const escalateRef = meanReward(store, key, 'escalate') ?? (opts.escalateRef ?? 0.6);
  const fallback = opts.fallback || 'escalate';
  const approve = opts.approve || 'approve';

  const b = bucketKey(conf);
  const q = meanReward(store, approveKey(key), b);
  const n = sampleCount(store, approveKey(key), b);
  const lo = base - margin;
  const hi = base + margin;

  if (q != null && n >= minSamples) {
    return { chosen: q >= escalateRef ? approve : fallback, reason: `exploit(q=${q.toFixed(2)}≷${escalateRef.toFixed(2)})`, bucket: b, escalateRef };
  }
  if (conf >= lo - 1e-9 && conf <= hi + 1e-9) {
    return { chosen: approve, reason: `explore(${b})`, bucket: b, escalateRef };
  }
  return { chosen: conf >= base ? approve : fallback, reason: 'default-gate', bucket: b, escalateRef };
}

/** Record the observed reward for a contextual decision. */
function recordContextual(store, key, conf, chosen, reward, opts = {}) {
  const approve = opts.approve || 'approve';
  if (chosen === approve) recordOutcome(store, approveKey(key), bucketKey(conf), reward);
  else recordOutcome(store, key, chosen, reward);
}

/** The threshold the learner has effectively converged to (lowest approving bucket). */
function learnedThreshold(store, key, base, opts = {}) {
  const escalateRef = meanReward(store, key, 'escalate') ?? (opts.escalateRef ?? 0.6);
  const tbl = store.data?.[approveKey(key)] || {};
  let lowest = null;
  for (const b of Object.keys(tbl)) {
    const e = tbl[b];
    if (e.count > 0 && (e.reward / e.count) >= escalateRef) {
      const v = parseFloat(b);
      if (lowest == null || v < lowest) lowest = v;
    }
  }
  return lowest == null ? base : lowest;
}

module.exports = { contextualDecision, recordContextual, learnedThreshold, bucketKey, approveKey, BUCKET };
