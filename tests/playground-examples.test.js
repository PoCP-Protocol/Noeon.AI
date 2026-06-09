'use strict';

const path = require('path');
const { loadCuratedExamples, CURATED_EXAMPLES } = require('../src/core/playground-examples');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Playground Examples API ═══\x1b[0m\n');

const root = path.join(__dirname, '..');
const examples = loadCuratedExamples({ root });

assert(Array.isArray(examples) && examples.length > 0, 'loadCuratedExamples returns non-empty list');
assert(examples.every((e) => e.name && e.source), 'each example includes name and source');

const names = new Set(examples.map((e) => e.name));
assert(names.has('hello.noeon'), 'includes hello.noeon');
assert(names.has('http_demo.noeon'), 'includes http_demo.noeon');
assert(names.has('web_fetch.noeon'), 'includes web_fetch.noeon');

const curatedNames = new Set(CURATED_EXAMPLES.map((e) => e.name));
for (const ex of examples) {
  assert(curatedNames.has(ex.name), `${ex.name} is in CURATED_EXAMPLES`);
}

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
