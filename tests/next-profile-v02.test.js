'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextProgram } = require('../src/grammar/next-parser');
const { parseNextSource } = require('../src/grammar');
const { parseAel } = require('../src/parser');
const { detectProfile, PROFILES } = require('../src/core/profile');
const { executeProgram } = require('../src/vm/unified-executor');
const { runFieldEngine } = require('../src/runtime/next/field-engine');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Next Profile v0.2 — Autonomous Field Engine ═══\x1b[0m\n');

const src = fs.readFileSync(path.join(__dirname, '../examples/genesis.next'), 'utf8');

const prog = parseNextProgram(src);
assert(prog.profile === 'next', 'parses next profile');
assert(prog.fields.length === 1, 'parses FIELD block');
assert(prog.cells.length >= 3, 'parses living CELL blocks');
assert(prog.weaves.length === 1, 'parses WEAVE');
assert(prog.dreams.length >= 1, 'parses DREAM');
assert(prog.spawns.length === 1, 'parses SPAWN');
assert(prog.fluxes.length === 1, 'parses FLUX');
assert(prog.echoes.length === 1, 'parses ECHO');

const ast = parseNextSource(src);
assert(ast.next.cells.length >= 3, 'lowers cells to ast.next');
assert(ast.cognition.hypotheses.length >= 3, 'cells become hypotheses');
assert(ast.cognitiveFlow.dreams.length >= 1, 'dreams lower to cognitiveFlow');

const viaAel = parseAel(src, { filename: 'genesis.next' });
assert(viaAel.profile === 'next', 'parseAel routes .next files');
assert(detectProfile(viaAel, { filename: 'genesis.next' }) === PROFILES.NEXT, 'profile detection');

const field = runFieldEngine(ast.next, {
  signals: ['risk-off', 'liquidity'],
  friction: { 'observe reason decide': 0.85 },
  force_flux: true
});
assert(field.cells.length >= 3, 'field engine ticks cells');
assert(field.woven.length >= 1, 'field engine weaves patterns');
assert(field.dreams.length >= 1, 'field engine dreams branches');
assert(field.flux.length >= 1, 'flux crystallizes under friction');
assert(field.dominant != null, 'dominant cell emerges');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: 'genesis.next',
    signals: ['risk-off'],
    friction: { 'observe reason decide': 0.85 },
    force_flux: true
  });

  assert(run.success === true, 'autonomous next program runs without human gates');
  assert(run.phases.includes('next'), 'next phase executes');
  assert(run.next?.autonomous === true, 'next phase marks autonomous mode');
  assert(run.next?.field?.dominant != null, 'execution surfaces dominant cell');
  assert(run.next?.woven?.length >= 1, 'execution surfaces weave result');
  assert(run.next?.dreams?.length >= 1, 'execution surfaces dream branches');

  // v0.1 world model still works
  const legacy = fs.readFileSync(path.join(__dirname, '../examples/next_gen_world_model.noeon'), 'utf8');
  const legacyAst = parseAel(legacy, { filename: 'next_gen_world_model.noeon' });
  const legacyRun = await executeProgram(legacyAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'next_gen_world_model.noeon',
    feedback: {
      projected_spend: 100,
      approved_budget: 120,
      portfolio_risk: 0.2,
      policy: { max_risk: 0.4 },
      warehouse_utilization: 0.8
    }
  });
  assert(legacyRun.success === true, 'v0.1 world-model next programs remain compatible');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
