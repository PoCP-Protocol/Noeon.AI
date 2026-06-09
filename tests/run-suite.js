'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = {
  system: [
    'noeon-pipeline.test.js',
    'noeon-brain-architecture.test.js',
    'playground-pipeline.test.js',
    'playground-human-gate.test.js',
    'lsp-canonical.test.js',
    'mcp-bridge.test.js',
    'mcp-client.test.js',
    'doctor-canonical.test.js',
    'canonical-conform-api.test.js',
    'canonical-ecosystem.test.js',
    'ai-native-lens.test.js',
    'golden-path.test.js',
    'self-improve.test.js',
    'patch-preview.test.js',
    'auto-remediate.test.js',
    'golden-gate-remediate.test.js',
    'studio-golden-gate.test.js',
    'golden-gate-diff.test.js',
    'golden-gate-apply.test.js',
    'universal-profile.test.js',
    'universal-stdlib.test.js',
    'universal-expand.test.js',
    'universal-inline.test.js',
    'universal-mesh-trace.test.js',
    'universal-mesh-runtime.test.js',
    'declaration-bindings.test.js',
    'architecture-panel.test.js',
    'vm-phases.test.js',
    'golden-examples.test.js',
    'surface-freeze.test.js',
    'canonical-cognitive-bridge.test.js',
    'noeon-surface-unification.test.js',
    'noeon-unified-stack.test.js',
    'canonical-parity.test.js',
    'fusion-unified.test.js',
    'fusion-preview.test.js'
  ],
  product: [
    'examples-p0.test.js',
    'noeon-test.test.js',
    'http-call-plugin.test.js',
    'cli-init.test.js',
    'general-profile-v1.test.js'
  ],
  canonical: [
    'noeon-surface-unification.test.js',
    'noeon-unified-stack.test.js',
    'canonical-parity.test.js',
    'canonical-phase-b.test.js',
    'canonical-convergence.test.js',
    'canonical-ir-first.test.js',
    'canonical-executor.test.js',
    'canonical-observability.test.js',
    'human-gate.test.js',
    'playground-human-gate.test.js'
  ],
  fusion: [
    'fusion-profile-v1.test.js',
    'fusion-preview.test.js',
    'fusion-graph.test.js',
    'fusion-unified.test.js',
    'fusion-triad.test.js',
    'fusion-coherence.test.js',
    'fusion-relay.test.js'
  ]
};

const suiteName = process.argv[2] || 'system';
const files = SUITES[suiteName];

if (!files) {
  console.error(`Unknown suite: ${suiteName}. Available: ${Object.keys(SUITES).join(', ')}`);
  process.exit(1);
}

let failed = 0;
console.log(`\n\x1b[36m═══ Noeon test suite: ${suiteName} ═══\x1b[0m\n`);

for (const file of files) {
  const full = path.join(__dirname, file);
  const result = spawnSync(process.execPath, [full], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}Suite ${suiteName}: ${files.length - failed}/${files.length} files passed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
