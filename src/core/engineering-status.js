'use strict';

const fs = require('fs');
const path = require('path');
const pkg = require('../../package.json');
const { NOEON_VERSION, buildReleaseManifest } = require('./release-version');

const ALPHA_GATE_TESTS = [
  'tests/release-version.test.js',
  'tests/stdlib-http.test.js',
  'tests/stdlib-fs.test.js',
  'tests/stdlib-web.test.js',
  'tests/general-canonical-mode.test.js',
  'tests/general-canonical-execution.test.js',
  'tests/canonical-act-runner.test.js',
  'tests/general-canonical-hybrid.test.js',
  'tests/golden-gate-canonical-probes.test.js',
  'tests/studio-golden-gate.test.js',
  'tests/golden-gate-status-summary.test.js',
  'tests/compile-presentation.test.js',
  'tests/cli-compile-canonical.test.js',
  'tests/cli-run-trace.test.js',
  'tests/cli-pipeline-json.test.js',
  'tests/architecture-view.test.js',
  'tests/act-binding-status.test.js',
  'tests/doctor-canonical.test.js',
  'tests/plugin-policy-config.test.js',
  'tests/audit-export.test.js',
  'tests/audit-rotation.test.js',
  'tests/production-gate.test.js',
  'tests/production-gate-status.test.js',
  'tests/signed-act-general.test.js',
  'tests/doctor-gate-script.test.js',
  'tests/lsp-canonical.test.js',
  'tests/lsp-stdlib-hover.test.js',
  'tests/playground-examples.test.js',
  'tests/examples-p0.test.js',
  'tests/surface-freeze.test.js',
  'tests/unified-vm.test.js',
  'tests/cognitive-evidence.test.js',
  'tests/world-model-runtime.test.js',
  'tests/cognitive-integration.test.js',
  'tests/canonical-replay.test.js',
  'tests/cognitive-effect.test.js',
  'tests/dual-view.test.js',
  'tests/agent-surface.test.js',
  'tests/execution-checkpoint.test.js'
];

const TEST_SUITES = Object.freeze({
  alpha: ALPHA_GATE_TESTS,
  product: 'tests/run-suite.js product',
  system: 'tests/run-suite.js system',
  vm: 'npm run test:vm',
  golden: 'npm run test:golden'
});

const GATE_COMMANDS = Object.freeze([
  'gate:alpha',
  'gate:doctor',
  'gate:production',
  'gate:strict',
  'gate:golden'
]);

function listCiWorkflows(root = process.cwd()) {
  const dir = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
}

function buildEngineeringStatus(options = {}) {
  const root = options.root || process.cwd();
  return {
    ...buildReleaseManifest(),
    engineering: {
      versionAligned: pkg.version === NOEON_VERSION,
      packageVersion: pkg.version,
      runtimeVersion: NOEON_VERSION,
      node: process.version,
      testSuites: Object.keys(TEST_SUITES),
      gates: [...GATE_COMMANDS],
      alphaGateTests: [...ALPHA_GATE_TESTS],
      ciWorkflows: listCiWorkflows(root),
      stdlib: ['std.ai', 'std.http', 'std.fs', 'std.github', 'std.web', 'std.universal', 'std.cognition'],
      plugins: ['http_call', 'fs_call', 'echo', 'policy_guard', 'mcp_call']
    }
  };
}

module.exports = {
  ALPHA_GATE_TESTS,
  TEST_SUITES,
  GATE_COMMANDS,
  buildEngineeringStatus,
  listCiWorkflows
};
