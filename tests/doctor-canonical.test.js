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
const stdlibCheck = report.checks.find((c) => c.name === 'stdlib_surface');
const generalCanonicalCheck = report.checks.find((c) => c.name === 'general_canonical');
const releaseEraCheck = report.checks.find((c) => c.name === 'release_era');
const snapshotExecCheck = report.checks.find((c) => c.name === 'snapshot_execution');
const toolCanonicalCheck = report.checks.find((c) => c.name === 'tool_demos_canonical');
const agentHybridCheck = report.checks.find((c) => c.name === 'agent_canonical_hybrid');
const goldenGateCheck = report.checks.find((c) => c.name === 'golden_gate');
const toolDemosCheck = report.checks.find((c) => c.name === 'tool_demos');

assert(canonicalCheck?.ok === true, 'canonical_route ok when legacy unset');
assert(canonicalCheck?.detail?.includes('IR-first'), 'canonical_route detail');
assert(mcpCheck?.ok === true, 'mcp check always ok');
assert(mcpCheck?.detail?.includes('MCP'), 'mcp detail mentions MCP');
assert(stdlibCheck?.ok === true, 'stdlib_surface check passes');
assert(stdlibCheck?.detail?.includes('stdlib modules'), 'stdlib_surface detail');
assert(generalCanonicalCheck?.ok === true, 'general_canonical check passes');
assert(releaseEraCheck?.ok === true, 'release_era check passes');
assert(releaseEraCheck?.detail?.includes('canonical-primary-era'), 'release_era detail');
assert(snapshotExecCheck?.ok === true, 'snapshot_execution check passes');
assert(snapshotExecCheck?.detail?.includes('snapshot-primary'), 'snapshot_execution detail');
assert(toolCanonicalCheck?.ok === true, 'tool_demos_canonical check passes');
assert(toolCanonicalCheck?.detail?.includes('tool demos'), 'tool_demos_canonical detail');
assert(agentHybridCheck?.ok === true, 'agent_canonical_hybrid check passes');
assert(agentHybridCheck?.detail?.includes('agent'), 'agent_canonical_hybrid detail');
assert(goldenGateCheck?.ok === true, 'golden_gate check passes (optional artifact)');
assert(goldenGateCheck?.detail?.includes('Golden gate') || goldenGateCheck?.detail?.includes('golden-gate'), 'golden_gate detail');
assert(toolDemosCheck?.ok === true, 'tool_demos check passes');
assert(toolDemosCheck?.detail?.includes('tool demos'), 'tool_demos detail mentions tool demos');

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
