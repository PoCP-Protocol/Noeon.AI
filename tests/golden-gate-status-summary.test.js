'use strict';

const path = require('path');
const {
  summarizeGoldenGateExecution,
  buildGoldenGateStatusSummary,
  buildExecutionPathStatusSummary,
  formatExecutionPathStatusLine
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
const status = getRuntimeStatus();
const statusText = formatRuntimeStatusText(status);
assert(statusText.includes('Noeon'), 'formatRuntimeStatusText includes version line');
assert(statusText.includes('Golden Gate'), 'formatRuntimeStatusText includes golden gate line');
assert(statusText.includes('Execution path:'), 'formatRuntimeStatusText includes execution path line');

const execPath = buildExecutionPathStatusSummary({ root: path.join(__dirname, '..') });
assert(execPath.schema === 'noeon.execution.path.status/v1', 'execution path schema');
assert(execPath.tracked === 5, 'execution path tracks 5 probes');
assert(execPath.hybrid === 2, 'execution path counts hybrid');
assert(execPath.snapshotAct === 2, 'execution path counts snapshot-act');
assert(execPath.cognitive === 1, 'execution path counts cognitive');
assert(execPath.pluginActs?.total === 2, 'execution path aggregates plugin acts');
assert(execPath.pluginActs?.signed === 1, 'execution path counts signed acts');
assert(execPath.probes.length === 5, 'execution path includes probe list');
assert(execPath.probes.every((p) => p.ok), 'all execution path probes ok');
assert(
  execPath.probes.find((p) => p.file.endsWith('signed_act_demo.noeon'))?.pluginActs?.signed === 1,
  'signed_act_demo probe includes signed pluginActs'
);
assert(status.executionPath?.schema === 'noeon.execution.path.status/v1', 'getRuntimeStatus includes executionPath');
assert(status.pluginPolicy?.schema === 'noeon.plugin.policy.status/v1', 'getRuntimeStatus includes pluginPolicy');
assert(statusText.includes('Plugin policy:'), 'formatRuntimeStatusText includes plugin policy line');
assert(status.productionGate?.schema === 'noeon.production.gate.status/v1' || status.productionGate?.available === false, 'getRuntimeStatus includes productionGate');
assert(statusText.includes('Production gate:'), 'formatRuntimeStatusText includes production gate line');
assert(
  formatExecutionPathStatusLine(execPath).startsWith('Execution path: hybrid=2 snapshot=2 cognitive=1 (5 tracked) · acts 1/2 signed'),
  'formatExecutionPathStatusLine compact with plugin acts'
);

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
