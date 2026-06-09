'use strict';

const path = require('path');
const {
  runProductionGate,
  writeProductionGateArtifact
} = require('../src/core/production-gate-status');

const jsonMode = process.argv.includes('--json');
const root = path.join(__dirname, '..');

const result = runProductionGate({ root });
writeProductionGateArtifact(result, { root });

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('\n\x1b[36m═══ Noeon Production Gate ═══\x1b[0m\n');
  for (const check of result.checks) {
    const mark = check.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`${mark} ${check.name}: ${check.detail}`);
  }
  console.log(`\n${result.ok ? '\x1b[32m' : '\x1b[31m'}Production gate: ${result.ok ? 'PASS' : 'FAIL'}\x1b[0m\n`);
}

process.exit(result.ok ? 0 : 1);
