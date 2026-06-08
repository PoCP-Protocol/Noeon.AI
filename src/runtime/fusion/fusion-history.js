'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join(process.cwd(), 'artifacts', 'fusion');

function historyPath(options = {}) {
  const dir = options.fusion_dir || options.fusion_history_dir || DEFAULT_DIR;
  return path.join(dir, 'history.jsonl');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function recordFusionRun(entry, options = {}) {
  const file = historyPath(options);
  ensureDir(file);
  const row = {
    ts: new Date().toISOString(),
    ...entry
  };
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, 'utf8');
  return row;
}

function readFusionHistory(options = {}) {
  const file = historyPath(options);
  if (!fs.existsSync(file)) return [];

  const limit = options.limit ? Number(options.limit) : 50;
  const since = options.since || null;
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const rows = [];

  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (since && row.ts && row.ts < since) continue;
      rows.push(row);
    } catch {
      // skip corrupt lines
    }
  }

  return rows.slice(-limit).reverse();
}

function summarizeHistoryStats(rows) {
  const byProfile = {};
  const byLayer = {};
  let success = 0;

  for (const row of rows) {
    byProfile[row.profile] = (byProfile[row.profile] || 0) + 1;
    for (const layer of row.layers || []) {
      byLayer[layer] = (byLayer[layer] || 0) + 1;
    }
    if (row.success) success += 1;
  }

  return {
    total: rows.length,
    success,
    byProfile,
    byLayer
  };
}

module.exports = {
  DEFAULT_DIR,
  historyPath,
  recordFusionRun,
  readFusionHistory,
  summarizeHistoryStats
};
