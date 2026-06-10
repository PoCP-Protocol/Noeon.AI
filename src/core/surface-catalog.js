'use strict';

/**
 * Surface tiers — reduce authoring surface overload in onboarding.
 * Primary: General (.noeon AGENT/program). Advanced: capability entry modes.
 */

const { SURFACES } = require('./surfaces');

const SURFACE_TIER_SCHEMA = 'noeon.surface.catalog/v1';

/** Default authoring — do not require Next/Liminal/AEL to start. */
const PRIMARY_SURFACES = [SURFACES.GENERAL];

/** Capability entry modes — documented under spec/, not first-run UX. */
const ADVANCED_SURFACES = [
  SURFACES.AEL,
  SURFACES.NEXT,
  SURFACES.LIMINAL,
  SURFACES.UNIVERSAL,
  SURFACES.COGNITIVE
];

const SURFACE_TIER_LABELS = {
  [SURFACES.GENERAL]: { tier: 'primary', label: 'General · AGENT / program', extension: '.noeon' },
  [SURFACES.AEL]: { tier: 'advanced', label: 'AEL · protocol & contract', extension: '.ael' },
  [SURFACES.NEXT]: { tier: 'advanced', label: 'Next · field & governance', extension: '.next' },
  [SURFACES.LIMINAL]: { tier: 'advanced', label: 'Liminal · alignment gate', extension: '.lim' },
  [SURFACES.UNIVERSAL]: { tier: 'advanced', label: 'Universal · six-dimension mesh', extension: '.noeon' },
  [SURFACES.COGNITIVE]: { tier: 'advanced', label: 'Cognitive · kernel scripts', extension: '.ael' }
};

const ONBOARDING_NOTE =
  'Start with General (.noeon) and AGENT blocks. Embed protocol, alignment, and field rules '
  + 'with CONTRACT / ALIGN / GOVERNANCE blocks — no separate .ael / .lim / .next required for most workflows. '
  + 'Legacy capability entry modes remain documented under docs/spec/.';

function buildSurfaceCatalog() {
  return {
    schema: SURFACE_TIER_SCHEMA,
    primary: PRIMARY_SURFACES,
    advanced: ADVANCED_SURFACES,
    labels: SURFACE_TIER_LABELS,
    onboarding: ONBOARDING_NOTE,
    defaultAuthoring: SURFACES.GENERAL
  };
}

function isPrimarySurface(surface) {
  return PRIMARY_SURFACES.includes(surface);
}

function filterExamplesByTier(examples = [], options = {}) {
  const tier = options.tier || (options.primaryOnly ? 'primary' : null);
  if (!tier) return examples;
  if (tier === 'primary') {
    return examples.filter((ex) => ex.tier === 'primary' || ex.category === 'getting-started'
      || ex.category === 'agents' || ex.category === 'tools' || ex.category === 'production');
  }
  return examples;
}

module.exports = {
  SURFACE_TIER_SCHEMA,
  PRIMARY_SURFACES,
  ADVANCED_SURFACES,
  SURFACE_TIER_LABELS,
  ONBOARDING_NOTE,
  buildSurfaceCatalog,
  isPrimarySurface,
  filterExamplesByTier
};
