'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { resolveRelayPolicy, applyRelayPolicy, POLICY_SCHEMA } = require('../src/runtime/fusion/fusion-relay-policy');
const { buildSemanticRelay } = require('../src/runtime/fusion/semantic-relay');
const { finalizeSemanticRelay } = require('../src/runtime/fusion/fusion-relay-finalize');
const {
  recordConvergenceEvent,
  getConvergenceStream,
  clearConvergenceStream
} = require('../src/runtime/fusion/convergence-stream');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ FUSE Relay Policy + Convergence Stream ═══\x1b[0m\n');

clearConvergenceStream();

const semanticPath = path.join(__dirname, '../examples/semantic_fusion.noeon');
const source = fs.readFileSync(semanticPath, 'utf8');
const ast = parseAel(source, { filename: semanticPath });

assert(ast.fusionRelay?.enabled === true, 'parses FUSE relay block');
assert(ast.fusionRelay.enforce === true, 'relay policy enforce flag');
assert(Array.isArray(ast.fusionRelay.human_must_approve), 'relay human_must_approve list');

const policy = resolveRelayPolicy(ast);
assert(Number(policy?.threshold) === 0.6, 'resolveRelayPolicy reads threshold');

const driftRelay = buildSemanticRelay(null, { coherence: { score: 0.3 }, drift: [{ type: 'semantic_misalignment' }] }, null, {});
const driftOutcome = applyRelayPolicy(driftRelay, { enabled: true, enforce: true, on_drift: 'block', threshold: 0.6 });
assert(driftOutcome.blocked === true, 'enforce blocks semantic drift');
assert(driftOutcome.relay.policy === POLICY_SCHEMA, 'relay carries policy schema');

const shiftOutcome = applyRelayPolicy(
  { ...driftRelay, action: 'dominant_shift', composite: 0.8 },
  { enabled: true, enforce: true, human_must_approve: ['dominant_shift'], threshold: 0.6 }
);
assert(shiftOutcome.humanGate === true, 'human_must_approve triggers gate');

recordConvergenceEvent({ coherence: 0.72, aligned: true, relay: { action: 'semantic_align' } });
recordConvergenceEvent({ coherence: 0.41, aligned: false, relay: { action: 'semantic_drift' } });
const stream = getConvergenceStream(10);
assert(stream.length === 2, 'convergence stream records events');
assert(stream[1].coherence === 0.41, 'stream preserves coherence score');

(async () => {
  const memDir = path.join(__dirname, '../artifacts/fusion-relay-mem');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  const run = await executeProgram(parseAel(source), {
    quiet: true,
    with_protocol: 'off',
    filename: semanticPath,
    field_memory_dir: memDir,
    triad: false
  });

  assert(run.relayPolicy?.enabled === true, 'executor attaches relayPolicy');
  assert(run.phases.includes('relay'), 'executor runs relay phase');
  assert(getConvergenceStream(5).length >= 1, 'executor records convergence stream');

  const stub = { semanticRelay: driftRelay, convergence: { drift: [{}], coherence: { score: 0.3 } } };
  const blocked = finalizeSemanticRelay(stub, ast, { filename: semanticPath });
  assert(blocked.blocked === true, 'finalizeSemanticRelay blocks on enforce drift');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
