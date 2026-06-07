'use strict';

const { runFieldEngine } = require('../runtime/next/field-engine');
const { loadCluster, publishCells, absorbFromCluster } = require('../runtime/next/mycelium-store');
const { publishEvent, readEvents } = require('../runtime/next/mycelium-bus');
const { relayToTargets } = require('../runtime/next/mycelium-relay');
const { applyFluxCrystallizations } = require('../grammar/next/macro-registry');
const { buildHotReloadPatch, applyHotReload } = require('../runtime/next/hot-reload');
const { buildDreamCrystallizePatch } = require('../runtime/next/weave-narrative');
const {
  loadFieldMemory,
  saveFieldMemory,
  mergeMemoryFromField,
  executeEchoes
} = require('../runtime/next/field-memory');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolvePath(obj, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function parseOperand(token, env) {
  const trimmed = String(token || '').trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return resolvePath(env, trimmed);
}

function evaluateExpr(expr, env) {
  const text = String(expr || '').trim();
  const m = text.match(/^(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)$/);
  if (!m) return { status: 'unknown', reason: 'unsupported expression format' };
  const left = parseOperand(m[1], env);
  const right = parseOperand(m[3], env);
  if (left === undefined || right === undefined) {
    return { status: 'unknown', reason: 'missing data for expression operands' };
  }
  let passed = false;
  switch (m[2]) {
    case '<=': passed = left <= right; break;
    case '>=': passed = left >= right; break;
    case '==': passed = left === right; break;
    case '!=': passed = left !== right; break;
    case '<': passed = left < right; break;
    case '>': passed = left > right; break;
    default: return { status: 'unknown', reason: 'unsupported operator' };
  }
  return { status: 'evaluated', passed, left, right, operator: m[2] };
}

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
  const { guarantees, field, selectedStrategy, feedback } = context;
  const summary = summarizeGuarantees(guarantees);
  const insights = [];

  insights.push({
    type: 'guarantee-summary',
    passed: summary.passed,
    failed: summary.failed,
    unknown: summary.unknown
  });

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

function buildEvolution(next, context) {
  const { guarantees, reflection, selectedStrategy, field } = context;
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
    acts: (next.acts || []).map((a) => ({ ...a })),
    reflects: (next.reflects || []).map((r) => ({ ...r })),
    evolves: (next.evolves || []).map((e) => ({ ...e })),
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

  const { field, selectedStrategy } = context;
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

  return {
    changed: false,
    mutation: null,
    reason: 'selection-not-applicable'
  };
}

function updateStrategyMemory(memory, selectedStrategy, guarantees, evolution, appliedEvolution) {
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

  return nextMemory;
}

async function runNextPhase(ast, options = {}) {
  const next = ast.next || {};
  const feedback = options.feedback || {};
  const strict = options.strict_next === true;
  const inputMemory = normalizeNextMemory(options.next_memory);
  const hasLivingField = (next.cells?.length || 0) > 0 || (next.fields?.length || 0) > 0;

  let myceliumRuntime = null;
  const myceliumEnv = { absorbed: [], rejected: [], events: [] };

  if ((next.mycelium || []).length > 0) {
    for (const mesh of next.mycelium) {
      const clusterData = loadCluster(mesh.cluster, { dir: options.mycelium_dir });
      const { absorbed, rejected } = absorbFromCluster([mesh], clusterData, ast.task || ast.module || 'local');
      myceliumEnv.absorbed.push(...absorbed);
      myceliumEnv.rejected.push(...rejected);
      if (mesh.react !== false) {
        const events = readEvents(mesh.cluster, {
          dir: options.mycelium_dir,
          limit: mesh.react_limit || 15
        });
        myceliumEnv.events.push(...events.map((e) => ({ ...e, cluster: mesh.cluster })));
      }
    }
    myceliumRuntime = {
      clusters: next.mycelium.map((m) => m.cluster),
      absorbed: myceliumEnv.absorbed.length,
      rejected: myceliumEnv.rejected.length,
      events_seen: myceliumEnv.events.length
    };
  }

  const programKey = ast.program || ast.task || ast.module || 'local';
  let fieldMemory = options.field_memory || loadFieldMemory(programKey, { dir: options.field_memory_dir });
  let echoResult = { written: [] };

  const field = hasLivingField
    ? runFieldEngine(next, { ...options, mycelium: myceliumEnv, field_memory: fieldMemory })
    : null;

  const fluxCrystals = applyFluxCrystallizations(field?.flux || []);

  const env = {
    ...(feedback.facts || {}),
    projected_spend: toNumber(feedback.projected_spend ?? feedback.facts?.projected_spend),
    approved_budget: toNumber(feedback.approved_budget ?? feedback.facts?.approved_budget),
    portfolio_risk: toNumber(feedback.portfolio_risk ?? feedback.facts?.portfolio_risk),
    warehouse_utilization: toNumber(feedback.warehouse_utilization ?? feedback.facts?.warehouse_utilization),
    policy: {
      max_risk: toNumber(feedback.policy?.max_risk ?? feedback.facts?.policy?.max_risk)
    }
  };

  const guarantees = (next.guarantees || []).map((g) => {
    const evalResult = evaluateExpr(g.expr, env);
    return { name: g.name || 'guarantee', expr: g.expr, ...evalResult };
  });

  const hasFail = guarantees.some((g) => g.status === 'evaluated' && g.passed === false);
  const hasUnknown = guarantees.some((g) => g.status === 'unknown');
  const goalPriority = toNumber(next.goal?.priority) ?? 0.7;
  const selectedStrategy = chooseStrategyWithMemory(next.strategies || [], goalPriority, inputMemory) ||
    chooseStrategy(next.strategies || [], goalPriority);

  // Autonomous mode: living programs proceed unless explicit guarantee failure + strict
  const blockOnGuarantee = (next.guarantees?.length || 0) > 0 && hasFail;
  const blocked = blockOnGuarantee || (strict && hasUnknown && (next.guarantees?.length || 0) > 0);
  const blockReason = blockOnGuarantee
    ? 'guarantee-failed'
    : (strict && hasUnknown ? 'guarantee-unknown' : null);

  const reflection = buildReflection(next, {
    guarantees,
    field,
    selectedStrategy,
    feedback
  });

  const evolution = buildEvolution(next, {
    guarantees,
    reflection,
    selectedStrategy,
    field
  });

  const runtimeNext = cloneNextState(next);
  const autoEvolve = options.auto_evolve === true;
  const appliedEvolution = autoEvolve
    ? applyEvolutionSelection(runtimeNext, evolution.selected, { field, selectedStrategy })
    : { changed: false, mutation: null, reason: 'auto-evolve-off' };

  const nextMemory = updateStrategyMemory(inputMemory, selectedStrategy, guarantees, evolution, appliedEvolution);

  evolution.applied = {
    enabled: autoEvolve,
    ...appliedEvolution
  };

  if (field?.dominant && (next.mycelium || []).length > 0 && options.publish_mycelium !== false) {
    for (const mesh of next.mycelium) {
      publishCells(mesh.cluster, ast.task || ast.module || 'local', field.cells.filter((c) => !c.provenance), {
        dir: options.mycelium_dir
      });
      const domEvent = {
        type: 'field.dominant',
        program: ast.task || ast.module || 'local',
        dominant: field.dominant.name,
        energy: field.dominant.energy,
        hybrid_dreams: (field.hybridDreams || []).length,
        dream_feedback: (field.dreamFeedback?.applied || []).length
      };
      publishEvent(mesh.cluster, domEvent, { dir: options.mycelium_dir });
      if (mesh.relay?.length) {
        relayToTargets(mesh.cluster, mesh.relay, domEvent, { dir: options.mycelium_dir });
      }
    }
    myceliumRuntime = myceliumRuntime || {};
    myceliumRuntime.published = true;
  }

  if ((next.echoes || []).length > 0 && field?.cells) {
    myceliumRuntime = myceliumRuntime || {};
    const echoed = executeEchoes(next.echoes, field, fieldMemory, { runCount: inputMemory.runCount + 1 });
    fieldMemory = echoed.memory;
    echoResult = echoed;
    myceliumRuntime.echoed = echoResult.written.map((e) => e.into);
  }

  if (field && options.field_memory !== false) {
    fieldMemory = mergeMemoryFromField(fieldMemory, field);
    if (options.save_field_memory !== false) {
      const savedPath = saveFieldMemory(programKey, fieldMemory, { dir: options.field_memory_dir });
      fieldMemory.path = savedPath;
      fieldMemory.runs = (fieldMemory.runs || 0) + 1;
    }
  }

  let hotReload = { applied: false, reason: 'disabled' };
  const autoSpawns = field?.spawns?.autoGenerated || [];
  const dreamPatch = buildDreamCrystallizePatch(field?.dreamFeedback, next.autobond);
  if (options.hot_reload !== false && (fluxCrystals.length > 0 || (field?.bonds?.autoGenerated || []).length > 0 || autoSpawns.length > 0 || dreamPatch)) {
    const sourcePath = options.source_path || options.filename;
    if (sourcePath && String(sourcePath).endsWith('.next')) {
      const patch = [
        buildHotReloadPatch({
          fluxCrystals,
          autoBonds: field?.bonds?.autoGenerated || [],
          autoSpawns,
          field
        }),
        dreamPatch
      ].filter(Boolean).join('\n\n');
      hotReload = applyHotReload(sourcePath, patch, { evolved_dir: options.evolved_dir });
    }
  }

  return {
    profile: 'next',
    blocked,
    blockReason,
    goal: next.goal || null,
    selectedStrategy,
    guarantees,
    models: next.models || [],
    acts: next.acts || [],
    reflects: next.reflects || [],
    evolves: next.evolves || [],
    reflection,
    evolution,
    nextMemory,
    runtimeNext,
    field,
    dominant: field?.dominant || null,
    emissions: field?.emissions || [],
    woven: field?.woven || [],
    dreams: field?.dreams || [],
    hybridDreams: field?.hybridDreams || [],
    dreamFeedback: field?.dreamFeedback || null,
    fieldMemory: field ? {
      path: fieldMemory.path,
      runs: fieldMemory.runs,
      restored: field?.memory?.restored || [],
      echoes: echoResult.written
    } : null,
    narrative: field?.narrative || [],
    flux: field?.flux || [],
    fluxCrystals,
    bonds: field?.bonds || null,
    spawns: field?.spawns || null,
    mycelium: myceliumRuntime,
    hotReload,
    strictMode: strict,
    autonomous: hasLivingField,
    recommendation: blocked ? 'halt' : (field?.dominant ? `emit:${field.dominant.name}` : 'proceed')
  };
}

module.exports = {
  runNextPhase
};
