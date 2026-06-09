'use strict';

const fs = require('fs');
const path = require('path');

const MAX_READ_BYTES = 256 * 1024;
const MAX_WRITE_BYTES = 128 * 1024;

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function parseCsvList(value) {
  if (!value) return [];
  return String(value).split(',').map((v) => v.trim()).filter(Boolean);
}

function resolveRoot(binding) {
  return path.resolve(binding.root || process.env.NOEON_FS_ROOT || process.cwd());
}

function resolveAllowlist(binding, root) {
  const fromBinding = parseCsvList(binding.allow_paths);
  const fromEnv = parseCsvList(process.env.NOEON_FS_ALLOWLIST);
  const list = fromBinding.length > 0 ? fromBinding : fromEnv;
  return list.map((entry) => path.resolve(root, entry));
}

function resolveTargetPath(binding, root) {
  const raw = binding.path || binding.file || binding.target;
  if (!raw) {
    const err = new Error('fs path is required');
    err.code = 'FS_BLOCKED';
    throw err;
  }
  const resolved = path.resolve(root, String(raw));
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    const err = new Error(`path '${raw}' escapes sandbox root`);
    err.code = 'FS_BLOCKED';
    throw err;
  }
  return resolved;
}

function pathAllowed(resolved, allowlist) {
  if (!allowlist.length) return true;
  return allowlist.some((allowed) => resolved === allowed || resolved.startsWith(`${allowed}${path.sep}`));
}

function buildFailure({ reason, latencyMs, errorCode, failureCategory = 'execution_error', pluginMeta }) {
  return {
    status: 'failed',
    reason,
    latencyMs: Math.max(1, Math.round(latencyMs)),
    failureCategory,
    pluginMeta,
    errorCode
  };
}

function buildAuditMeta({ op, path: filePath, bytes, durationMs, mocked, encoding }) {
  return {
    template: 'fs_call',
    op,
    path: filePath,
    bytes,
    durationMs,
    mocked: !!mocked,
    encoding: encoding || 'utf8'
  };
}

function executeMock({ binding, targetPath, op, latencyMs }) {
  const bytes = op === 'write' ? Buffer.byteLength(String(binding.content || binding.body || '')) : 64;
  return {
    status: 'done',
    reason: `fs ${op} succeeded (mock)`,
    latencyMs,
    failureCategory: null,
    pluginMeta: buildAuditMeta({
      op,
      path: targetPath,
      bytes,
      durationMs: latencyMs,
      mocked: true
    })
  };
}

async function execute({ stepName, binding = {}, feedback = {} }) {
  const started = Date.now();
  const op = String(binding.op || binding.operation || 'read').toLowerCase();
  const latencyMs = Number(binding.latencyMs || 100);
  const mockEnabled =
    normalizeBoolean(binding.mock, false) ||
    normalizeBoolean(process.env.NOEON_FS_MOCK, false);

  const root = resolveRoot(binding);
  let targetPath;
  try {
    targetPath = resolveTargetPath(binding, root);
  } catch (err) {
    return buildFailure({
      reason: err.message,
      latencyMs: Date.now() - started,
      errorCode: err.code || 'FS_BLOCKED',
      failureCategory: 'policy_block',
      pluginMeta: buildAuditMeta({ op, path: binding.path || null, bytes: 0, durationMs: 0, mocked: false })
    });
  }

  const allowlist = resolveAllowlist(binding, root);
  if (!pathAllowed(targetPath, allowlist)) {
    return buildFailure({
      reason: `path '${binding.path}' is not in FS allowlist`,
      latencyMs: Date.now() - started,
      errorCode: 'FS_BLOCKED',
      failureCategory: 'policy_block',
      pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: 0, mocked: false })
    });
  }

  const injected = feedback?.actionResults?.[stepName];
  if (injected?.status === 'failed') {
    return buildFailure({
      reason: injected.reason || 'fs call failed',
      latencyMs: Number(injected.latencyMs || latencyMs),
      errorCode: injected.errorCode || 'FS_CALL_FAILED',
      failureCategory: 'execution_error',
      pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: latencyMs, mocked: true })
    });
  }

  if (mockEnabled) {
    return executeMock({ binding, targetPath, op, latencyMs });
  }

  try {
    if (op === 'read') {
      const stat = fs.statSync(targetPath);
      if (!stat.isFile()) {
        return buildFailure({
          reason: 'path is not a file',
          latencyMs: Date.now() - started,
          errorCode: 'FS_ERROR',
          pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: Date.now() - started, mocked: false })
        });
      }
      if (stat.size > MAX_READ_BYTES) {
        return buildFailure({
          reason: `file exceeds read limit (${MAX_READ_BYTES} bytes)`,
          latencyMs: Date.now() - started,
          errorCode: 'FS_BLOCKED',
          failureCategory: 'policy_block',
          pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: stat.size, durationMs: Date.now() - started, mocked: false })
        });
      }
      const content = fs.readFileSync(targetPath, 'utf8');
      return {
        status: 'done',
        reason: 'fs read succeeded',
        latencyMs: Date.now() - started,
        failureCategory: null,
        pluginMeta: buildAuditMeta({
          op,
          path: targetPath,
          bytes: Buffer.byteLength(content),
          durationMs: Date.now() - started,
          mocked: false
        }),
        content: content.slice(0, 512)
      };
    }

    if (op === 'list') {
      const stat = fs.statSync(targetPath);
      const entries = stat.isDirectory()
        ? fs.readdirSync(targetPath).slice(0, 200)
        : [path.basename(targetPath)];
      return {
        status: 'done',
        reason: 'fs list succeeded',
        latencyMs: Date.now() - started,
        failureCategory: null,
        pluginMeta: buildAuditMeta({
          op,
          path: targetPath,
          bytes: entries.length,
          durationMs: Date.now() - started,
          mocked: false
        }),
        entries
      };
    }

    if (op === 'write') {
      if (!normalizeBoolean(binding.allow_write, false) && !normalizeBoolean(process.env.NOEON_FS_ALLOW_WRITE, false)) {
        return buildFailure({
          reason: 'fs write requires allow_write=true or NOEON_FS_ALLOW_WRITE=true',
          latencyMs: Date.now() - started,
          errorCode: 'FS_BLOCKED',
          failureCategory: 'policy_block',
          pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: Date.now() - started, mocked: false })
        });
      }
      const content = String(binding.content ?? binding.body ?? '');
      if (Buffer.byteLength(content) > MAX_WRITE_BYTES) {
        return buildFailure({
          reason: `write exceeds limit (${MAX_WRITE_BYTES} bytes)`,
          latencyMs: Date.now() - started,
          errorCode: 'FS_BLOCKED',
          failureCategory: 'policy_block',
          pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: Date.now() - started, mocked: false })
        });
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf8');
      return {
        status: 'done',
        reason: 'fs write succeeded',
        latencyMs: Date.now() - started,
        failureCategory: null,
        pluginMeta: buildAuditMeta({
          op,
          path: targetPath,
          bytes: Buffer.byteLength(content),
          durationMs: Date.now() - started,
          mocked: false
        })
      };
    }

    return buildFailure({
      reason: `unsupported fs op '${op}'`,
      latencyMs: Date.now() - started,
      errorCode: 'FS_ERROR',
      pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: Date.now() - started, mocked: false })
    });
  } catch (err) {
    return buildFailure({
      reason: err.message || 'fs call failed',
      latencyMs: Date.now() - started,
      errorCode: 'FS_ERROR',
      pluginMeta: buildAuditMeta({ op, path: targetPath, bytes: 0, durationMs: Date.now() - started, mocked: false })
    });
  }
}

module.exports = {
  execute,
  resolveRoot,
  resolveTargetPath,
  pathAllowed
};
