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

function checkVersionAlignment() {
  const pkg = require('../package.json');
  const { NOEON_VERSION } = require('./core/release-version');
  const aligned = pkg.version === NOEON_VERSION;
  return {
    name: 'version_alignment',
    ok: aligned,
    detail: aligned
      ? `package.json and runtime aligned at ${NOEON_VERSION}`
      : `package.json=${pkg.version} runtime=${NOEON_VERSION}`,
    recommendation: aligned ? null : 'Run release-version sync across package.json, CLI, and runtime.'
  };
}

function checkEngineeringGate() {
  const { ALPHA_GATE_TESTS } = require('./core/engineering-status');
  const fs = require('fs');
  const path = require('path');
  const missing = ALPHA_GATE_TESTS.filter((rel) => !fs.existsSync(path.join(process.cwd(), rel)));
  return {
    name: 'engineering_gate',
    ok: missing.length === 0,
    detail: missing.length === 0
      ? `${ALPHA_GATE_TESTS.length} alpha gate tests present`
      : `Missing alpha gate tests: ${missing.join(', ')}`,
    recommendation: missing.length ? 'Restore missing test files or update engineering-status.js' : 'Run npm run gate:alpha'
  };
}

function checkStdlibSurface() {
  const { STDLIB_MODULES } = require('./stdlib/registry');
  const expected = ['std.ai', 'std.http', 'std.fs', 'std.github', 'std.web', 'std.universal', 'std.cognition'];
  const missing = expected.filter((name) => !STDLIB_MODULES[name]);
  return {
    name: 'stdlib_surface',
    ok: missing.length === 0,
    detail: missing.length === 0
      ? `${expected.length} stdlib modules registered`
      : `Missing stdlib modules: ${missing.join(', ')}`,
    recommendation: missing.length ? 'Restore stdlib registry entries under src/stdlib/' : null
  };
}

function checkReleaseEra() {
  const { NOEON_ERA } = require('./core/release-version');
  const status = getRuntimeStatus();
  const ok = status.era === NOEON_ERA;
  return {
    name: 'release_era',
    ok,
    detail: ok
      ? `Release era ${NOEON_ERA} (runtime status aligned)`
      : `status.era=${status.era} manifest=${NOEON_ERA}`,
    recommendation: ok ? null : 'Sync release-version.js with getRuntimeStatus() manifest spread'
  };
}

function checkSnapshotExecution() {
  const { prepareCanonicalExecution } = require('./core/canonical-runtime');
  const { deriveExecutionRoute } = require('./core/canonical-route');
  const { resolveCanonicalPhases } = require('./vm/canonical-phase-resolver');
  const { detectProfile, resolveExecutionMode } = require('./core/profile');
  const samplePath = path.join(process.cwd(), 'examples', 'web_fetch.noeon');
  if (!fs.existsSync(samplePath)) {
    return {
      name: 'snapshot_execution',
      ok: false,
      detail: 'Missing examples/web_fetch.noeon',
      recommendation: 'Add web_fetch.noeon for snapshot execution checks'
    };
  }

  try {
    const { ast } = parseProgram(samplePath);
    const { buildBindingsFromCanonicalActs } = require('./core/canonical-act-runner');
    const opts = { general_canonical: true, with_protocol: 'off' };
    const prep = prepareCanonicalExecution(ast, opts);
    const profile = detectProfile(ast, opts);
    const mode = resolveExecutionMode(profile, opts);
    const route = deriveExecutionRoute(prep, profile, mode, opts);
    const phases = resolveCanonicalPhases(route, prep, ast, opts, {});
    const bindings = buildBindingsFromCanonicalActs(prep.canonical?.execution?.acts || []);
    const ok =
      prep.executionDriver === 'snapshot-primary' &&
      prep.canonicalPrimary === true &&
      (prep.snapshotActCount ?? 0) >= 1 &&
      phases?.snapshot_primary === true &&
      phases?.cognitive === true &&
      bindings.steps.length >= 1 &&
      bindings.steps[0].binding?.plugin === 'http_call';
    return {
      name: 'snapshot_execution',
      ok,
      detail: ok
        ? `snapshot-primary + canonical.execution.acts (${bindings.steps.length} plugin binding(s))`
        : `driver=${prep.executionDriver} bindings=${bindings.steps.length} snapshot_primary=${phases?.snapshot_primary}`,
      recommendation: ok ? null : 'Check general-canonical-execution.js and canonical-phase-resolver'
    };
  } catch (error) {
    return {
      name: 'snapshot_execution',
      ok: false,
      detail: 'Failed snapshot execution probe',
      recommendation: error.message
    };
  }
}

function checkGeneralCanonical() {
  const { resolveCompilePresentation } = require('./core/general-canonical-mode');
  const samplePath = path.join(process.cwd(), 'examples', 'web_fetch.noeon');
  if (!fs.existsSync(samplePath)) {
    return {
      name: 'general_canonical',
      ok: false,
      detail: 'Missing examples/web_fetch.noeon',
      recommendation: 'Add web_fetch.noeon demo for canonical general profile checks'
    };
  }

  try {
    const { ast } = parseProgram(samplePath);
    const presentation = resolveCompilePresentation(ast, {}, { general_canonical: true });
    const ok = presentation.compileMode === 'canonical-primary' && Boolean(ast.general?.canonicalIr);
    return {
      name: 'general_canonical',
      ok,
      detail: ok
        ? 'General canonical-primary mode enabled for web_fetch snapshot'
        : `compileMode=${presentation.compileMode}, canonicalIr=${Boolean(ast.general?.canonicalIr)}`,
      recommendation: ok ? null : 'Check general-canonical-mode.js and general lower canonicalIr attachment'
    };
  } catch (error) {
    return {
      name: 'general_canonical',
      ok: false,
      detail: 'Failed to evaluate general canonical mode',
      recommendation: error.message
    };
  }
}

function checkToolDemosCanonicalActs() {
  const { prepareCanonicalExecution } = require('./core/canonical-runtime');
  const { buildBindingsFromCanonicalActs } = require('./core/canonical-act-runner');
  const demos = [
    { name: 'http_demo.noeon', acts: 1 },
    { name: 'fs_demo.noeon', acts: 2 },
    { name: 'github_demo.noeon', acts: 1 },
    { name: 'web_fetch.noeon', acts: 1 }
  ];
  const failures = [];

  for (const demo of demos) {
    const resolved = path.join(process.cwd(), 'examples', demo.name);
    if (!fs.existsSync(resolved)) {
      failures.push(`${demo.name} missing`);
      continue;
    }
    try {
      const { ast } = parseProgram(resolved);
      const prep = prepareCanonicalExecution(ast, { general_canonical: true, with_protocol: 'off' });
      const bindings = buildBindingsFromCanonicalActs(prep.canonical?.execution?.acts || []);
      if (prep.executionDriver !== 'snapshot-primary') {
        failures.push(`${demo.name} not snapshot-primary`);
      }
      if (bindings.steps.length !== demo.acts) {
        failures.push(`${demo.name} bindings=${bindings.steps.length} expected=${demo.acts}`);
      }
    } catch (error) {
      failures.push(`${demo.name}: ${error.message}`);
    }
  }

  return {
    name: 'tool_demos_canonical',
    ok: failures.length === 0,
    detail: failures.length === 0
      ? `${demos.length} tool demos snapshot-primary with plugin bindings`
      : failures.join('; '),
    recommendation: failures.length ? 'Check canonical-act-runner and general lower canonicalIr' : null
  };
}

function checkAgentCanonicalHybrid() {
  const {
    isHybridCanonicalCandidate,
    resolveExecutionStrategy
  } = require('./core/general-canonical-mode');
  const agents = [
    { name: 'agent_research.noeon', minActs: 1 },
    { name: 'agent_risk_review.noeon', minActs: 1 },
    { name: 'agent_customer_service.noeon', minActs: 1 }
  ];
  const failures = [];

  for (const spec of agents) {
    const resolved = path.join(process.cwd(), 'examples', spec.name);
    if (!fs.existsSync(resolved)) {
      failures.push(`${spec.name} missing`);
      continue;
    }
    try {
      const { ast } = parseProgram(resolved);
      const acts = ast?.general?.canonicalIr?.execution?.acts || [];
      if (!ast?.general?.canonicalIr) {
        failures.push(`${spec.name} missing canonicalIr snapshot`);
        continue;
      }
      if (acts.length < spec.minActs) {
        failures.push(`${spec.name} acts=${acts.length} expected>=${spec.minActs}`);
      }
      if (!isHybridCanonicalCandidate(ast)) {
        failures.push(`${spec.name} not hybrid candidate`);
      }
      if (resolveExecutionStrategy(ast, { general_canonical: true }) !== 'hybrid-canonical-acts') {
        failures.push(`${spec.name} strategy not hybrid-canonical-acts`);
      }
    } catch (error) {
      failures.push(`${spec.name}: ${error.message}`);
    }
  }

  return {
    name: 'agent_canonical_hybrid',
    ok: failures.length === 0,
    detail: failures.length === 0
      ? `${agents.length} P0 agent(s) hybrid-canonical with plugin ACT snapshot`
      : failures.join('; '),
    recommendation: failures.length ? 'Check general-canonical-snapshot and agent plugin ACT lowering' : null
  };
}

function checkGoldenGateArtifact() {
  const { buildGoldenGateStatusSummary } = require('./core/golden-gate-status');
  const summary = buildGoldenGateStatusSummary();
  if (!summary.available) {
    return {
      name: 'golden_gate',
      ok: true,
      detail: 'No golden-gate.latest.json (optional CI artifact)',
      recommendation: 'Run npm run gate:golden to track AI path + canonical probes'
    };
  }
  const probesOk = summary.probes?.ok !== false;
  const ok = summary.ok === true && probesOk;
  const probeTxt = summary.probes?.total != null
    ? ` · probes ${summary.probes.passed}/${summary.probes.total}`
    : '';
  return {
    name: 'golden_gate',
    ok,
    detail: ok
      ? `Golden gate PASS · AI ${summary.aiPath?.passed}/${summary.aiPath?.total}${probeTxt}`
      : `Golden gate FAIL · AI ${summary.aiPath?.passed}/${summary.aiPath?.total}${probeTxt}`,
    recommendation: ok ? null : 'Run npm run gate:golden or npm run gate:golden:remediate'
  };
}

function checkToolDemos() {
  const demos = ['http_demo.noeon', 'fs_demo.noeon', 'github_demo.noeon', 'web_fetch.noeon'];
  const failures = [];

  for (const name of demos) {
    const resolved = path.join(process.cwd(), 'examples', name);
    if (!fs.existsSync(resolved)) {
      failures.push(`${name} missing`);
      continue;
    }
    try {
      const { ast } = parseProgram(resolved);
      const validation = validateProgram(ast);
      if (!validation.valid) {
        failures.push(`${name} invalid: ${(validation.errors || []).join('; ')}`);
      }
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  }

  return {
    name: 'tool_demos',
    ok: failures.length === 0,
    detail: failures.length === 0
      ? `${demos.length} tool demos parse and validate`
      : failures.join('; '),
    recommendation: failures.length ? 'Fix tool demo examples under examples/' : null
  };
}

function runDoctor(options = {}) {
  const checks = [
    checkNode(),
    checkConfig(options.cwd),
    checkRuntime(),
    checkVersionAlignment(),
    checkReleaseEra(),
    checkEngineeringGate(),
    checkStdlibSurface(),
    checkGeneralCanonical(),
    checkSnapshotExecution(),
    checkToolDemosCanonicalActs(),
    checkAgentCanonicalHybrid(),
    checkGoldenGateArtifact(),
    checkToolDemos(),
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
