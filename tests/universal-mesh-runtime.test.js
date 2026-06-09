'use strict';

const { runUniversalMeshRuntime } = require('../src/runtime/universal-mesh-runtime');
const { buildUniversalMeshTrace, attachMeshTraceToResult } = require('../src/runtime/universal-mesh-trace');
const { parseGeneralSource } = require('../src/grammar');
const { executeProgram } = require('../src/vm/unified-executor');
const { runGoldenGate } = require('../scripts/golden-gate');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 13 — Live Mesh Runtime ═══\x1b[0m\n');

const ast = parseGeneralSource(
  fs.readFileSync(path.join(__dirname, '../examples/universal/hybrid_weave.noeon'), 'utf8'),
  { filename: 'hybrid_weave.noeon' }
);
assert(ast.social.spawns.length >= 2, 'hybrid parses spawns');
assert(ast.social.delegations.length >= 1, 'hybrid parses delegate');

const mockResult = { success: true, phases: ['canonical', 'cognitive', 'relay'] };
const runtime = runUniversalMeshRuntime(ast, mockResult);
assert(runtime.summary.live === true, 'mesh runtime live flag');
assert(runtime.workers.some((w) => w.status === 'completed'), 'workers complete after delegate');
assert(runtime.routes[0].status === 'routed', 'delegation routed');
assert(runtime.timeline.some((t) => t.event === 'assign'), 'timeline has assign event');
assert(runtime.timeline.some((t) => t.phase === 'cognitive'), 'timeline stamps cognitive phase');

const trace = buildUniversalMeshTrace(ast, { ...mockResult, meshRuntime: runtime });
assert(trace.live === true, 'trace reflects live mesh');
assert(trace.nodes[0].status === 'completed', 'node status from runtime');
assert(trace.summary.completed >= 1, 'trace summary completed count');
assert(!trace.nodes[0].simulated, 'live nodes not simulated');

const attached = attachMeshTraceToResult({ success: true, report: {} }, ast);
// attach runs runtime internally via finalize - test direct path
const withRuntime = attachMeshTraceToResult(
  { success: true, report: {}, meshRuntime: runtime },
  ast
);
assert(withRuntime.meshTrace?.live === true, 'attach preserves live trace');

(async () => {
  const hybridAst = parseGeneralSource(
    fs.readFileSync(path.join(__dirname, '../examples/universal/hybrid_weave.noeon'), 'utf8'),
    { filename: 'hybrid_weave.noeon' }
  );
  const run = await executeProgram(hybridAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'hybrid_weave.noeon'
  });
  assert(run.meshRuntime?.summary?.live === true, 'execute attaches meshRuntime');
  assert(run.meshTrace?.live === true, 'execute meshTrace is live');
  assert(run.meshTrace?.timeline?.length >= 4, 'live timeline events');

  const gate = await runGoldenGate({ root: path.join(__dirname, '..'), conform: false });
  const hybridGate = gate.programs.find((p) => p.file.includes('hybrid_weave'));
  const inlineGate = gate.programs.find((p) => p.file.includes('inline_fn'));
  assert(hybridGate?.ok === true, 'hybrid_weave golden gate');
  assert(inlineGate?.ok === true, 'inline_fn golden gate');
  assert(hybridGate?.liveMesh?.timeline >= 4, 'gate records live mesh timeline');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
