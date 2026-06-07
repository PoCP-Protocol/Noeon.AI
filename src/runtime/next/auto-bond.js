'use strict';

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function claimSimilarity(claimA, claimB) {
  const a = new Set(tokenize(claimA));
  const b = new Set(tokenize(claimB));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function bondKey(from, to) {
  return [from, to].sort().join('::');
}

function generateAutoBonds(cells, config = {}) {
  const threshold = config.threshold ?? 0.55;
  const max = config.max ?? 6;
  const kind = config.kind ?? 'resonates';
  const minSimilarity = config.min_similarity ?? 0.12;
  const energyWindow = config.energy_window ?? 0.18;

  const hot = [...cells]
    .filter((c) => (c.energy ?? 0) >= threshold)
    .sort((a, b) => b.energy - a.energy);

  const bonds = [];
  const seen = new Set();

  for (let i = 0; i < hot.length; i += 1) {
    for (let j = i + 1; j < hot.length; j += 1) {
      const a = hot[i];
      const b = hot[j];
      const key = bondKey(a.name, b.name);
      if (seen.has(key)) continue;

      const sim = claimSimilarity(a.claim, b.claim);
      const energyClose = Math.abs(a.energy - b.energy) <= energyWindow;
      if (sim < minSimilarity && !energyClose) continue;

      bonds.push({
        from: a.name,
        to: b.name,
        bidirectional: true,
        strength: Number(Math.min(0.85, 0.22 + sim * 0.5 + (energyClose ? 0.1 : 0)).toFixed(3)),
        kind,
        auto: true,
        similarity: Number(sim.toFixed(4))
      });
      seen.add(key);
      if (bonds.length >= max) return bonds;
    }
  }

  return bonds;
}

function mergeBondSets(explicit = [], auto = []) {
  const map = new Map();
  for (const bond of explicit) {
    map.set(bondKey(bond.from, bond.to), { ...bond, auto: false });
  }
  for (const bond of auto) {
    const key = bondKey(bond.from, bond.to);
    if (!map.has(key)) map.set(key, bond);
  }
  return [...map.values()];
}

module.exports = {
  generateAutoBonds,
  mergeBondSets,
  claimSimilarity,
  bondKey
};
