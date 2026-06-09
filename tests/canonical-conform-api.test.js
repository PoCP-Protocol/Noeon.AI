'use strict';

const { runParityConformance } = require('../src/core/canonical-conform');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Conform API — Parity Payload ═══\x1b[0m\n');

(async () => {
  const payload = await runParityConformance();
  assert(payload.schema === 'noeon.canonical.report/v1', 'payload schema ref');
  assert(typeof payload.allValid === 'boolean', 'allValid boolean');
  assert(payload.goal === 'Assess market risk with evidence', 'shared goal');
  assert(payload.results.every((r) => r.executor === 'canonical'), 'all canonical executor');
  assert(payload.results.every((r) => r.irFirst === true), 'all irFirst');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
