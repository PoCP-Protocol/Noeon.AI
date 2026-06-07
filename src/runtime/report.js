function buildKpis(cycle, state) {
  const planTrace = cycle.cognition.planTrace;
  const completed = planTrace.steps.filter((s) => s.status === "done").length;
  const failed = planTrace.steps.filter((s) => s.status === "failed").length;
  const totalLatency = planTrace.steps.reduce((acc, s) => acc + s.latencyMs, 0);

  return {
    planCompletionRate:
      planTrace.totalNodes > 0 ? Number((completed / planTrace.totalNodes).toFixed(4)) : 0,
    failedSteps: failed,
    totalLatencyMs: totalLatency,
    policyRounds: Array.isArray(state?.rounds) ? state.rounds.length : 0
  };
}

function generateReport(cycle, state) {
  const kpis = buildKpis(cycle, state);
  const metaPolicy = cycle.cognition?.metaPolicy || {
    enabled: false,
    hardened: false,
    violations: []
  };
  const topMetaMessages = (metaPolicy.violations || []).slice(0, 3).map((v) => v.message);

  const recommendations = [
    kpis.failedSteps > 0
      ? "Increase validation depth and inspect failed plan step traces."
      : "Plan execution is stable; keep current validation profile.",
    kpis.totalLatencyMs > 3000
      ? "Consider lowering reasoning depth or increasing solver parallelism."
      : "Latency is within expected range."
  ];

  if (metaPolicy.enabled && metaPolicy.hardened) {
    recommendations.push("Meta policy hardening was triggered; review blocking meta-rule violations.");
  }
  for (const msg of topMetaMessages) {
    recommendations.push(`Meta-rule: ${msg}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    title: "Noeon Super Brain Cycle Report",
    task: cycle.contract.task,
    goal: cycle.contract.goal,
    kpis,
    policyDelta: cycle.adaptation.diagnostics,
    metaPolicy: {
      enabled: metaPolicy.enabled,
      hardened: metaPolicy.hardened,
      violationCount: Array.isArray(metaPolicy.violations) ? metaPolicy.violations.length : 0
    },
    recommendations
  };
}

module.exports = {
  generateReport
};
