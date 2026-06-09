'use strict';

const fs = require('fs');
const path = require('path');
const { STDLIB_MODULES } = require('../stdlib/registry');
const {
  isRegistryPackage,
  resolveRegistryPackage,
  materializePackage,
  parseRegistrySpec
} = require('./registry');

const MANIFEST_FILE = 'noeon.json';
const LOCK_FILE = '.noeon-lock.json';
const { NOEON_VERSION } = require('../core/release-version');

const RUNTIME_VERSION = NOEON_VERSION;

const BUILTIN_PACKAGES = Object.keys(STDLIB_MODULES);

function findManifestFile(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, MANIFEST_FILE);
    if (fs.existsSync(candidate)) return candidate;
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

function readManifest(cwd = process.cwd()) {
  const manifestPath = findManifestFile(cwd);
  if (!manifestPath) {
    return { manifestPath: null, manifest: null };
  }
  try {
    return {
      manifestPath,
      manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    };
  } catch (e) {
    return { manifestPath, manifest: null, error: e.message };
  }
}

function writeManifest(cwd, manifest) {
  const manifestPath = path.join(path.resolve(cwd), MANIFEST_FILE);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}

function readLockfile(cwd = process.cwd()) {
  const lockPath = path.join(path.resolve(cwd), LOCK_FILE);
  if (!fs.existsSync(lockPath)) return { lockPath: null, lock: null };
  try {
    return { lockPath, lock: JSON.parse(fs.readFileSync(lockPath, 'utf8')) };
  } catch (e) {
    return { lockPath, lock: null, error: e.message };
  }
}

function writeLockfile(cwd, lock) {
  const lockPath = path.join(path.resolve(cwd), LOCK_FILE);
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  return lockPath;
}

function normalizePackageName(name) {
  return String(name || '').trim();
}

function isKnownPackage(name, options = {}) {
  const n = normalizePackageName(name);
  return BUILTIN_PACKAGES.includes(n) || n.startsWith('path:') || isRegistryPackage(n, options);
}

function resolvePackageSpec(name, spec = 'builtin', options = {}) {
  const n = normalizePackageName(name);
  if (BUILTIN_PACKAGES.includes(n)) {
    return {
      name: n,
      version: RUNTIME_VERSION,
      source: 'builtin',
      spec: spec || 'builtin'
    };
  }
  if (String(spec).startsWith('path:') || n.startsWith('path:')) {
    const p = String(spec).startsWith('path:') ? spec.slice(5) : n.slice(5);
    return { name: n, version: 'local', source: 'path', path: path.resolve(p), spec: String(spec).startsWith('path:') ? spec : n };
  }
  if (parseRegistrySpec(spec) || isRegistryPackage(n, options)) {
    const version = parseRegistrySpec(spec)?.version || spec;
    const entry = resolveRegistryPackage(n, version, options);
    if (entry) return entry;
  }
  return null;
}

function ensureManifest(cwd, defaults = {}) {
  const { manifestPath, manifest } = readManifest(cwd);
  if (manifest) return { manifestPath, manifest };
  const created = {
    name: defaults.name || path.basename(path.resolve(cwd)),
    version: RUNTIME_VERSION,
    profile: defaults.profile || 'general',
    dependencies: {}
  };
  const written = writeManifest(cwd, created);
  return { manifestPath: written, manifest: created, created: true };
}

function addDependency(cwd, packageName, spec = 'builtin', options = {}) {
  const name = normalizePackageName(packageName);
  const registrySpec = parseRegistrySpec(spec);
  const resolvedSpec = registrySpec ? `registry:${registrySpec.version}` : spec;
  if (!isKnownPackage(name, options) && !String(spec).startsWith('path:') && !registrySpec) {
    throw new Error(`unknown package '${name}'; run 'noeon pkg search' or use builtin: ${BUILTIN_PACKAGES.join(', ')}`);
  }
  const { manifestPath, manifest } = ensureManifest(cwd);
  manifest.dependencies = manifest.dependencies || {};
  manifest.dependencies[name] = resolvedSpec || spec || 'builtin';
  writeManifest(cwd, manifest);
  return { manifestPath, manifest, added: name, spec: manifest.dependencies[name] };
}

function listDependencies(cwd = process.cwd()) {
  const { manifest } = readManifest(cwd);
  const { lock } = readLockfile(cwd);
  return {
    manifest: manifest?.dependencies || {},
    resolved: lock?.resolved || {},
    packages: Object.keys(manifest?.dependencies || {})
  };
}

function installPackages(cwd = process.cwd(), options = {}) {
  const { manifestPath, manifest } = readManifest(cwd);
  if (!manifest) {
    throw new Error(`no ${MANIFEST_FILE} found; run from project root or noeon pkg add <package>`);
  }

  const resolved = {};
  for (const [name, spec] of Object.entries(manifest.dependencies || {})) {
    let entry = resolvePackageSpec(name, spec, options);
    if (!entry) throw new Error(`cannot resolve package '${name}' (${spec})`);
    if (entry.source === 'registry') {
      const materializedPath = materializePackage(entry, cwd);
      entry = { ...entry, path: materializedPath, materialized: true };
    }
    resolved[name] = entry;
  }

  const lock = {
    lockfileVersion: 1,
    runtime: RUNTIME_VERSION,
    resolved
  };
  const lockPath = writeLockfile(cwd, lock);
  return { manifestPath, lockPath, lock, installed: Object.keys(resolved) };
}

function getInstalledPackages(cwd = process.cwd()) {
  const { lock } = readLockfile(cwd);
  if (lock?.resolved) return Object.keys(lock.resolved);
  const { manifest } = readManifest(cwd);
  return Object.keys(manifest?.dependencies || {});
}

function validateManifestImports(imports = [], cwd = process.cwd(), errors = []) {
  const { manifest } = readManifest(cwd);
  if (!manifest) return errors;

  const installed = new Set(getInstalledPackages(cwd));
  const declared = new Set(Object.keys(manifest.dependencies || {}));

  for (const imp of imports) {
    if (!isKnownPackage(imp)) {
      errors.push(`unknown import '${imp}'; run 'noeon pkg search' or use: ${BUILTIN_PACKAGES.join(', ')}`);
      continue;
    }
    if (!declared.has(imp)) {
      errors.push(`import '${imp}' not declared in ${MANIFEST_FILE}; run 'noeon pkg add ${imp}'`);
    } else if (installed.length > 0 && !installed.has(imp)) {
      errors.push(`import '${imp}' not installed; run 'noeon pkg install'`);
    }
  }
  return errors;
}

module.exports = {
  MANIFEST_FILE,
  LOCK_FILE,
  RUNTIME_VERSION,
  BUILTIN_PACKAGES,
  findManifestFile,
  readManifest,
  writeManifest,
  readLockfile,
  writeLockfile,
  ensureManifest,
  addDependency,
  listDependencies,
  installPackages,
  getInstalledPackages,
  validateManifestImports,
  isKnownPackage,
  resolvePackageSpec
};
