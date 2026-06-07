'use strict';

const fs = require('fs');
const path = require('path');
const { expandNextSource } = require('../../grammar/next/macro-registry');

const DEFAULT_EVOLVED_DIR = path.join(process.cwd(), 'artifacts', 'evolved');

function evolvedPath(sourcePath, options = {}) {
  const base = path.resolve(sourcePath);
  if (options.evolved_dir) {
    const name = path.basename(base);
    return path.join(path.resolve(options.evolved_dir), `${name}.evolved`);
  }
  return `${base}.evolved`;
}

function readSourceWithEvolved(sourcePath, options = {}) {
  const resolved = path.resolve(sourcePath);
  const evo = evolvedPath(resolved, options);
  if (options.prefer_evolved !== false && fs.existsSync(evo)) {
    const evoStat = fs.statSync(evo);
    const baseStat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
    if (!baseStat || evoStat.mtimeMs >= baseStat.mtimeMs) {
      return { source: fs.readFileSync(evo, 'utf8'), path: evo, evolved: true };
    }
  }
  return { source: fs.readFileSync(resolved, 'utf8'), path: resolved, evolved: false };
}

function formatBondLine(bond) {
  const sym = bond.bidirectional !== false ? '<->' : '->';
  return `BOND ${bond.from} ${sym} ${bond.to} strength=${bond.strength} kind=${bond.kind || 'resonates'} # auto-generated`;
}

function formatFluxPatch(fluxCrystal) {
  const macro = fluxCrystal.macro;
  if (!macro?.body) return '';
  return [
    `# flux crystallize from ${fluxCrystal.flux || 'flux'}`,
    macro.body
  ].join('\n');
}

function formatSpawnCell(spawn) {
  const claim = String(spawn.claim || spawn.name).replace(/"/g, '\\"');
  const tags = (spawn.tags || ['hybrid', 'auto-spawn']).map((t) => `"${t}"`).join(', ');
  return [
    `CELL ${spawn.name} {`,
    `  energy: ${Number(spawn.energy ?? 0.6).toFixed(2)}`,
    `  claim: "${claim}"`,
    `  tags: [${tags}]`,
    `  when energy > 0.55 { emit narrative.hybrid } # auto-spawn`,
    '}'
  ].join('\n');
}

function buildHotReloadPatch({ fluxCrystals = [], autoBonds = [], autoSpawns = [], field = null } = {}) {
  const chunks = [];
  for (const crystal of fluxCrystals) {
    const block = formatFluxPatch(crystal);
    if (block) chunks.push(block);
  }
  for (const spawn of autoSpawns) {
    chunks.push(formatSpawnCell(spawn));
  }
  for (const bond of autoBonds) {
    chunks.push(formatBondLine(bond));
  }
  if (field?.dominant && !chunks.length) {
    chunks.push([
      `# dominant emergence ${field.dominant.name}`,
      `CELL ${field.dominant.name}_echo {`,
      `  energy: ${Number(field.dominant.energy).toFixed(2)}`,
      `  claim: "Echo of dominant cell ${field.dominant.name}"`,
      `  when energy > 0.5 { emit narrative.echo }`,
      '}'
    ].join('\n'));
  }
  return chunks.filter(Boolean).join('\n\n');
}

function applyHotReload(sourcePath, patch, options = {}) {
  if (!patch || !patch.trim()) {
    return { applied: false, reason: 'empty-patch' };
  }

  const resolved = path.resolve(sourcePath);
  const target = evolvedPath(resolved, options);
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const header = [
    `# --- noeon hot-reload ${new Date().toISOString()} ---`,
    `# source: ${path.basename(resolved)}`,
    ''
  ].join('\n');

  let base = '';
  if (fs.existsSync(target)) base = fs.readFileSync(target, 'utf8');
  else if (fs.existsSync(resolved)) base = fs.readFileSync(resolved, 'utf8');

  if (base.includes(patch.trim())) {
    return { applied: false, reason: 'duplicate-patch', path: target };
  }

  const next = `${base.trim()}\n\n${header}${patch}\n`;
  fs.writeFileSync(target, next, 'utf8');

  let expanded = null;
  try {
    expanded = expandNextSource(next, { expandMacros: true });
  } catch {
    expanded = null;
  }

  return {
    applied: true,
    path: target,
    bytes: Buffer.byteLength(next, 'utf8'),
    expanded: expanded?.macrosUsed || []
  };
}

module.exports = {
  DEFAULT_EVOLVED_DIR,
  evolvedPath,
  readSourceWithEvolved,
  buildHotReloadPatch,
  applyHotReload
};
