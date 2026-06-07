const { runSuperBrainCycle } = require("./simulator");
const { buildConvergenceSeries } = require("./convergence-series");

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function applyPolicyToCompiled(compiled, policy) {
  if (!policy) {
    return compiled;
  }
  const next = clone(compiled);
  if (policy.verify) {
    next.contract.verify = {
      ...next.contract.verify,
      ...policy.verify
    };
  }
  if (policy.slash) {
    next.contract.settlement.slash = {
      ...next.contract.settlement.slash,
      ...policy.slash
    };
  }
  return next;
}

function runTraining(compiled, feedbackBatch) {
  const rounds = [];
  let working = clone(compiled);
  let lastPolicy = null;

  for (let i = 0; i < feedbackBatch.length; i += 1) {
    const feedback = feedbackBatch[i] || {};
    working = applyPolicyToCompiled(working, lastPolicy);
    const cycle = runSuperBrainCycle(working, feedback);

    lastPolicy = cycle.adaptation.updates;
    rounds.push({
      round: i + 1,
      feedback,
      diagnostics: cycle.adaptation.diagnostics,
      policy: cycle.adaptation.updates,
      plan: {
        complete: cycle.cognition.planTrace.complete,
        haltedReason: cycle.cognition.planTrace.haltedReason || null,
        visitedCount: cycle.cognition.planTrace.visitedCount,
        totalNodes: cycle.cognition.planTrace.totalNodes
      }
    });
  }

  return {
    trainedAt: new Date().toISOString(),
    rounds,
    finalPolicy: lastPolicy,
    totalRounds: rounds.length,
    convergence: buildConvergenceSeries({ rounds })
  };
}

module.exports = {
  runTraining
};
