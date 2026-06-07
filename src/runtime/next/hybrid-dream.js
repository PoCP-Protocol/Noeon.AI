'use strict';

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function selectHybridSubgraph(cells) {
  const hybrids = cells.filter((c) =>
    (c.tags || []).includes('hybrid') ||
    (c.tags || []).includes('auto-spawn') ||
    c.auto === true
  );
  if (!hybrids.length) return { hybrids: [], subgraph: [] };

  const names = new Set();
  for (const h of hybrids) {
    names.add(h.name);
    for (const p of h.parents || []) names.add(p);
  }
  return {
    hybrids,
    subgraph: cells.filter((c) => names.has(c.name))
  };
}

function runDreamBranch(cells, branchId, depth, mergeBy) {
  let state = cells.map((c) => ({ name: c.name, energy: c.energy ?? 0.5, claim: c.claim }));
  for (let d = 0; d < depth; d += 1) {
    state = state.map((c) => ({
      ...c,
      energy: clamp(c.energy + (Math.random() - 0.5) * 0.18 * (1 + branchId * 0.05))
    }));
  }
  const score = mergeBy === 'energy'
    ? state.reduce((s, c) => s + c.energy, 0)
    : state.reduce((s, c) => s + c.energy * c.energy, 0);
  return { id: branchId, cells: state, score: Number(score.toFixed(4)) };
}

function runHybridDreams(cells, dreams, config = {}) {
  const { hybrids, subgraph } = selectHybridSubgraph(cells);
  if (hybrids.length === 0 || subgraph.length < 2) return [];

  const hybridDreams = (dreams || []).filter((d) => d.on === 'hybrid' || d.hybrid === true);
  const targets = hybridDreams.length
    ? hybridDreams
    : (config?.spawn !== false ? [{ name: 'hybrid_auto', branches: 3, depth: 2, merge_by: 'coherence', on: 'hybrid' }] : []);

  const results = [];
  for (const dream of targets) {
    const branches = [];
    const n = dream.branches || 3;
    const depth = dream.depth || 2;
    const mergeBy = dream.merge_by || 'coherence';

    for (let b = 0; b < n; b += 1) {
      branches.push(runDreamBranch(subgraph, b, depth, mergeBy));
    }
    branches.sort((a, b) => b.score - a.score);

    results.push({
      name: dream.name,
      kind: 'hybrid',
      hybridCount: hybrids.length,
      parents: [...new Set(hybrids.flatMap((h) => h.parents || []))],
      branches: n,
      depth,
      merge_by: mergeBy,
      dominant: branches[0],
      subgraph: subgraph.map((c) => c.name)
    });
  }
  return results;
}

module.exports = {
  selectHybridSubgraph,
  runHybridDreams,
  runDreamBranch
};
