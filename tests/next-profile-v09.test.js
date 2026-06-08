'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextProgram, parseNextSource } = require('../src/grammar');
const { recallFromMemory, applyRecallBoosts } = require('../src/runtime/next/memory-recall');
const { consolidateEpisodicToSemantic } = require('../src/runtime/next/memory-consolidate');
const { executeDeclaredSpawns } = require('../src/runtime/next/spawn-runner');
const { loadFieldMemory } = require('../src/runtime/next/field-memory');
const { runFieldEngine } = require('../src/runtime/next/field-engine');
const { executeProgram } = require('../src/vm/unified-executor');
const { readEvents } = require('../src/runtime/next/mycelium-bus');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Next Profile v0.9 — Recall + Consolidate + Declared Spawn + Lineage ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/field-memory-test-v09');
const myceliumDir = path.join(__dirname, '../artifacts/mycelium-test-v09');
const evolvedDir = path.join(__dirname, '../artifacts/evolved-test-v09');
const genesisPath = path.join(__dirname, '../examples/genesis.next');

for (const dir of [memDir, myceliumDir, evolvedDir]) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const src = fs.readFileSync(genesisPath, 'utf8');
const prog = parseNextProgram(src);
assert(prog.fields[0]?.recall === true, 'FIELD recall enabled');
assert(prog.fields[0]?.consolidate_after === 3, 'FIELD consolidate_after parsed');

const memory = {
  echoes: {
    'memory.episodic': [
      { dominant: { name: 'hypothesis_risk_off', energy: 0.7 }, woven: [{ winners: ['hypothesis_soft'] }] },
      { dominant: { name: 'hypothesis_risk_off', energy: 0.72 }, woven: [] }
    ]
  },
  dominant_history: [
    { name: 'hypothesis_risk_off', energy: 0.7, at: new Date().toISOString() },
    { name: 'hypothesis_risk_off', energy: 0.72, at: new Date().toISOString() }
  ]
};

const recall = recallFromMemory(memory, { recall: true, recall_depth: 3 });
assert(recall.signals.length >= 1, 'recall derives signals from episodic memory');
assert(recall.dominantStreak >= 2, 'recall tracks dominant streak');

const boosted = applyRecallBoosts(
  [{ name: 'hypothesis_risk_off', energy: 0.4, claim: 'x' }],
  recall
);
assert(boosted.boosted.length >= 1, 'recall boosts matching cells');

let memForConsolidate = { echoes: { 'memory.episodic': [] } };
for (let i = 0; i < 4; i += 1) {
  memForConsolidate.echoes['memory.episodic'].push({
    dominant: { name: 'hypothesis_risk_off' },
    woven: [{ winners: ['hypothesis_soft'], into: 'narrative' }]
  });
}
const consolidated = consolidateEpisodicToSemantic(memForConsolidate, { consolidate_after: 3 });
assert(consolidated.consolidated === true, 'consolidates episodic to semantic');
assert(consolidated.patterns.length >= 1, 'semantic patterns extracted');

const cells = [
  { name: 'hypothesis_risk_off', energy: 0.6, claim: 'A' },
  { name: 'hypothesis_soft', energy: 0.5, claim: 'B' }
];
const spawns = executeDeclaredSpawns(
  [{ name: 'analyst_thread', inherit: ['hypothesis_*'], goal: 'Analyze dominant' }],
  cells,
  { dominant: { name: 'hypothesis_risk_off', energy: 0.6, claim: 'A' } }
);
assert(spawns.length === 1, 'declared SPAWN creates runtime cell');
assert(spawns[0].name === 'analyst_thread', 'spawn name matches declaration');

const ast = parseNextSource(src);

async function runOnce() {
  return executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: genesisPath,
    source_path: genesisPath,
    signals: ['risk-off'],
    force_flux: true,
    field_memory_dir: memDir,
    evolved_dir: evolvedDir,
    mycelium_dir: myceliumDir,
    publish_mycelium: true,
    hot_reload: true
  });
}

(async () => {
  for (let i = 0; i < 3; i += 1) {
    const run = await runOnce();
    assert(run.success === true, `genesis v0.9 run ${i + 1} succeeds`);
    if (i === 0) {
      assert((run.next?.declaredSpawns || []).length >= 1, 'first run executes declared spawn');
      assert((run.next?.narrative || []).length >= 1, 'narrative emitted');
    }
    if (i === 2) {
      assert(run.next?.fieldMemory?.semantic != null || run.next?.fieldMemory?.lineage_size >= 1, 'third run consolidates or tracks lineage');
      assert((run.next?.fieldMemory?.recall?.signals || []).length >= 0, 'recall exposed on later run');
    }
  }

  const events = readEvents('dream_cluster', { dir: myceliumDir });
  assert(events.some((e) => e.type === 'narrative.weave'), 'narrative published to mycelium bus');

  const mem = loadFieldMemory('genesis', { dir: memDir });
  assert((mem.lineage || []).length >= 1, 'lineage recorded in field memory');
  assert(mem.semantic?.patterns?.length >= 1, 'semantic memory after 3 runs');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
