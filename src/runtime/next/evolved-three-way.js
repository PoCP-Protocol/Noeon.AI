'use strict';

const {
  splitEvolvedLayers,
  listConstructs,
  extractCellBlock,
  diffEvolvedSources
} = require('./evolved-sync');

function mapCellBlocks(source) {
  const layer = splitEvolvedLayers(source);
  const map = new Map();

  for (const name of listConstructs(layer.base, 'cell')) {
    const block = extractCellBlock(layer.base, name);
    if (block) map.set(name, block.trim());
  }
  for (const patch of layer.patchBodies) {
    for (const name of listConstructs(patch, 'cell')) {
      const block = extractCellBlock(patch, name);
      if (block) map.set(name, block.trim());
    }
  }
  return map;
}

function mapBondLines(source) {
  const layer = splitEvolvedLayers(source);
  const combined = [layer.base, ...layer.patchBodies].join('\n\n');
  const re = /^BOND\s+.+/gm;
  const lines = [];
  let m;
  while ((m = re.exec(combined)) !== null) lines.push(m[0].trim());
  return lines;
}

function extractCellEnergy(block) {
  const m = String(block || '').match(/energy:\s*([\d.]+)/i);
  return m ? Number(m[1]) : 0.5;
}

function resolveConflictSmart(conflict, prefer = 'ours') {
  const eOurs = extractCellEnergy(conflict.ours);
  const eTheirs = extractCellEnergy(conflict.theirs);
  if (eOurs > eTheirs) return { block: conflict.ours, source: 'ours', reason: 'energy', energy: eOurs };
  if (eTheirs > eOurs) return { block: conflict.theirs, source: 'theirs', reason: 'energy', energy: eTheirs };
  const pick = prefer === 'theirs' ? conflict.theirs : conflict.ours;
  return { block: pick, source: prefer, reason: 'tie', energy: extractCellEnergy(pick) };
}

function threeWayCellMerge(baseMap, oursMap, theirsMap, strategy = 'union') {
  const allNames = new Set([...baseMap.keys(), ...oursMap.keys(), ...theirsMap.keys()]);
  const merged = [];
  const conflicts = [];
  const resolved = [];

  for (const name of allNames) {
    const base = baseMap.get(name);
    const ours = oursMap.get(name);
    const theirs = theirsMap.get(name);

    if (ours && theirs && ours !== theirs && base !== ours && base !== theirs) {
      if (strategy === 'smart') {
        const pick = resolveConflictSmart({ name, base, ours, theirs });
        merged.push({ name, block: pick.block, source: pick.source, resolved: pick.reason });
        resolved.push({ name, ...pick });
        continue;
      }
      conflicts.push({ type: 'cell', name, base, ours, theirs });
      continue;
    }
    if (ours && theirs && ours === theirs && base !== ours) {
      merged.push({ name, block: ours, source: 'both' });
      continue;
    }
    if (ours && (!base || ours !== base)) merged.push({ name, block: ours, source: 'ours' });
    else if (theirs && (!base || theirs !== base)) merged.push({ name, block: theirs, source: 'theirs' });
    else if (base) merged.push({ name, block: base, source: 'base' });
  }

  merged.sort((a, b) => a.name.localeCompare(b.name));
  return { cells: merged, conflicts, resolved };
}

function mergeEvolvedThreeWay(baseSource, oursSource, theirsSource, strategy = 'union') {
  const baseLayer = splitEvolvedLayers(baseSource);
  const baseMap = mapCellBlocks(baseSource);
  const oursMap = mapCellBlocks(oursSource);
  const theirsMap = mapCellBlocks(theirsSource);

  const { cells, conflicts, resolved } = threeWayCellMerge(baseMap, oursMap, theirsMap, strategy);
  const oursBonds = mapBondLines(oursSource);
  const theirsBonds = mapBondLines(theirsSource);
  const baseBonds = new Set(mapBondLines(baseSource));
  const extraBonds = [...oursBonds, ...theirsBonds].filter((b) => {
    const nameMatch = b.match(/^BOND\s+(\S+)/);
    return nameMatch && !baseBonds.has(b);
  });
  const uniqueBonds = [...new Set(extraBonds)];

  if (strategy === 'base-wins') {
    return { merged: baseLayer.base.trim(), conflicts, strategy, diff: diffEvolvedSources(baseSource, oursSource) };
  }

  if (conflicts.length > 0 && strategy === 'union') {
    const conflictBlocks = conflicts.map((c) => [
      `<<<<<<< base`,
      c.base || `# (missing in base)`,
      `======= ours`,
      c.ours,
      `======= theirs`,
      c.theirs,
      `>>>>>>> conflict`
    ].join('\n'));
    const merged = [
      baseLayer.base.trim(),
      '',
      '# --- three-way merge conflicts ---',
      conflictBlocks.join('\n\n'),
      '',
      '# --- merged additions ---',
      ...cells.filter((c) => c.source !== 'base').map((c) => c.block),
      '',
      ...uniqueBonds
    ].join('\n');
    return { merged, conflicts, resolved, strategy, hasConflictMarkers: true, addedCells: cells.filter((c) => c.source !== 'base').length };
  }

  const smartNote = strategy === 'smart' && resolved.length
    ? [`# --- smart-resolved (${resolved.length}) ---`, ...resolved.map((r) => `# ${r.name}: ${r.source} (${r.reason}, energy=${r.energy})`)].join('\n')
    : null;

  const merged = [
    baseLayer.base.trim(),
    '',
    smartNote,
    '# --- three-way merge ---',
    ...cells.filter((c) => c.source !== 'base').map((c) => c.block),
    '',
    ...uniqueBonds
  ].filter(Boolean).join('\n');

  return {
    merged,
    conflicts,
    resolved,
    strategy,
    hasConflictMarkers: false,
    addedCells: cells.filter((c) => c.source !== 'base').length,
    bonds: uniqueBonds.length
  };
}

function formatThreeWayReport(result) {
  return [
    '# Three-way merge report',
    `Strategy: ${result.strategy}`,
    `Added cells: ${result.addedCells ?? 0}`,
    `Extra bonds: ${result.bonds ?? 0}`,
    `Conflicts: ${result.conflicts.length}`,
    `Smart resolved: ${result.resolved?.length ?? 0}`,
    result.hasConflictMarkers ? '(conflict markers written)' : ''
  ].filter(Boolean).join('\n');
}

module.exports = {
  mapCellBlocks,
  mergeEvolvedThreeWay,
  formatThreeWayReport,
  threeWayCellMerge,
  resolveConflictSmart,
  extractCellEnergy
};
