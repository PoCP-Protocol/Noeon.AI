'use strict';

const { detectSurface, SURFACES } = require('../src/grammar/detect');

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

console.log('\n\x1b[36m═══ Surface Detect v1 Tests ═══\x1b[0m\n');

(() => {
  const nextInNoeon = [
    'PROFILE "next"',
    'VERSION "1.0.0"',
    'PROGRAM "x"',
    'GOAL "g" priority=0.9',
    'MODEL name=m source=s confidence=0.9',
    'STRATEGY name=a objective=b risk=medium',
    'GUARANTEE name=g expr="x <= y"'
  ].join('\n');
  const s1 = detectSurface(nextInNoeon, { filename: 'x.noeon' });
  assert(s1 === SURFACES.NEXT, '.noeon with NEXT syntax is detected as NEXT');

  const generalInNoeon = [
    'profile "general"',
    'version "1.0.0-alpha"',
    'program demo {',
    '  objective "x"',
    '}'
  ].join('\n');
  const s2 = detectSurface(generalInNoeon, { filename: 'g.noeon' });
  assert(s2 === SURFACES.GENERAL, '.noeon with general syntax stays GENERAL');

  const nextFile = 'PROFILE "general"\nPROGRAM "x"';
  const s3 = detectSurface(nextFile, { filename: 'force.next' });
  assert(s3 === SURFACES.NEXT, '.next filename keeps NEXT precedence');

  const aelFile = 'TASK "t"\nGOAL "x"';
  const s4 = detectSurface(aelFile, { filename: 'contract.ael' });
  assert(s4 === SURFACES.AEL, '.ael filename remains AEL');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
