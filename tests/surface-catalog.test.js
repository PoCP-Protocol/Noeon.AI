'use strict';

const {
  buildSurfaceCatalog,
  PRIMARY_SURFACES,
  filterExamplesByTier
} = require('../src/core/surface-catalog');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Surface Catalog (primary vs advanced) ═══\x1b[0m\n');

const catalog = buildSurfaceCatalog();
assert(catalog.schema === 'noeon.surface.catalog/v1', 'surface catalog schema');
assert(catalog.primary.includes('general'), 'primary includes general');
assert(catalog.advanced.includes('ael'), 'advanced includes ael');
assert(catalog.onboarding?.includes('AGENT'), 'onboarding mentions AGENT');

const examples = [
  { name: 'hello.noeon', tier: 'primary', category: 'getting-started' },
  { name: 'fusion_triad.noeon', tier: 'advanced', category: 'fusion' }
];
const primary = filterExamplesByTier(examples, { tier: 'primary' });
assert(primary.length === 1 && primary[0].name === 'hello.noeon', 'primary filter');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
