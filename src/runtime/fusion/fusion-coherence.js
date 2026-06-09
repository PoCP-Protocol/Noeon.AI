'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadConvergenceFromDir,
  DEFAULT_PARITY,
  MATRIX_SCHEMA
} = require('../../core/canonical-convergence');
const { computeSemanticPulse } = require('../../core/canonical-pulse');
const { buildSemanticRelay } = require('./semantic-relay');
const { resolveRelayPolicy } = require('./fusion-relay-policy');

function resolveCoherenceConfig(ast, options = {}) {
  return ast.fusionCoherence ||
    (ast.fusion || []).find((f) => f.target === 'coherence' && f.enabled !== false) ||
    null;
}

function resolveCoherenceDir(cfg, options = {}) {
  const raw = options.coherence_dir || cfg?.dir || cfg?.directory || 'parity';
  if (path.isAbsolute(raw)) return raw;

  const fromCwd = path.resolve(process.cwd(), raw);
  if (fs.existsSync(fromCwd)) return fromCwd;

  if (options.filename || options.source_path) {
    const base = path.dirname(path.resolve(options.filename || options.source_path));
    const fromHub = path.resolve(base, raw);
    if (fs.existsSync(fromHub)) return fromHub;
  }

  return fromCwd;
}

function buildCoherenceManifest(cfg) {
  const surfaces = cfg?.surfaces || cfg?.surface;
  if (!surfaces) return DEFAULT_PARITY;
  const list = Array.isArray(surfaces) ? surfaces : String(surfaces).split(',').map((s) => s.trim());
  return list.map((surface) => {
    const file = cfg?.files?.[surface] || cfg?.[`${surface}_file`] ||
      DEFAULT_PARITY.find((p) => p.surface === surface)?.file ||
      `${surface}.noeon`;
    return { surface, file };
  });
}

function injectCoherenceContext(ast, payload) {
  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};
  ast.cognition.context.semantic_coherence = payload.matrix?.coherence?.score ?? null;
  ast.cognition.context.semantic_aligned = payload.matrix?.aligned ?? false;
  ast.cognition.context.semantic_relay = payload.relay?.action || null;
  if (payload.relay?.composite != null) {
    ast.cognition.context.semantic_relay_score = payload.relay.composite;
  }
  return ast.cognition.context;
}

function runFusionCoherence(ast, options = {}) {
  const cfg = resolveCoherenceConfig(ast, options);
  if (!cfg || cfg.enabled === false) {
    return { enabled: false, skipped: true };
  }

  const dir = resolveCoherenceDir(cfg, options);
  const manifest = buildCoherenceManifest(cfg);
  const matrix = loadConvergenceFromDir(dir, manifest);
  const pulse = computeSemanticPulse(matrix);
  const threshold = Number(cfg.threshold ?? cfg.floor ?? 0.6);
  const policy = resolveRelayPolicy(ast, options);
  const relay = buildSemanticRelay(null, matrix, pulse, {
    threshold: policy?.threshold ?? threshold,
    ...options
  });

  injectCoherenceContext(ast, { matrix, pulse, relay });

  const blocked = cfg.enforce === true && matrix.coherence.score < threshold;

  return {
    enabled: true,
    success: !blocked,
    blocked,
    blockReason: blocked ? 'coherence_below_threshold' : null,
    schema: MATRIX_SCHEMA,
    matrix,
    pulse,
    relay,
    threshold,
    dir,
    summary: matrix.aligned
      ? `Semantic coherence ${matrix.coherence.score} — surfaces aligned`
      : `Semantic drift — coherence ${matrix.coherence.score} (threshold ${threshold})`
  };
}

module.exports = {
  resolveCoherenceConfig,
  resolveCoherenceDir,
  buildCoherenceManifest,
  runFusionCoherence,
  injectCoherenceContext
};
