'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join(process.cwd(), 'artifacts', 'field-memory');

function ensureDir(dir = DEFAULT_DIR) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function memoryPath(programKey, options = {}) {
  const safe = String(programKey || 'default').replace(/[^\w.-]+/g, '_');
  return path.join(ensureDir(options.dir || DEFAULT_DIR), `${safe}.json`);
}

function emptyMemory(programKey) {
  return {
    program: programKey,
    runs: 0,
    updated_at: null,
    cells: {},
    dominant_history: [],
    echoes: {}
  };
}

function loadFieldMemory(programKey, options = {}) {
  const file = memoryPath(programKey, options);
  if (!fs.existsSync(file)) return emptyMemory(programKey);
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...emptyMemory(programKey), ...data, program: programKey };
  } catch {
    return emptyMemory(programKey);
  }
}

function saveFieldMemory(programKey, memory, options = {}) {
  const file = memoryPath(programKey, options);
  const payload = {
    ...memory,
    program: programKey,
    updated_at: new Date().toISOString(),
    runs: (memory.runs || 0) + 1
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

function parseDecayMs(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim().toLowerCase();
  const m = text.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/);
  if (!m) return null;
  const num = Number(m[1]);
  const unit = m[2] || 'h';
  const mult = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (mult[unit] || 3600000);
}

function applyDecayEnergy(storedEnergy, lastRunAt, decayMs, now = Date.now()) {
  if (decayMs == null || !lastRunAt) return storedEnergy;
  const elapsed = now - new Date(lastRunAt).getTime();
  if (elapsed <= 0) return storedEnergy;
  const factor = Math.exp(-elapsed / decayMs);
  return storedEnergy * factor + 0.5 * (1 - factor);
}

function applyFieldMemoryToCells(cells, memory, fieldConfig = {}) {
  if (!memory?.cells || !Object.keys(memory.cells).length) {
    return { cells, restored: [], decayMs: null };
  }

  const decayMs = parseDecayMs(fieldConfig.decay);
  const restored = [];
  const next = cells.map((cell) => {
    const stored = memory.cells[cell.name];
    if (!stored) return cell;
    const energy = applyDecayEnergy(stored.energy ?? cell.energy, memory.updated_at, decayMs);
    restored.push({
      name: cell.name,
      before: cell.energy,
      after: Number(energy.toFixed(4)),
      from_memory: true
    });
    return {
      ...cell,
      energy: Number(energy.toFixed(4)),
      claim: stored.claim || cell.claim
    };
  });

  return { cells: next, restored, decayMs };
}

function snapshotFieldState(field, meta = {}) {
  const cells = {};
  for (const c of field?.cells || []) {
    cells[c.name] = { energy: c.energy, claim: c.claim };
  }
  return {
    at: new Date().toISOString(),
    dominant: field?.dominant || null,
    cells,
    woven: field?.woven || [],
    dream_feedback: (field?.dreamFeedback?.applied || []).length,
    ...meta
  };
}

function mergeMemoryFromField(memory, field) {
  const snap = snapshotFieldState(field);
  memory.cells = { ...memory.cells, ...snap.cells };
  if (field?.dominant) {
    memory.dominant_history = memory.dominant_history || [];
    memory.dominant_history.push({
      name: field.dominant.name,
      energy: field.dominant.energy,
      at: snap.at
    });
    if (memory.dominant_history.length > 30) {
      memory.dominant_history = memory.dominant_history.slice(-30);
    }
  }
  memory.last_snapshot = snap;
  return memory;
}

function resolveEchoSource(from, field, context = {}) {
  if (String(from).toLowerCase() === 'last_run') {
    return snapshotFieldState(field, { run: context.runCount });
  }
  return { source: from, at: new Date().toISOString() };
}

function executeEchoes(echoes, field, memory, context = {}) {
  const written = [];
  for (const echo of echoes || []) {
    const payload = resolveEchoSource(echo.from, field, context);
    const slot = echo.into;
    memory.echoes = memory.echoes || {};
    memory.echoes[slot] = memory.echoes[slot] || [];
    memory.echoes[slot].push(payload);
    if (memory.echoes[slot].length > 20) {
      memory.echoes[slot] = memory.echoes[slot].slice(-20);
    }
    written.push({ from: echo.from, into: slot, ok: true });
  }
  return { memory, written };
}

module.exports = {
  DEFAULT_DIR,
  loadFieldMemory,
  saveFieldMemory,
  memoryPath,
  parseDecayMs,
  applyDecayEnergy,
  applyFieldMemoryToCells,
  snapshotFieldState,
  mergeMemoryFromField,
  executeEchoes
};
