'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { runFusionPreview, formatFusionPreviewText } = require('../src/runtime/fusion/fusion-preview');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Fusion Preview — Bidirectional CLI + API ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/fusion-preview-mem');
if (fs.existsSync(memDir)) {
  for (const f of fs.readdirSync(memDir)) fs.unlinkSync(path.join(memDir, f));
} else {
  fs.mkdirSync(memDir, { recursive: true });
}

const agentPath = path.join(__dirname, '../examples/agent_field.noeon');
const genesisPath = path.join(__dirname, '../examples/genesis.next');

(async () => {
  const agentAst = parseAel(fs.readFileSync(agentPath, 'utf8'));
  const agentPreview = await runFusionPreview(agentAst, {
    filename: agentPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false
  });

  assert(agentPreview.profile === 'general', 'agent_field preview is general profile');
  assert(agentPreview.layers.includes('next'), 'general preview includes next layer');
  assert(agentPreview.layers.includes('liminal'), 'general preview includes liminal layer');
  assert(agentPreview.phases.includes('next-field'), 'general preview runs next-field');
  assert(agentPreview.phases.includes('liminal-field'), 'general preview runs liminal-field');
  assert(agentPreview.nextField?.dominant?.name, 'general preview exposes dominant');
  assert(agentPreview.liminalField?.mode === 'observe', 'liminal observe mode summarized');
  assert(agentPreview.context?.next_dominant, 'preview context includes next_dominant');
  assert(agentPreview.summary, 'preview builds summary string');

  const text = formatFusionPreviewText(agentPreview);
  assert(text.includes('Profile Fusion Preview'), 'text formatter renders header');
  assert(text.includes('next'), 'text formatter mentions next layer');

  const genesisAst = parseAel(fs.readFileSync(genesisPath, 'utf8'));
  const nextPreview = await runFusionPreview(genesisAst, {
    filename: genesisPath,
    source_path: genesisPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false,
    resonance: {
      'field_goal->hypothesis_risk_off': 0.82,
      'field_signal->hypothesis_soft': 0.76
    }
  });

  assert(nextPreview.profile === 'next', 'genesis preview is next profile');
  assert(nextPreview.layers.includes('liminal'), 'next preview includes liminal');
  assert(nextPreview.layers.includes('general'), 'next preview includes general bridge');
  assert(nextPreview.fusion?.general?.summary, 'next preview general bridge summary');
  assert(nextPreview.success === true, 'genesis fusion preview succeeds');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
