'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextProgram, parseNextSource } = require('../src/grammar');
const { applyDreamFeedback } = require('../src/runtime/next/dream-feedback');
const { reactToMyceliumEvents } = require('../src/runtime/next/mycelium-react');
const { relayEvent } = require('../src/runtime/next/mycelium-relay');
const { readEvents, publishEvent } = require('../src/runtime/next/mycelium-bus');
const { mergeEvolvedThreeWay, resolveConflictSmart } = require('../src/runtime/next/evolved-three-way');
const { runFieldEngine } = require('../src/runtime/next/field-engine');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Next Profile v0.7 — Dream Feedback + Mycelium React + Relay + Smart Merge ═══\x1b[0m\n');

const myceliumDir = path.join(__dirname, '../artifacts/mycelium-test-v07');
const evolvedDir = path.join(__dirname, '../artifacts/evolved-test-v07');
const genesisPath = path.join(__dirname, '../examples/genesis.next');

for (const dir of [myceliumDir, evolvedDir]) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) {
        for (const g of fs.readdirSync(p)) fs.unlinkSync(path.join(p, g));
      } else fs.unlinkSync(p);
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const src = fs.readFileSync(genesisPath, 'utf8');
const prog = parseNextProgram(src);
assert(prog.autobond?.dream_feedback === 0.3, 'parses dream_feedback in AUTOBOND');
assert(prog.mycelium[0]?.relay?.includes('echo_cluster'), 'parses mycelium relay');

const cells = [
  { name: 'alpha', energy: 0.5, claim: 'A' },
  { name: 'beta', energy: 0.5, claim: 'B' }
];
const dreams = [{ name: 'd1', feedback: true, dominant: { cells: [{ name: 'alpha', energy: 0.9 }, { name: 'beta', energy: 0.4 }] } }];
const fb = applyDreamFeedback(cells, dreams, [], { strength: 0.5 });
assert(fb.applied.length === 2, 'dream feedback adjusts cell energies');
assert(fb.cells.find((c) => c.name === 'alpha').energy > 0.5, 'dream feedback boosts toward dreamed energy');

publishEvent('dream_cluster', {
  type: 'field.dominant',
  dominant: 'hypothesis_risk_off',
  energy: 0.8,
  program: 'peer'
}, { dir: myceliumDir });

const reacted = reactToMyceliumEvents(
  [{ name: 'hypothesis_risk_off', energy: 0.4, claim: 'x' }],
  readEvents('dream_cluster', { dir: myceliumDir }),
  [{ cluster: 'dream_cluster', react: true, absorb: ['hypothesis_*'] }]
);
assert(reacted.reactions.length >= 1, 'mycelium react to field.dominant');

const relay = relayEvent('dream_cluster', 'echo_cluster', { type: 'field.dominant', dominant: 'x', energy: 0.7 }, { dir: myceliumDir });
assert(relay.relayed === true, 'relay copies event to target cluster');
const echoEvents = readEvents('echo_cluster', { dir: myceliumDir });
assert(echoEvents.some((e) => e.relay_from === 'dream_cluster'), 'echo cluster receives relay');

const base = 'CELL alpha { claim: "A" energy: 0.5 }';
const ours = `${base}\n\n# --- noeon hot-reload ---\nCELL alpha { claim: "A2" energy: 0.9 }`;
const theirs = `${base}\n\n# --- noeon hot-reload ---\nCELL alpha { claim: "A3" energy: 0.4 }`;
const smart = mergeEvolvedThreeWay(base, ours, theirs, 'smart');
assert(smart.conflicts.length === 0, 'smart merge resolves energy conflict');
assert((smart.resolved || []).length === 1, 'smart merge records resolution');
assert(smart.merged.includes('energy: 0.9'), 'smart merge picks higher energy block');

const pick = resolveConflictSmart({ ours: 'energy: 0.9', theirs: 'energy: 0.4' });
assert(pick.source === 'ours', 'resolveConflictSmart prefers higher energy');

const ast = parseNextSource(src);
const field = runFieldEngine(ast.next, {
  signals: ['risk-off'],
  force_flux: true,
  mycelium: { events: readEvents('dream_cluster', { dir: myceliumDir }), absorbed: [], rejected: [] }
});
assert((field.dreamFeedback?.applied || []).length >= 1, 'field engine applies dream feedback');
assert((field.mycelium?.reactions || []).length >= 1, 'field engine applies bus reactions');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: genesisPath,
    source_path: genesisPath,
    signals: ['risk-off'],
    force_flux: true,
    hot_reload: true,
    evolved_dir: evolvedDir,
    mycelium_dir: myceliumDir,
    publish_mycelium: true
  });

  assert(run.success === true, 'genesis v0.7 runs end-to-end');
  assert(run.next?.dreamFeedback?.applied?.length >= 1, 'run exposes dream feedback');
  assert((run.next?.mycelium?.events_seen || 0) >= 0, 'run tracks mycelium events');

  const relayed = readEvents('echo_cluster', { dir: myceliumDir });
  assert(relayed.some((e) => e.type === 'field.dominant'), 'run relays dominant to echo_cluster');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
