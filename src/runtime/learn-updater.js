function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toFraction(quorum) {
  if (!quorum || !quorum.denominator) {
    return 2 / 3;
  }
  return quorum.numerator / quorum.denominator;
}

function fractionToQuorum(value) {
  if (value >= 0.75) {
    return { numerator: 3, denominator: 4 };
  }
  if (value >= 2 / 3) {
    return { numerator: 2, denominator: 3 };
  }
  if (value >= 0.6) {
    return { numerator: 3, denominator: 5 };
  }
  return { numerator: 1, denominator: 2 };
}

function applyLearning(compiled, feedback) {
  const verify = compiled.contract?.verify || {
    quorum: { numerator: 2, denominator: 3 },
    challengeSeconds: 600
  };
  const slash = compiled.contract?.settlement?.slash || { malicious: 90 };
  const learn = compiled.contract?.cognition?.learn || { signal: 'reward', rate: 0.1 };

  const successRate = typeof feedback.successRate === "number" ? feedback.successRate : 0.8;
  const disputeRate = typeof feedback.disputeRate === "number" ? feedback.disputeRate : 0.1;
  const maliciousRate = typeof feedback.maliciousRate === "number" ? feedback.maliciousRate : 0.02;
  const observedLatencyMs =
    typeof feedback.observedLatencyMs === "number" ? feedback.observedLatencyMs : 4000;

  const currentQuorum = toFraction(verify.quorum);
  const tension = disputeRate + maliciousRate - successRate * 0.2;
  const delta = clamp(tension * (learn.rate || 0.1), -0.08, 0.1);
  const updatedQuorum = clamp(currentQuorum + delta, 0.5, 0.8);

  const latencyPressure = observedLatencyMs > 7000 ? 1.15 : 1;
  const riskBoost = compiled.contract?.cognition?.risk?.level === "high" ? 1.1 : 1;
  const challengeSeconds = clamp(
    Math.round((verify.challengeSeconds || 600) * (1 + delta) * latencyPressure * riskBoost),
    120,
    3600
  );

  const maliciousBase = typeof slash.malicious === "number" ? slash.malicious : 90;
  const maliciousAdjusted = clamp(Math.round(maliciousBase + delta * 40), 70, 100);

  return {
    feedback,
    updates: {
      verify: {
        quorum: fractionToQuorum(updatedQuorum),
        challengeSeconds
      },
      slash: {
        ...slash,
        malicious: maliciousAdjusted
      }
    },
    diagnostics: {
      currentQuorum,
      updatedQuorum,
      delta,
      signal: learn.signal,
      learningRate: learn.rate
    }
  };
}

module.exports = {
  applyLearning
};
