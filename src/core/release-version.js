'use strict';

/**
 * Single source of truth for Noeon release identity (CLI, runtime, package, API).
 * @see docs/spec/NOEON_V1_ALPHA_SCOPE.md
 */

const NOEON_VERSION = '1.0.0-alpha.1';
const NOEON_PHASE = 'alpha';
const NOEON_ERA = 'canonical-primary-era';
const NOEON_STAGE =
  'AI-native general programming language — unified runtime alpha (canonical-primary era)';

/** Five terms exposed in public docs; advanced concepts stay in spec/ADR. */
const PUBLIC_VOCABULARY = Object.freeze([
  'Noeon Program',
  'Cognitive IR',
  'Unified VM',
  'Policy / Governance',
  'Trace / Memory'
]);

/** Frozen v1.0-alpha authoring surface — no new top-level syntax families without ADR. */
const V1_ALPHA_LANGUAGE_CORE = Object.freeze([
  'PROGRAM',
  'AGENT',
  'GOAL',
  'OBJECTIVE',
  'CONTEXT',
  'PERCEIVE',
  'OBSERVE',
  'UNDERSTAND',
  'REASON',
  'DECIDE',
  'ACT',
  'FEEDBACK',
  'REFLECT',
  'LEARN',
  'MEMORY',
  'POLICY',
  'TRACE'
]);

function buildReleaseManifest() {
  return {
    version: NOEON_VERSION,
    phase: NOEON_PHASE,
    era: NOEON_ERA,
    stage: NOEON_STAGE,
    publicVocabulary: [...PUBLIC_VOCABULARY],
    languageCore: [...V1_ALPHA_LANGUAGE_CORE],
    architecture: 'docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md',
    adr: 'docs/adr/ADR-003-canonical-architecture-and-dual-ir.md'
  };
}

module.exports = {
  NOEON_VERSION,
  NOEON_PHASE,
  NOEON_ERA,
  NOEON_STAGE,
  PUBLIC_VOCABULARY,
  V1_ALPHA_LANGUAGE_CORE,
  buildReleaseManifest
};
