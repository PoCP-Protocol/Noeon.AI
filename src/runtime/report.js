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

  const next = cycle.next || null;
  const ritualSummary = (next?.reflection?.insights || []).find((x) => x.type === 'ritual-summary') || null;
  const constitutionSummary = (next?.reflection?.insights || []).find((x) => x.type === 'constitution-summary') || null;
  if (next) {
    if (next.blocked) {
      recommendations.push(`Next gate blocked execution (${next.blockReason || 'unknown'}); apply lower-risk strategy and rerun.`);
    }
    if (next.reflection?.verdict === 'needs-observability') {
      recommendations.push('Next reflection requires observability; add telemetry signals for missing operands.');
    }
    if (next.evolution?.applied?.changed) {
      recommendations.push(`Next evolution applied mutation: ${next.evolution.applied.mutation}`);
    }
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
    next: next
      ? {
          profile: 'next',
          blocked: next.blocked === true,
          blockReason: next.blockReason || null,
          selectedStrategy: next.selectedStrategy
            ? {
                name: next.selectedStrategy.name || next.selectedStrategy.objective || 'strategy',
                risk: next.selectedStrategy.risk || 'medium',
                utility: next.selectedStrategy.utility ?? null,
                memoryBias: next.selectedStrategy.memoryBias ?? 0
              }
            : null,
          reflectionVerdict: next.reflection?.verdict || null,
          guaranteeSummary: next.reflection?.summary || null,
          ritualSummary: ritualSummary
            ? {
                active: ritualSummary.active || 0,
                deferred: ritualSummary.deferred || 0,
                suspended: ritualSummary.suspended || 0,
                unknown: ritualSummary.unknown || 0,
                overridden: ritualSummary.overridden || 0,
                dependencyBlocked: ritualSummary.dependencyBlocked || 0
              }
            : null,
          constitutionSummary: constitutionSummary
            ? {
                passed: constitutionSummary.passed || 0,
                failed: constitutionSummary.failed || 0,
                unknown: constitutionSummary.unknown || 0,
                hardFailed: constitutionSummary.hardFailed || 0
              }
            : null,
          evolution: {
            proposalCount: next.evolution?.count || 0,
            selectedKind: next.evolution?.selected?.kind || null,
            applied: next.evolution?.applied || null
          },
          governance: next.governance
            ? {
                winner: next.governance.winner || 'none',
                blocked: next.governance.blocked === true,
                blockReason: next.governance.blockReason || null,
                detail: next.governance.detail || null,
                conflictCount: Number(next.governance.conflictCount || 0),
                precedence: Array.isArray(next.governance.precedence) ? next.governance.precedence : []
              }
            : null,
          memory: {
            source: next.memorySource || 'unknown',
            runCount: next.nextMemory?.runCount || 0,
            lastSelected: next.nextMemory?.lastSelected || null,
            trackedStrategies: Object.keys(next.nextMemory?.strategyStats || {}).length,
            trackedRituals: Object.keys(next.nextMemory?.ritualStats || {}).length
          }
        }
      : null,
    recommendations
  };
}

module.exports = {
  generateReport
};
