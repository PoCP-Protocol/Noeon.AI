'use strict';

const { expandUniversalStdlib, expandMeshSocial, STDLIB_DEFAULT_FLOW } = require('../src/core/universal-expand');
const { parseUniversalSource } = require('../src/grammar/universal-lower');
const { buildUniversalTemplate } = require('../src/core/universal-scaffold');
const { buildUniversalStudioStatus } = require('../src/core/universal-studio');
const { runGoldenGate } = require('../scripts/golden-gate');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 11 — Universal Expand & Studio Radar ═══\x1b[0m\n');

(async () => {
  const minimal = buildUniversalTemplate({ name: 'Bare', intent: 'Test defaults' })
    .replace(/  EPISTEMIC[\s\S]*?  EVOLUTION[\s\S]*?(?=^$)/m, '')
    .replace('import std.universal\n\n', '');

  const bareSource = `PROFILE "universal"
import std.universal
UNIVERSAL "Bare"
  INTENT "Minimal with stdlib expansion"
  COGNITION
    FLOW
      PERCEIVE source=x modality=text
`;

  const expanded = expandUniversalStdlib({
    imports: ['std.universal'],
    universal: {
      name: 'Bare',
      dimensions: {
        intent: { goal: 'Minimal', empty: false },
        epistemic: { empty: true },
        cognition: { flow: [{ kind: 'perceive', source: 'x', modality: 'text' }], empty: false },
        capability: { empty: true },
        governance: { empty: true },
        evolution: { empty: true }
      }
    }
  });

  assert(expanded.expanded === true, 'stdlib expands');
  assert(expanded.fragments.includes('epistemic.defaults'), 'fills epistemic');
  assert(expanded.fragments.includes('equip.default_tools'), 'fills capability');

  const orch = parseUniversalSource(
    require('fs').readFileSync(require('path').join(__dirname, '../examples/universal/orchestrator.noeon'), 'utf8'),
    { filename: 'orchestrator.noeon' }
  );
  assert(orch.universal?.stdlib?.expanded === true, 'orchestrator stdlib expanded');
  assert(orch.social?.spawns?.length >= 1, 'mesh spawns simulated');
  assert(orch.social?.delegations?.length >= 1, 'mesh delegations simulated');
  assert(orch.general?.stdlibExpansion?.length >= 1, 'stdlib fragments recorded');

  const flowOnly = parseUniversalSource(`PROFILE "universal"
import std.universal
UNIVERSAL "FlowOnly"
  INTENT "Only intent"
  COGNITION
    FLOW
      ACT action=run channel=test
`, { filename: 't.noeon' });
  assert(flowOnly.agents?.[0]?.flow?.length >= 1, 'partial flow preserved');

  const studio = buildUniversalStudioStatus({ root: require('path').join(__dirname, '..') });
  assert(studio.programs.length >= 3, 'studio lists universal examples');
  assert(studio.aggregateChecks.intent >= 0.9, 'aggregate intent high');

  const gate = await runGoldenGate({ root: require('path').join(__dirname, '..') });
  const orchGate = gate.programs.find((p) => p.file.includes('orchestrator'));
  assert(orchGate?.ok === true, 'orchestrator golden gate');
  assert(orchGate?.mesh?.spawns >= 1, 'orchestrator mesh in gate');

  assert(STDLIB_DEFAULT_FLOW.length >= 5, 'default flow steps');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
