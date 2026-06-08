'use strict';

const path = require('path');
const { parseFromSource } = require('../src/runtime/unified-runtime');
const { detectSurface } = require('../src/grammar/detect');
const {
  assertFrozenFilename,
  resolveFrozenExtension,
  classifyExtension
} = require('../src/core/canonical-architecture');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ Frozen Surface Entry Policy ═══\x1b[0m\n');

assert(classifyExtension('.lim') === 'liminal', '.lim maps to liminal');
assert(resolveFrozenExtension('review.lim.human') === '.lim', '.lim.human resolves to .lim');
assert(resolveFrozenExtension('genesis.next.evolved') === '.evolved', '.next.evolved ext skipped by policy');

try {
  assertFrozenFilename('program.xyz');
  assert(false, 'program.xyz should throw');
} catch (e) {
  assert(String(e.message).includes('Frozen surface'), 'rejects .xyz at filename check');
}

try {
  parseFromSource('TASK "demo"', 'demo.xyz');
  assert(false, 'parseFromSource should reject .xyz');
} catch (e) {
  assert(String(e.message).includes('Frozen surface'), 'parseFromSource enforces freeze');
}

assert(
  detectSurface('covenant { }', { filename: 'x.lim' }) === 'liminal',
  'detectSurface allows .lim'
);

parseFromSource('profile "general"\nprogram p { objective "ok" }', 'ok.noeon');
assert(true, 'parseFromSource allows .noeon');

assert(
  detectSurface('', { filename: path.join('examples', 'code_reviewer.lim.human') }) === 'liminal',
  'detectSurface allows .lim.human variant'
);

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
