'use strict';

const { claimSimilarity, bondKey } = require('./auto-bond');

function hybridName(a, b) {
  const [x, y] = [a, b].sort();
  return `${x}__${y}_hybrid`;
}

function spawnFromBonds(bonds, cells, config = {}) {
  const minSimilarity = config.spawn_min_similarity ?? 0.18;
  const minStrength = config.spawn_min_strength ?? 0.25;
  const spawns = [];
  const seen = new Set();

  for (const bond of bonds || []) {
    if (!bond.auto) continue;
    if ((bond.strength ?? 0) < minStrength) continue;
    if ((bond.similarity ?? 0) < minSimilarity && bond.kind !== 'resonates') continue;

    const key = bondKey(bond.from, bond.to);
    if (seen.has(key)) continue;
    seen.add(key);

    const a = cells.find((c) => c.name === bond.from);
    const b = cells.find((c) => c.name === bond.to);
    if (!a || !b) continue;

    const name = hybridName(bond.from, bond.to);
    const energy = Math.min(1, ((a.energy ?? 0.5) + (b.energy ?? 0.5)) / 2 + (bond.strength ?? 0.3) * 0.15);

    spawns.push({
      name,
      claim: `Hybrid(${bond.from}, ${bond.to}): ${a.claim || a.name} ⊗ ${b.claim || b.name}`,
      energy: Number(energy.toFixed(4)),
      when: [{
        condition: 'energy > 0.55',
        action: 'emit',
        target: `narrative.hybrid.${name}`
      }],
      tags: ['hybrid', 'auto-spawn'],
      auto: true,
      parents: [bond.from, bond.to],
      bond: key,
      similarity: bond.similarity
    });
  }

  return spawns;
}

function mergeSpawnCells(cells, spawns) {
  const names = new Set(cells.map((c) => c.name));
  const merged = [...cells];
  for (const s of spawns || []) {
    if (names.has(s.name)) continue;
    merged.push(s);
    names.add(s.name);
  }
  return merged;
}

module.exports = {
  spawnFromBonds,
  mergeSpawnCells,
  hybridName
};
