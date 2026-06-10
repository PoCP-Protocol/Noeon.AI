'use strict';

/**
 * Learning store — a persistent contextual bandit.
 *
 * This is Noeon's honest cross-run learning substrate: the system records the
 * real outcome (reward) of each decision it makes, keyed by decision context +
 * chosen option, and persists it. On later runs DECIDE consults the store to
 * prefer higher-reward options — so the program demonstrably gets better with
 * experience, and the improvement is measurable and saved to disk.
 *
 * It is NOT a fabricated "the AI learned" claim: behavior changes only because
 * real recorded outcomes accumulate. With no history it is a no-op.
 *
 * Strategy: explore each option once (deterministic, in declared order), then
 * exploit the option with the best mean reward.
 */

const fs = require('fs');
const path = require('path');

function loadLearningStore(filePath) {
  const store = { path: filePath || null, data: {}, dirty: false };
  if (filePath && fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object') store.data = parsed.policies || parsed;
    } catch { /* corrupt store → start fresh */ }
  }
  return store;
}

function tableFor(store, key) {
  const k = String(key);
  store.data[k] = store.data[k] || {};
  return store.data[k];
}

/** Record the observed reward for choosing `option` in context `key`. */
function recordOutcome(store, key, option, reward) {
  if (key == null || option == null) return;
  const tbl = tableFor(store, key);
  const o = String(option);
  const e = tbl[o] || { reward: 0, count: 0 };
  e.reward += Number(reward) || 0;
  e.count += 1;
  e.mean = e.reward / e.count;
  tbl[o] = e;
  store.dirty = true;
}

function meanReward(store, key, option) {
  const e = store.data?.[String(key)]?.[String(option)];
  return e && e.count > 0 ? e.reward / e.count : null;
}

function sampleCount(store, key, option) {
  const e = store.data?.[String(key)]?.[String(option)];
  return e ? e.count : 0;
}

/**
 * Choose among `options` for context `key`:
 *   { option, reason: 'explore'|'exploit'|'default', mean }
 * explore → first option with no recorded outcome (deterministic order);
 * exploit → highest mean reward; default → no learning data / single option.
 */
function preferred(store, key, options) {
  if (!Array.isArray(options) || options.length === 0) return null;
  const tbl = store.data?.[String(key)] || {};
  for (const o of options) {
    const e = tbl[String(o)];
    if (!e || e.count === 0) return { option: o, reason: 'explore', mean: null };
  }
  let best = options[0];
  let bestMean = -Infinity;
  for (const o of options) {
    const m = meanReward(store, key, o);
    if (m != null && m > bestMean) { bestMean = m; best = o; }
  }
  return { option: best, reason: 'exploit', mean: bestMean };
}

function saveLearningStore(store) {
  if (!store || !store.path) return false;
  fs.mkdirSync(path.dirname(store.path), { recursive: true });
  fs.writeFileSync(store.path, JSON.stringify({ schema: 'noeon.learning/v1', policies: store.data }, null, 2), 'utf8');
  store.dirty = false;
  return true;
}

function policyStats(store, key) {
  return store.data?.[String(key)] || {};
}

module.exports = {
  loadLearningStore, recordOutcome, meanReward, sampleCount, preferred, saveLearningStore, policyStats
};
