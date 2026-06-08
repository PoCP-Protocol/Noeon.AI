'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextProgram } = require('../src/grammar');
const { loadFusionSidecars, runProfileFusion } = require('../src/runtime/fusion/profile-fusion');
const { synthesizeLiminalFromField } = require('../src/runtime/fusion/liminal-field-bridge');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Profile Fusion v1 — Next × Liminal × General ═══\x1b[0m\n');

const genesisPath = path.join(__dirname, '../examples/genesis.next');
const limPath = path.join(__dirname, '../examples/genesis.lim');
const memDir = path.join(__dirname, '../artifacts/fusion-test-mem');

if (fs.existsSync(memDir)) {
  for (const f of fs.readdirSync(memDir)) fs.unlinkSync(path.join(memDir, f));
} else {
  fs.mkdirSync(memDir, { recursive: true });
}

const src = fs.readFileSync(genesisPath, 'utf8');
const prog = parseNextProgram(src);
assert(prog.fusion?.length === 2, 'genesis parses FUSE liminal + general');
assert(fs.existsSync(limPath), 'genesis.lim sidecar exists');

const sidecars = loadFusionSidecars(genesisPath);
assert(sidecars.liminal?.beliefs?.length >= 2, 'sidecar loads liminal beliefs');

const noSidecarNoeon = path.join(__dirname, '../examples/hello.noeon');
const noSidecars = loadFusionSidecars(noSidecarNoeon);
assert(!noSidecars.liminal, '.noeon main file is not treated as its own liminal sidecar');

const field = {
  dominant: { name: 'hypothesis_risk_off', energy: 0.72, claim: 'risk-off' },
  cells: [
    { name: 'hypothesis_risk_off', energy: 0.72, claim: 'risk-off' },
    { name: 'hypothesis_soft', energy: 0.55, claim: 'soft' }
  ]
};
const synth = synthesizeLiminalFromField({ next: prog, task: 'genesis' }, field);
assert(synth.liminal?.beliefs?.length === 2, 'synthesized liminal from field');
assert(synth.liminal.resonates.length >= 1, 'synthesized liminal resonates');

(async () => {
  const ast = parseNextProgram(src);
  const { lowerNextProgram } = require('../src/grammar/lower-next');
  const lowered = lowerNextProgram(prog);
  lowered.next = { ...lowered.next, fusion: prog.fusion };

  const nextStub = {
    blocked: false,
    field,
    dominant: field.dominant,
    narrative: [{ text: 'Weave→narrative: [hypothesis_risk_off] coherence=0.8' }]
  };

  const fusion = await runProfileFusion(lowered, nextStub, {
    filename: genesisPath,
    source_path: genesisPath,
    resonance: {
      'field_goal->hypothesis_risk_off': 0.82,
      'field_signal->hypothesis_soft': 0.76
    }
  });

  assert(fusion?.layers?.includes('liminal'), 'fusion runs liminal layer');
  assert(fusion?.layers?.includes('general'), 'fusion runs general layer');
  assert(fusion.liminal.observe === true, 'liminal fusion in observe mode');
  assert(fusion.liminal.blocked === false, 'observe mode does not block');
  assert(fusion.general?.bridge?.cycle?.length === 5, 'general bridge exposes cognitive cycle');

  const run = await executeProgram(lowered, {
    quiet: true,
    with_protocol: 'off',
    filename: genesisPath,
    source_path: genesisPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false,
    resonance: {
      'field_goal->hypothesis_risk_off': 0.85,
      'field_signal->hypothesis_soft': 0.7
    }
  });

  assert(run.success === true, 'fused genesis runs end-to-end');
  assert(run.phases.includes('fusion'), 'executor includes fusion phase');
  assert((run.fusion?.layers || []).length >= 2, 'run exposes fusion layers');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
