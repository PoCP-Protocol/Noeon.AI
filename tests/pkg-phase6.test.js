'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  addDependency,
  installPackages,
  readLockfile,
  readManifest
} = require('../src/pkg/manifest');
const {
  searchPackages,
  publishPackage,
  resolveRegistryPackage,
  materializePackage,
  loadRegistryModule,
  getBundledRegistryDir
} = require('../src/pkg/registry');
const { parseGeneralSource } = require('../src/grammar');
const { validateAel } = require('../src/validator');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Package Registry + Ecosystem Phase 6 Tests ═══\x1b[0m\n');

(async () => {
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-pkg6-'));
const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

try {
  const results = searchPackages('demo');
  assert(results.some((p) => p.name === 'std.demo'), 'bundled registry lists std.demo');

  const resolved = resolveRegistryPackage('std.demo', '1.0.0');
  assert(resolved?.path && fs.existsSync(resolved.path), 'resolveRegistryPackage finds std.demo@1.0.0');

  addDependency(tmp, 'std.demo', 'registry:1.0.0');
  installPackages(tmp);
  const { lock } = readLockfile(tmp);
  assert(lock.resolved['std.demo'].source === 'registry', 'lockfile records registry source');
  assert(fs.existsSync(lock.resolved['std.demo'].path), 'registry package materialized under .noeon/packages');

  const mod = loadRegistryModule(lock.resolved['std.demo'].path);
  assert(mod?.exports?.greet, 'registry module.json exports greet');

  const src = `profile "general"
version "1.0.0-alpha"
module demo
import std.demo

@effect(pure)
fn main() {
  let x = 1
  assert x == 1
}
`;
  const ast = parseGeneralSource(src);
  const ok = validateAel(ast, { cwd: tmp });
  assert(ok.valid === true, 'validates registry import when declared in manifest');

  const searchCli = spawnSync(process.execPath, [cliPath, 'pkg', 'search', 'demo'], { encoding: 'utf8' });
  assert(searchCli.status === 0 && searchCli.stdout.includes('std.demo'), 'cli pkg search finds std.demo');

  const publishDir = path.join(tmp, 'my_pkg');
  fs.mkdirSync(publishDir, { recursive: true });
  fs.writeFileSync(path.join(publishDir, 'noeon-pkg.json'), `${JSON.stringify({
    name: 'demo.local',
    version: '0.1.0',
    description: 'local publish test',
    effect: 'pure',
    exports: { ping: { kind: 'fn', effect: 'pure' } }
  }, null, 2)}\n`);
  const published = publishPackage(publishDir, { registryDir: path.join(tmp, 'local-registry') });
  assert(published.name === 'demo.local', 'publishPackage writes to local registry');
  assert(fs.existsSync(path.join(published.packageRoot, 'module.json')), 'published package includes module.json');

  const { handlePlaygroundApi } = require('../src/playground-api');
  let pkgPayload = null;
  const res = {
    writeHead() {},
    end(body) { pkgPayload = JSON.parse(body); }
  };
  await handlePlaygroundApi({ method: 'GET', url: '/api/pkg/search?q=demo' }, res, '/api/pkg/search');
  assert(pkgPayload?.results?.some((p) => p.name === 'std.demo'), 'playground /api/pkg/search lists std.demo');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
})();
