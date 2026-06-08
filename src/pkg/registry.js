'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');

const INDEX_FILE = 'index.json';
const PKG_MANIFEST = 'noeon-pkg.json';

function getUserRegistryDir() {
  return process.env.NOEON_REGISTRY_DIR || path.join(os.homedir(), '.noeon', 'registry');
}

function getBundledRegistryDir() {
  return path.join(__dirname, '..', '..', 'registry');
}

function readIndex(registryDir) {
  if (!registryDir || !fs.existsSync(registryDir)) return null;
  const indexPath = path.join(registryDir, INDEX_FILE);
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeIndex(registryDir, index) {
  fs.mkdirSync(registryDir, { recursive: true });
  const indexPath = path.join(registryDir, INDEX_FILE);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return indexPath;
}

function mergeIndices(...indices) {
  const merged = { version: 1, packages: {} };
  for (const idx of indices) {
    if (!idx?.packages) continue;
    for (const [name, meta] of Object.entries(idx.packages)) {
      if (!merged.packages[name]) {
        merged.packages[name] = {
          latest: meta.latest,
          description: meta.description,
          versions: { ...(meta.versions || {}) }
        };
      } else {
        const existing = merged.packages[name];
        existing.latest = meta.latest || existing.latest;
        existing.description = meta.description || existing.description;
        existing.versions = { ...existing.versions, ...(meta.versions || {}) };
      }
    }
  }
  return merged;
}

function listRegistryDirs(options = {}) {
  const dirs = [getBundledRegistryDir()];
  const userDir = getUserRegistryDir();
  if (fs.existsSync(userDir)) dirs.push(userDir);
  if (options.registryDir) dirs.push(path.resolve(options.registryDir));
  return dirs;
}

function getMergedIndex(options = {}) {
  const indices = listRegistryDirs(options).map(readIndex).filter(Boolean);
  if (options.remoteIndex) indices.push(options.remoteIndex);
  return mergeIndices(...indices);
}

function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`registry fetch failed: HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`registry index is not valid JSON: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('registry fetch timed out'));
    });
  });
}

async function loadMergedIndex(options = {}) {
  const remoteUrl = options.registryUrl || process.env.NOEON_REGISTRY_URL || '';
  if (!remoteUrl) return getMergedIndex(options);
  try {
    const remoteIndex = await fetchJson(remoteUrl);
    return getMergedIndex({ ...options, remoteIndex });
  } catch (e) {
    if (options.strictRemote) throw e;
    return getMergedIndex(options);
  }
}

function searchPackages(query = '', options = {}) {
  const index = getMergedIndex(options);
  const q = String(query || '').toLowerCase().trim();
  const results = [];
  for (const [name, meta] of Object.entries(index.packages || {})) {
    const latest = meta.latest;
    const latestMeta = meta.versions?.[latest] || {};
    const description = meta.description || latestMeta.description || '';
    if (!q || name.toLowerCase().includes(q) || description.toLowerCase().includes(q)) {
      results.push({
        name,
        latest,
        description,
        versions: Object.keys(meta.versions || {})
      });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

async function searchPackagesAsync(query = '', options = {}) {
  const index = await loadMergedIndex(options);
  const q = String(query || '').toLowerCase().trim();
  const results = [];
  for (const [name, meta] of Object.entries(index.packages || {})) {
    const latest = meta.latest;
    const latestMeta = meta.versions?.[latest] || {};
    const description = meta.description || latestMeta.description || '';
    if (!q || name.toLowerCase().includes(q) || description.toLowerCase().includes(q)) {
      results.push({
        name,
        latest,
        description,
        versions: Object.keys(meta.versions || {})
      });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function parseRegistrySpec(spec) {
  const raw = String(spec || '').trim();
  if (raw === 'registry' || raw === 'latest') return { channel: 'registry', version: 'latest' };
  if (raw.startsWith('registry:')) {
    const version = raw.slice('registry:'.length) || 'latest';
    return { channel: 'registry', version };
  }
  return null;
}

function isRegistryPackage(name, options = {}) {
  const index = getMergedIndex(options);
  return Boolean(index.packages?.[name]);
}

function resolveRegistryPackage(name, versionSpec = 'latest', options = {}) {
  const index = getMergedIndex(options);
  const pkg = index.packages?.[name];
  if (!pkg) return null;

  let version = versionSpec;
  const parsed = parseRegistrySpec(versionSpec);
  if (parsed) version = parsed.version;

  if (!version || version === 'latest') version = pkg.latest;
  const verMeta = pkg.versions?.[version];
  if (!verMeta) return null;

  const relPath = verMeta.path || path.join('packages', name, version);
  for (const dir of listRegistryDirs(options)) {
    const fullPath = path.join(dir, relPath);
    if (fs.existsSync(fullPath)) {
      return {
        name,
        version,
        path: fullPath,
        source: 'registry',
        spec: `registry:${version}`,
        registryDir: dir
      };
    }
  }
  return null;
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const from = path.join(src, item);
    const to = path.join(dest, item);
    if (fs.statSync(from).isDirectory()) copyDirSync(from, to);
    else fs.copyFileSync(from, to);
  }
}

function materializePackage(entry, cwd = process.cwd()) {
  const destRoot = path.join(path.resolve(cwd), '.noeon', 'packages', entry.name, entry.version);
  copyDirSync(entry.path, destRoot);
  return destRoot;
}

function loadRegistryModule(materializedPath) {
  const moduleJsonPath = path.join(materializedPath, 'module.json');
  if (fs.existsSync(moduleJsonPath)) {
    return JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
  }
  const indexJs = path.join(materializedPath, 'index.js');
  if (fs.existsSync(indexJs)) {
    return require(indexJs);
  }
  return null;
}

function readPackageManifest(cwd = process.cwd()) {
  const dir = path.resolve(cwd);
  const pkgPath = path.join(dir, PKG_MANIFEST);
  if (fs.existsSync(pkgPath)) {
    return { path: pkgPath, manifest: JSON.parse(fs.readFileSync(pkgPath, 'utf8')) };
  }
  const noeonPath = path.join(dir, 'noeon.json');
  if (fs.existsSync(noeonPath)) {
    const manifest = JSON.parse(fs.readFileSync(noeonPath, 'utf8'));
    if (manifest.exports || manifest.publish) {
      return { path: noeonPath, manifest };
    }
  }
  return null;
}

function publishPackage(cwd = process.cwd(), options = {}) {
  const dir = path.resolve(cwd);
  const pkgInfo = readPackageManifest(dir);
  if (!pkgInfo?.manifest?.name) {
    throw new Error(`missing package name; create ${PKG_MANIFEST} or add name/exports to noeon.json`);
  }

  const manifest = pkgInfo.manifest;
  const name = manifest.name;
  const version = manifest.version || '0.1.0';
  const targetRegistry = options.registryDir
    ? path.resolve(options.registryDir)
    : (options.local ? path.join(dir, 'registry') : getUserRegistryDir());

  const packageRoot = path.join(targetRegistry, 'packages', name, version);
  fs.mkdirSync(packageRoot, { recursive: true });

  const modulePayload = manifest.module || {
    module: name,
    effect: manifest.effect || 'pure',
    exports: manifest.exports || {}
  };

  fs.writeFileSync(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name, version, description: manifest.description || '' }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(packageRoot, 'module.json'),
    `${JSON.stringify(modulePayload, null, 2)}\n`,
    'utf8'
  );

  if (manifest.files?.length) {
    for (const rel of manifest.files) {
      const src = path.join(dir, rel);
      if (!fs.existsSync(src)) continue;
      const dest = path.join(packageRoot, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  const index = readIndex(targetRegistry) || { version: 1, packages: {} };
  index.packages = index.packages || {};
  index.packages[name] = index.packages[name] || { versions: {} };
  index.packages[name].latest = version;
  index.packages[name].description = manifest.description || index.packages[name].description || '';
  index.packages[name].versions[version] = {
    description: manifest.description || '',
    path: path.join('packages', name, version).split(path.sep).join('/')
  };
  const indexPath = writeIndex(targetRegistry, index);

  return {
    name,
    version,
    registryDir: targetRegistry,
    indexPath,
    packageRoot
  };
}

function loadProjectRegistryModules(cwd = process.cwd()) {
  const { readLockfile } = require('./manifest');
  const { lock } = readLockfile(cwd);
  const modules = {};
  for (const [name, entry] of Object.entries(lock?.resolved || {})) {
    if (entry.source !== 'registry' || !entry.path) continue;
    const mod = loadRegistryModule(entry.path);
    if (mod) modules[name] = mod;
  }
  return modules;
}

module.exports = {
  INDEX_FILE,
  PKG_MANIFEST,
  getUserRegistryDir,
  getBundledRegistryDir,
  readIndex,
  writeIndex,
  getMergedIndex,
  loadMergedIndex,
  fetchJson,
  searchPackages,
  searchPackagesAsync,
  parseRegistrySpec,
  isRegistryPackage,
  resolveRegistryPackage,
  materializePackage,
  loadRegistryModule,
  readPackageManifest,
  publishPackage,
  loadProjectRegistryModules
};
