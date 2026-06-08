'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { detectFusionPlan, runUnifiedFusion } = require('../src/runtime/fusion/unified-fusion');
const { recordFusionRun, readFusionHistory, summarizeHistoryStats } = require('../src/runtime/fusion/fusion-history');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Unified Fusion Orchestrator v1.1 ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/fusion-unified-mem');
const histDir = path.join(__dirname, '../artifacts/fusion-unified-hist');

for (const dir of [memDir, histDir]) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const agentPath = path.join(__dirname, '../examples/agent_field.noeon');
const genesisPath = path.join(__dirname, '../examples/genesis.next');

(async () => {
  const agentAst = parseAel(fs.readFileSync(agentPath, 'utf8'));
  const agentPlan = detectFusionPlan(agentAst, { filename: agentPath });

  assert(agentPlan.profile === 'general', 'agent plan profile general');
  assert(agentPlan.layers.includes('next'), 'agent plan has next');
  assert(agentPlan.layers.includes('liminal'), 'agent plan has liminal');
  assert(agentPlan.bidirectional === true, 'agent_field is bidirectional fusion');
  assert(agentPlan.triad === false, 'agent_field is not full triad on single file');

  const genesisAst = parseAel(fs.readFileSync(genesisPath, 'utf8'));
  const genesisPlan = detectFusionPlan(genesisAst, { filename: genesisPath });
  assert(genesisPlan.layers.includes('liminal'), 'genesis forward liminal');
  assert(genesisPlan.layers.includes('general'), 'genesis forward general');

  const agentFusion = await runUnifiedFusion(agentAst, {
    filename: agentPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false,
    with_protocol: 'off'
  });
  assert(agentFusion.nextField?.layers?.includes('next'), 'unified runs nextField');
  assert(agentFusion.liminalField?.layers?.includes('liminal'), 'unified runs liminalField');
  assert(agentFusion.bidirectional === true, 'unified marks bidirectional');

  const run = await executeProgram(agentAst, {
    quiet: true,
    with_protocol: 'off',
    filename: agentPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false
  });
  assert(run.fusionMeta?.bidirectional === true, 'executor exposes fusionMeta.bidirectional');
  assert(run.phases.includes('next-field'), 'executor still runs next-field');
  assert(run.phases.includes('liminal-field'), 'executor still runs liminal-field');

  const row = recordFusionRun({
    file: agentPath,
    profile: 'general',
    layers: ['next', 'liminal'],
    phases: ['next-field', 'liminal-field'],
    success: true,
    summary: 'test record',
    bidirectional: true
  }, { fusion_dir: histDir });

  assert(row.ts, 'history row has timestamp');
  const history = readFusionHistory({ fusion_dir: histDir, limit: 5 });
  assert(history.length === 1, 'history read returns recorded row');
  assert(history[0].summary === 'test record', 'history preserves summary');

  const stats = summarizeHistoryStats(history);
  assert(stats.total === 1, 'history stats count');
  assert(stats.byProfile.general === 1, 'history stats by profile');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
