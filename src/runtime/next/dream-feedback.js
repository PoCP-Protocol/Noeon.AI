'use strict';

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function applyDreamFeedback(cells, dreams, hybridDreams, config = {}) {
  if (config.enabled === false) {
    return { cells, applied: [], strength: 0 };
  }

  const strength = config.strength ?? config.dream_feedback ?? 0.25;
  const sources = [];

  for (const dream of dreams || []) {
    if (dream.feedback === false) continue;
    if (dream.dominant?.cells) sources.push({ name: dream.name, kind: 'dream', dominant: dream.dominant });
  }
  for (const dream of hybridDreams || []) {
    if (dream.feedback === false) continue;
    if (dream.dominant?.cells) sources.push({ name: dream.name, kind: 'hybrid', dominant: dream.dominant });
  }

  if (!sources.length) return { cells, applied: [], strength };

  const energyMap = new Map();
  for (const src of sources) {
    for (const c of src.dominant.cells) {
      const prev = energyMap.get(c.name);
      energyMap.set(c.name, prev == null ? c.energy : (prev + c.energy) / 2);
    }
  }

  const applied = [];
  const nextCells = cells.map((cell) => {
    const dreamed = energyMap.get(cell.name);
    if (dreamed == null) return cell;
    const delta = (dreamed - cell.energy) * strength;
    const energy = clamp(cell.energy + delta);
    applied.push({
      name: cell.name,
      before: Number(cell.energy.toFixed(4)),
      after: Number(energy.toFixed(4)),
      dreamed: Number(dreamed.toFixed(4))
    });
    return { ...cell, energy };
  });

  return { cells: nextCells, applied, strength, sources: sources.map((s) => s.name) };
}

module.exports = {
  applyDreamFeedback
};
