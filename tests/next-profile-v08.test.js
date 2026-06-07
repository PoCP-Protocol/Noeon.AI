'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextSource } = require('../src/grammar');
const {
  loadFieldMemory,
  saveFieldMemory,
  applyFieldMemoryToCells,
  executeEchoes,
  parseDecayMs,
  applyDecayEnergy
} = require('../src/runtime/next/field-memory');
const { buildDreamCrystallizePatch, buildWeaveNarrative } = require('../src/runtime/next/weave-narrative');
const { applyDreamFeedback } = require('../src/runtime/next/dream-feedback');
const { runFieldEngine } = require('../src/runtime/next/field-engine');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Next Profile v0.8 — Field Memory + ECHO + Decay + Dream Crystallize ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/field-memory-test-v08');
const myceliumDir = path.join(__dirname, '../artifacts/mycelium-test-v08');
const evolvedDir = path.join(__dirname, '../artifacts/evolved-test-v08');
const genesisPath = path.join(__dirname, '../examples/genesis.next');

for (const dir of [memDir, myceliumDir, evolvedDir]) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

assert(parseDecayMs('1h') === 3600000, 'parseDecayMs parses hours');
const decayed = applyDecayEnergy(0.9, new Date(Date.now() - 7200000).toISOString(), 3600000);
assert(decayed < 0.9 && decayed > 0.5, 'applyDecayEnergy decays toward baseline');

const cells = [{ name: 'alpha', energy: 0.4, claim: 'A' }];
const mem = { cells: { alpha: { energy: 0.85, claim: 'A stored' } }, updated_at: new Date().toISOString() };
const restored = applyFieldMemoryToCells(cells, mem, { decay: '1h' });
assert(restored.restored.length === 1, 'field memory restores cell energy');
assert(restored.cells[0].energy > 0.4, 'restored energy higher than base declaration');

const fieldStub = {
  dominant: { name: 'alpha', energy: 0.77 },
  cells: [{ name: 'alpha', energy: 0.77, claim: 'A' }],
  woven: [{ into: 'narrative', winners: ['alpha'], coherence: 0.8, pattern: 'alpha' }],
  dreamFeedback: { applied: [{ name: 'alpha', before: 0.5, after: 0.77 }] }
};
const echoed = executeEchoes([{ from: 'last_run', into: 'memory.episodic' }], fieldStub, loadFieldMemory('t', { dir: memDir }));
assert(echoed.written.length === 1, 'ECHO writes to memory slot');
assert(echoed.memory.echoes['memory.episodic']?.length === 1, 'ECHO stores episodic snapshot');

const narrative = buildWeaveNarrative(fieldStub.woven);
assert(narrative[0]?.text.includes('Weave→narrative'), 'weave narrative text generated');

const patch = buildDreamCrystallizePatch(fieldStub.dreamFeedback, { min_delta: 0.05 });
assert(patch.includes('dream crystallize'), 'dream crystallize patch generated');
assert(patch.includes('energy: 0.77'), 'dream patch uses feedback energy');

const ast = parseNextSource(fs.readFileSync(genesisPath, 'utf8'));

(async () => {
  const run1 = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: genesisPath,
    source_path: genesisPath,
    signals: ['risk-off'],
    force_flux: true,
    field_memory_dir: memDir,
    evolved_dir: evolvedDir,
    mycelium_dir: myceliumDir,
    publish_mycelium: false,
    hot_reload: true
  });

  assert(run1.success === true, 'genesis v0.8 first run');
  assert(run1.next?.fieldMemory?.echoes?.length >= 1, 'first run executes ECHO');
  assert((run1.next?.narrative || []).length >= 1, 'first run exposes weave narrative');

  const mem1 = loadFieldMemory('genesis', { dir: memDir });
  assert(Object.keys(mem1.cells || {}).length >= 1, 'field memory persisted cells');

  const run2 = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: genesisPath,
    source_path: genesisPath,
    signals: ['risk-off'],
    force_flux: true,
    field_memory_dir: memDir,
    evolved_dir: evolvedDir,
    mycelium_dir: myceliumDir,
    publish_mycelium: false
  });

  assert(run2.success === true, 'genesis v0.8 second run with memory');
  assert((run2.next?.fieldMemory?.restored || []).length >= 1, 'second run restores from field memory');
  assert((run2.next?.fieldMemory?.runs || 0) >= 1, 'field memory run count tracked');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
