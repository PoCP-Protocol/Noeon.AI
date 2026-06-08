'use strict';

function chooseStrategy(strategies, goalPriority) {
  if (!Array.isArray(strategies) || strategies.length === 0) return null;
  const scored = strategies.map((s) => {
    const risk = String(s.risk || 'medium').toLowerCase();
    const riskScore = risk === 'low' ? 1 : risk === 'medium' ? 0.6 : 0.2;
    const utility = goalPriority >= 0.9 ? riskScore + 0.3 : riskScore;
    return { ...s, utility };
  });
  scored.sort((a, b) => b.utility - a.utility);
  return scored[0];
}

function strategyKey(strategy) {
  return strategy?.name || strategy?.objective || 'strategy';
}

function normalizeNextMemory(input) {
  const base = input && typeof input === 'object' ? input : {};
  return {
    strategyStats: { ...(base.strategyStats || {}) },
    ritualStats: { ...(base.ritualStats || {}) },
    ritualOrder: Array.isArray(base.ritualOrder) ? [...base.ritualOrder] : [],
    evolutionHistory: Array.isArray(base.evolutionHistory) ? [...base.evolutionHistory] : [],
    lastSelected: base.lastSelected || null,
    runCount: Number(base.runCount) || 0
  };
}

function chooseStrategyWithMemory(strategies, goalPriority, memory) {
  if (!Array.isArray(strategies) || strategies.length === 0) return null;
  const stats = memory.strategyStats || {};
  const scored = strategies.map((s) => {
    const risk = String(s.risk || 'medium').toLowerCase();
    const riskScore = risk === 'low' ? 1 : risk === 'medium' ? 0.6 : 0.2;
    const utilityBase = goalPriority >= 0.9 ? riskScore + 0.3 : riskScore;

    const key = strategyKey(s);
    const st = stats[key] || {};
    const failPenalty = Math.min(0.4, Number(st.failCount || 0) * 0.12);
    const successBoost = Math.min(0.25, Number(st.successCount || 0) * 0.05);
    const stabilityBoost = st.lastOutcome === 'pass' ? 0.05 : 0;
    const memoryBias = successBoost + stabilityBoost - failPenalty;

    return {
      ...s,
      utilityBase,
      memoryBias: Number(memoryBias.toFixed(4)),
      utility: Number((utilityBase + memoryBias).toFixed(4))
    };
  });
  scored.sort((a, b) => b.utility - a.utility);
  return scored[0];
}

function updateStrategyMemory(memory, selectedStrategy, guarantees, evolution, appliedEvolution, rituals, ritualConflicts, governanceDecision) {
  const nextMemory = normalizeNextMemory(memory);
  nextMemory.runCount += 1;

  if (selectedStrategy) {
    const key = strategyKey(selectedStrategy);
    const row = nextMemory.strategyStats[key] || { successCount: 0, failCount: 0, unknownCount: 0, lastOutcome: null };
    const failed = guarantees.some((g) => g.status === 'evaluated' && g.passed === false);
    const unknown = guarantees.some((g) => g.status === 'unknown');

    if (failed) {
      row.failCount += 1;
      row.lastOutcome = 'fail';
    } else if (unknown) {
      row.unknownCount += 1;
      row.lastOutcome = 'unknown';
    } else {
      row.successCount += 1;
      row.lastOutcome = 'pass';
    }

    row.lastUtility = selectedStrategy.utility;
    row.lastBias = selectedStrategy.memoryBias || 0;
    nextMemory.strategyStats[key] = row;
    nextMemory.lastSelected = key;
  }

  nextMemory.evolutionHistory.push({
    ts: new Date().toISOString(),
    selected: evolution?.selected?.kind || null,
    mutation: appliedEvolution?.mutation || null,
    changed: appliedEvolution?.changed === true
  });
  if (nextMemory.evolutionHistory.length > 50) {
    nextMemory.evolutionHistory = nextMemory.evolutionHistory.slice(-50);
  }

  const ritualStats = { ...(nextMemory.ritualStats || {}) };
  for (const ritual of Array.isArray(rituals) ? rituals : []) {
    const key = String(ritual.name || 'ritual');
    const row = ritualStats[key] || {
      winCount: 0,
      overrideCount: 0,
      overriddenCount: 0,
      dependencyBlockedCount: 0,
      lastOutcome: null,
      learnedPriority: 0
    };

    if (governanceDecision?.winner === 'ritual' && governanceDecision?.detail === key) {
      row.winCount += 1;
      row.lastOutcome = 'win';
    } else if (ritual.status === 'overridden') {
      row.overriddenCount += 1;
      row.lastOutcome = 'overridden';
    } else if (ritual.status === 'dependency-blocked') {
      row.dependencyBlockedCount += 1;
      row.lastOutcome = 'dependency-blocked';
    } else if (ritual.active) {
      row.lastOutcome = 'active';
    }

    row.lastEffectivePriority = Number(ritual.effectivePriority ?? ritual.priority ?? 0);
    ritualStats[key] = row;
  }

  for (const conflict of Array.isArray(ritualConflicts) ? ritualConflicts : []) {
    if (conflict.type === 'override' && conflict.controller) {
      const key = String(conflict.controller);
      const row = ritualStats[key] || {
        winCount: 0,
        overrideCount: 0,
        overriddenCount: 0,
        dependencyBlockedCount: 0,
        lastOutcome: null,
        learnedPriority: 0
      };
      row.overrideCount += 1;
      ritualStats[key] = row;
    }
  }

  for (const [key, row] of Object.entries(ritualStats)) {
    row.learnedPriority = Number((
      Number(row.winCount || 0) * 0.3 +
      Number(row.overrideCount || 0) * 0.12 -
      Number(row.overriddenCount || 0) * 0.14 -
      Number(row.dependencyBlockedCount || 0) * 0.16
    ).toFixed(4));
    ritualStats[key] = row;
  }

  nextMemory.ritualStats = ritualStats;
  nextMemory.ritualOrder = Object.entries(ritualStats)
    .sort((a, b) => Number(b[1].learnedPriority || 0) - Number(a[1].learnedPriority || 0))
    .map(([name]) => name);

  return nextMemory;
}

module.exports = {
  chooseStrategy,
  strategyKey,
  normalizeNextMemory,
  chooseStrategyWithMemory,
  updateStrategyMemory
};
