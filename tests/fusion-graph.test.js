'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { buildFusionGraph, formatFusionMermaid, runFusionGraph } = require('../src/runtime/fusion/fusion-graph');
const { runFusionPreview } = require('../src/runtime/fusion/fusion-preview');
const { runGeneralLiminalFusion } = require('../src/runtime/fusion/general-liminal-fusion');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Fusion Graph — Topology + Mermaid + Enforce ═══\x1b[0m\n');

const memDir = path.join(__dirname, '../artifacts/fusion-graph-test-mem');
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

  const agentGraph = buildFusionGraph(agentAst, agentPreview, { filename: agentPath });
  assert(agentGraph.nodes.some((n) => n.kind === 'general'), 'graph has general root');
  assert(agentGraph.nodes.some((n) => n.kind === 'next'), 'graph has next layer');
  assert(agentGraph.nodes.some((n) => n.kind === 'liminal'), 'graph has liminal layer');
  assert(agentGraph.nodes.some((n) => n.kind === 'sidecar'), 'graph has liminal sidecar');
  assert(agentGraph.nodes.some((n) => n.kind === 'dominant'), 'graph has dominant node');
  assert(agentGraph.edges.some((e) => e.label?.includes('FUSE')), 'graph has FUSE edges');

  const mermaid = formatFusionMermaid(agentGraph);
  assert(mermaid.includes('flowchart LR'), 'mermaid is flowchart LR');
  assert(mermaid.includes('FUSE field'), 'mermaid labels FUSE field');
  assert(mermaid.includes('style'), 'mermaid applies node styles');

  const agentRun = await runFusionGraph(agentAst, {
    filename: agentPath,
    field_memory_dir: memDir,
    publish_mycelium: false,
    hot_reload: false
  });
  assert(agentRun.nodeCount >= 5, 'runFusionGraph returns node count');
  assert(agentRun.mermaid.includes('agent_field.noeon'), 'graph references program file');

  const genesisAst = parseAel(fs.readFileSync(genesisPath, 'utf8'));
  const genesisRun = await runFusionGraph(genesisAst, {
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
  assert(genesisRun.profile === 'next', 'genesis graph profile is next');
  assert(genesisRun.layers.includes('liminal'), 'genesis graph includes liminal');
  assert(genesisRun.layers.includes('general'), 'genesis graph includes general');

  const enforceAst = parseAel(`PROFILE "general"
VERSION "1.0.0"
FUSE liminal {
  mode: enforce
  resonance_floor: 0.99
}
AGENT "Strict"
  GOAL "High bar alignment"
  FLOW
    REFLECT
`);
  const enforceFusion = await runGeneralLiminalFusion(enforceAst, {
    filename: path.join(memDir, 'strict_agent.noeon'),
    resonance: { 'agent_goal->execution': 0.2 }
  });
  assert(enforceFusion?.blocked === true, 'enforce mode can block on low resonance');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
