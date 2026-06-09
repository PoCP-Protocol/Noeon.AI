'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GATE_SCHEMA = 'noeon.human.gate/v1';

function gateDir(options = {}) {
  return options.human_gate_dir || path.join(process.cwd(), 'artifacts', 'human-gates');
}

function pendingFile(options = {}) {
  return path.join(gateDir(options), 'pending.jsonl');
}

function ensureDir(options) {
  const dir = gateDir(options);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readPendingLines(options = {}) {
  const file = pendingFile(options);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
}

function writePendingLines(lines, options = {}) {
  ensureDir(options);
  fs.writeFileSync(pendingFile(options), `${lines.join('\n')}\n`, 'utf8');
}

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function createPendingGate(payload, options = {}) {
  ensureDir(options);
  const entry = {
    schema: GATE_SCHEMA,
    id: crypto.randomBytes(8).toString('hex'),
    token: crypto.randomBytes(16).toString('hex'),
    status: 'pending',
    createdAt: new Date().toISOString(),
    action: payload.action || null,
    kind: payload.kind || null,
    relay: payload.relay || null,
    goal: payload.goal || null,
    file: payload.file || null,
    surface: payload.surface || null,
    evidence_count: payload.evidence_count,
    confidence: payload.confidence,
    threshold: payload.threshold,
    message: payload.message || 'Human approval required'
  };
  fs.appendFileSync(pendingFile(options), `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

function listPendingGates(options = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 50, 200));
  return readPendingLines(options)
    .map(parseLine)
    .filter((e) => e && e.status === 'pending')
    .slice(-limit);
}

function findGateById(id, options = {}) {
  return readPendingLines(options).map(parseLine).find((e) => e?.id === id) || null;
}

function findGateByToken(token, options = {}) {
  return readPendingLines(options).map(parseLine).find((e) => e?.token === token) || null;
}

function updateGateStatus(id, status, options = {}) {
  const lines = readPendingLines(options);
  let updated = null;
  const next = lines.map((line) => {
    const entry = parseLine(line);
    if (!entry || entry.id !== id) return line;
    updated = {
      ...entry,
      status,
      resolvedAt: new Date().toISOString(),
      resolver: options.resolver || 'cli'
    };
    return JSON.stringify(updated);
  });
  writePendingLines(next, options);
  return updated;
}

function approveGate(id, options = {}) {
  return updateGateStatus(id, 'approved', options);
}

function rejectGate(id, options = {}) {
  return updateGateStatus(id, 'rejected', options);
}

function consumeApprovalToken(token, options = {}) {
  const gate = findGateByToken(token, options);
  if (!gate || gate.status !== 'pending') return null;
  return approveGate(gate.id, { ...options, resolver: 'token' });
}

function formatGateList(gates) {
  if (!gates.length) return 'No pending human gates.';
  return gates.map((g) =>
    `  ${g.id}  ${g.createdAt?.slice(0, 19) || '—'}  action=${g.action || '—'}  file=${g.file || '—'}`
  ).join('\n');
}

module.exports = {
  GATE_SCHEMA,
  createPendingGate,
  listPendingGates,
  findGateById,
  findGateByToken,
  approveGate,
  rejectGate,
  consumeApprovalToken,
  formatGateList,
  pendingFile
};
