'use strict';

const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { compileProgram } = require('../src/runtime/unified-runtime');
const { resolveCompilePresentation } = require('../src/core/general-canonical-mode');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Compile Presentation Integration ═══\x1b[0m\n');

const src = `
profile "general"
version "1.0.0-alpha.1"
module compile_demo
import std.web

@effect(external)
fn main() {
  text("https://example.com", mock=true)
}
`;

const ast = parseAel(src);
assert(validateAel(ast).valid === true, 'web demo validates');

const off = compileProgram(ast, 'ir', { general_canonical: false });
assert(off.compileMode === 'cognitive-primary', 'compileProgram returns cognitive-primary by default');
assert(off.primaryIr === 'cognitive', 'compileProgram primaryIr cognitive by default');
assert(Boolean(off.program?.toJSON?.()), 'compileProgram returns cognitive program JSON');

const on = compileProgram(ast, 'ir', { general_canonical: true });
assert(on.compileMode === 'canonical-primary', 'compileProgram returns canonical-primary when enabled');
assert(on.primaryIr === 'canonical', 'compileProgram primaryIr canonical when enabled');
assert(Boolean(on.canonicalIr?.intent), 'compileProgram attaches canonicalIr from ast');

const presentation = resolveCompilePresentation(ast, on.program, { general_canonical: true });
assert(presentation.compileMode === on.compileMode, 'resolveCompilePresentation matches compileProgram');

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
