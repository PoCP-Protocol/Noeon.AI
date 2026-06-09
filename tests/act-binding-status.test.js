'use strict';

const {
  summarizePluginActs,
  summarizePluginActsFromCanonical,
  formatPluginActsLine,
  attachPluginActsToPayload,
  formatPluginActsStatusLines
} = require('../src/core/act-binding-status');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Plugin Act Binding Status ═══\x1b[0m\n');

const signed = summarizePluginActs([
  { plugin: 'http_call', step: 'fetch', version: '0.9.0', signature: 'hmac-sha256:abc' }
]);
assert(signed.total === 1, 'counts signed act');
assert(signed.signed === 1, 'marks signed');
assert(signed.unsigned === 0, 'no unsigned');

const unsigned = summarizePluginActs([
  { plugin: 'http_call', step: 'fetch_sources' }
]);
assert(unsigned.unsigned === 1, 'marks unsigned act');
assert(
  formatPluginActsLine(unsigned) === 'plugin acts (1): http_call (unsigned)',
  'format unsigned line'
);
assert(
  formatPluginActsLine(signed) === 'plugin acts (1): http_call (signed · v0.9.0)',
  'format signed line with version'
);

const fromCanonical = summarizePluginActsFromCanonical({
  execution: {
    acts: [
      { plugin: 'http_call', step: 'fetch', signature: 'hmac-sha256:abc', version: '0.9.0' },
      { plugin: 'fs_call', step: 'read' }
    ]
  }
});
assert(fromCanonical.total === 2, 'summarize from canonical IR');
assert(fromCanonical.signed === 1 && fromCanonical.unsigned === 1, 'mixed signed/unsigned');

const payload = attachPluginActsToPayload({}, {
  execution: { acts: [{ plugin: 'http_call', signature: 'hmac-sha256:abc' }] }
});
assert(payload.pluginActs?.signed === 1, 'attachPluginActsToPayload adds summary');
assert(formatPluginActsStatusLines(unsigned).some((line) => line.includes('unsigned')), 'status lines include unsigned');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
