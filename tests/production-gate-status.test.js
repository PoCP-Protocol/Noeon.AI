'use strict';

const path = require('path');
const fs = require('fs');
const {
  runProductionGate,
  summarizeProductionGate,
  buildProductionGateStatusSummary,
  formatProductionGateStatusLine,
  writeProductionGateArtifact,
  readProductionGateArtifact
} = require('../src/core/production-gate-status');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Production Gate Status ═══\x1b[0m\n');

const root = path.join(__dirname, '..');
const missing = summarizeProductionGate(null);
assert(missing.available === false, 'missing artifact returns available=false');

const result = runProductionGate({ root });
assert(result.ok === true, 'runProductionGate passes in repo');
assert(result.checks.length === 6, 'production gate runs 6 checks');
assert(result.checks.every((c) => c.ok), 'all production gate checks ok');

const artifactPath = writeProductionGateArtifact(result, { root });
assert(fs.existsSync(artifactPath), 'writeProductionGateArtifact creates file');

const readBack = readProductionGateArtifact({ root });
assert(readBack?.ok === true, 'readProductionGateArtifact round-trips');

const summary = buildProductionGateStatusSummary({ root });
assert(summary.available === true, 'buildProductionGateStatusSummary available after write');
assert(summary.ok === true, 'buildProductionGateStatusSummary ok');
assert(summary.checks.passed === 6, 'summary counts passed checks');
assert(
  formatProductionGateStatusLine(summary) === 'Production gate: PASS · checks 6/6',
  'formatProductionGateStatusLine compact'
);
assert(
  formatProductionGateStatusLine(missing) === 'Production gate: — (run npm run gate:production)',
  'formatProductionGateStatusLine missing artifact'
);

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
