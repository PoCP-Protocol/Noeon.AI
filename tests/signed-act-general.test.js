'use strict';

const fs = require('fs');
const path = require('path');
const { parseProgram } = require('../src/runtime/unified-runtime');
const { buildActBinding } = require('../src/runtime/act-binding');
const { verifyPluginBinding, expectedSignature } = require('../src/runtime/plugins/integrity');
const { resolvePluginPolicyFromConfig, DEFAULT_CONFIG } = require('../src/core/config');
const { executeSnapshotCanonicalActs } = require('../src/core/canonical-act-runner');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Signed General ACT Demo ═══\x1b[0m\n');

const demoPath = path.join(__dirname, '../examples/signed_act_demo.noeon');
assert(fs.existsSync(demoPath), 'signed_act_demo.noeon exists');

const { ast } = parseProgram(demoPath);
const act = ast?.general?.canonicalIr?.execution?.acts?.find((a) => a.plugin === 'http_call');
assert(act?.version === '0.9.0', 'canonical act retains version');
assert(act?.signature?.startsWith('hmac-sha256:'), 'canonical act retains signature');

const binding = buildActBinding(act);
assert(binding?.version === '0.9.0', 'buildActBinding forwards version');
assert(binding?.signature?.startsWith('hmac-sha256:'), 'buildActBinding forwards signature');

const prodPolicy = resolvePluginPolicyFromConfig({}, {
  ...DEFAULT_CONFIG,
  environment: 'production'
});
const plugin = { name: 'http_call', version: '0.9.0' };
const verified = verifyPluginBinding({
  binding,
  plugin,
  context: { pluginPolicy: prodPolicy }
});
assert(verified.ok === true, 'signed binding verifies under production policy');

const unsignedBinding = buildActBinding({ ...act, signature: null });
const blocked = verifyPluginBinding({
  binding: unsignedBinding,
  plugin,
  context: { pluginPolicy: prodPolicy }
});
assert(blocked.ok === false, 'unsigned binding blocked under production policy');

(async () => {
  const out = await executeSnapshotCanonicalActs(ast.general.canonicalIr, ast, {
    pluginPolicy: prodPolicy,
    feedback: {}
  });
  assert(out.success === true, 'signed act demo executes under production policy');
  assert(out.acts?.length === 1, 'one canonical act executed');
  assert(out.acts[0].status === 'done', 'signed act status done');

  const expected = expectedSignature('http_call', '0.9.0', 'noeon-dev-key');
  assert(act.signature === expected, 'demo signature matches noeon-dev-key default');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
