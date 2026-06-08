'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextProgram, parseNextSource } = require('../src/grammar');
const { buildMemoryGraph, formatMermaidGraph } = require('../src/runtime/next/memory-graph');
const { runFieldEpochFromFile } = require('../src/runtime/next/field-epoch');
const { bridgeNextToCognitive } = require('../src/runtime/next/cognitive-bridge');
const { loadFieldMemory } = require('../src/runtime/next/field-memory');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Next Profile v1.0 — Epoch + Memory Graph + Cognitive Bridge ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/field-memory-test-v10');
const myceliumDir = path.join(__dirname, '../artifacts/mycelium-test-v10');
const evolvedDir = path.join(__dirname, '../artifacts/evolved-test-v10');
const genesisPath = path.join(__dirname, '../examples/genesis.next');

function cleanDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      for (const g of fs.readdirSync(p)) {
        try { fs.unlinkSync(path.join(p, g)); } catch { /* ignore */ }
      }
      try { fs.rmdirSync(p); } catch { /* ignore */ }
    } else {
      fs.unlinkSync(p);
    }
  }
}

cleanDir(memDir);
cleanDir(myceliumDir);
cleanDir(evolvedDir);

const src = fs.readFileSync(genesisPath, 'utf8');
const prog = parseNextProgram(src);
assert(prog.version === '1.0.0', 'genesis at v1.0.0');

const memory = {
  program: 'genesis',
  runs: 3,
  cells: { alpha: { energy: 0.7, claim: 'A' } },
  lineage: [{
    at: new Date().toISOString(),
    dominant: 'alpha',
    declared: ['thread_a'],
    auto_spawns: [{ name: 'a__b_hybrid', parents: ['a', 'b'] }]
  }],
  semantic: { patterns: [{ pattern: 'alpha', kind: 'dominant', weight: 0.8 }] }
};

const graph = buildMemoryGraph({ program: 'genesis', memory });
const mermaid = formatMermaidGraph(graph);
assert(graph.nodes.length >= 4, 'memory graph has nodes');
assert(graph.edges.length >= 3, 'memory graph has edges');
assert(mermaid.includes('flowchart TD'), 'memory graph mermaid renders');

(async () => {
  const epoch = await runFieldEpochFromFile(genesisPath, {
    epochs: 4,
    field_memory_dir: memDir,
    mycelium_dir: myceliumDir,
    evolved_dir: evolvedDir,
    hot_reload: true,
    publish_mycelium: true
  });

  assert(epoch.completed === 4, 'epoch runner completes 4 runs');
  assert(epoch.summary.success === true, 'all epoch runs succeed');
  assert(epoch.results.every((r) => r.dominant?.name), 'each epoch has dominant');

  const ast = parseNextSource(src);
  const bridge = bridgeNextToCognitive(epoch.last, ast);
  assert(bridge.profile === 'next→cognitive', 'cognitive bridge profile tag');
  assert(bridge.cycle.length === 5, 'bridge maps 5 cognitive phases');
  assert(bridge.artifact.summary.includes('Dominant'), 'bridge artifact summary');

  const mem = loadFieldMemory('genesis', { dir: memDir });
  assert(mem.runs >= 4, 'epoch persists field memory runs');
  assert((mem.lineage || []).length >= 4, 'epoch builds lineage');

  const liveGraph = buildMemoryGraph({ program: 'genesis', memory: mem });
  assert(liveGraph.nodes.some((n) => n.kind === 'epoch'), 'live memory graph includes epochs');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
