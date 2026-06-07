'use strict';

const HOT_RELOAD_MARKER = /# --- noeon hot-reload /;

function listConstructs(source, kind) {
  const re = kind === 'cell'
    ? /^CELL\s+([a-zA-Z_][\w]*)\s*\{/gm
    : /^BOND\s+([a-zA-Z_][\w]*)[\s<->]/gm;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractCellBlock(source, name) {
  const re = new RegExp(`^CELL\\s+${name}\\s*\\{`, 'm');
  const match = re.exec(source);
  if (!match) return null;
  const start = match.index;
  let depth = 0;
  let end = start;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  return source.slice(start, end);
}

function splitEvolvedLayers(source) {
  const parts = source.split(HOT_RELOAD_MARKER);
  if (parts.length === 1) {
    return { base: source, patches: [], patchBodies: [] };
  }
  const base = parts[0].trim();
  const patchBodies = parts.slice(1).map((p) => p.replace(/^[^\n]*\n/, '').trim());
  return { base, patches: parts.slice(1), patchBodies };
}

function diffEvolvedSources(baseSource, evolvedSource) {
  const baseLayer = splitEvolvedLayers(baseSource);
  const evoLayer = splitEvolvedLayers(evolvedSource);

  const baseCells = new Set(listConstructs(baseLayer.base, 'cell'));
  const baseBonds = new Set(listConstructs(baseLayer.base, 'bond'));

  const added = { cells: [], bonds: [], sections: evoLayer.patches.length };
  const conflicts = [];

  for (const patch of evoLayer.patchBodies) {
    for (const name of listConstructs(patch, 'cell')) {
      if (baseCells.has(name)) {
        const baseBlock = extractCellBlock(baseLayer.base, name);
        const evoBlock = extractCellBlock(patch, name) || extractCellBlock(evolvedSource, name);
        if (baseBlock && evoBlock && baseBlock.trim() !== evoBlock.trim()) {
          conflicts.push({ type: 'cell', name, base: baseBlock.trim(), evolved: evoBlock.trim() });
        }
      } else {
        added.cells.push(name);
      }
    }
    for (const name of listConstructs(patch, 'bond')) {
      if (baseBonds.has(name)) {
        conflicts.push({ type: 'bond', name, reason: 'duplicate-bond-name' });
      } else {
        added.bonds.push(name);
      }
    }
  }

  return {
    baseCellCount: baseCells.size,
    evolvedCellCount: listConstructs(evolvedSource, 'cell').length,
    hotReloadSections: evoLayer.patches.length,
    added,
    conflicts,
    clean: conflicts.length === 0
  };
}

function mergeEvolvedSources(baseSource, evolvedSource, strategy = 'union') {
  const diff = diffEvolvedSources(baseSource, evolvedSource);
  const evoLayer = splitEvolvedLayers(evolvedSource);

  if (strategy === 'base-wins') {
    return { merged: baseSource.trim(), diff, strategy, conflicts: diff.conflicts };
  }

  if (strategy === 'evolved-wins') {
    return { merged: evolvedSource.trim(), diff, strategy, conflicts: diff.conflicts };
  }

  if (diff.conflicts.length > 0 && strategy === 'union') {
    const conflictBlocks = diff.conflicts.map((c) => {
      if (c.type !== 'cell') return `# CONFLICT bond ${c.name}`;
      return [
        `<<<<<<< base`,
        c.base,
        `=======`,
        c.evolved,
        `>>>>>>> evolved`
      ].join('\n');
    });
    const merged = [
      splitEvolvedLayers(baseSource).base.trim(),
      '',
      '# --- merge conflicts ---',
      conflictBlocks.join('\n\n'),
      '',
      '# --- hot-reload patches (non-conflicting) ---',
      ...evoLayer.patchBodies
    ].join('\n');
    return { merged, diff, strategy, conflicts: diff.conflicts, hasConflictMarkers: true };
  }

  const merged = evolvedSource.trim();
  return { merged, diff, strategy, conflicts: [], hasConflictMarkers: false };
}

function formatDiffReport(diff, paths = {}) {
  const lines = [
    `# Evolved diff${paths.base ? `: ${paths.base}` : ''}`,
    '',
    `Base cells: ${diff.baseCellCount}`,
    `Evolved cells: ${diff.evolvedCellCount}`,
    `Hot-reload sections: ${diff.hotReloadSections}`,
    `Added cells: ${diff.added.cells.join(', ') || '(none)'}`,
    `Added bonds: ${diff.added.bonds.join(', ') || '(none)'}`,
    `Conflicts: ${diff.conflicts.length}`,
    ''
  ];
  for (const c of diff.conflicts) {
    if (c.type === 'cell') {
      lines.push(`## CONFLICT cell ${c.name}`);
      lines.push('--- base');
      lines.push(c.base);
      lines.push('--- evolved');
      lines.push(c.evolved);
      lines.push('');
    } else {
      lines.push(`## CONFLICT ${c.type} ${c.name}: ${c.reason}`);
    }
  }
  return lines.join('\n');
}

module.exports = {
  splitEvolvedLayers,
  diffEvolvedSources,
  mergeEvolvedSources,
  formatDiffReport,
  listConstructs,
  extractCellBlock
};
