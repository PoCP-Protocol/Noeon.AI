'use strict';

/**
 * Phase D — IR-first phase resolution from canonical route only.
 * Profile is a hint; when route is active, these flags drive the executor.
 */

function resolveCanonicalPhases(route, canonicalPrep, ast, options = {}, fusionPlan = {}) {
  if (!route || options.legacy_profile === true) return null;

  const canonical = canonicalPrep?.canonical;
  const surface = route.surface || canonical?.surface || 'general';
  const isGeneralHub = surface === 'general';
  const snapshotPrimary = canonicalPrep?.canonicalPrimary === true;
  const snapshotActs = canonical?.execution?.acts?.length ?? 0;

  return {
    engine: 'canonical',
    ir_first: true,
    snapshot_primary: snapshotPrimary,
    snapshot_act_count: snapshotPrimary ? snapshotActs : null,
    surface,
    triad: route.triad === true && isGeneralHub && options.triad !== false,
    fusion:
      route.fusion === true ||
      route.next_field === true ||
      route.forward_fusion === true,
    record_next: route.next_field || canonical?.capabilities?.next,
    record_next_field: route.next_field === true,
    record_liminal_field: route.forward_fusion === true,
    coherence:
      route.coherence === true ||
      fusionPlan.coherence === true ||
      canonical?.fusion?.coherence === true ||
      Boolean(ast.fusionCoherence?.enabled),
    alignment: route.alignment === true && options.alignment_gate !== false,
    cognitive:
      route.cognitive === true ||
      (snapshotPrimary && snapshotActs > 0),
    protocol: route.protocol === true,
    relay:
      route.relay === true ||
      canonical?.fusion?.relay === true ||
      Boolean(ast.fusionRelay?.enabled),
    transcript:
      route.alignment === true ||
      canonical?.capabilities?.liminal === true ||
      surface === 'liminal'
  };
}

function phaseLabelFromResolver(phases) {
  if (!phases) return 'legacy';
  const order = [];
  order.push('canonical');
  if (phases.triad) order.push('triad');
  else if (phases.fusion) order.push('fusion');
  if (phases.coherence) order.push('coherence');
  if (phases.alignment) order.push('alignment');
  if (phases.cognitive) order.push('cognitive');
  if (phases.protocol) order.push('protocol');
  if (phases.relay) order.push('relay');
  return order.join(' → ');
}

module.exports = {
  resolveCanonicalPhases,
  phaseLabelFromResolver
};
