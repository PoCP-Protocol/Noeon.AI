'use strict';

const {
  isGeneralCanonicalEnabled,
  resolveCompilePresentation
} = require('../src/core/general-canonical-mode');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ General Canonical Mode ═══\x1b[0m\n');

const prevEnv = process.env.NOEON_GENERAL_CANONICAL;
process.env.NOEON_GENERAL_CANONICAL = '1';
assert(isGeneralCanonicalEnabled() === true, 'NOEON_GENERAL_CANONICAL=1 enables mode');
assert(isGeneralCanonicalEnabled({ general_canonical: false }) === false, 'option overrides env');
process.env.NOEON_GENERAL_CANONICAL = prevEnv;

const ast = { general: { canonicalIr: { intent: { name: 'demo' } } } };
const cognitiveProgram = { toJSON: () => ({ nodes: [] }) };

const off = resolveCompilePresentation(ast, cognitiveProgram, { general_canonical: false });
assert(off.compileMode === 'cognitive-primary', 'default compileMode is cognitive-primary');
assert(off.primaryIr === 'cognitive', 'default primaryIr is cognitive');

const on = resolveCompilePresentation(ast, cognitiveProgram, { general_canonical: true });
assert(on.compileMode === 'canonical-primary', 'enabled compileMode is canonical-primary');
assert(on.primaryIr === 'canonical', 'enabled primaryIr is canonical');
assert(on.canonicalIr?.intent?.name === 'demo', 'presentation preserves canonicalIr');

const missing = resolveCompilePresentation({}, cognitiveProgram, { general_canonical: true });
assert(missing.compileMode === 'cognitive-primary', 'no canonicalIr keeps cognitive-primary');

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
