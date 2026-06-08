'use strict';

const { matchPattern } = require('./mycelium-store');

function recallFromMemory(memory, config = {}) {
  if (config.recall === false) {
    return { signals: [], boosts: {}, dominantStreak: 0, episodicCount: 0, semantic: null };
  }

  const depth = config.recall_depth ?? 3;
  const episodic = memory?.echoes?.['memory.episodic'] || [];
  const signals = [];
  const boosts = {};

  for (const snap of episodic.slice(-depth)) {
    const dom = snap.dominant?.name;
    if (!dom) continue;
    signals.push(dom.replace(/_/g, ' '));
    boosts[dom] = (boosts[dom] || 0) + 0.06;
    for (const w of (snap.woven || []).flatMap((x) => x.winners || [])) {
      boosts[w] = (boosts[w] || 0) + 0.03;
    }
  }

  const semantic = memory?.semantic || memory?.echoes?.['memory.semantic']?.slice(-1)[0] || null;
  if (semantic?.patterns) {
    for (const p of semantic.patterns.slice(0, 3)) {
      signals.push(String(p.pattern).replace(/_/g, ' '));
      boosts[p.pattern] = (boosts[p.pattern] || 0) + (p.weight || 0.1) * 0.15;
    }
  }

  const history = memory?.dominant_history || [];
  let dominantStreak = 0;
  if (history.length) {
    const last = history[history.length - 1].name;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i].name === last) dominantStreak += 1;
      else break;
    }
  }

  return {
    signals: [...new Set(signals)],
    boosts,
    dominantStreak,
    episodicCount: episodic.length,
    semantic
  };
}

function applyRecallBoosts(cells, recall) {
  if (!recall?.boosts || !Object.keys(recall.boosts).length) {
    return { cells, boosted: [] };
  }

  const boosted = [];
  const next = cells.map((cell) => {
    const delta = recall.boosts[cell.name];
    if (delta == null) return cell;
    const energy = Math.max(0, Math.min(1, cell.energy + delta));
    boosted.push({ name: cell.name, delta: Number(delta.toFixed(4)), after: Number(energy.toFixed(4)) });
    return { ...cell, energy: Number(energy.toFixed(4)) };
  });

  return { cells: next, boosted };
}

module.exports = {
  recallFromMemory,
  applyRecallBoosts
};
