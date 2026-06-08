'use strict';

const stdAi = require('./ai');
const { loadProjectRegistryModules } = require('../pkg/registry');

const STDLIB_MODULES = {
  'std.ai': stdAi,
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
    if (imp === 'std.cognition') {
      context.stdCognition = mod;
    }
    for (const name of Object.keys(mod.exports || {})) {
      context.registryExports.set(name, imp);
      if (imp !== 'std.ai') context.exportNames.add(name);
    }
  }

  return context;
}

function validateImports(imports = [], errors, options = {}) {
  for (const imp of imports) {
    if (!resolveImport(imp, options)) {
      errors.push(`unknown import '${imp}'; supported: std.ai, std.cognition, or registry packages from lockfile`);
    }
  }
}

function isStdAiExport(name, importContext = {}) {
  return importContext.exportNames?.has(name) || importContext.stdAi?.exports?.[name];
}

module.exports = {
  STDLIB_MODULES,
  resolveImport,
  buildImportContext,
  validateImports,
  isStdAiExport
};
