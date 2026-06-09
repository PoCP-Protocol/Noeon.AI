'use strict';

const { buildUniversalMeshTrace, attachMeshTraceToResult } = require('../src/runtime/universal-mesh-trace');
const { parseUniversalSource } = require('../src/grammar/universal-lower');
const { executeProgram } = require('../src/vm/unified-executor');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 12 — Universal Mesh Trace ═══\x1b[0m\n');

const empty = buildUniversalMeshTrace({ social: { spawns: [], delegations: [] } });
assert(empty === null, 'no trace when mesh empty');

const ast = parseUniversalSource(
  fs.readFileSync(path.join(__dirname, '../examples/universal/orchestrator.noeon'), 'utf8'),
  { filename: 'orchestrator.noeon' }
);
const trace = buildUniversalMeshTrace(ast, { success: true });
assert(trace?.schema === 'noeon.universal.mesh/v1', 'mesh trace schema');
assert(trace.nodes.length >= 1, 'orchestrator spawns as nodes');
assert(trace.edges.length >= 1, 'orchestrator delegations as edges');
assert(trace.mermaid?.includes('flowchart'), 'mermaid flowchart generated');
assert(trace.timeline.length >= trace.nodes.length, 'timeline includes spawn events');

const result = attachMeshTraceToResult({ success: true, report: { observability: {} } }, ast);
assert(result.meshTrace?.schema === 'noeon.universal.mesh/v1', 'attachMeshTraceToResult sets meshTrace');
assert(result.report.observability.mesh_trace?.nodes?.length >= 1, 'mesh_trace in report');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: 'orchestrator.noeon',
    lens_only: true
  });
  assert(run.meshTrace?.summary?.delegations >= 1, 'orchestrator run carries mesh trace');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
