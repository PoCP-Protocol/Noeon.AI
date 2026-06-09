'use strict';

const fs = require('fs');
const path = require('path');
const { formatUnifiedDiff } = require('./patch-preview');

const GOLDEN_DIFF_SCHEMA = 'noeon.golden.diff/v1';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function safeRelative(root, filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (rel.startsWith('..')) throw new Error('path escapes project root');
  return rel;
}

function resolveRemediateSources(options = {}) {
  const root = options.root || process.cwd();
  const file = String(options.file || '').replace(/\\/g, '/');
  if (!file) throw new Error('file required');

  const filePath = path.join(root, file);
  const gateDir = path.join(root, 'artifacts/golden-gate');
  const manifest = readJsonIfExists(path.join(gateDir, 'remediate.manifest.json'));
  const entry = (manifest?.programs || []).find((p) => p.file === file) || null;

  let before = options.before ?? null;
  if (before == null && fs.existsSync(filePath)) {
    before = fs.readFileSync(filePath, 'utf8');
  }

  let after = options.after ?? null;
  if (after == null && entry?.suggestedSource) {
    after = entry.suggestedSource;
  }
  if (after == null && entry?.artifactPath) {
    const artifact = path.join(root, entry.artifactPath);
    if (fs.existsSync(artifact)) after = fs.readFileSync(artifact, 'utf8');
  }

  return { root, file, before, after, entry, manifest, artifactPath: entry?.artifactPath || null };
}

function countDiffLines(diff) {
  const lines = String(diff || '').split('\n');
  return {
    added: lines.filter((l) => l.startsWith('+')).length,
    removed: lines.filter((l) => l.startsWith('-')).length
  };
}

function buildGoldenGateDiff(options = {}) {
  const { file, before, after, entry, artifactPath } = resolveRemediateSources(options);

  if (before == null) {
    return { schema: GOLDEN_DIFF_SCHEMA, ok: false, file, reason: 'original source not found' };
  }
  if (after == null) {
    return { schema: GOLDEN_DIFF_SCHEMA, ok: false, file, reason: 'remediated artifact not found — run remediate first' };
  }

  const diff = options.diff || formatUnifiedDiff(before, after, file);
  const stats = countDiffLines(diff);

  return {
    schema: GOLDEN_DIFF_SCHEMA,
    ok: true,
    file,
    artifactPath,
    diff,
    diffPreview: diff.length > 800 ? `${diff.slice(0, 800)}\n… (${diff.length - 800} more chars)` : diff,
    stats,
    remediate: entry
      ? {
          ok: entry.ok,
          verifyGrade: entry.verify?.grade,
          verifyVerdict: entry.verify?.verdict,
          staticDelta: entry.staticLens?.delta
        }
      : null
  };
}

function listGoldenGateDiffs(options = {}) {
  const root = options.root || process.cwd();
  const manifest = readJsonIfExists(path.join(root, 'artifacts/golden-gate/remediate.manifest.json'));
  const gate = readJsonIfExists(path.join(root, 'artifacts/golden-gate/golden-gate.latest.json'));

  const files = new Set();
  for (const p of manifest?.programs || []) {
    if (p.ok && (p.artifactPath || p.suggestedSource)) files.add(p.file);
  }
  for (const p of gate?.programs || []) {
    if (!p.ok && p.patchPreview?.diff) files.add(p.file);
  }

  return [...files].map((file) => {
    try {
      const d = buildGoldenGateDiff({ root, file });
      return {
        file,
        ok: d.ok,
        hasDiff: Boolean(d.diff),
        stats: d.stats,
        artifactPath: d.artifactPath
      };
    } catch {
      return { file, ok: false, hasDiff: false };
    }
  });
}

module.exports = {
  GOLDEN_DIFF_SCHEMA,
  resolveRemediateSources,
  buildGoldenGateDiff,
  listGoldenGateDiffs,
  countDiffLines,
  safeRelative
};
