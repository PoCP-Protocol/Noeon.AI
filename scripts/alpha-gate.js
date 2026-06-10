'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { ALPHA_GATE_TESTS } = require('../src/core/engineering-status');

// Gates must be deterministic and reproducible: default to offline mock LLM so
// the result never depends on ambient API keys or network. Override explicitly
// (e.g. NOEON_LLM_MODE=live) if a live check is intended.
if (!process.env.NOEON_LLM_MODE) process.env.NOEON_LLM_MODE = 'mock';

let failed = 0;

console.log('\n\x1b[36m═══ Noeon Alpha Gate ═══\x1b[0m\n');

for (const rel of ALPHA_GATE_TESTS) {
  const full = path.join(process.cwd(), rel);
  process.stdout.write(`▸ ${rel} … `);
  const result = spawnSync(process.execPath, [full], { stdio: 'pipe', encoding: 'utf8' });
  if (result.status === 0) {
    console.log('\x1b[32mPASS\x1b[0m');
  } else {
    failed += 1;
    console.log('\x1b[31mFAIL\x1b[0m');
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}Alpha gate: ${ALPHA_GATE_TESTS.length - failed}/${ALPHA_GATE_TESTS.length} passed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
