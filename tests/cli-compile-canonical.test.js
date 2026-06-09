'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ CLI Compile Canonical Flag ═══\x1b[0m\n');

const cli = path.join(__dirname, '..', 'src', 'cli.js');
const sample = path.join(__dirname, '..', 'examples', 'web_fetch.noeon');

function runCompile(extraArgs = []) {
  return spawnSync(process.execPath, [cli, 'compile', sample, ...extraArgs], {
    encoding: 'utf8'
  });
}

const defaultRun = runCompile(['--json']);
assert(defaultRun.status === 0, 'compile exits 0');
let payload = null;
try {
  payload = JSON.parse(defaultRun.stdout.trim());
} catch {
  payload = null;
}
assert(payload?.compileMode === 'cognitive-primary', 'default compileMode cognitive-primary');
assert(payload?.primaryIr === 'cognitive', 'default primaryIr cognitive');
assert(Boolean(payload?.cognitiveIr), 'json envelope includes cognitiveIr');
assert(Boolean(payload?.canonicalIr?.intent), 'json envelope includes canonicalIr snapshot');

const canonicalRun = runCompile(['--json', '--canonical']);
assert(canonicalRun.status === 0, 'compile --canonical exits 0');
let canonicalPayload = null;
try {
  canonicalPayload = JSON.parse(canonicalRun.stdout.trim());
} catch {
  canonicalPayload = null;
}
assert(canonicalPayload?.compileMode === 'canonical-primary', '--canonical sets canonical-primary');
assert(canonicalPayload?.primaryIr === 'canonical', '--canonical sets primaryIr canonical');

const plainCanonical = runCompile(['--canonical']);
assert(plainCanonical.status === 0, 'plain compile --canonical exits 0');
let plainPayload = null;
try {
  plainPayload = JSON.parse(plainCanonical.stdout.trim());
} catch {
  plainPayload = null;
}
assert(Boolean(plainPayload?.intent), 'plain --canonical outputs canonicalIr body');

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
