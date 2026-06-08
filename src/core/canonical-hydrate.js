'use strict';

/**
 * Hydrate legacy AST from Canonical IR so cognitive kernel sees unified semantics.
 */

const {
  attachCanonicalStack,
  hydrateNextFromCanonical,
  buildStackManifest
} = require('./noeon-unified');

function hydrateAstFromCanonical(ast, canonical) {
  if (!canonical) return ast;

  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};

  if (!ast.cognition.goal && canonical.intent?.goal) {
    ast.cognition.goal = canonical.intent.goal;
  }

  if (canonical.intent?.constraints && Object.keys(canonical.intent.constraints).length) {
    ast.cognition.constraints = {
      ...(ast.cognition.constraints || {}),
      ...canonical.intent.constraints
    };
  }

  ast.cognition.context._canonical = {
    surface: canonical.surface,
    version: canonical.version,
    capabilities: { ...canonical.capabilities },
    fusion: {
      layers: [...(canonical.fusion?.layers || [])],
      triad: canonical.fusion?.triad || false,
      bidirectional: canonical.fusion?.bidirectional || false
    },
    governance_winner: null
  };

  if (canonical.learning?.context && Object.keys(canonical.learning.context).length) {
    ast.cognition.context = {
      ...canonical.learning.context,
      ...ast.cognition.context
    };
  }

  if (!ast.metaRules) ast.metaRules = [];

  for (const tier of ['constitutions', 'vows', 'rituals', 'strategies']) {
    for (const rule of canonical.governance?.[tier] || []) {
      const exists = ast.metaRules.some(
        (r) => r.type === rule.type && r.source === rule.source && r.name === rule.name
      );
      if (!exists) {
        ast.metaRules.push({ ...rule, canonical: true });
      }
    }
  }

  if (canonical.alignment?.covenant && !ast.liminal) {
    ast.liminal = {
      covenant: canonical.alignment.covenant,
      beliefs: canonical.alignment.beliefs || [],
      resonates: canonical.alignment.resonates || [],
      from_canonical: true
    };
  }

  hydrateNextFromCanonical(ast, canonical);
  attachCanonicalStack(ast, canonical);
  ast.noeonStack = ast.noeonStack || buildStackManifest(ast);

  return ast;
}

function setGovernanceWinnerOnContext(ast, governance) {
  if (ast?.cognition?.context?._canonical && governance?.winner) {
    ast.cognition.context._canonical.governance_winner = governance.winner.tier;
  }
  if (ast?.noeonStack?.canonical && governance?.winner) {
    ast.noeonStack.governance_winner = governance.winner.tier;
  }
  return ast;
}

module.exports = {
  hydrateAstFromCanonical,
  setGovernanceWinnerOnContext
};
