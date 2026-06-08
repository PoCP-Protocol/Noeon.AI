'use strict';

const fs = require('fs');
const path = require('path');
const { isGeneralSyntax, parseGeneralProgram, parseGeneralSource } = require('../src/grammar');
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

console.log('\n\x1b[36m═══ General Grammar Phase 2 Tests ═══\x1b[0m\n');

const agentSrc = fs.readFileSync(path.join(__dirname, '../examples/cognitive_agent.noeon'), 'utf8');
const helloSrc = fs.readFileSync(path.join(__dirname, '../examples/hello.noeon'), 'utf8');

assert(isGeneralSyntax(agentSrc, { filename: 'cognitive_agent.noeon' }), 'detect fn syntax in .noeon');
assert(isGeneralSyntax(helloSrc, { filename: 'hello.noeon' }), 'detect program block in .noeon');

const gp = parseGeneralProgram(agentSrc);
assert(gp.functions.length === 2, 'parses think and main functions');
assert(gp.exports.includes('main'), 'tracks export fn main');
assert(gp.effects.think === 'ai', 'parses @effect(ai) on fn think');

const ast = parseGeneralSource(agentSrc);
assert(ast.profile === 'general', 'lowered AST has general profile');
assert(ast.general.functions.length === 2, 'preserves general metadata');
assert(ast.cognitive.perceptions.length >= 1, 'inlines think() into main cognitive perceptions');
assert(ast.cognitive.reasonings.length >= 1, 'inlines think() reason step');

const legacyHello = parseAel(helloSrc, { filename: 'hello.noeon' });
assert(legacyHello.task === 'hello_world', 'program block lowers to task name');
assert(legacyHello.cognition.acts.length >= 1, 'program block includes ACT');

const compiler = new AELtoIRCompiler();
const { program } = compiler.compile(ast);
assert(program.processes.length >= 1, 'general program compiles to IR processes');
assert(program.perceivers.length >= 1, 'general program compiles PERCEIVE nodes');

assert(detectProfile(ast, { filename: 'cognitive_agent.noeon' }) === PROFILES.GENERAL, 'profile detection');

(async () => {
  const run = await executeProgram(ast, { quiet: true, with_protocol: 'off', filename: 'cognitive_agent.noeon' });
  assert(run.success === true, 'unified VM runs general syntax program');
  assert(run.phases.includes('cognitive'), 'cognitive phase executes');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
