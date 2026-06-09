'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  DEFAULT_CONFIG,
  loadProjectConfig,
  resolveRunOptions,
  resolvePluginPolicyFromConfig
} = require('../src/core/config');
const {
  DEFAULT_ALLOWED_PLUGINS,
  DEFAULT_ALLOWED_ACTION_TYPES,
  resolvePluginPolicy
} = require('../src/runtime/plugins/policy');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Plugin Policy Config ═══\x1b[0m\n');

assert(Array.isArray(DEFAULT_CONFIG.plugins?.allowedPlugins), 'DEFAULT_CONFIG has plugins.allowedPlugins');
assert(
  DEFAULT_ALLOWED_PLUGINS.every((p) => DEFAULT_CONFIG.plugins.allowedPlugins.includes(p)),
  'DEFAULT_CONFIG includes all default allowed plugins'
);
assert(
  DEFAULT_ALLOWED_ACTION_TYPES.every((t) => DEFAULT_CONFIG.plugins.allowedActionTypes.includes(t)),
  'DEFAULT_CONFIG includes all default allowed action types'
);

const runOpts = resolveRunOptions({}, DEFAULT_CONFIG);
assert(Array.isArray(runOpts.pluginPolicy?.allowedPlugins), 'resolveRunOptions exposes pluginPolicy.allowedPlugins');
assert(
  runOpts.pluginPolicy.allowedPlugins.includes('http_call'),
  'resolveRunOptions pluginPolicy includes http_call'
);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-plugin-policy-'));
const configPath = path.join(tmpDir, '.noeonrc.json');
fs.writeFileSync(configPath, JSON.stringify({
  plugins: {
    allowedPlugins: ['echo', 'http_call'],
    allowedActionTypes: ['sense', 'commit']
  }
}, null, 2));

const loaded = loadProjectConfig({ cwd: tmpDir, configPath });
const mergedOpts = resolveRunOptions({}, loaded.config);
assert(
  mergedOpts.pluginPolicy.allowedPlugins.length === 2,
  'project config overrides plugin allowlist length'
);
assert(
  mergedOpts.pluginPolicy.allowedPlugins.includes('echo'),
  'project config allowlist includes echo'
);

const deny = resolvePluginPolicy({ plugin: 'fs_call' }, {
  pluginPolicy: mergedOpts.pluginPolicy,
  actionType: 'sense'
});
assert(deny.allow === false, 'fs_call denied when not in project allowlist');
assert(deny.category === 'policy_block', 'deny category is policy_block');

const allow = resolvePluginPolicy({ plugin: 'http_call' }, {
  pluginPolicy: mergedOpts.pluginPolicy,
  actionType: 'sense'
});
assert(allow.allow === true, 'http_call allowed when in project allowlist');

const prevEnv = process.env.NOEON_ALLOWED_PLUGINS;
process.env.NOEON_ALLOWED_PLUGINS = 'echo';
const envPolicy = resolvePluginPolicyFromConfig({}, loaded.config);
assert(envPolicy.allowedPlugins === 'echo', 'NOEON_ALLOWED_PLUGINS env overrides config');
if (prevEnv === undefined) delete process.env.NOEON_ALLOWED_PLUGINS;
else process.env.NOEON_ALLOWED_PLUGINS = prevEnv;

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
