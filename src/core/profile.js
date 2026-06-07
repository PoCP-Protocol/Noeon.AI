'use strict';

/**
 * Language profiles for unified VM (Phase 1 → v1.0 dual-profile model)
 *
 * ael       — Governance/contract profile (.ael default)
 * general   — AI-era general profile (.noeon, future syntax)
 * cognitive — Cognitive-only scripts (no full contract header)
 */

const PROFILES = {
  AEL: 'ael',
  GENERAL: 'general',
  COGNITIVE: 'cognitive'
};

function detectProfile(ast, options = {}) {
  if (options.profile && Object.values(PROFILES).includes(options.profile)) {
    return options.profile;
  }

  const filename = options.filename || options.program_name || '';
  if (filename.endsWith('.noeon')) return PROFILES.GENERAL;
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
  detectProfile,
  resolveExecutionMode
};
