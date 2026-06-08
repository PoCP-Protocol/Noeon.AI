'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const {
  expandTriadFusionBlocks,
  runFusionTriad,
  buildTriadGraph,
  computeTriadCoherence
} = require('../src/runtime/fusion/fusion-triad');
const { detectFusionPlan } = require('../src/runtime/fusion/unified-fusion');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Fusion Triad — FUSE triad + Cross-File Relay ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/fusion-triad-mem');
if (fs.existsSync(memDir)) {
  for (const f of fs.readdirSync(memDir)) fs.unlinkSync(path.join(memDir, f));
} else {
  fs.mkdirSync(memDir, { recursive: true });
}

const triadPath = path.join(__dirname, '../examples/fusion_triad.noeon');
const limPath = path.join(__dirname, '../examples/fusion_triad.lim');

(async () => {
  const expanded = expandTriadFusionBlocks({ next: 'genesis.next', liminal: 'observe', relay: true });
  assert(expanded.length === 3, 'triad expands to three FUSE blocks');
  assert(expanded.every((b) => b.from_triad), 'expanded blocks marked from_triad');

  const ast = parseAel(fs.readFileSync(triadPath, 'utf8'));
  assert(ast.fusionTriad?.enabled === true, 'parses FUSE triad metadata');
  assert(ast.fusion.length === 3, 'triad expands on parse');
  assert(ast.fusion.some((f) => f.target === 'general'), 'triad includes general leg');
  assert(fs.existsSync(limPath), 'fusion_triad.lim sidecar exists');

  const plan = detectFusionPlan(ast, { filename: triadPath });
  assert(plan.triad === true, 'detectFusionPlan marks triad');
  assert(plan.bidirectional === false, 'triad supersedes bidirectional flag');

  const triad = await runFusionTriad(ast, {
    filename: triadPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false,
    resonance: {
      'field_goal->hypothesis_risk_off': 0.82,
      'agent_goal->hypothesis_risk_off': 0.82
    }
  });

  assert(triad.success === true, 'triad orchestration succeeds');
  assert(triad.cross_file === true, 'triad is cross-file');
  assert(triad.forward?.dominant?.name, 'forward leg exposes dominant');
  assert(triad.reverse?.dominant?.name, 'reverse leg exposes dominant');
  assert(triad.coherence?.score != null, 'triad computes coherence score');
  assert(typeof triad.relay?.triggered === 'boolean', 'triad computes relay');
  assert(triad.summary, 'triad builds summary');

  const graph = buildTriadGraph(triad);
  assert(graph.mermaid.includes('Triad Fusion'), 'triad graph mermaid');
  assert(graph.graph.nodes.some((n) => n.kind === 'general'), 'triad graph has hub');

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: triadPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false
  });
  assert(run.phases.includes('triad'), 'executor runs triad phase');
  assert(run.triad?.coherence, 'executor exposes triad coherence');
  assert(run.injectedContext?.triad_coherence != null, 'triad context injected');

  const mockCoherence = computeTriadCoherence(
    { next: { dominant: { name: 'a', energy: 0.9 } } },
    { nextField: { dominant: { name: 'a', energy: 0.88 } } }
  );
  assert(mockCoherence.aligned === true, 'coherence detects aligned dominants');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
