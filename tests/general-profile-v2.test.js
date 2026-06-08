'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { runGeneralNextFusion, injectNextFieldIntoGeneral } = require('../src/runtime/fusion/general-next-fusion');
const { executeProgram } = require('../src/vm/unified-executor');
const { parseGeneralSource } = require('../src/grammar');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ General Profile v1.0 — Reverse FUSE Next + Stable GA ═══\x1b[0m\n');

const agentFieldPath = path.join(__dirname, '../examples/agent_field.noeon');
const memDir = path.join(__dirname, '../artifacts/general-fusion-mem');

if (fs.existsSync(memDir)) {
  for (const f of fs.readdirSync(memDir)) fs.unlinkSync(path.join(memDir, f));
} else {
  fs.mkdirSync(memDir, { recursive: true });
}

const agentAst = parseAel(fs.readFileSync(agentFieldPath, 'utf8'));
assert(agentAst.version === '1.0.0', 'agent_field at General v1.0.0');
assert(agentAst.fusion?.length === 2, 'parses FUSE next + liminal blocks');
assert(agentAst.fusion.some((f) => f.target === 'next'), 'FUSE next present');
assert(agentAst.fusion.some((f) => f.target === 'liminal'), 'FUSE liminal present');
assert(agentAst.fusion[0].file === 'genesis.next', 'FUSE references genesis.next');
assert(agentAst.agents[0].name === 'FieldAnalyst', 'FieldAnalyst agent parsed');

const stubNext = {
  dominant: { name: 'hypothesis_risk_off', energy: 0.71, claim: 'risk-off' },
  goal: { text: 'Field goal' },
  field: {
    dominant: { name: 'hypothesis_risk_off', energy: 0.71 },
    cells: [{ name: 'hypothesis_risk_off', energy: 0.71, claim: 'risk' }],
    narrative: [{ text: 'Weave→narrative: [hypothesis_risk_off] coherence=0.8' }]
  },
  narrative: [{ text: 'Weave→narrative: [hypothesis_risk_off] coherence=0.8' }]
};

const probeAst = parseAel(`PROFILE "general"\nVERSION "1.0.0"\nAGENT "T"\n  GOAL "g"\n  FLOW\n    REFLECT\n`);
injectNextFieldIntoGeneral(probeAst, stubNext, { inject: ['dominant', 'narrative', 'summary'] });
assert(probeAst.cognition.context.next_dominant?.name === 'hypothesis_risk_off', 'injects next dominant into cognition context');
assert(probeAst.cognition.understandings.some((u) => u.source === 'next_field'), 'adds next_field understanding');

(async () => {
  const fusion = await runGeneralNextFusion(agentAst, {
    filename: agentFieldPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false
  });

  assert(fusion?.layers?.includes('next'), 'general next fusion runs');
  assert(fusion.fusions.some((f) => f.ok === true), 'genesis.next fusion succeeds');
  assert(fusion.summary?.includes('Dominant'), 'fusion summary from bridge');

  const run = await executeProgram(agentAst, {
    quiet: true,
    with_protocol: 'off',
    filename: agentFieldPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false
  });

  assert(run.success === true, 'agent_field.noeon runs end-to-end');
  assert(run.phases.includes('next-field'), 'executor runs next-field phase');
  assert(run.phases.includes('liminal-field'), 'executor runs liminal-field phase');
  assert(run.liminalField?.fusions?.[0]?.mode === 'observe', 'liminal observe mode in fusion result');
  assert(run.nextField?.summary || run.injectedContext?.next_dominant, 'run carries field context');

  const helloAst = parseGeneralSource(fs.readFileSync(path.join(__dirname, '../examples/hello.noeon'), 'utf8'));
  assert(helloAst.version === '1.0.0-alpha' || helloAst.profile === 'general', 'hello.noeon still parses');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
