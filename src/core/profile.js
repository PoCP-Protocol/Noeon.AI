'use strict';

/**
 * Language profiles — aliases of unified Noeon surfaces.
 * Next is the semantic core; General/Liminal/AEL are stack layers.
 */

const {
  SURFACES,
  CORE_SURFACE,
  SURFACE_ROLES,
  SURFACE_DESCRIPTIONS,
  getSurfaceInfo,
  resolveIntentGoal,
  resolveProgramTask
} = require('./surfaces');

const { detectSurface } = require('../grammar/detect');

const PROFILES = SURFACES;
const PROFILE_ROLES = SURFACE_ROLES;
const PROFILE_DESCRIPTIONS = SURFACE_DESCRIPTIONS;

function getProfileInfo(profile) {
  return getSurfaceInfo(profile);
}

function detectProfile(ast, options = {}) {
  if (ast?.detectedSurface && Object.values(PROFILES).includes(ast.detectedSurface)) {
    return ast.detectedSurface;
  }

  if (options.profile && Object.values(PROFILES).includes(options.profile)) {
    return options.profile;
  }

  const filename = options.filename || options.program_name || '';
  if (filename.endsWith('.lim')) return PROFILES.LIMINAL;
  if (filename.endsWith('.next')) return PROFILES.NEXT;
  if (ast.profile === 'next' || ast.languageProfile === 'next') return PROFILES.NEXT;
  if (filename.endsWith('.noeon')) return PROFILES.GENERAL;
  if (ast.profile === 'liminal' || ast.languageProfile === 'liminal') return PROFILES.LIMINAL;
  if (ast.profile === 'general' || ast.languageProfile === 'general') return PROFILES.GENERAL;

  const hasContractCore = Boolean(ast.task && (ast.budget != null || ast.deadline));
  const hasCognitiveOnly =
    !hasContractCore &&
    Boolean(
      ast.cognitive?.perceptions?.length ||
        ast.cognitive?.reasonings?.length ||
        ast.cognitive?.drives?.length ||
        ast.cognitive?.attentions?.length ||
        ast.cognitive?.predictions?.length ||
        ast.cognitive?.reflections?.length ||
        ast.cognitive?.decisions?.length ||
        ast.cognitiveFlow?.whenSalient?.length ||
        ast.cognitiveFlow?.ruminations?.length ||
        ast.cognitiveFlow?.perceiveAll?.length ||
        ast.cognitiveFlow?.competitions?.length ||
        ast.cognitiveFlow?.habits?.length ||
        ast.cognitiveFlow?.surpriseHandlers?.length ||
        ast.cognitiveFlow?.dreams?.length ||
        ast.cognitiveFlow?.primes?.length ||
        ast.cognitiveFlow?.inhibitions?.length ||
        ast.agents?.length
    );

  if (hasCognitiveOnly) return PROFILES.COGNITIVE;
  return PROFILES.AEL;
}

function resolveExecutionMode(profile, options = {}) {
  if (options.mode && ['full', 'cognitive', 'protocol'].includes(options.mode)) {
    return options.mode;
  }

  switch (profile) {
    case PROFILES.COGNITIVE:
      return options.with_protocol === 'on' ? 'full' : 'cognitive';
    case PROFILES.GENERAL:
    case PROFILES.NEXT:
    case PROFILES.LIMINAL:
      return options.with_protocol === 'off' ? 'cognitive' : 'full';
    case PROFILES.AEL:
    default:
      if (options.with_protocol === 'off') return 'cognitive';
      if (options.simulate === true) return 'protocol';
      return 'full';
  }
}

module.exports = {
  PROFILES,
  SURFACES,
  CORE_SURFACE,
  PROFILE_ROLES,
  SURFACE_ROLES,
  PROFILE_DESCRIPTIONS,
  SURFACE_DESCRIPTIONS,
  detectProfile,
  detectSurface,
  resolveExecutionMode,
  getProfileInfo,
  getSurfaceInfo,
  resolveIntentGoal,
  resolveProgramTask
};
