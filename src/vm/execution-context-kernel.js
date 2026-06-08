'use strict';

const {
  toNumber,
  evaluateExpr,
  evaluateRituals,
  resolveRitualGovernance,
  evaluateConstitutions,
  planActsWithRituals
} = require('./governance-kernel');

function buildFeedbackEnv(feedback = {}) {
  return {
    ...(feedback.facts || {}),
    projected_spend: toNumber(feedback.projected_spend ?? feedback.facts?.projected_spend),
    approved_budget: toNumber(feedback.approved_budget ?? feedback.facts?.approved_budget),
    portfolio_risk: toNumber(feedback.portfolio_risk ?? feedback.facts?.portfolio_risk),
    carbon_intensity: toNumber(feedback.carbon_intensity ?? feedback.facts?.carbon_intensity),
    warehouse_utilization: toNumber(feedback.warehouse_utilization ?? feedback.facts?.warehouse_utilization),
    policy: {
      max_risk: toNumber(feedback.policy?.max_risk ?? feedback.facts?.policy?.max_risk),
      max_carbon: toNumber(feedback.policy?.max_carbon ?? feedback.facts?.policy?.max_carbon)
    }
  };
}

function evaluateGuarantees(next, env) {
  return (next.guarantees || []).map((g) => {
    const evalResult = evaluateExpr(g.expr, env);
    return { name: g.name || 'guarantee', expr: g.expr, ...evalResult };
  });
}

function evaluateVows(next, env) {
  return (next.vows || []).map((v) => {
    const evalResult = evaluateExpr(v.expr, env);
    return {
      name: v.name || 'vow',
      expr: v.expr,
      level: String(v.level || 'soft').toLowerCase(),
      ...evalResult
    };
  });
}

function buildExecutionContext(next, feedback, inputMemory) {
  const env = buildFeedbackEnv(feedback || {});
  const guarantees = evaluateGuarantees(next, env);
  const vows = evaluateVows(next, env);
  const constitutions = evaluateConstitutions(next.constitutions || [], env);

  const ritualGovernance = resolveRitualGovernance(evaluateRituals(next.rituals || [], env, inputMemory));
  const rituals = ritualGovernance.rituals;
  const ritualConflicts = ritualGovernance.conflicts;
  const actsPlanned = planActsWithRituals(next.acts || [], rituals, constitutions);

  const hasUnknownGuarantee = guarantees.some((g) => g.status === 'unknown');
  const hasHardVowUnknown = vows.some((v) => v.level === 'hard' && v.status === 'unknown');
  const hasHardConstitutionUnknown = constitutions.some((c) => c.level === 'hard' && c.status === 'unknown');
  const goalPriority = toNumber(next.goal?.priority) ?? 0.7;

  return {
    env,
    guarantees,
    vows,
    constitutions,
    rituals,
    ritualConflicts,
    actsPlanned,
    hasUnknownGuarantee,
    hasHardVowUnknown,
    hasHardConstitutionUnknown,
    goalPriority
  };
}

module.exports = {
  buildFeedbackEnv,
  evaluateGuarantees,
  evaluateVows,
  buildExecutionContext
};
