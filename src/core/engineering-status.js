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
  'tests/compile-presentation.test.js',
  'tests/playground-examples.test.js',
  'tests/examples-p0.test.js',
  'tests/surface-freeze.test.js',
  'tests/unified-vm.test.js'
];

const GATE_COMMANDS = Object.freeze(['gate:alpha', 'gate:strict', 'gate:golden']);

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
      testSuites: ['alpha', 'product', 'system', 'vm', 'golden'],
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
  GATE_COMMANDS,
  buildEngineeringStatus,
  listCiWorkflows
};
