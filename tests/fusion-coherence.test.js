'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { runFusionCoherence } = require('../src/runtime/fusion/fusion-coherence');
const { buildSemanticRelay, RELAY_SCHEMA } = require('../src/runtime/fusion/semantic-relay');
const { runFusionTriad } = require('../src/runtime/fusion/fusion-triad');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ FUSE Coherence + Semantic Relay ═══\x1b[0m\n');

const semanticPath = path.join(__dirname, '../examples/semantic_fusion.noeon');
const parityDir = path.join(__dirname, '../examples/parity');

assert(fs.existsSync(semanticPath), 'semantic_fusion.noeon example exists');

const source = fs.readFileSync(semanticPath, 'utf8');
const ast = parseAel(source, { filename: semanticPath });

assert(ast.fusionCoherence?.enabled === true, 'parses FUSE coherence block');
assert(ast.fusionTriad?.enabled === true, 'parses FUSE triad alongside coherence');
assert((ast.fusion || []).some((f) => f.target === 'coherence'), 'fusion array includes coherence target');

const coherenceOut = runFusionCoherence(ast, { filename: semanticPath });
assert(coherenceOut.enabled === true, 'runFusionCoherence executes');
assert(coherenceOut.matrix?.coherence?.unanimous_goal === true, 'parity dir unanimous goal');
assert(coherenceOut.relay?.schema === RELAY_SCHEMA, 'coherence run builds semantic relay');
assert(ast.cognition?.context?.semantic_coherence != null, 'injects semantic_coherence context');

const relay = buildSemanticRelay(
  { coherence: { score: 0.9, aligned: true }, relay: { triggered: false } },
  coherenceOut.matrix,
  coherenceOut.pulse,
  { threshold: 0.6 }
);
assert(relay.triggered === true, 'composite relay triggers on high convergence');
assert(relay.composite != null, 'relay computes composite score');

(async () => {
  const memDir = path.join(__dirname, '../artifacts/fusion-coherence-mem');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  const triadPath = path.join(__dirname, '../examples/fusion_triad.noeon');
  if (fs.existsSync(triadPath)) {
    const triadAst = parseAel(fs.readFileSync(triadPath, 'utf8'), { filename: triadPath });
    const triad = await runFusionTriad(triadAst, {
      filename: triadPath,
      field_memory_dir: memDir,
      quiet: true
    });
    assert(triad.semanticRelay?.schema === RELAY_SCHEMA, 'triad run includes semantic relay');
  }

  if (fs.existsSync(semanticPath)) {
    const run = await executeProgram(parseAel(source), {
      quiet: true,
      with_protocol: 'off',
      filename: semanticPath,
      field_memory_dir: memDir,
      triad: false
    });
    assert(run.phases.includes('coherence'), 'executor runs coherence phase without triad');
    assert(run.convergence?.coherence?.score != null, 'executor attaches convergence matrix');
    assert(run.semanticRelay != null, 'executor attaches semanticRelay');
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
