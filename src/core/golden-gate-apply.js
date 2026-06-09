'use strict';

const fs = require('fs');
const path = require('path');
const { resolveRemediateSources, safeRelative } = require('./golden-gate-diff');

const APPLY_SCHEMA = 'noeon.golden.apply/v1';

function readManifest(root) {
  const manifestPath = path.join(root, 'artifacts/golden-gate/remediate.manifest.json');
  if (!fs.existsSync(manifestPath)) return { path: manifestPath, data: null };
  return { path: manifestPath, data: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
}

function writeManifest(manifestPath, data) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2));
}

function applySourceToWorktree(options = {}) {
  const root = options.root || process.cwd();
  const file = String(options.file || '').replace(/\\/g, '/');
  if (!file) throw new Error('file required');

  const target = path.join(root, file);
  safeRelative(root, target);

  const { after, entry } = resolveRemediateSources({ root, file });
  if (!entry?.ok) {
    return { schema: APPLY_SCHEMA, ok: false, file, reason: 'no successful remediate entry for file' };
  }
  if (!after) {
    return { schema: APPLY_SCHEMA, ok: false, file, reason: 'remediated source not found — run remediate first' };
  }
  if (entry.appliedToWorktree === true && !options.force) {
    return { schema: APPLY_SCHEMA, ok: false, file, reason: 'already applied — use force to re-apply', skipped: true };
  }

  let backupPath = null;
  if (options.backup !== false && fs.existsSync(target)) {
    backupPath = `${target}.golden.bak`;
    fs.writeFileSync(backupPath, fs.readFileSync(target, 'utf8'), 'utf8');
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, after, 'utf8');

  const manifest = readManifest(root);
  if (manifest.data) {
    const row = (manifest.data.programs || []).find((p) => p.file === file);
    if (row) {
      row.appliedToWorktree = true;
      row.appliedAt = new Date().toISOString();
      if (backupPath) row.backupPath = path.relative(root, backupPath).replace(/\\/g, '/');
    }
    manifest.data.summary = manifest.data.summary || {};
    manifest.data.summary.applied = (manifest.data.programs || []).filter((p) => p.appliedToWorktree).length;
    writeManifest(manifest.path, manifest.data);
  }

  return {
    schema: APPLY_SCHEMA,
    ok: true,
    file,
    backupPath: backupPath ? path.relative(root, backupPath).replace(/\\/g, '/')
      : null,
    appliedAt: new Date().toISOString(),
    verifyGrade: entry.verify?.grade,
    verifyVerdict: entry.verify?.verdict
  };
}

function applyRemediatedPrograms(options = {}) {
  const root = options.root || process.cwd();
  const manifest = readManifest(root);
  if (!manifest.data?.programs?.length) {
    return {
      schema: APPLY_SCHEMA,
      ok: false,
      reason: 'no remediate manifest — run remediate first',
      applied: [],
      skipped: [],
      failed: []
    };
  }

  let targets = manifest.data.programs.filter((p) => p.ok && (p.suggestedSource || p.artifactPath));
  if (options.file) {
    targets = targets.filter((p) => p.file === String(options.file).replace(/\\/g, '/'));
  } else if (!options.all) {
    return {
      schema: APPLY_SCHEMA,
      ok: false,
      reason: 'specify file or all=true',
      applied: [],
      skipped: [],
      failed: []
    };
  }

  const applied = [];
  const skipped = [];
  const failed = [];

  for (const row of targets) {
    const result = applySourceToWorktree({
      root,
      file: row.file,
      backup: options.backup,
      force: options.force
    });
    if (result.ok) applied.push(result);
    else if (result.skipped) skipped.push(result);
    else failed.push(result);
  }

  return {
    schema: APPLY_SCHEMA,
    ok: applied.length > 0,
    applied,
    skipped,
    failed,
    summary: { attempted: targets.length, applied: applied.length, skipped: skipped.length, failed: failed.length }
  };
}

module.exports = {
  APPLY_SCHEMA,
  applySourceToWorktree,
  applyRemediatedPrograms,
  readManifest
};
