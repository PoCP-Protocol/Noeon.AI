'use strict';

/**
 * Canonical execution planner — Phase B
 * Derives runtime phases from unified semantic model, not profile alone.
 */

function shouldRunProtocol(canonical, options = {}) {
  if (options.with_protocol === 'on') return true;
  if (options.with_protocol === 'off') return false;
  return Boolean(
    canonical.capabilities?.ael ||
    canonical.execution?.budget ||
    canonical.execution?.verify
  );
}

function planExecutionPhases(canonical, options = {}) {
  const caps = canonical.capabilities || {};
  const fusion = canonical.fusion || {};
  const layers = fusion.layers || [];

  return {
    engine: 'canonical',
    surface: canonical.surface,
    capabilities: { ...caps },
    cognitive: options.mode !== 'protocol',
    protocol: shouldRunProtocol(canonical, options),
    fusion: layers.length > 0,
    triad: fusion.triad === true,
    bidirectional: fusion.bidirectional === true,
    next_field: layers.includes('next'),
    forward_fusion: caps.next && layers.some((l) => l === 'liminal' || l === 'general'),
    alignment_gate: Boolean(
      caps.liminal ||
      layers.includes('liminal') ||
      canonical.alignment?.covenant ||
      (canonical.alignment?.beliefs?.length ?? 0) > 0
    ),
    coherence: fusion.coherence === true,
    relay: fusion.relay === true,
    fusion_layers: [...layers],
    governance_tier: null
  };
}

function applyPlanGovernanceTier(plan, governance) {
  if (governance?.winner?.tier) {
    plan.governance_tier = governance.winner.tier;
  }
  return plan;
}

module.exports = {
  planExecutionPhases,
  shouldRunProtocol,
  applyPlanGovernanceTier
};
