'use strict';

/**
 * Protocol bridge — attach compute + META governance to kernel results.
 * Closes the gap between cognitive run and protocol simulate paths.
 */

const { compileAel } = require('../compiler');
const { executeComputeKernel } = require('../runtime/compute-kernel');
const { evaluateMetaPolicy } = require('../runtime/meta-rule-engine');

function hasProtocolFeatures(ast) {
  const compute = ast.compute;
  const hasCompute = compute && (
    (compute.functions && compute.functions.length) ||
    (compute.bindings && compute.bindings.length) ||
    (compute.calls && compute.calls.length) ||
    (compute.branches && compute.branches.length)
  );
  const hasMeta = Array.isArray(ast.metaRules) && ast.metaRules.length > 0;
  const hasPlan = ast.cognition?.plan?.length > 0 || ast.plan?.length > 0;
  return Boolean(hasCompute || hasMeta || hasPlan);
}

function shouldEnrichProtocol(ast, options = {}) {
  const mode = options.with_protocol || 'auto';
  if (mode === false || mode === 'off') return false;
  if (mode === true || mode === 'on') return true;
  return hasProtocolFeatures(ast);
}

function enrichWithProtocol(ast, kernelResult, feedback = {}, options = {}) {
  if (!shouldEnrichProtocol(ast, options)) {
    return { enriched: false, reason: 'no_protocol_features' };
  }

  const compiled = compileAel(ast);
  const compute = executeComputeKernel(compiled, feedback, {
    pluginPolicy: options.pluginPolicy || {}
  });

  const metaPolicy = evaluateMetaPolicy({
    compiled,
    feedback,
    adaptiveProfile: kernelResult?.results?.adaptiveProfile || {},
    learning: { updates: kernelResult?.results?.learning || {} },
    compute
  });

  const blocking = (metaPolicy.violations || []).filter((v) => v.level === 'error');
  const computeErrors = (compute.diagnostics || []).filter((d) => d.level === 'error');

  return {
    enriched: true,
    compute: {
      result: compute.result,
      env: compute.env,
      diagnostics: compute.diagnostics,
      receipts: compute.receipts,
      summary: compute.summary
    },
    metaPolicy: {
      enabled: metaPolicy.enabled,
      profile: metaPolicy.profile,
      totalRules: metaPolicy.totalRules,
      hardened: metaPolicy.hardened,
      violations: metaPolicy.violations
    },
    protocolSuccess: blocking.length === 0 && computeErrors.length === 0
  };
}

module.exports = {
  hasProtocolFeatures,
  shouldEnrichProtocol,
  enrichWithProtocol
};
