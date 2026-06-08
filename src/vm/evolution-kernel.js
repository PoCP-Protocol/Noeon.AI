'use strict';

function buildEvolution(next, context) {
  const { guarantees, vows, constitutions, rituals, actsPlanned, ritualConflicts, reflection, selectedStrategy, field } = context;
  const proposals = [];

  for (const declared of next.evolves || []) {
    proposals.push({
      kind: 'declared-evolve',
      scope: declared.scope || 'strategy',
      guard: declared.guard || null,
      mutation: declared.mutation || null,
      reason: 'declared-by-program',
      confidence: 0.7
    });
  }

  const failedGuarantees = guarantees.filter((g) => g.status === 'evaluated' && g.passed === false);
  const failedVows = (vows || []).filter((v) => v.status === 'evaluated' && v.passed === false);
  const failedConstitutions = (constitutions || []).filter((c) => c.status === 'evaluated' && c.passed === false);
  for (const g of failedGuarantees) {
    proposals.push({
      kind: 'safety-tightening',
      scope: 'strategy',
      guard: g.name,
      mutation: 'shift-to-low-risk-strategy',
      reason: `failed guarantee: ${g.name}`,
      confidence: 0.92
    });
  }

  if (reflection.summary.unknown > 0) {
    proposals.push({
      kind: 'observability-upgrade',
      scope: 'model',
      mutation: 'add-telemetry-model',
      reason: 'unknown guarantee operands',
      confidence: 0.8
    });
  }

  if (field?.dominant && Number(field.dominant.energy) >= 0.85) {
    proposals.push({
      kind: 'dominant-cell-amplification',
      scope: 'cell',
      mutation: `spawn-from:${field.dominant.name}`,
      reason: 'high-energy dominant cell',
      confidence: 0.78
    });
  }

  if (selectedStrategy && String(selectedStrategy.risk || '').toLowerCase() === 'high' && failedGuarantees.length > 0) {
    proposals.push({
      kind: 'risk-rebalance',
      scope: 'strategy',
      mutation: 'downgrade-risk-high-to-medium',
      reason: 'high-risk strategy under failed guarantees',
      confidence: 0.88
    });
  }

  if (failedVows.length > 0) {
    proposals.push({
      kind: 'vow-realignment',
      scope: 'strategy',
      mutation: 'align-actions-with-vows',
      reason: `failed vows: ${failedVows.map((v) => v.name).join(', ')}`,
      confidence: 0.9
    });
  }

  if (failedConstitutions.length > 0) {
    proposals.push({
      kind: 'constitutional-realignment',
      scope: 'governance',
      mutation: 'align-plan-with-constitution',
      reason: `failed constitutions: ${failedConstitutions.map((c) => c.name).join(', ')}`,
      confidence: 0.93
    });
  }

  const activeRituals = (rituals || []).filter((r) => r.active);
  const knownActions = new Set((actsPlanned || []).map((a) => String(a.action || '').toLowerCase()).filter(Boolean));
  const danglingRituals = activeRituals.filter((r) => r.action && !knownActions.has(String(r.action).toLowerCase()));
  if (danglingRituals.length > 0) {
    proposals.push({
      kind: 'ritual-materialization',
      scope: 'act',
      mutation: `add-missing-ritual-actions:${danglingRituals.map((r) => r.action).join(',')}`,
      reason: `active rituals without matching acts: ${danglingRituals.map((r) => r.name).join(', ')}`,
      confidence: 0.79
    });
  }

  const unknownRituals = (rituals || []).filter((r) => r.status === 'unknown');
  if (unknownRituals.length > 0) {
    proposals.push({
      kind: 'ritual-telemetry-upgrade',
      scope: 'model',
      mutation: 'instrument-ritual-triggers',
      reason: `unknown ritual triggers: ${unknownRituals.map((r) => r.name).join(', ')}`,
      confidence: 0.76
    });
  }

  if ((ritualConflicts || []).length > 0) {
    proposals.push({
      kind: 'ritual-topology-reorder',
      scope: 'ritual',
      mutation: 'rebalance-ritual-priority-by-conflicts',
      reason: `ritual conflicts observed: ${(ritualConflicts || []).length}`,
      confidence: Math.min(0.95, 0.7 + Math.min(0.2, (ritualConflicts || []).length * 0.03))
    });
  }

  const selfModels = Array.isArray(next.selfModels) ? next.selfModels : [];
  if (selfModels.length > 0) {
    const primary = selfModels[0];
    proposals.push({
      kind: 'selfmodel-alignment',
      scope: 'identity',
      mutation: 'align-strategy-with-selfmodel',
      reason: `selfmodel ${primary.identity || primary.id || 'unknown'} alignment`,
      confidence: 0.74
    });
  }

  const myths = Array.isArray(next.myths) ? next.myths : [];
  if (myths.length > 0) {
    const primaryMyth = myths[0];
    proposals.push({
      kind: 'mythic-alignment',
      scope: 'narrative',
      mutation: 'align-strategy-with-mythic-core',
      reason: `mythic directive: ${primaryMyth.directive || primaryMyth.tone || 'guidance'}`,
      confidence: 0.73
    });
  }

  proposals.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const selected = proposals[0] || null;

  return {
    proposals,
    selected,
    count: proposals.length,
    mode: proposals.length > 0 ? 'proposed' : 'none'
  };
}

function cloneNextState(next) {
  return {
    goal: next.goal ? { ...next.goal } : null,
    models: (next.models || []).map((m) => ({ ...m })),
    strategies: (next.strategies || []).map((s) => ({ ...s })),
    guarantees: (next.guarantees || []).map((g) => ({ ...g })),
    vows: (next.vows || []).map((v) => ({ ...v })),
    constitutions: (next.constitutions || []).map((c) => ({ ...c })),
    rituals: (next.rituals || []).map((r) => ({ ...r })),
    acts: (next.acts || []).map((a) => ({ ...a })),
    reflects: (next.reflects || []).map((r) => ({ ...r })),
    evolves: (next.evolves || []).map((e) => ({ ...e })),
    selfModels: (next.selfModels || []).map((s) => ({ ...s })),
    myths: (next.myths || []).map((m) => ({ ...m })),
    fields: (next.fields || []).map((f) => ({ ...f })),
    cells: (next.cells || []).map((c) => ({ ...c, when: Array.isArray(c.when) ? c.when.map((w) => ({ ...w })) : [] })),
    weaves: (next.weaves || []).map((w) => ({ ...w })),
    dreams: (next.dreams || []).map((d) => ({ ...d })),
    echoes: (next.echoes || []).map((e) => ({ ...e })),
    spawns: (next.spawns || []).map((s) => ({ ...s })),
    fluxes: (next.fluxes || []).map((f) => ({ ...f })),
    bonds: (next.bonds || []).map((b) => ({ ...b })),
    mycelium: (next.mycelium || []).map((m) => ({ ...m })),
    autobond: next.autobond ? { ...next.autobond } : null
  };
}

function pickLowestRiskStrategy(strategies) {
  if (!Array.isArray(strategies) || strategies.length === 0) return null;
  const order = { low: 1, medium: 2, high: 3 };
  const sorted = [...strategies].sort((a, b) => {
    const ar = order[String(a.risk || 'medium').toLowerCase()] || 99;
    const br = order[String(b.risk || 'medium').toLowerCase()] || 99;
    return ar - br;
  });
  return sorted[0] || null;
}

function applyEvolutionSelection(runtimeState, selected, context) {
  if (!selected) {
    return {
      changed: false,
      mutation: null,
      reason: 'no-selection'
    };
  }

  const { field, selectedStrategy, rituals, ritualConflicts } = context;
  const strategyName = selectedStrategy?.name || selectedStrategy?.objective || null;

  if (selected.kind === 'safety-tightening') {
    const low = pickLowestRiskStrategy(runtimeState.strategies);
    if (low) {
      runtimeState.runtimeSelection = {
        strategy: low.name || low.objective || 'strategy',
        risk: low.risk || 'low',
        source: 'evolution.safety-tightening'
      };
      return {
        changed: true,
        mutation: 'runtime-selection->low-risk',
        reason: selected.reason
      };
    }
  }

  if (selected.kind === 'observability-upgrade') {
    const modelName = 'telemetry_shadow';
    const exists = runtimeState.models.some((m) => String(m.name || '').toLowerCase() === modelName);
    if (!exists) {
      runtimeState.models.push({
        name: modelName,
        source: 'runtime.feedback',
        confidence: 0.6,
        generated_by: 'evolution.observability-upgrade'
      });
      return {
        changed: true,
        mutation: 'model+telemetry_shadow',
        reason: selected.reason
      };
    }
  }

  if (selected.kind === 'dominant-cell-amplification') {
    if (field?.dominant?.name) {
      runtimeState.spawns.push({
        name: `${field.dominant.name}_fork`,
        inherit: [field.dominant.name],
        goal: `amplify ${field.dominant.name}`,
        source: 'evolution.dominant-cell-amplification'
      });
      return {
        changed: true,
        mutation: `spawn+${field.dominant.name}_fork`,
        reason: selected.reason
      };
    }
  }

  if (selected.kind === 'risk-rebalance') {
    if (strategyName) {
      const target = runtimeState.strategies.find((s) => (s.name || s.objective) === strategyName);
      if (target) {
        target.risk = 'medium';
        target.evolved_by = 'risk-rebalance';
        return {
          changed: true,
          mutation: `strategy:${strategyName}.risk=medium`,
          reason: selected.reason
        };
      }
    }
  }

  if (selected.kind === 'declared-evolve') {
    if (selected.scope === 'cell' && String(selected.mutation || '').startsWith('spawn-from:')) {
      const from = String(selected.mutation).slice('spawn-from:'.length).trim();
      if (from) {
        runtimeState.spawns.push({
          name: `${from}_declared_fork`,
          inherit: [from],
          goal: `declared evolve from ${from}`,
          source: 'evolution.declared'
        });
        return {
          changed: true,
          mutation: `declared-spawn-from:${from}`,
          reason: selected.reason
        };
      }
    }
  }

  if (selected.kind === 'ritual-materialization') {
    const suffix = Date.now().toString().slice(-6);
    runtimeState.acts.push({
      action: `ritual_materialize_${suffix}`,
      capability: 'runtime.self_patch',
      source: 'evolution.ritual-materialization'
    });
    return {
      changed: true,
      mutation: 'act+ritual_materialize',
      reason: selected.reason
    };
  }

  if (selected.kind === 'ritual-topology-reorder') {
    const ranked = (Array.isArray(rituals) ? rituals : [])
      .slice()
      .sort((a, b) => {
        const modeDelta = (b.mode === 'strict' ? 2 : 1) - (a.mode === 'strict' ? 2 : 1);
        if (modeDelta !== 0) return modeDelta;
        const prioDelta = Number(b.effectivePriority ?? b.priority ?? 0) - Number(a.effectivePriority ?? a.priority ?? 0);
        if (prioDelta !== 0) return prioDelta;
        return Number(a.declarationOrder || 0) - Number(b.declarationOrder || 0);
      })
      .map((r) => r.name);

    runtimeState.ritualOrder = ranked;
    runtimeState.ritualConflictCount = Array.isArray(ritualConflicts) ? ritualConflicts.length : 0;
    return {
      changed: true,
      mutation: 'ritual-order-rebalanced',
      reason: selected.reason
    };
  }

  return {
    changed: false,
    mutation: null,
    reason: 'selection-not-applicable'
  };
}

module.exports = {
  buildEvolution,
  cloneNextState,
  applyEvolutionSelection
};
