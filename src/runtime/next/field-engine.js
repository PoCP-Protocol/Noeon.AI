'use strict';

const { matchPattern } = require('./mycelium-store');
const { generateAutoBonds, mergeBondSets } = require('./auto-bond');
const { spawnFromBonds, mergeSpawnCells } = require('./auto-spawn');
const { runHybridDreams } = require('./hybrid-dream');
const { applyDreamFeedback } = require('./dream-feedback');
const { reactToMyceliumEvents } = require('./mycelium-react');
const { applyFieldMemoryToCells } = require('./field-memory');
const { buildWeaveNarrative } = require('./weave-narrative');

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function applyBonds(cells, bonds) {
  if (!bonds?.length) return { cells, activations: [] };
  const map = new Map(cells.map((c) => [c.name, { ...c }]));
  const activations = [];

  for (const bond of bonds) {
    const a = map.get(bond.from);
    const b = map.get(bond.to);
    if (!a || !b) continue;
    const strength = bond.strength ?? 0.3;
    const kind = bond.kind || 'amplifies';

    if (kind === 'amplifies' || kind === 'symbiotic') {
      const delta = (b.energy - a.energy) * strength * 0.45;
      a.energy = clamp(a.energy + delta);
      b.energy = clamp(b.energy + delta * 0.35);
    } else if (kind === 'inhibits') {
      a.energy = clamp(a.energy - b.energy * strength * 0.25);
    } else if (kind === 'resonates') {
      const avg = (a.energy + b.energy) / 2;
      a.energy = clamp(a.energy + (avg - a.energy) * strength);
      b.energy = clamp(b.energy + (avg - b.energy) * strength);
    }

    activations.push({
      from: bond.from,
      to: bond.to,
      kind,
      strength,
      after: { [a.name]: Number(a.energy.toFixed(4)), [b.name]: Number(b.energy.toFixed(4)) }
    });
  }

  return { cells: [...map.values()], activations };
}

function mergeMyceliumCells(localCells, absorbed) {
  const names = new Set(localCells.map((c) => c.name));
  const merged = [...localCells];
  for (const ext of absorbed || []) {
    if (names.has(ext.name)) continue;
    merged.push(ext);
    names.add(ext.name);
  }
  return merged;
}

function evalCondition(condition, cell, env) {
  const text = String(condition || '').trim();
  const m = text.match(/^energy\s*(<=|>=|==|!=|<|>)\s*(\d+(?:\.\d+)?)$/i);
  if (m) {
    const op = m[1];
    const rhs = Number(m[2]);
    const lhs = cell.energy;
    switch (op) {
      case '<=': return lhs <= rhs;
      case '>=': return lhs >= rhs;
      case '==': return lhs === rhs;
      case '!=': return lhs !== rhs;
      case '<': return lhs < rhs;
      case '>': return lhs > rhs;
      default: return false;
    }
  }
  const friction = text.match(/^friction\s*\(\s*"([^"]+)"\s*\)\s*(<=|>=|>|<)\s*(\d+(?:\.\d+)?)$/i);
  if (friction) {
    const pattern = friction[1];
    const score = env.friction?.[pattern] ?? 0.5;
    const op = friction[2];
    const rhs = Number(friction[3]);
    switch (op) {
      case '<=': return score <= rhs;
      case '>=': return score >= rhs;
      case '>': return score > rhs;
      case '<': return score < rhs;
      default: return false;
    }
  }
  return false;
}

function tickCells(cells, env) {
  const working = cells.map((c) => ({ ...c, energy: c.energy ?? 0.5 }));
  const emissions = [];
  const splits = [];
  const merges = [];

  for (const signal of env.signals || []) {
    for (const cell of working) {
      if (cell.claim && String(cell.claim).toLowerCase().includes(String(signal).toLowerCase())) {
        cell.energy = clamp(cell.energy + 0.12);
      }
    }
  }

  for (const cell of working) {
    for (const rule of cell.when || []) {
      if (!evalCondition(rule.condition, cell, env)) continue;
      if (rule.action === 'emit') {
        emissions.push({ cell: cell.name, target: rule.target, energy: cell.energy });
      } else if (rule.action === 'split') {
        splits.push({ cell: cell.name, into: rule.targets, energy: cell.energy });
        cell.energy *= 0.6;
      } else if (rule.action === 'merge') {
        merges.push({ cell: cell.name, into: rule.target });
        cell.energy = clamp(cell.energy + 0.08);
      }
    }
    cell.energy = clamp(cell.energy - 0.02);
  }

  return { cells: working, emissions, splits, merges };
}

function runWeave(cells, weaves) {
  const results = [];
  for (const weave of weaves || []) {
    const matched = cells
      .filter((c) => matchPattern(c.name, weave.pattern))
      .sort((a, b) => b.energy - a.energy)
      .slice(0, weave.max || 12);
    const score = matched.reduce((acc, c) => acc + c.energy, 0) / Math.max(1, matched.length);
    results.push({
      into: weave.into,
      pattern: weave.pattern,
      strategy: weave.strategy || 'competitive',
      winners: matched.map((c) => c.name),
      coherence: Number(score.toFixed(4))
    });
  }
  return results;
}

function runDreams(cells, dreams) {
  const results = [];
  for (const dream of dreams || []) {
    const branches = [];
    const n = dream.branches || 3;
    for (let b = 0; b < n; b += 1) {
      const branch = cells.map((c) => ({
        name: c.name,
        energy: clamp(c.energy + (Math.random() - 0.5) * 0.2)
      }));
      branches.push({ id: b, cells: branch });
    }
    branches.sort((a, b) => {
      const sa = a.cells.reduce((s, c) => s + c.energy, 0);
      const sb = b.cells.reduce((s, c) => s + c.energy, 0);
      return sb - sa;
    });
    results.push({
      name: dream.name,
      branches: n,
      depth: dream.depth || 2,
      merge_by: dream.merge_by || 'coherence',
      dominant: branches[0]
    });
  }
  return results;
}

function runFluxes(fluxes, env) {
  const crystallizations = [];
  for (const flux of fluxes || []) {
    if (!flux.when) continue;
    const triggered = evalCondition(flux.when, { energy: 0.5 }, env);
    if (triggered || env.force_flux === true) {
      crystallizations.push({
        name: flux.name,
        crystallize: flux.crystallize,
        mutate: flux.mutate,
        triggered: true
      });
    }
  }
  return crystallizations;
}

function runFieldEngine(next, options = {}) {
  const env = {
    signals: options.feedback?.signals || options.signals || [],
    friction: options.feedback?.friction || options.friction || {},
    force_flux: options.force_flux === true,
    mycelium: options.mycelium || null
  };

  let initialCells = (next.cells || []).map((c) => ({
    name: c.name,
    claim: c.claim,
    energy: c.energy ?? 0.5,
    when: c.when || [],
    tags: c.tags || []
  }));

  let memoryRestore = { restored: [], decayMs: null };
  if (options.field_memory) {
    const fieldCfg = (next.fields || [])[0] || {};
    const restored = applyFieldMemoryToCells(initialCells, options.field_memory, fieldCfg);
    initialCells = restored.cells;
    memoryRestore = restored;
  }

  const myceliumAbsorbed = env.mycelium?.absorbed || [];
  initialCells = mergeMyceliumCells(initialCells, myceliumAbsorbed);

  let busReactions = [];
  if ((env.mycelium?.events || []).length && (next.mycelium || []).length) {
    const reacted = reactToMyceliumEvents(initialCells, env.mycelium.events, next.mycelium);
    initialCells = reacted.cells;
    busReactions = reacted.reactions;
  }

  const autoBonds = next.autobond?.enabled !== false && next.autobond
    ? generateAutoBonds(initialCells, next.autobond)
    : [];
  const allBonds = mergeBondSets(next.bonds || [], autoBonds);

  const autoSpawns = next.autobond?.spawn !== false && next.autobond && autoBonds.length
    ? spawnFromBonds(autoBonds, initialCells, next.autobond)
    : [];
  initialCells = mergeSpawnCells(initialCells, autoSpawns);

  const bonded = applyBonds(initialCells, allBonds);
  let cells = bonded.cells;

  const tick = tickCells(cells, env);
  cells = tick.cells;

  const postBond = applyBonds(cells, allBonds);
  cells = postBond.cells;

  const woven = runWeave(cells, next.weaves);
  const narrative = buildWeaveNarrative(woven);
  const dreams = runDreams(cells, next.dreams);
  const hybridDreams = runHybridDreams(cells, next.dreams, next.autobond);
  const dreamFeedback = applyDreamFeedback(cells, dreams, hybridDreams, {
    strength: next.autobond?.dream_feedback,
    enabled: next.autobond?.dream_feedback !== false
  });
  cells = dreamFeedback.cells;
  const flux = runFluxes(next.fluxes, env);
  const dominant = [...cells].sort((a, b) => b.energy - a.energy)[0] || null;

  return {
    fields: next.fields || [],
    cells,
    bonds: {
      all: allBonds,
      autoGenerated: autoBonds,
      activations: [...bonded.activations, ...postBond.activations]
    },
    spawns: {
      declared: next.spawns || [],
      autoGenerated: autoSpawns
    },
    mycelium: {
      absorbed: myceliumAbsorbed,
      rejected: env.mycelium?.rejected || [],
      reactions: busReactions
    },
    emissions: tick.emissions,
    splits: tick.splits,
    merges: tick.merges,
    memory: memoryRestore,
    woven,
    narrative,
    dreams,
    hybridDreams,
    dreamFeedback,
    flux,
    echoes: next.echoes || [],
    dominant: dominant ? { name: dominant.name, energy: dominant.energy, claim: dominant.claim } : null,
    autonomous: true
  };
}

module.exports = {
  runFieldEngine,
  applyBonds,
  tickCells,
  runWeave,
  runDreams,
  evalCondition,
  mergeMyceliumCells
};
