'use strict';

const fs = require('fs');
const path = require('path');
const {
  isLiminalSyntax,
  parseLiminalProgram,
  parseLiminalSource
} = require('../src/grammar/liminal');
const { parseAel } = require('../src/parser');
const { AELtoIRCompiler } = require('../src/core/cognitive-ir');
const { executeProgram } = require('../src/vm/unified-executor');
const { detectProfile, PROFILES } = require('../src/core/profile');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Liminal Profile v0.1 Tests ═══\x1b[0m\n');

const src = fs.readFileSync(path.join(__dirname, '../examples/code_reviewer.lim'), 'utf8');

assert(isLiminalSyntax(src, { filename: 'code_reviewer.lim' }), 'detect .lim symbiotic syntax');
assert(isLiminalSyntax(src), 'detect covenant keyword');

const lim = parseLiminalProgram(src);
assert(lim.profile === 'liminal', 'profile is liminal');
assert(lim.covenant.name === 'CodeReviewer', 'parses covenant name');
assert(lim.covenant.resonanceFloor === 0.75, 'parses resonance_floor');
assert(lim.beliefs.length === 1, 'parses belief block');
assert(lim.beliefs[0].confidence === 0.58, 'parses belief confidence');
assert(lim.resonates.length === 1, 'parses resonate block');
assert(lim.hypotheses[0].items.length === 3, 'parses hypothesis forest');
assert(lim.proposals.length === 1, 'parses proposal');
assert(lim.morphs.length === 1, 'parses morph evolve block');

const ast = parseLiminalSource(src);
assert(ast.profile === 'liminal', 'lowered AST profile is liminal');
assert(ast.liminal?.covenant?.name === 'CodeReviewer', 'preserves liminal metadata');
assert(ast.cognition.goal.includes('Review pull requests'), 'covenant intent → cognition.goal');
assert(ast.metaRules.length >= 3, 'covenant lowers to META rules');
assert(ast.cognition.hypotheses.length >= 4, 'beliefs + hypotheses lower to hypothesis set');
assert(ast.cognitive.perceptions.length >= 1, 'resonate/hypotheses add perceptions');
assert(ast.llm.asks.length >= 1, 'resonate mirror → llm.asks dialogue gate');
assert(ast.cognition.acts.length >= 1, 'propose lowers to gated acts');
assert(ast.evolution.evolves.length >= 1, 'morph lowers to evolution');

const viaParseAel = parseAel(src, { filename: 'code_reviewer.lim' });
assert(viaParseAel.profile === 'liminal', 'parseAel routes .lim to liminal');

const compiler = new AELtoIRCompiler();
const { program } = compiler.compile(ast);
assert(program.metas.length >= 3, 'liminal META rules compile to IR');
assert(program.intents.length >= 1, 'covenant drive compiles to INTENT');
assert(program.perceivers.length >= 1, 'observe/resonate compile to PERCEIVE');

assert(detectProfile(ast, { filename: 'code_reviewer.lim' }) === PROFILES.LIMINAL, 'profile detection');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: 'code_reviewer.lim',
    resonance: { 'pr_description->pr_intent': 0.82 },
    uncertainty_resolved: true
  });
  assert(run.success === true, 'unified VM runs liminal program');
  assert(run.phases.includes('resonance'), 'resonance phase executes for liminal');
  assert(run.phases.includes('cognitive'), 'cognitive phase executes for liminal');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
