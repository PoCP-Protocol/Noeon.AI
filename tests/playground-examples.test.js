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
assert(examples.every((e) => e.executionStrategy && e.executionPath), 'each example includes execution metadata');

const names = new Set(examples.map((e) => e.name));
assert(names.has('hello.noeon'), 'includes hello.noeon');
assert(names.has('parity/risk_assess_unified.noeon'), 'includes unified entry example');
assert(names.has('http_demo.noeon'), 'includes http_demo.noeon');
assert(names.has('web_fetch.noeon'), 'includes web_fetch.noeon');

const httpDemo = examples.find((e) => e.name === 'http_demo.noeon');
assert(httpDemo?.executionPath === 'snapshot-act', 'http_demo tagged snapshot-act');
assert(httpDemo?.autoCanonical === true, 'http_demo auto canonical');

const agentResearch = examples.find((e) => e.name === 'agent_research.noeon');
assert(agentResearch?.executionPath === 'hybrid', 'agent_research tagged hybrid');
assert(agentResearch?.autoCanonical === true, 'agent_research auto canonical');

const unified = examples.find((e) => e.name === 'parity/risk_assess_unified.noeon');
assert(unified?.tier === 'primary', 'unified entry is primary tier');
assert(unified?.source?.includes('CONTRACT'), 'unified entry source has CONTRACT block');

const hello = examples.find((e) => e.name === 'hello.noeon');
assert(hello?.executionPath === 'cognitive', 'hello cognitive path');
assert(examples.every((e) => e.tier === 'primary'), 'default curated list is primary tier only');

const advanced = loadCuratedExamples({ root, tier: null, primaryOnly: false });
assert(advanced.length >= examples.length, 'full curated list is at least primary size');

const signedDemo = examples.find((e) => e.name === 'signed_act_demo.noeon');
assert(signedDemo?.executionPath === 'hybrid', 'signed_act_demo tagged hybrid');
assert(signedDemo?.signedAct === true, 'signed_act_demo flagged signedAct');

const curatedNames = new Set(CURATED_EXAMPLES.map((e) => e.name));
for (const ex of examples) {
  assert(curatedNames.has(ex.name), `${ex.name} is in CURATED_EXAMPLES`);
}

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
