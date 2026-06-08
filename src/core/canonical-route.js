'use strict';

/**
 * Canonical-first execution routing.
 * Phases derive from unified semantic plan — profile is a hint only.
 */

const { shouldRunProtocol } = require('./canonical-plan');
const { SURFACES } = require('./surfaces');
const { PHASE } = require('../vm/phases');

function deriveExecutionRoute(canonicalPrep, profile, mode, options = {}) {
  if (options.legacy_profile === true || !canonicalPrep?.plan) {
    return null;
  }

  const plan = canonicalPrep.plan;
  const canonical = canonicalPrep.canonical;
  const layers = plan.fusion_layers || canonical.fusion?.layers || [];
  const caps = canonical.capabilities || {};

  const nextField = plan.next_field === true || layers.includes('next') || caps.next === true;
  const forwardFusion =
    plan.forward_fusion === true ||
    (caps.next && layers.some((l) => l === 'liminal' || l === 'general'));
  const needsFusion = plan.fusion === true || forwardFusion || nextField;
  const needsTriad = plan.triad === true && options.triad !== false;

  const protocol =
    mode === 'protocol' ||
    (mode === 'full' && (plan.protocol ?? shouldRunProtocol(canonical, options)));

  return {
    engine: 'canonical',
    surface: canonical.surface || profile,
    core_surface: SURFACES.NEXT,
    profile_hint: profile,
    mode,
    triad: needsTriad,
    fusion: needsFusion && !needsTriad,
    next_field: nextField,
    forward_fusion: forwardFusion,
    alignment: plan.alignment_gate === true && options.alignment_gate !== false,
    cognitive:
      plan.cognitive !== false &&
      (mode === 'full' || mode === 'cognitive'),
    protocol,
    fusion_layers: [...layers],
    governance_tier: plan.governance_tier || canonicalPrep.governance?.winner?.tier || null,
    capabilities: { ...caps }
  };
}

function routePhaseLabel(route) {
  if (!route) return 'legacy';
  const phases = [PHASE.CANONICAL];
  if (route.triad) {
    phases.push(PHASE.TRIAD);
  } else {
    if (route.fusion) phases.push(PHASE.FUSION);
    if (route.next_field) phases.push(PHASE.NEXT_FIELD);
    if (route.forward_fusion) phases.push(PHASE.LIMINAL_FIELD);
  }
  if (route.alignment) phases.push(PHASE.ALIGNMENT);
  if (route.cognitive) {
    phases.push(PHASE.CONSCIOUSNESS);
    phases.push(PHASE.COGNITIVE);
  }
  if (route.protocol) phases.push(PHASE.PROTOCOL);
  return phases.join(' → ');
}

module.exports = {
  deriveExecutionRoute,
  routePhaseLabel
};
