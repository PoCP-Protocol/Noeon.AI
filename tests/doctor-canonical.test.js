'use strict';

const { runDoctor } = require('../src/doctor');
const { runParityConformance } = require('../src/core/canonical-conform');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Doctor — Canonical & MCP Checks ═══\x1b[0m\n');

const prevLegacy = process.env.NOEON_LEGACY_PROFILE;
delete process.env.NOEON_LEGACY_PROFILE;

const report = runDoctor({ file: 'examples/hello.noeon' });
const canonicalCheck = report.checks.find((c) => c.name === 'canonical_route');
const mcpCheck = report.checks.find((c) => c.name === 'mcp');

assert(canonicalCheck?.ok === true, 'canonical_route ok when legacy unset');
assert(canonicalCheck?.detail?.includes('IR-first'), 'canonical_route detail');
assert(mcpCheck?.ok === true, 'mcp check always ok');
assert(mcpCheck?.detail?.includes('MCP'), 'mcp detail mentions MCP');

process.env.NOEON_LEGACY_PROFILE = '1';
const legacyReport = runDoctor({ file: 'examples/hello.noeon' });
const legacyCheck = legacyReport.checks.find((c) => c.name === 'canonical_route');
assert(legacyCheck?.ok === false, 'canonical_route fails when NOEON_LEGACY_PROFILE=1');
assert(legacyCheck?.recommendation?.includes('NOEON_LEGACY_PROFILE'), 'legacy recommendation');

if (prevLegacy === undefined) delete process.env.NOEON_LEGACY_PROFILE;
else process.env.NOEON_LEGACY_PROFILE = prevLegacy;

(async () => {
  const conform = await runParityConformance();
  assert(conform.allValid === true, 'runParityConformance allValid');
  assert(conform.results?.length === 4, 'four parity surfaces');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
