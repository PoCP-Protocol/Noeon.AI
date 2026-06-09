'use strict';

const path = require('path');
const {
  DEFAULT_CANONICAL_PROBE_PROGRAMS,
  runCanonicalProbes
} = require('../src/core/canonical-probes');
const { buildGoldenGateStudioStatus } = require('../src/core/golden-gate-status');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Golden Gate Canonical Probes ═══\x1b[0m\n');

(async () => {
  const root = path.join(__dirname, '..');

  assert(DEFAULT_CANONICAL_PROBE_PROGRAMS.length === 5, 'five default probe programs');
  assert(
    DEFAULT_CANONICAL_PROBE_PROGRAMS.includes('examples/agent_research.noeon'),
    'agent_research included in probes'
  );

  const staticProbes = await runCanonicalProbes({ root, probe_only: true });
  assert(staticProbes.schema === 'noeon.canonical.probes/v1', 'probe schema');
  assert(staticProbes.ok === true, 'static probe_only passes');
  assert(staticProbes.programs.length === 5, 'static probe program count');

  const agentProbe = staticProbes.programs.find((p) => p.file.endsWith('agent_research.noeon'));
  assert(agentProbe?.hybridCandidate === true, 'agent_research hybrid candidate');
  assert(agentProbe?.strategy === 'hybrid-canonical-acts', 'agent_research hybrid strategy');

  const liveProbes = await runCanonicalProbes({ root });
  assert(liveProbes.ok === true, 'live canonical probes pass');
  assert(liveProbes.summary.passed === liveProbes.summary.total, 'all live probes passed');

  const status = buildGoldenGateStudioStatus({ root });
  assert(Array.isArray(status.canonicalProbePrograms), 'studio status lists probe programs');
  assert(status.canonicalPath?.probes != null, 'studio canonicalPath includes probes summary');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
