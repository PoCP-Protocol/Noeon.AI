'use strict';

const { dispatchParseSurface, SURFACES } = require('../src/grammar/parse-dispatch');

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

console.log('\n\x1b[36m═══ Parse Dispatch Surface v1 Tests ═══\x1b[0m\n');

(() => {
  const nextSource = [
    'PROFILE "next"',
    'VERSION "1.0.0"',
    'PROGRAM "dispatch-next"',
    'GOAL "stabilize routing" priority=0.8',
    'MODEL name=oracle source=sim confidence=0.9',
    'STRATEGY name=safe objective=stability risk=low',
    'GUARANTEE name=g expr="signal >= 0.5"',
    'ACT strategy=safe when="signal >= 0.5"'
  ].join('\n');

  const nextAst = dispatchParseSurface(nextSource, { filename: 'dispatch.noeon' });
  assert(!!nextAst, '.noeon NEXT source produces AST');
  assert(nextAst?.detectedSurface === SURFACES.NEXT, '.noeon NEXT source detected as NEXT');
  assert(nextAst?.profile === 'next', 'dispatch returns lowered next profile AST');
  assert(Array.isArray(nextAst?.next?.strategies), 'next AST includes strategies array');

  const generalSource = [
    'profile "general"',
    'version "1.0.0-alpha"',
    'program demo {',
    '  objective "keep baseline"',
    '}'
  ].join('\n');

  const generalAst = dispatchParseSurface(generalSource, { filename: 'dispatch.noeon' });
  assert(!!generalAst, '.noeon general source produces AST');
  assert(generalAst?.detectedSurface === SURFACES.GENERAL, '.noeon general source stays GENERAL');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();