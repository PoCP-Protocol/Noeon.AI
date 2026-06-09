'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  environment: 'development',
  cognition: {
    exploration_factor: 0.5,
    enable_llm: true,
    with_protocol: 'auto',
    general_canonical: false,
    general_canonical_tools: true,
    general_canonical_agents: true
  },
  observability: {
    log_level: 'info'
  },
  llm: {
    mode: 'auto',
    model: null
  },
  mcp: {
    servers: []
  }
};

function findConfigFile(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, '.noeonrc.json');
    if (fs.existsSync(candidate)) return candidate;
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

function loadProjectConfig(options = {}) {
  const configPath = options.configPath || findConfigFile(options.cwd || process.cwd());
  if (!configPath) {
    return { config: { ...DEFAULT_CONFIG }, configPath: null };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      configPath,
      config: deepMerge(DEFAULT_CONFIG, raw)
    };
  } catch (e) {
    return {
      configPath,
      config: { ...DEFAULT_CONFIG },
      configError: e.message
    };
  }
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object') {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function resolveRunOptions(userOptions = {}, projectConfig = DEFAULT_CONFIG) {
  const cog = projectConfig.cognition || {};
  const obs = projectConfig.observability || {};
  const llm = projectConfig.llm || {};

  return {
    verbose: userOptions.verbose ?? obs.log_level === 'debug',
    trace: userOptions.trace ?? false,
    quiet: userOptions.quiet ?? false,
    enable_llm: userOptions.enable_llm ?? cog.enable_llm !== false,
    with_protocol: userOptions.with_protocol ?? cog.with_protocol ?? 'auto',
    general_canonical:
      userOptions.general_canonical ??
      (process.env.NOEON_GENERAL_CANONICAL != null
        ? ['1', 'true', 'yes', 'on'].includes(String(process.env.NOEON_GENERAL_CANONICAL).toLowerCase())
        : (cog.general_canonical === true ? true : undefined)),
    general_canonical_tools:
      userOptions.general_canonical_tools ??
      (process.env.NOEON_GENERAL_CANONICAL_TOOLS != null
        ? ['1', 'true', 'yes', 'on'].includes(String(process.env.NOEON_GENERAL_CANONICAL_TOOLS).toLowerCase())
        : cog.general_canonical_tools),
    general_canonical_agents:
      userOptions.general_canonical_agents ??
      (process.env.NOEON_GENERAL_CANONICAL_AGENTS != null
        ? ['1', 'true', 'yes', 'on'].includes(String(process.env.NOEON_GENERAL_CANONICAL_AGENTS).toLowerCase())
        : cog.general_canonical_agents),
    legacy_profile: userOptions.legacy_profile ??
      (process.env.NOEON_LEGACY_PROFILE === '1'),
    mcp: userOptions.mcp || projectConfig.mcp || { servers: [] },
    llm: {
      mode: userOptions.llm?.mode || llm.mode || process.env.NOEON_LLM_MODE || 'auto',
      model: userOptions.llm?.model || llm.model || process.env.NOEON_LLM_MODEL
    }
  };
}

module.exports = {
  DEFAULT_CONFIG,
  findConfigFile,
  loadProjectConfig,
  resolveRunOptions
};
