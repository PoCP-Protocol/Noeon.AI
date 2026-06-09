'use strict';

const assert = require('assert');
const pkg = require('../package.json');
const { NOEON_VERSION, buildReleaseManifest, PUBLIC_VOCABULARY, V1_ALPHA_LANGUAGE_CORE } = require('../src/core/release-version');
const { VM_VERSION } = require('../src/vm/unified-executor');
const { getRuntimeStatus } = require('../src/runtime/unified-runtime');
const { RUNTIME_VERSION } = require('../src/pkg/manifest');

assert.strictEqual(NOEON_VERSION, '1.0.0-alpha.1');
assert.strictEqual(pkg.version, NOEON_VERSION);
assert.strictEqual(VM_VERSION, NOEON_VERSION);
assert.strictEqual(RUNTIME_VERSION, NOEON_VERSION);

const manifest = buildReleaseManifest();
assert.strictEqual(manifest.version, NOEON_VERSION);
assert.strictEqual(manifest.phase, 'alpha');
assert.strictEqual(manifest.era, 'canonical-primary-era');
assert.strictEqual(PUBLIC_VOCABULARY.length, 5);
assert.ok(V1_ALPHA_LANGUAGE_CORE.includes('AGENT'));
assert.ok(V1_ALPHA_LANGUAGE_CORE.includes('TRACE'));

const status = getRuntimeStatus();
assert.strictEqual(status.version, NOEON_VERSION);
assert.strictEqual(status.era, 'canonical-primary-era');
assert.strictEqual(status.generalCanonicalDefault, false);
assert.strictEqual(status.generalCanonicalToolsAuto, true);
assert.strictEqual(status.vm, NOEON_VERSION);
assert.deepStrictEqual(status.publicVocabulary, PUBLIC_VOCABULARY);
assert.ok(status.engineering?.versionAligned === true, 'engineering status reports version alignment');
assert.ok(status.engineering?.alphaGateTests?.length >= 6, 'engineering status lists alpha gate tests');

console.log('release-version.test.js: all passed');
