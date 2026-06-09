'use strict';

const path = require('path');
const {
  summarizeGoldenGateExecution,
  buildGoldenGateStatusSummary
} = require('../src/core/golden-gate-status');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Golden Gate Status Summary ═══\x1b[0m\n');

const missing = summarizeGoldenGateExecution(null);
assert(missing.available === false, 'missing gate returns available=false');

const sampleGate = {
  ok: true,
  generatedAt: '2026-01-01T00:00:00.000Z',
  programs: [
    { ok: true, execution: { strategy: 'hybrid-canonical-acts', hybrid: true } },
    { ok: true, execution: { strategy: 'cognitive-primary', lensOnly: true } }
  ],
  canonicalProbes: { ok: true, summary: { passed: 5, total: 5 } },
  conform: { allValid: true }
};

const summary = summarizeGoldenGateExecution(sampleGate);
assert(summary.available === true, 'sample gate available');
assert(summary.aiPath.tracked === 2, 'tracks AI path execution');
assert(summary.aiPath.hybrid === 1, 'counts hybrid programs');
assert(summary.probes.passed === 5, 'includes probe summary');

const fromDisk = buildGoldenGateStatusSummary({ root: path.join(__dirname, '..') });
assert(typeof fromDisk.available === 'boolean', 'buildGoldenGateStatusSummary returns summary');

const { formatRuntimeStatusText, getRuntimeStatus } = require('../src/runtime/unified-runtime');
const statusText = formatRuntimeStatusText(getRuntimeStatus());
assert(statusText.includes('Noeon'), 'formatRuntimeStatusText includes version line');
assert(statusText.includes('Golden Gate'), 'formatRuntimeStatusText includes golden gate line');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
