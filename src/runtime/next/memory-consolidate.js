'use strict';

function consolidateEpisodicToSemantic(memory, options = {}) {
  const min = options.consolidate_after ?? 5;
  const episodic = memory?.echoes?.['memory.episodic'] || [];

  if (episodic.length < min) {
    return { consolidated: false, memory, reason: 'insufficient-episodes', count: episodic.length };
  }

  const dominantCounts = {};
  const weaveWinners = {};

  for (const episode of episodic) {
    const dom = episode.dominant?.name;
    if (dom) dominantCounts[dom] = (dominantCounts[dom] || 0) + 1;
    for (const w of (episode.woven || [])) {
      for (const winner of w.winners || []) {
        weaveWinners[winner] = (weaveWinners[winner] || 0) + 1;
      }
    }
  }

  const patterns = Object.entries(dominantCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      pattern: name,
      kind: 'dominant',
      weight: Number((count / episodic.length).toFixed(4)),
      count
    }));

  for (const [name, count] of Object.entries(weaveWinners)) {
    if (patterns.some((p) => p.pattern === name)) continue;
    patterns.push({
      pattern: name,
      kind: 'weave-winner',
      weight: Number((count / episodic.length).toFixed(4)),
      count
    });
  }

  const semantic = {
    patterns,
    consolidated_at: new Date().toISOString(),
    from_episodes: episodic.length
  };

  memory.semantic = semantic;
  memory.echoes = memory.echoes || {};
  memory.echoes['memory.semantic'] = memory.echoes['memory.semantic'] || [];
  memory.echoes['memory.semantic'].push(semantic);
  if (memory.echoes['memory.semantic'].length > 10) {
    memory.echoes['memory.semantic'] = memory.echoes['memory.semantic'].slice(-10);
  }

  return { consolidated: true, memory, patterns, semantic };
}

module.exports = {
  consolidateEpisodicToSemantic
};
