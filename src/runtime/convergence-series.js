function quorumToFraction(quorum) {
  if (!quorum || !quorum.denominator) {
    return 0;
  }
  return Number((quorum.numerator / quorum.denominator).toFixed(4));
}

function buildConvergenceSeries(training) {
  const rounds = Array.isArray(training?.rounds) ? training.rounds : [];

  const points = rounds.map((round) => {
    const policy = round.policy || {};
    const verify = policy.verify || {};
    const slash = policy.slash || {};
    const plan = round.plan || {};
    const diagnostics = round.diagnostics || {};

    return {
      round: round.round,
      quorumFraction: quorumToFraction(verify.quorum),
      challengeSeconds: verify.challengeSeconds ?? null,
      maliciousSlash: slash.malicious ?? null,
      planCompletionRate:
        plan.totalNodes > 0
          ? Number((plan.visitedCount / plan.totalNodes).toFixed(4))
          : 0,
      learningDelta: diagnostics.delta ?? 0,
      haltedReason: plan.haltedReason || null
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totalRounds: points.length,
    metrics: {
      quorumFraction: points.map((p) => ({ round: p.round, value: p.quorumFraction })),
      challengeSeconds: points.map((p) => ({ round: p.round, value: p.challengeSeconds })),
      maliciousSlash: points.map((p) => ({ round: p.round, value: p.maliciousSlash })),
      planCompletionRate: points.map((p) => ({ round: p.round, value: p.planCompletionRate })),
      learningDelta: points.map((p) => ({ round: p.round, value: p.learningDelta }))
    },
    points
  };
}

module.exports = {
  buildConvergenceSeries
};
