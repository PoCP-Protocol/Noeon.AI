'use strict';

const fs = require('fs');
const path = require('path');
const { publishEvent } = require('./mycelium-bus');

const DEFAULT_DIR = path.join(process.cwd(), 'artifacts', 'mycelium');

function ensureDir(dir = DEFAULT_DIR) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clusterPath(cluster, dir = DEFAULT_DIR) {
  const safe = String(cluster).replace(/[^\w.-]+/g, '_');
  return path.join(ensureDir(dir), `${safe}.json`);
}

function loadCluster(cluster, options = {}) {
  const file = clusterPath(cluster, options.dir);
  if (!fs.existsSync(file)) return { cluster, cells: [], programs: [] };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { cluster, cells: [], programs: [] };
  }
}

function saveCluster(cluster, data, options = {}) {
  const file = clusterPath(cluster, options.dir);
  fs.writeFileSync(file, JSON.stringify({ ...data, cluster, updated_at: new Date().toISOString() }, null, 2), 'utf8');
  return file;
}

function publishCells(cluster, program, cells, options = {}) {
  const existing = loadCluster(cluster, options);
  const stamped = (cells || []).map((c) => ({
    name: c.name,
    claim: c.claim,
    energy: c.energy,
    tags: c.tags || ['public'],
    program,
    published_at: new Date().toISOString()
  }));
  const merged = [...existing.cells.filter((c) => c.program !== program), ...stamped];
  const programs = [...new Set([...(existing.programs || []), program])];
  saveCluster(cluster, { cells: merged, programs }, options);
  publishEvent(cluster, {
    type: 'cells.published',
    program,
    count: stamped.length,
    cell_names: stamped.map((c) => c.name)
  }, options);
  return stamped.length;
}

function matchPattern(name, pattern) {
  if (!pattern) return false;
  if (pattern === '*' || pattern === name) return true;
  if (pattern.startsWith('tagged=')) return true;
  if (pattern.endsWith('*')) return name.startsWith(pattern.slice(0, -1));
  return false;
}

function matchesFilter(cell, filter) {
  if (typeof filter === 'string') {
    if (filter.startsWith('tagged=')) {
      const tag = filter.slice('tagged='.length);
      return (cell.tags || []).includes(tag);
    }
    return matchPattern(cell.name, filter);
  }
  return false;
}

function absorbFromCluster(mycelium, clusterData, localProgram) {
  const absorbed = [];
  const rejected = [];

  for (const m of mycelium || []) {
    const filters = m.absorb || m.share || [];
    for (const cell of clusterData.cells || []) {
      if (cell.program === localProgram) continue;
      const allowed = filters.some((f) => matchesFilter(cell, f));
      const isolated = (m.isolate || []).some((f) => matchesFilter(cell, f));
      if (isolated) {
        rejected.push({ cell: cell.name, reason: 'isolated' });
        continue;
      }
      if (allowed) {
        absorbed.push({
          name: `${cell.program}__${cell.name}`,
          claim: cell.claim,
          energy: Math.min(1, (cell.energy ?? 0.5) * 0.85),
          provenance: cell.program,
          tags: cell.tags || []
        });
      }
    }
  }
  return { absorbed, rejected };
}

module.exports = {
  DEFAULT_DIR,
  loadCluster,
  saveCluster,
  publishCells,
  absorbFromCluster,
  matchPattern
};
