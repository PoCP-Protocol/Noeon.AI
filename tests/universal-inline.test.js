'use strict';

const { parseGeneralProgram, parseGeneralSource } = require('../src/grammar');
const { validateAel } = require('../src/validator');
const { expandUniversalStdlibCall } = require('../src/grammar/universal-stdlib-inline');
const { inferBodyEffect } = require('../src/grammar/effects');
const { executeProgram } = require('../src/vm/unified-executor');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 12 — Universal Inline stdlib in General fn ═══\x1b[0m\n');

const inlineSrc = `
profile "general"
version "1.0.0-alpha"
module inline_demo
import std.universal

@effect(external)
fn weave() {
  intent "Test inline"
  epistemic require_citation=true confidence_floor=0.8
  cognize()
  equip tools="web_search"
  govern audit=true
  spawn name=worker channel=mesh
  delegate strategy=mesh threshold=0.7
}

export fn main() {
  weave()
}
`;

const gp = parseGeneralProgram(inlineSrc);
assert(gp.functions[0].body.some((s) => s.kind === 'stdlib' && s.module === 'std.universal' && s.exportName === 'cognize'), 'parses cognize() call');
assert(gp.functions[0].body.some((s) => s.exportName === 'intent'), 'parses intent statement');
assert(gp.functions[0].body.some((s) => s.exportName === 'epistemic'), 'parses epistemic kv');

const dotted = parseGeneralProgram(`profile "general"
import std.universal
fn t() {
  std.universal.scaffold()
}
export fn main() {
  t()
}
`);
assert(dotted.functions[0].body[0].module === 'std.universal', 'parses std.universal.scaffold() dotted call');

const expanded = expandUniversalStdlibCall('cognize', [], {});
assert(expanded.statements.length >= 5, 'cognize expands default flow');
assert(expanded.fragments.includes('cognize.inline_flow'), 'cognize fragment recorded');

const ast = parseGeneralSource(inlineSrc);
assert(ast.cognition.goal === 'Test inline', 'intent lowers to cognition.goal');
assert(String(ast.cognition.context.require_citation) === 'true', 'epistemic lowers to context');
assert(ast.cognitive.perceptions.length >= 1, 'cognize expands PERCEIVE');
assert(ast.cognitive.reasonings.length >= 1, 'cognize expands REASON');
assert(ast.social.spawns.length >= 1, 'spawn preserved after inline expansion');
assert((ast.general.universalInline || []).length >= 3, 'universalInline fragments tracked');

const valid = validateAel(ast);
assert(valid.valid === true, 'inline universal program validates');
assert(inferBodyEffect(gp.functions[0].body, gp.importContext) === 'external', 'weave fn infers external effect (govern)');

const examplePath = path.join(__dirname, '../examples/universal/inline_fn.noeon');
const exampleAst = parseGeneralSource(fs.readFileSync(examplePath, 'utf8'), { filename: 'inline_fn.noeon' });
assert(exampleAst.general.universalInline?.length >= 1, 'example file inline expansion');

(async () => {
  const run = await executeProgram(exampleAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'inline_fn.noeon'
  });
  assert(run.success === true, 'inline_fn executes');
  assert(run.meshTrace?.summary?.spawns >= 1, 'mesh trace attached on run');
  assert(run.report?.observability?.mesh_trace?.mermaid, 'mesh trace in report observability');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
