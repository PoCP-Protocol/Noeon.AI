'use strict';

const fs = require('fs');
const path = require('path');
const { parseProgram, validateProgram, getRuntimeStatus } = require('./runtime/unified-runtime');
const { loadProjectConfig } = require('./core/config');
const { detectProfile, PROFILES } = require('./core/profile');

function parseMajor(version) {
  const match = String(version || '').match(/^v?(\d+)/);
  return match ? Number(match[1]) : 0;
}

function checkNode() {
  const major = parseMajor(process.version);
  return {
    name: 'node',
    ok: major >= 18,
    detail: `Node.js ${process.version}`,
    recommendation: major >= 18 ? null : 'Install Node.js 18 or newer.'
  };
}

function checkConfig(cwd = process.cwd()) {
  const loaded = loadProjectConfig({ cwd });
  return {
    name: 'config',
    ok: !loaded.configError,
    detail: loaded.configPath ? `Loaded ${loaded.configPath}` : 'Using built-in defaults',
    recommendation: loaded.configError || null
  };
}

function checkExample(examplePath) {
  const rel = examplePath || path.join('examples', 'hello.noeon');
  const resolved = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(resolved)) {
    return {
      name: 'example',
      ok: false,
      detail: `Missing ${resolved}`,
      recommendation: 'Run doctor from the Noeon project root or pass --file <program.ael>.'
    };
  }

  try {
    const { ast } = parseProgram(resolved);
    const profile = detectProfile(ast, { filename: resolved });
    if (profile === PROFILES.GENERAL) {
      return {
        name: 'example',
        ok: true,
        detail: `Parsed ${resolved} as general profile`,
        recommendation: null
      };
    }

    const validation = validateProgram(ast);
    return {
      name: 'example',
      ok: validation.valid,
      detail: validation.valid ? `Parsed and validated ${resolved}` : `Validation failed for ${resolved}`,
      recommendation: validation.valid ? null : (validation.errors || []).join('; ')
    };
  } catch (error) {
    return {
      name: 'example',
      ok: false,
      detail: `Failed to parse ${resolved}`,
      recommendation: error.message
    };
  }
}

function checkRuntime() {
  const status = getRuntimeStatus();
  return {
    name: 'runtime',
    ok: Boolean(status.version),
    detail: `Noeon runtime ${status.version}`,
    recommendation: null
  };
}

function checkCanonicalRoute() {
  const legacy = process.env.NOEON_LEGACY_PROFILE === '1';
  return {
    name: 'canonical_route',
    ok: !legacy,
    detail: legacy
      ? 'NOEON_LEGACY_PROFILE=1 — legacy executor opt-out active'
      : 'Canonical IR-first routing (default)',
    recommendation: legacy
      ? 'Unset NOEON_LEGACY_PROFILE to use the unified canonical executor.'
      : null
  };
}

function checkMcpConfig(cwd = process.cwd()) {
  const { config } = loadProjectConfig({ cwd });
  const { getMcpStatus } = require('./runtime/mcp-bridge');
  const status = getMcpStatus(config);
  return {
    name: 'mcp',
    ok: true,
    detail: status.enabled
      ? `${status.serverCount} server(s), mode=${status.mode}, ${status.staticToolCount} static tool(s)`
      : `No MCP servers configured (optional — NOEON_MCP_MODE=${status.mode})`,
    recommendation: null
  };
}

function runDoctor(options = {}) {
  const checks = [
    checkNode(),
    checkConfig(options.cwd),
    checkRuntime(),
    checkCanonicalRoute(),
    checkMcpConfig(options.cwd),
    checkExample(options.file)
  ];

  return {
    ok: checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    checks
  };
}

function formatDoctorReport(report) {
  const lines = [
    `Noeon doctor: ${report.ok ? 'OK' : 'ISSUES FOUND'}`,
    `Checked at: ${report.checkedAt}`,
    ''
  ];

  for (const check of report.checks) {
    lines.push(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
    if (check.recommendation) {
      lines.push(`  ${check.recommendation}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  runDoctor,
  formatDoctorReport
};
