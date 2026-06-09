'use strict';

const { detectProfile } = require('./profile');
const { resolveActPlugin } = require('../runtime/act-binding');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function isToolCanonicalCandidate(ast) {
  if (!ast || detectProfile(ast) !== 'general') return false;
  const acts = ast?.general?.canonicalIr?.execution?.acts;
  if (!Array.isArray(acts) || acts.length === 0) return false;
  if (!acts.every((act) => Boolean(resolveActPlugin(act)))) return false;

  const cog = ast.cognition || {};
  if ((cog.decisions?.length || 0) > 0) return false;
  if ((cog.debates?.length || 0) > 0) return false;
  if ((ast.agents?.length || 0) > 0) return false;
  if (ast.fusionCoherence?.enabled || ast.fusionRelay?.enabled) return false;
  return true;
}

function shouldAutoCanonicalForToolProgram(ast, options = {}) {
  if (!isToolCanonicalCandidate(ast)) return false;
  if (options.general_canonical_tools === false) return false;
  if (options.general_canonical_tools === true) return true;
  if (options.auto_tools_canonical === true) return true;
  if (parseBoolean(process.env.NOEON_GENERAL_CANONICAL_TOOLS, false)) return true;
  const config = options.projectConfig || options.config;
  if (config?.cognition?.general_canonical_tools === true) return true;
  return false;
}

function isHybridCanonicalCandidate(ast) {
  const acts = ast?.general?.canonicalIr?.execution?.acts;
  if (!Array.isArray(acts) || acts.length === 0) return false;
  if (!acts.some((act) => resolveActPlugin(act))) return false;
  if (isToolCanonicalCandidate(ast)) return false;
  return detectProfile(ast) === 'general';
}

function shouldAutoCanonicalForHybridProgram(ast, options = {}) {
  if (!isHybridCanonicalCandidate(ast)) return false;
  if (options.general_canonical_agents === false) return false;
  if (options.general_canonical_agents === true) return true;
  if (options.auto_agents_canonical === true) return true;
  if (parseBoolean(process.env.NOEON_GENERAL_CANONICAL_AGENTS, false)) return true;
  const config = options.projectConfig || options.config;
  if (config?.cognition?.general_canonical_agents === true) return true;
  return false;
}

function resolveGeneralCanonical(ast, options = {}) {
  if (options.general_canonical != null) {
    return parseBoolean(options.general_canonical, false);
  }
  if (process.env.NOEON_GENERAL_CANONICAL != null) {
    return parseBoolean(process.env.NOEON_GENERAL_CANONICAL, false);
  }
  const config = options.projectConfig || options.config;
  if (config?.cognition?.general_canonical === true) {
    return true;
  }
  if (shouldAutoCanonicalForToolProgram(ast, options)) {
    return true;
  }
  if (shouldAutoCanonicalForHybridProgram(ast, options)) {
    return true;
  }
  if (config?.cognition?.general_canonical === false) {
    return false;
  }
  return false;
}

function resolveExecutionStrategy(ast, options = {}) {
  const enabled = resolveGeneralCanonical(ast, options);
  if (!enabled) return 'cognitive-primary';
  if (isToolCanonicalCandidate(ast)) return 'tool-snapshot-primary';
  if (isHybridCanonicalCandidate(ast)) return 'hybrid-canonical-acts';
  if (ast?.general?.canonicalIr) return 'snapshot-primary';
  return 'cognitive-primary';
}

function isGeneralCanonicalEnabled(options = {}, ast = null) {
  return resolveGeneralCanonical(ast, options);
}

function resolveCompilePresentation(ast, cognitiveProgram, options = {}) {
  const canonicalIr = ast?.general?.canonicalIr || null;
  const enabled = resolveGeneralCanonical(ast, options) && Boolean(canonicalIr);

  return {
    compileMode: enabled ? 'canonical-primary' : 'cognitive-primary',
    primaryIr: enabled ? 'canonical' : 'cognitive',
    canonicalIr,
    cognitiveProgram,
    autoToolsCanonical: shouldAutoCanonicalForToolProgram(ast, options),
    autoAgentsCanonical: shouldAutoCanonicalForHybridProgram(ast, options)
  };
}

module.exports = {
  parseBoolean,
  isToolCanonicalCandidate,
  isHybridCanonicalCandidate,
  shouldAutoCanonicalForToolProgram,
  shouldAutoCanonicalForHybridProgram,
  resolveGeneralCanonical,
  resolveExecutionStrategy,
  isGeneralCanonicalEnabled,
  resolveCompilePresentation
};
