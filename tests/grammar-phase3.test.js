'use strict';

const fs = require('fs');
const path = require('path');
const { parseGeneralSource, parseGeneralProgram } = require('../src/grammar');
const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { evalExprSource } = require('../src/grammar/expr');
const { inferBodyEffect } = require('../src/grammar/effects');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ General Grammar Phase 3 Tests ═══\x1b[0m\n');

assert(Math.abs(evalExprSource('0.72 - 0.07') - 0.65) < 1e-9, 'expr eval subtracts decimals');
assert(evalExprSource('0.65 >= 0.5') === true, 'expr eval comparison');

const exprSrc = `
profile "general"
version "1.0.0-alpha"
module expr_demo
import std.ai

@effect(ai)
fn score() {
  let threshold = 0.72 - 0.07
  assert threshold >= 0.5
  ask "ready" model=default
}
export fn main() {
  score()
}
`;

const gp = parseGeneralProgram(exprSrc);
assert(gp.functions[0].body.some((s) => s.kind === 'let' && s.exprSource), 'parses let with expression');
assert(gp.functions[0].body.some((s) => s.kind === 'assert'), 'parses assert statement');
assert(gp.functions[0].body.some((s) => s.kind === 'stdlib' && s.exportName === 'ask'), 'parses std.ai ask statement');

const ast = parseGeneralSource(exprSrc);
assert(Math.abs(ast.cognition.context.threshold - 0.65) < 1e-9, 'lowers let expression into cognition.context');
assert(ast.llm.asks.length === 1, 'lowers ask to llm.asks');
assert((ast.general?.assertions || ast.compute.assertions).length === 1, 'lowers assert for validation');

const valid = validateAel(ast);
assert(valid.valid === true, 'validates expr + std.ai + effects');

const badEffectSrc = `
profile "general"
version "1.0.0-alpha"
module bad
@effect(pure)
fn bad() {
  reason strategy=deductive depth=1
}
export fn main() {
  bad()
}
`;
const badAst = parseGeneralSource(badEffectSrc);
const badValid = validateAel(badAst);
assert(badValid.valid === false, 'rejects pure fn with ai body');
assert(badValid.errors.some((e) => e.includes('@effect(ai)')), 'effect error mentions required ai');

const badTypeSrc = `
profile "general"
version "1.0.0-alpha"
module bad
fn bad(x: unknown_type) {
  observe input modality=text
}
export fn main() {
  bad("x")
}
`;
const badTypeAst = parseGeneralSource(badTypeSrc);
const badTypeValid = validateAel(badTypeAst);
assert(badTypeValid.valid === false, 'rejects unknown param type');

const agentAst = parseAel(
  fs.readFileSync(path.join(__dirname, '../examples/cognitive_agent.noeon'), 'utf8'),
  { filename: 'cognitive_agent.noeon' }
);
assert(agentAst.llm.asks.length >= 1, 'cognitive_agent lowers std.ai ask');
assert(inferBodyEffect(parseGeneralProgram(fs.readFileSync(path.join(__dirname, '../examples/cognitive_agent.noeon'), 'utf8')).functions[0].body, agentAst.general.importContext) === 'ai', 'agent think() infers ai effect');

(async () => {
  const run = await executeProgram(agentAst, { quiet: true, with_protocol: 'off', filename: 'cognitive_agent.noeon' });
  assert(run.success === true, 'VM runs phase3 cognitive_agent');
  assert(run.llm?.totalCalls >= 1, 'LLM bridge engaged via std.ai ask');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
