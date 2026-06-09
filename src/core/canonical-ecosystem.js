'use strict';

const { getMcpStatus } = require('../runtime/mcp-bridge');
const { resolveMcpMode } = require('../runtime/mcp-client');

const ECOSYSTEM_SCHEMA = 'noeon.ecosystem/v1';

function buildEcosystemSnapshot(ast, options = {}, result = {}) {
  const imports = Array.isArray(ast?.general?.imports) ? ast.general.imports : [];
  const agentTools = ast?.agents?.[0]?.tools || ast?.tools || [];
  const mcpTools = ast?.mcpTools || [];

  let manifestDeps = [];
  try {
    const { listDependencies } = require('../pkg/manifest');
    manifestDeps = listDependencies(options.cwd || process.cwd());
  } catch {
    manifestDeps = [];
  }

  let registryPackages = [];
  try {
    const { searchPackages } = require('../pkg/registry');
    registryPackages = searchPackages('').slice(0, 12).map((pkg) => ({
      name: pkg.name,
      latest: pkg.latest,
      description: pkg.description || null
    }));
  } catch {
    registryPackages = [];
  }

  const mcpConfig = options.mcp || options.projectConfig?.mcp || { servers: [] };
  const mcpStatus = getMcpStatus({ mcp: mcpConfig });

  return {
    schema: ECOSYSTEM_SCHEMA,
    packages: {
      imports,
      manifest: manifestDeps,
      agent_tools: Array.isArray(agentTools) ? agentTools : []
    },
    mcp: {
      ...mcpStatus,
      attached_tools: mcpTools.map((t) => t.qualifiedName || t.name)
    },
    registry: {
      count: registryPackages.length,
      packages: registryPackages
    },
    runtime: {
      executor: result.executor || null,
      ir_first: result.irFirst === true,
      mcp_mode: resolveMcpMode(options)
    }
  };
}

async function buildEcosystemStatus(options = {}) {
  const { loadProjectConfig } = require('./config');
  const { runParityConformance } = require('./canonical-conform');
  const { config } = loadProjectConfig({ cwd: options.cwd || process.cwd() });

  const [conform, registryPackages] = await Promise.all([
    runParityConformance().catch(() => ({ allValid: false, results: [] })),
    Promise.resolve((() => {
      try {
        const { searchPackages } = require('../pkg/registry');
        return searchPackages('');
      } catch {
        return [];
      }
    })())
  ]);

  return {
    schema: ECOSYSTEM_SCHEMA,
    conform,
    mcp: getMcpStatus(config),
    registry: {
      count: registryPackages.length,
      packages: registryPackages.slice(0, 20).map((p) => ({
        name: p.name,
        latest: p.latest,
        description: p.description || null
      }))
    },
    legacy: {
      deprecated: true,
      opt_out_env: 'NOEON_LEGACY_PROFILE',
      sunset_target: 'v1.2'
    }
  };
}

module.exports = {
  ECOSYSTEM_SCHEMA,
  buildEcosystemSnapshot,
  buildEcosystemStatus
};
