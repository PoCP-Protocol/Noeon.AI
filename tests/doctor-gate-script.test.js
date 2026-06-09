'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ Doctor Gate Script ═══\x1b[0m\n');

const script = path.join(__dirname, '..', 'scripts', 'doctor-gate.js');

const humanRun = spawnSync(process.execPath, [script], { encoding: 'utf8' });
assert(humanRun.status === 0, 'doctor-gate.js exits 0');
assert(humanRun.stdout.includes('execution_path_probes'), 'human output mentions execution_path_probes');

const jsonRun = spawnSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
assert(jsonRun.status === 0, 'doctor-gate.js --json exits 0');
let parsed;
try {
  parsed = JSON.parse(jsonRun.stdout);
} catch {
  parsed = null;
}
assert(parsed?.ok === true, 'JSON report ok === true');
assert(
  parsed?.checks?.some((check) => check.name === 'execution_path_probes' && check.ok === true),
  'JSON report includes passing execution_path_probes'
);
assert(
  parsed?.checks?.some((check) => check.name === 'production_gate' && check.ok === true),
  'JSON report includes passing production_gate'
);
assert(parsed?.productionGateArtifact != null, 'JSON report includes productionGateArtifact summary');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}Doctor gate script: ${passed}/${passed + failed} passed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
