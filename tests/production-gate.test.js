'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Production Gate Script ═══\x1b[0m\n');

const script = path.join(__dirname, '..', 'scripts', 'production-gate.js');
const run = spawnSync(process.execPath, [script, '--json'], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_REQUIRE_PLUGIN_SIGNATURE: 'true', NOEON_PLUGIN_SIGNING_KEY: 'noeon-hardened-key' }
});

assert(run.status === 0, 'production-gate.js exits 0 with signature env');
const payload = run.stdout ? JSON.parse(run.stdout) : null;
assert(payload?.ok === true, 'production gate json ok');
assert(payload?.policy?.requireVersion === true, 'production policy requireVersion');
assert(payload?.policy?.requireSignature === true, 'production policy requireSignature default');
assert(payload?.checks?.some((c) => c.name === 'signed_plugin_probe' && c.ok), 'signed_plugin_probe passes');
assert(payload?.checks?.some((c) => c.name === 'signed_act_demo' && c.ok), 'signed_act_demo check passes');
assert(payload?.checks?.some((c) => c.name === 'execution_path_probes' && c.ok), 'execution_path_probes in production gate');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
