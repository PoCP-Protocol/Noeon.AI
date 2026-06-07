'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextProgram } = require('../src/grammar/next-parser');
const { parseNextSource } = require('../src/grammar');
const { expandNextSource, applyFluxCrystallizations, resetRuntimeRegistry } = require('../src/grammar/next/macro-registry');
const { applyBonds } = require('../src/runtime/next/field-engine');
const { publishCells, loadCluster, absorbFromCluster } = require('../src/runtime/next/mycelium-store');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Next Profile v0.3 — Bond + Mycelium + Flux Macros ═══\x1b[0m\n');

const myceliumDir = path.join(__dirname, '../artifacts/mycelium-test');
if (fs.existsSync(myceliumDir)) {
  for (const f of fs.readdirSync(myceliumDir)) {
    fs.unlinkSync(path.join(myceliumDir, f));
  }
}

const genesisSrc = fs.readFileSync(path.join(__dirname, '../examples/genesis.next'), 'utf8');
const emberSrc = fs.readFileSync(path.join(__dirname, '../examples/ember.next'), 'utf8');

const genesisProg = parseNextProgram(genesisSrc);
assert(genesisProg.bonds.length >= 2, 'parses BOND constructs');
assert(genesisProg.mycelium.length === 1, 'parses MYCELIUM join block');

const expanded = expandNextSource(genesisSrc);
assert(expanded.macrosUsed.some((m) => m.name === 'cycle'), '@cycle macro expands at parse time');
assert(expanded.source.includes('CELL cycle_gate'), 'cycle macro injects crystallized cell');

resetRuntimeRegistry();
const ast = parseNextSource(genesisSrc);
assert((ast.next.macrosExpanded || []).length >= 1, 'parseNextSource records macro expansion');

const bonded = applyBonds(
  [
    { name: 'a', energy: 0.4, claim: 'a' },
    { name: 'b', energy: 0.7, claim: 'b' }
  ],
  [{ from: 'a', to: 'b', kind: 'amplifies', strength: 0.5 }]
);
assert(bonded.cells[0].energy > 0.4, 'BOND amplifies coupled cell energy');

publishCells('dream_cluster', 'ember', [
  { name: 'ember_volatility_spike', claim: 'Vol spike', energy: 0.71, tags: ['public'] }
], { dir: myceliumDir });
const cluster = loadCluster('dream_cluster', { dir: myceliumDir });
assert(cluster.cells.length === 1, 'mycelium store persists published cells');

const absorbed = absorbFromCluster(
  [{ cluster: 'dream_cluster', absorb: ['tagged=public'], isolate: [] }],
  cluster,
  'genesis'
);
assert(absorbed.absorbed.length === 1, 'genesis absorbs public cells from cluster');

(async () => {
  const emberAst = parseNextSource(emberSrc);
  const emberRun = await executeProgram(emberAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'ember.next',
    mycelium_dir: myceliumDir,
    publish_mycelium: true
  });
  assert(emberRun.success === true, 'ember publishes into mycelium cluster');

  const genesisAst = parseNextSource(genesisSrc);
  const genesisRun = await executeProgram(genesisAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'genesis.next',
    signals: ['risk-off'],
    friction: { 'observe reason decide': 0.85 },
    force_flux: true,
    mycelium_dir: myceliumDir,
    publish_mycelium: true
  });

  assert(genesisRun.success === true, 'genesis runs with bonds + mycelium + flux');
  assert(genesisRun.next?.bonds?.activations?.length >= 1, 'bond activations surfaced');
  assert(genesisRun.next?.mycelium != null, 'mycelium runtime metadata present');
  assert((genesisRun.next?.fluxCrystals || []).length >= 1, 'flux crystallizes macro into registry');
  assert(genesisRun.next?.field?.cells.length >= 4, 'field includes absorbed mycelium cells');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
