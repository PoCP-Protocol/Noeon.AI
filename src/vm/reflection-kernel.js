'use strict';

function summarizeGuarantees(guarantees) {
  const summary = { passed: 0, failed: 0, unknown: 0 };
  for (const g of guarantees) {
    if (g.status === 'unknown') summary.unknown += 1;
    else if (g.passed) summary.passed += 1;
    else summary.failed += 1;
  }
  return summary;
}

function buildReflection(next, context) {
  const { guarantees, vows, constitutions, rituals, ritualConflicts, actsPlanned, governanceDecision, field, selectedStrategy, feedback } = context;
  const summary = summarizeGuarantees(guarantees);
  const insights = [];

  insights.push({
    type: 'guarantee-summary',
    passed: summary.passed,
    failed: summary.failed,
    unknown: summary.unknown
  });

  if (Array.isArray(vows) && vows.length > 0) {
    const vowSummary = { passed: 0, failed: 0, unknown: 0, hardFailed: 0 };
    for (const v of vows) {
      if (v.status === 'unknown') vowSummary.unknown += 1;
      else if (v.passed) vowSummary.passed += 1;
      else {
        vowSummary.failed += 1;
        if (String(v.level || 'soft').toLowerCase() === 'hard') vowSummary.hardFailed += 1;
      }
    }
    insights.push({ type: 'vow-summary', ...vowSummary });
  }

  if (Array.isArray(constitutions) && constitutions.length > 0) {
    const constitutionSummary = { passed: 0, failed: 0, unknown: 0, hardFailed: 0 };
    for (const c of constitutions) {
      if (c.status === 'unknown') constitutionSummary.unknown += 1;
      else if (c.passed) constitutionSummary.passed += 1;
      else {
        constitutionSummary.failed += 1;
        if (String(c.level || 'soft').toLowerCase() === 'hard') constitutionSummary.hardFailed += 1;
      }
    }
    insights.push({ type: 'constitution-summary', ...constitutionSummary });
  }

  if (Array.isArray(rituals) && rituals.length > 0) {
    const ritualSummary = {
      active: 0,
      deferred: 0,
      suspended: 0,
      unknown: 0,
      overridden: 0,
      dependencyBlocked: 0
    };
    for (const r of rituals) {
      if (r.status === 'dependency-blocked') ritualSummary.dependencyBlocked += 1;
      else ritualSummary[r.status] = (ritualSummary[r.status] || 0) + 1;
    }
    insights.push({ type: 'ritual-summary', ...ritualSummary });

    if (Array.isArray(ritualConflicts) && ritualConflicts.length > 0) {
      insights.push({
        type: 'ritual-conflicts',
        count: ritualConflicts.length,
        samples: ritualConflicts.slice(0, 5)
      });
    }

    const topAction = (actsPlanned || [])[0];
    if (topAction && Array.isArray(topAction.rituals) && topAction.rituals.length > 0) {
      insights.push({
        type: 'ritual-act-priority',
        action: topAction.action || null,
        rituals: topAction.rituals,
        boost: Number(topAction.ritualBoost || 0)
      });
    }
  }

  if (governanceDecision) {
    insights.push({
      type: 'governance-arbitration',
      winner: governanceDecision.winner,
      blocked: governanceDecision.blocked,
      blockReason: governanceDecision.blockReason,
      detail: governanceDecision.detail,
      precedence: governanceDecision.precedence
    });
  }

  if (selectedStrategy) {
    insights.push({
      type: 'strategy-selection',
      name: selectedStrategy.name || selectedStrategy.objective || 'strategy',
      risk: selectedStrategy.risk || 'medium',
      utility: selectedStrategy.utility
    });
  }

  if (field?.dominant) {
    insights.push({
      type: 'field-dominance',
      cell: field.dominant.name,
      energy: Number((field.dominant.energy || 0).toFixed(4)),
      claim: field.dominant.claim || null
    });
  }

  const friction = feedback.friction || {};
  const hotspots = Object.keys(friction)
    .filter((k) => Number(friction[k]) >= 0.7)
    .map((k) => ({ pattern: k, score: Number(friction[k]) }));
  if (hotspots.length > 0) {
    insights.push({ type: 'friction-hotspots', hotspots });
  }

  if (Array.isArray(next.selfModels) && next.selfModels.length > 0) {
    const primary = next.selfModels[0];
    insights.push({
      type: 'self-model',
      identity: primary.identity || primary.id || 'unknown',
      creator: primary.creator || 'unspecified',
      paradigm: primary.paradigm || 'unspecified',
      principle: primary.principle || null
    });
  }

  if (Array.isArray(next.myths) && next.myths.length > 0) {
    const primaryMyth = next.myths[0];
    insights.push({
      type: 'mythic-core',
      text: primaryMyth.text,
      tone: primaryMyth.tone || 'neutral',
      directive: primaryMyth.directive || null
    });
  }

  const methodScores = (next.reflects || []).map((r) => {
    const method = r.method || 'causal';
    const target = r.target || 'execution';
    const base = method === 'counterfactual' ? 0.82 : method === 'causal' ? 0.75 : 0.68;
    const penalty = summary.failed > 0 ? 0.15 : 0;
    const confidence = Math.max(0, Math.min(1, base - penalty));
    return { target, method, confidence: Number(confidence.toFixed(4)) };
  });

  const verdict = summary.failed > 0
    ? 'needs-correction'
    : (summary.unknown > 0 ? 'needs-observability' : 'stable');

  return {
    verdict,
    summary,
    methodScores,
    insights,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  summarizeGuarantees,
  buildReflection
};
