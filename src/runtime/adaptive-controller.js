function resolveAdaptiveProfile(compiled, feedback = {}) {
  const riskLevel = compiled.contract?.cognition?.risk?.level || "medium";
  const verifyMode = compiled.contract?.verify?.mode || "auto";

  const base = {
    riskLevel,
    profileName: "balanced",
    maxPlanSteps: null,
    verificationMode: verifyMode,
    latencyScale: 1
  };

  if (riskLevel === "low") {
    base.profileName = "fast-path";
    base.maxPlanSteps = 3;
    base.verificationMode = "auto";
    base.latencyScale = 0.9;
  } else if (riskLevel === "medium") {
    base.profileName = "balanced";
    base.maxPlanSteps = 5;
    base.verificationMode = verifyMode;
    base.latencyScale = 1;
  } else if (riskLevel === "high") {
    base.profileName = "careful";
    base.maxPlanSteps = null;
    base.verificationMode = "manual";
    base.latencyScale = 1.1;
  } else {
    base.profileName = "strict";
    base.maxPlanSteps = null;
    base.verificationMode = "manual";
    base.latencyScale = 1.2;
  }

  if (typeof feedback.maxPlanSteps === "number" && feedback.maxPlanSteps > 0) {
    base.maxPlanSteps = Math.floor(feedback.maxPlanSteps);
  }

  return base;
}

module.exports = {
  resolveAdaptiveProfile
};
