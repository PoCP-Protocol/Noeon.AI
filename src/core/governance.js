'use strict';

/**
 * Governance preflight — unifies validator + META awareness for all execution paths.
 */

const { validateAel } = require('../validator');

function runGovernancePreflight(ast, validation, options = {}) {
  const result = validation || validateAel(ast);
  const errors = [...(result.errors || [])];
  const warnings = [...(result.warnings || [])];

  if (Array.isArray(ast.metaRules) && ast.metaRules.length > 0) {
    warnings.push(`${ast.metaRules.length} META rule(s) will be enforced at runtime`);
  }

  if (ast.metaProfile) {
    warnings.push(`META profile '${ast.metaProfile}' active`);
  }

  const strict = options.strict_governance === true || process.env.NOEON_STRICT_GOVERNANCE === 'true';
  if (strict && warnings.length > 0 && !result.valid) {
    errors.push('Strict governance mode: unresolved validation warnings treated as errors');
  }

  return {
    valid: result.valid && errors.length === 0,
    errors,
    warnings,
    meta: {
      ruleCount: Array.isArray(ast.metaRules) ? ast.metaRules.length : 0,
      profile: ast.metaProfile || null
    },
    raw: result
  };
}

module.exports = {
  runGovernancePreflight
};
