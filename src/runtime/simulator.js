const { executePlan } = require("./plan-executor");
const { applyLearning } = require("./learn-updater");
const { resolveAdaptiveProfile } = require("./adaptive-controller");
const { runActionStep } = require("./action-runner");
const { evaluateMetaPolicy } = require("./meta-rule-engine");
const { executeComputeKernel } = require("./compute-kernel");

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
}

function parseCsvEnv(value) {
  if (!value) {
    return null;
  }
  const items = String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return items.length > 0 ? items.join(",") : null;
}

function resolveRuntimePluginPolicy() {
  return {
    allowedPlugins: parseCsvEnv(process.env.NOEON_ALLOWED_PLUGINS),
    allowedActionTypes: parseCsvEnv(process.env.NOEON_ALLOWED_ACTION_TYPES),
    requireVersion: parseBooleanEnv(process.env.NOEON_REQUIRE_PLUGIN_VERSION, false),
    requireSignature: parseBooleanEnv(process.env.NOEON_REQUIRE_PLUGIN_SIGNATURE, false),
    signingKey: process.env.NOEON_PLUGIN_SIGNING_KEY || undefined
  };
}

function hardenByCompute(adaptiveProfile, learning) {
  const nextAdaptive = {
    ...(adaptiveProfile || {})
  };
  nextAdaptive.profileName = "compute-guarded";
  nextAdaptive.verificationMode = "manual";
  const latencyScale = Number(nextAdaptive.latencyScale || 1);
  nextAdaptive.latencyScale = Math.max(latencyScale, 1.1);

  const nextLearning = {
    ...(learning || {})
  };
  if (nextLearning.updates && typeof nextLearning.updates === "object") {
    if (nextLearning.updates.verify && typeof nextLearning.updates.verify === "object") {
      const currentChallenge = Number(nextLearning.updates.verify.challengeSeconds || 0);
      nextLearning.updates.verify.challengeSeconds = Math.max(900, currentChallenge);
    }
    if (
      nextLearning.updates.slash &&
      typeof nextLearning.updates.slash === "object" &&
      typeof nextLearning.updates.slash.malicious === "number"
    ) {
      nextLearning.updates.slash.malicious = Math.max(95, nextLearning.updates.slash.malicious);
    }
  }

  return {
    adaptiveProfile: nextAdaptive,
    learning: nextLearning
  };
}

function summarizeFailures(planTrace) {
  const summary = {
    totalFailed: 0,
    byCategory: {}
  };

  for (const step of planTrace.steps || []) {
    if (step.status !== "failed") {
      continue;
    }
    summary.totalFailed += 1;
    const key = step.failureCategory || "unknown_failure";
    summary.byCategory[key] = (summary.byCategory[key] || 0) + 1;
  }

  return summary;
}

function countStepsByStatus(planTrace, status) {
  return (planTrace.steps || []).filter((step) => step.status === status).length;
}

function summarizeCompute(compute) {
  const receipts = Array.isArray(compute?.receipts) ? compute.receipts : [];
  const callReceipts = receipts.filter((item) => item && item.kind === "CALL");
  const callTotal = callReceipts.length;
  const callFailed = callReceipts.filter((item) => item.status === "failed").length;
  const callSuccess = callTotal - callFailed;
  const callFailureRate = callTotal > 0 ? callFailed / callTotal : 0;

  return {
    receiptCount: receipts.length,
    diagnosticCount: Array.isArray(compute?.diagnostics) ? compute.diagnostics.length : 0,
    callTotal,
    callSuccess,
    callFailed,
    callFailureRate: Number(callFailureRate.toFixed(4))
  };
}

function evaluateNativeMind(compiled, planTrace, feedback) {
  const nativeAI = compiled.contract.cognition.nativeAI || {
    mode: "hybrid",
    autonomy: "native",
    reflection: "adaptive",
    selfCheck: true
  };
  const selfCheck = compiled.contract.cognition.selfCheck || {
    metric: "uncertainty",
    threshold: 0.35,
    action: "escalate"
  };
  const infer = compiled.contract.cognition.infer || {
    strategy: "hybrid",
    depth: 4,
    diversity: 3
  };
  const critic = compiled.contract.cognition.critic || {
    mode: "self",
    strictness: 3,
    veto: false
  };
  const hypotheses = Array.isArray(compiled.contract.cognition.hypotheses)
    ? compiled.contract.cognition.hypotheses
    : [];
  const evidences = Array.isArray(compiled.contract.cognition.evidences)
    ? compiled.contract.cognition.evidences
    : [];
  const counterexamples = Array.isArray(compiled.contract.cognition.counterexamples)
    ? compiled.contract.cognition.counterexamples
    : [];
  const traces = Array.isArray(compiled.contract.cognition.traces)
    ? compiled.contract.cognition.traces
    : [];
  const debate =
    compiled.contract.cognition.debate ||
    ({ topic: "default", sides: 2, rounds: 2, protocol: "adversarial" });
  const arbitration =
    compiled.contract.cognition.arbitration ||
    ({ mode: "threshold", accept: 0.68, revise: 0.48, fallback: "escalate" });
  const jurors = Array.isArray(compiled.contract.cognition.jurors)
    ? compiled.contract.cognition.jurors
    : [];

  const totalSteps = Math.max(1, (planTrace.steps || []).length);
  const doneCount = countStepsByStatus(planTrace, "done");
  const failedCount = countStepsByStatus(planTrace, "failed");
  const completionRate = doneCount / totalSteps;
  const failureRate = failedCount / totalSteps;

  const externalUncertainty = Number(feedback?.uncertainty || 0);
  const riskLevel = String(compiled.contract.cognition.risk?.level || "medium").toLowerCase();
  const riskPenalty = riskLevel === "critical" ? 0.2 : riskLevel === "high" ? 0.12 : 0.05;
  const strategyBoost =
    infer.strategy === "hybrid" ? 0.05 : infer.strategy === "abductive" ? 0.035 : 0.02;
  const depthBoost = Math.min(8, infer.depth) * 0.01;
  const diversityBoost = Math.min(5, infer.diversity) * 0.008;
  const inferBoost = strategyBoost + depthBoost + diversityBoost;

  const hypothesisCoverage = Math.min(1, hypotheses.length / 3);
  const hypothesisConfidence =
    hypotheses.length > 0
      ? hypotheses.reduce((acc, h) => acc + Number(h.confidence || 0), 0) / hypotheses.length
      : 0;

  const qualityWeight = {
    low: 0.3,
    medium: 0.6,
    high: 1
  };
  const evidenceStrength =
    evidences.length > 0
      ? evidences.reduce(
          (acc, e) => acc + Number(e.weight || 0) * (qualityWeight[e.quality] || 0.5),
          0
        ) / evidences.length
      : 0;

  const severityWeight = {
    low: 0.35,
    medium: 0.65,
    high: 1
  };
  const counterexamplePressure =
    counterexamples.length > 0
      ? counterexamples.reduce(
          (acc, c) => acc + Number(c.weight || 0) * (severityWeight[c.severity] || 0.6),
          0
        ) / counterexamples.length
      : 0;

  const planNodes = new Set();
  for (const edge of compiled.contract.cognition.plan || []) {
    planNodes.add(edge.from);
    planNodes.add(edge.to);
  }
  const traceStepSet = new Set(traces.map((t) => t.step));
  const traceCoverage = planNodes.size > 0 ? Math.min(1, traceStepSet.size / planNodes.size) : 0;

  const hypothesisIds = new Set(hypotheses.map((h) => h.id));
  const evidenceIds = new Set(evidences.map((e) => e.source));
  const counterexampleIds = new Set(counterexamples.map((c) => c.id));
  const traceConsistency =
    traces.length > 0
      ? traces.reduce((acc, t) => {
          const hOK = !t.hypothesis || hypothesisIds.has(t.hypothesis);
          const eOK = !t.evidence || evidenceIds.has(t.evidence);
          const cOK = !t.counterexample || counterexampleIds.has(t.counterexample);
          return acc + (hOK && eOK && cOK ? 1 : 0);
        }, 0) / traces.length
      : 0;

  const baseConsensus = debate.protocol === "consensus" ? 0.72 : debate.protocol === "socratic" ? 0.64 : 0.56;
  const sidePenalty = Math.max(0, debate.sides - 2) * 0.035;
  const roundBoost = Math.min(7, debate.rounds) * 0.018;
  const debateConsensus = Math.max(
    0,
    Math.min(1, Number(feedback?.debateConsensus ?? baseConsensus - sidePenalty + roundBoost))
  );
  const debateFriction = Math.max(0, Math.min(1, 1 - debateConsensus));

  const hypothesisBoost = hypothesisCoverage * 0.05 + hypothesisConfidence * 0.04;
  const evidenceBoost = evidenceStrength * 0.08;
  const counterexamplePenalty = counterexamplePressure * 0.12;
  const traceBoost = traceCoverage * 0.05 + traceConsistency * 0.04;

  const criticPenalty = critic.mode === "none" ? 0 : critic.strictness * 0.02;
  const uncertainty = Math.max(
    0,
    Math.min(
      1,
      failureRate +
        riskPenalty +
        externalUncertainty +
        criticPenalty +
        counterexamplePressure * 0.15 -
        evidenceStrength * 0.12 -
        traceConsistency * 0.06 +
        debateFriction * 0.08
    )
  );
  const confidence = Math.max(
    0,
    Math.min(
      1,
      completionRate +
        inferBoost +
        hypothesisBoost +
        evidenceBoost -
        counterexamplePenalty -
        traceBoost +
        debateConsensus * 0.05 -
        uncertainty * 0.5
    )
  );

  const reflectionTriggered =
    nativeAI.reflection === "on" ||
    (nativeAI.reflection === "adaptive" && uncertainty >= selfCheck.threshold * 0.8);

  let decision = "continue";
  if (nativeAI.selfCheck && uncertainty >= selfCheck.threshold) {
    decision = selfCheck.action;
  }
  if (critic.mode !== "none" && critic.veto && uncertainty >= selfCheck.threshold * 0.9) {
    decision = "halt";
  }
  if (counterexamplePressure >= 0.7 && decision === "continue") {
    decision = "retry";
  }
  if (traceCoverage < 0.4 && decision === "continue") {
    decision = "retry";
  }
  if (debateConsensus < 0.45 && decision === "continue") {
    decision = "retry";
  }

  let verdict = arbitration.fallback;
  let juryScore = null;
  let juryWeightsUsed = null;
  if (arbitration.mode === "threshold") {
    if (debateConsensus >= arbitration.accept && uncertainty < selfCheck.threshold) {
      verdict = "accept";
    } else if (debateConsensus >= arbitration.revise) {
      verdict = "revise";
    } else if (critic.veto && uncertainty >= selfCheck.threshold * 0.9) {
      verdict = "reject";
    }
  } else {
    const votes = feedback?.juryVotes && typeof feedback.juryVotes === "object" ? feedback.juryVotes : {};
    const totalWeight = jurors.reduce((acc, j) => acc + Number(j.weight || 0), 0) || 1;
    const weightedConsensus =
      jurors.length > 0
        ? jurors.reduce((acc, j) => {
            const vote = Number(votes[j.id]);
            const normalizedVote = Number.isFinite(vote)
              ? Math.max(0, Math.min(1, vote))
              : debateConsensus;
            return acc + normalizedVote * Number(j.weight || 0);
          }, 0) / totalWeight
        : debateConsensus;

    juryScore = weightedConsensus - uncertainty * 0.6 - counterexamplePressure * 0.3;
    juryWeightsUsed = jurors.length;

    if (juryScore >= arbitration.accept) {
      verdict = "accept";
    } else if (juryScore >= arbitration.revise) {
      verdict = "revise";
    } else {
      verdict = critic.veto ? "reject" : arbitration.fallback;
    }
  }

  return {
    mode: nativeAI.mode,
    autonomy: nativeAI.autonomy,
    reflection: nativeAI.reflection,
    selfCheck,
    infer,
    critic,
    hypotheses,
    evidences,
    counterexamples,
    traces,
    debate,
    arbitration,
    jurors,
    inferred: {
      confidence: Number(confidence.toFixed(4)),
      uncertainty: Number(uncertainty.toFixed(4)),
      completionRate: Number(completionRate.toFixed(4)),
      inferBoost: Number(inferBoost.toFixed(4)),
      criticPenalty: Number(criticPenalty.toFixed(4)),
      hypothesisCoverage: Number(hypothesisCoverage.toFixed(4)),
      hypothesisConfidence: Number(hypothesisConfidence.toFixed(4)),
      evidenceStrength: Number(evidenceStrength.toFixed(4)),
      counterexamplePressure: Number(counterexamplePressure.toFixed(4)),
      traceCoverage: Number(traceCoverage.toFixed(4)),
      traceConsistency: Number(traceConsistency.toFixed(4)),
      debateConsensus: Number(debateConsensus.toFixed(4)),
      debateFriction: Number(debateFriction.toFixed(4)),
      juryScore: juryScore === null ? null : Number(juryScore.toFixed(4)),
      juryWeightsUsed,
      reflectionTriggered,
      decision,
      verdict
    }
  };
}

function runSuperBrainCycle(compiled, feedback) {
  const adaptive = resolveAdaptiveProfile(compiled, feedback || {});
  const preMetaPolicy = evaluateMetaPolicy({
    compiled,
    feedback: feedback || {},
    adaptiveProfile: adaptive,
    learning: null
  });
  const effectiveAdaptive = preMetaPolicy.adaptiveProfile || adaptive;
  const pluginPolicy = resolveRuntimePluginPolicy();
  const compute = executeComputeKernel(compiled, feedback || {}, {
    runActionStep,
    network: compiled.contract.network,
    task: compiled.contract.task,
    adaptiveProfile: effectiveAdaptive,
    pluginPolicy
  });
  const computeSummary = summarizeCompute(compute);
  const computeForPolicy = {
    ...compute,
    summary: computeSummary
  };

  const planTrace = executePlan(compiled.contract.cognition.plan || [], {
    failedSteps: feedback?.failedSteps,
    stepLatencyMs: feedback?.stepLatencyMs,
    maxSteps: effectiveAdaptive.maxPlanSteps,
    stepEvaluator: (stepName) =>
      runActionStep(stepName, {
        network: compiled.contract.network,
        task: compiled.contract.task,
        feedback,
        adaptiveProfile: effectiveAdaptive,
        actionBindings: compiled.contract.cognition.actions || {},
        pluginPolicy
      })
  });
  const learning = applyLearning(compiled, feedback || {});
  const postMetaPolicy = evaluateMetaPolicy({
    compiled,
    feedback: feedback || {},
    adaptiveProfile: effectiveAdaptive,
    learning,
    compute: computeForPolicy
  });
  const computeBlockingDiagnostics = (compute.diagnostics || []).filter(
    (item) => item && item.level === "error"
  );
  const computeViolations = computeBlockingDiagnostics.map((item) => ({
    kind: "compute",
    level: "error",
    path: "runtime.compute.diagnostics",
    expected: "no compute error diagnostics",
    actual: item.code || "unknown",
    message: `[compute-guard] ${item.code || "COMPUTE_ERROR"}: ${item.message || "compute diagnostic"}`
  }));

  const hardenedByCompute = computeBlockingDiagnostics.length > 0;
  const hardenedPolicy = postMetaPolicy.hardened || hardenedByCompute;
  const computeHardening = hardenedByCompute
    ? hardenByCompute(postMetaPolicy.adaptiveProfile || effectiveAdaptive, postMetaPolicy.learning || learning)
    : null;

  const effectiveAdaptiveProfile = computeHardening
    ? computeHardening.adaptiveProfile
    : (postMetaPolicy.adaptiveProfile || effectiveAdaptive);
  const effectiveLearning = computeHardening
    ? computeHardening.learning
    : (postMetaPolicy.learning || learning);
  const failureSummary = summarizeFailures(planTrace);
  const nativeMind = evaluateNativeMind(compiled, planTrace, feedback || {});

  return {
    cycleAt: new Date().toISOString(),
    contract: {
      network: compiled.contract.network,
      task: compiled.contract.task,
      goal: compiled.contract.cognition.goal
    },
    cognition: {
      memory: compiled.contract.cognition.memory,
      learningSignal: compiled.contract.cognition.learn.signal,
      executionProfile: effectiveAdaptiveProfile,
      planTrace,
      nativeMind,
      metaPolicy: {
        enabled: postMetaPolicy.enabled,
        profile: postMetaPolicy.profile || null,
        totalRules: postMetaPolicy.totalRules,
        hardened: hardenedPolicy,
        violations: (postMetaPolicy.violations || []).concat(computeViolations)
      }
    },
    adaptation: effectiveLearning,
    execution: {
      compute: {
        result: compute.result,
        env: compute.env,
        diagnostics: compute.diagnostics,
        receipts: compute.receipts,
        summary: computeSummary
      },
      failureSummary,
      recommendation: nativeMind.inferred.verdict,
      controlDecision: nativeMind.inferred.decision
    }
  };
}

module.exports = {
  runSuperBrainCycle
};
