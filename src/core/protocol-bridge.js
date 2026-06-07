'use strict';

const { compileAel } = require('../compiler');
const { runProtocolCycle } = require('../vm/protocol-phase');

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

async function enrichWithProtocol(ast, kernelResult, feedback = {}, options = {}) {
  if (!shouldEnrichProtocol(ast, options)) {
    return { enriched: false, reason: 'no_protocol_features' };
  }

  const compiled = compileAel(ast);
  const result = await runProtocolCycle(compiled, feedback, {
    lite: true,
    skipPlan: true,
    pluginPolicy: options.pluginPolicy
  });

  return {
    enriched: true,
    compute: result.compute,
    metaPolicy: result.metaPolicy,
    protocolSuccess: result.protocolSuccess,
    cycle: result.cycle
  };
}

module.exports = {
  hasProtocolFeatures,
  shouldEnrichProtocol,
  enrichWithProtocol
};
