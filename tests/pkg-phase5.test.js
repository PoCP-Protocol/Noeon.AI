'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  addDependency,
  installPackages,
  listDependencies,
  readManifest,
  readLockfile,
  validateManifestImports
} = require('../src/pkg/manifest');
const { parseGeneralSource } = require('../src/grammar');
const { validateAel } = require('../src/validator');
const {
  getCompletions,
  getHover,
  getDocumentSymbols,
  isGeneralSource
} = require('../language-server/noeon-service');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Package Manager + IDE Phase 5 Tests ═══\x1b[0m\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-pkg-'));
const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

try {
  addDependency(tmp, 'std.ai');
  installPackages(tmp);
  const { manifest } = readManifest(tmp);
  const { lock } = readLockfile(tmp);
  assert(manifest.dependencies['std.ai'] === 'builtin', 'manifest records std.ai');
  assert(lock.resolved['std.ai'].source === 'builtin', 'lockfile resolves std.ai');

  const pkgAdd = spawnSync(process.execPath, [cliPath, 'pkg', 'add', 'std.cognition'], { cwd: tmp, encoding: 'utf8' });
  assert(pkgAdd.status === 0, 'cli pkg add std.cognition');

  const deps = listDependencies(tmp);
  assert(deps.packages.includes('std.cognition'), 'pkg list includes std.cognition');

  const src = `profile "general"
version "1.0.0-alpha"
module demo
import std.ai

@effect(ai)
fn main() {
  ask "hi" model=default
}
`;
  const ast = parseGeneralSource(src);
  const ok = validateAel(ast, { cwd: tmp });
  assert(ok.valid === true, 'validates when imports match manifest');

  const badErrors = [];
  validateManifestImports(['std.ai', 'std.unknown'], tmp, badErrors);
  assert(badErrors.some((e) => e.includes('std.unknown')), 'manifest rejects unknown import');

  assert(isGeneralSource(src, 'demo.noeon'), 'LSP detects general source');
  const completions = getCompletions(src, 4, 6, 'demo.noeon');
  assert(completions.includes('ask'), 'LSP completes std.ai ask export');
  const hover = getHover('@effect(ai)\n', 0, 7, 'demo.noeon');
  assert(hover && hover.keyword === '@effect', 'LSP hovers @effect');
  const symbols = getDocumentSymbols(src, 'demo.noeon');
  assert(symbols.some((s) => s.name === 'main' && s.kind === 'function'), 'LSP symbols include fn main');

  const init = spawnSync(process.execPath, [cliPath, 'init', 'pkg_demo', '--profile', 'general'], {
    cwd: tmp,
    encoding: 'utf8'
  });
  assert(init.status === 0, 'init creates pkg-ready general project');
  assert(fs.existsSync(path.join(tmp, 'pkg_demo', 'noeon.json')), 'init writes noeon.json');
  assert(fs.existsSync(path.join(tmp, 'pkg_demo', '.noeon-lock.json')), 'init writes lockfile');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
