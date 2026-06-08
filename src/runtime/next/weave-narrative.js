'use strict';

function buildDreamCrystallizePatch(dreamFeedback, config = {}) {
  const cfg = config && typeof config === 'object' ? config : {};
  const minDelta = cfg.min_delta ?? cfg.dream_crystallize_delta ?? 0.06;
  const chunks = [];

  for (const row of dreamFeedback?.applied || []) {
    const delta = Math.abs((row.after ?? 0) - (row.before ?? 0));
    if (delta < minDelta) continue;
    chunks.push([
      `# dream crystallize ${row.name} delta=${delta.toFixed(3)}`,
      `CELL ${row.name} {`,
      `  energy: ${Number(row.after).toFixed(2)}`,
      `  claim: "Dream-refined ${row.name}"`,
      `  tags: ["dream-crystallized"]`,
      '}'
    ].join('\n'));
  }

  return chunks.join('\n\n');
}

function buildWeaveNarrative(woven) {
  return (woven || []).map((w) => ({
    into: w.into,
    pattern: w.pattern,
    winners: w.winners || [],
    coherence: w.coherence,
    text: `Weave→${w.into}: [${(w.winners || []).join(', ')}] coherence=${w.coherence}`
  }));
}

module.exports = {
  buildDreamCrystallizePatch,
  buildWeaveNarrative
};
