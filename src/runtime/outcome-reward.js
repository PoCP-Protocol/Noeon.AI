'use strict';

/**
 * Outcome reward — derive a learning signal from a run's REAL results.
 *
 * Instead of a hand-fed payoff, the system learns from what actually happened:
 * did the ACTs succeed, did VALIDATE pass, were there errors. This lets an agent
 * improve during normal operation with no manufactured feedback.
 *
 * Pure: maps observed outcomes to a reward in [0, 1] (higher = better). Returns
 * null when there is no outcome signal at all — we never invent a reward.
 */

const SUCCESS_STATUSES = new Set(['done', 'ok', 'success', 'sim', 'simulated', 'completed']);

function outcomeReward({ actStatuses = [], validationPassed = null, errorCount = 0 } = {}) {
  const signals = [];

  if (Array.isArray(actStatuses) && actStatuses.length) {
    const ok = actStatuses.filter((s) => SUCCESS_STATUSES.has(String(s).toLowerCase())).length;
    signals.push(ok / actStatuses.length);
  }
  if (typeof validationPassed === 'boolean') {
    signals.push(validationPassed ? 1 : 0);
  }
  if (errorCount > 0) {
    signals.push(0); // any runtime error is a poor outcome
  }

  if (!signals.length) return null;
  return signals.reduce((a, b) => a + b, 0) / signals.length;
}

/** Build the outcome view from a kernel ExecutionContext and score it. */
function outcomeRewardFromContext(ctx) {
  const acts = Object.values(ctx.results || {})
    .filter((r) => r && typeof r === 'object' && r.status != null)
    .map((r) => r.status);
  const val = ctx.getFromWorkspace ? ctx.getFromWorkspace('validation') : null;
  return outcomeReward({
    actStatuses: acts,
    validationPassed: val && typeof val.passed === 'boolean' ? val.passed : null,
    errorCount: (ctx.errors || []).length
  });
}

/**
 * Attribute a run's real outcome to the decision it made, into the learning
 * store, and persist — unless an explicit LEARN already settled it. Returns the
 * recorded {key, option, reward} or null when there is nothing to attribute.
 */
function attributeRunOutcome(ctx) {
  if (!ctx || !ctx.learning) return null;
  if (ctx.lastDecisionKey == null || ctx.lastChosen == null || ctx.learningRecorded) return null;
  const reward = outcomeRewardFromContext(ctx);
  if (reward == null) return null;
  const { saveLearningStore, recordOutcome } = require('./learning-store');
  if (ctx.lastContextual) {
    const { recordContextual } = require('./threshold-learner');
    recordContextual(ctx.learning, ctx.lastDecisionKey, ctx.lastConf, ctx.lastChosen, reward, { approve: ctx.lastApproveOption });
  } else {
    recordOutcome(ctx.learning, ctx.lastDecisionKey, ctx.lastChosen, reward);
  }
  saveLearningStore(ctx.learning);
  ctx.learningRecorded = true;
  const learned = { key: ctx.lastDecisionKey, option: ctx.lastChosen, reward };
  ctx.autoLearned = learned;
  return learned;
}

module.exports = { outcomeReward, outcomeRewardFromContext, attributeRunOutcome, SUCCESS_STATUSES };
