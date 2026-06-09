'use strict';

const stdAi = require('./ai');
const stdHttp = require('./http');
const stdFs = require('./fs');
const stdGithub = require('./github');
const stdWeb = require('./web');
const stdUniversal = require('./universal');
const { loadProjectRegistryModules } = require('../pkg/registry');

const STDLIB_MODULES = {
  'std.ai': stdAi,
  'std.http': stdHttp,
  'std.fs': stdFs,
  'std.github': stdGithub,
  'std.web': stdWeb,
  'std.universal': stdUniversal,
  'std.cognition': {
    module: 'std.cognition',
    effect: 'io',
    exports: {}
  }
};

function resolveImport(name, options = {}) {
  if (STDLIB_MODULES[name]) return STDLIB_MODULES[name];
  const projectModules = options.projectModules || (
    options.cwd ? loadProjectRegistryModules(options.cwd) : {}
  );
  return projectModules[name] || null;
}

function buildImportContext(imports = [], options = {}) {
  const context = {
    modules: [],
    stdAi: null,
    stdCognition: null,
    stdUniversal: null,
    exportNames: new Set(),
    registryExports: new Map()
  };

  for (const imp of imports) {
    const mod = resolveImport(imp, options);
    if (!mod) continue;
    context.modules.push(mod);
    if (imp === 'std.ai') {
      context.stdAi = mod;
      for (const name of Object.keys(mod.exports || {})) {
        context.exportNames.add(name);
      }
    }
    if (imp === 'std.http') {
      context.stdHttp = mod;
      for (const name of Object.keys(mod.exports || {})) {
        context.exportNames.add(name);
      }
    }
    if (imp === 'std.fs') {
      context.stdFs = mod;
      for (const name of Object.keys(mod.exports || {})) {
        context.exportNames.add(name);
      }
    }
    if (imp === 'std.github') {
      context.stdGithub = mod;
      for (const name of Object.keys(mod.exports || {})) {
        context.exportNames.add(name);
      }
    }
    if (imp === 'std.web') {
      context.stdWeb = mod;
      for (const name of Object.keys(mod.exports || {})) {
        context.exportNames.add(name);
      }
    }
    if (imp === 'std.cognition') {
      context.stdCognition = mod;
    }
    if (imp === 'std.universal') {
      context.stdUniversal = mod;
      for (const name of Object.keys(mod.exports || {})) {
        context.exportNames.add(name);
      }
    }
    for (const name of Object.keys(mod.exports || {})) {
      context.registryExports.set(name, imp);
      if (!['std.ai', 'std.http', 'std.fs', 'std.github', 'std.web'].includes(imp)) context.exportNames.add(name);
    }
  }

  return context;
}

function validateImports(imports = [], errors, options = {}) {
  for (const imp of imports) {
    if (!resolveImport(imp, options)) {
      errors.push(`unknown import '${imp}'; supported: std.ai, std.http, std.fs, std.github, std.web, std.universal, std.cognition, or registry packages from lockfile`);
    }
  }
}

function isStdAiExport(name, importContext = {}) {
  return importContext.exportNames?.has(name) || importContext.stdAi?.exports?.[name];
}

function isStdUniversalExport(name, importContext = {}) {
  return importContext.stdUniversal?.exports?.[name] ||
    (importContext.exportNames?.has(name) && importContext.modules?.some((m) => m.module === 'std.universal'));
}

function isStdHttpExport(name, importContext = {}) {
  return Boolean(importContext.stdHttp?.exports?.[name]);
}

function isStdFsExport(name, importContext = {}) {
  return Boolean(importContext.stdFs?.exports?.[name]);
}

function isStdGithubExport(name, importContext = {}) {
  return Boolean(importContext.stdGithub?.exports?.[name]);
}

function isStdWebExport(name, importContext = {}) {
  return Boolean(importContext.stdWeb?.exports?.[name]);
}

module.exports = {
  STDLIB_MODULES,
  resolveImport,
  buildImportContext,
  validateImports,
  isStdAiExport,
  isStdHttpExport,
  isStdFsExport,
  isStdGithubExport,
  isStdWebExport,
  isStdUniversalExport
};
