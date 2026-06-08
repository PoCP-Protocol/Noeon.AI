'use strict';

const path = require('path');

/**
 * Noeon Canonical Architecture v1.0 — single pipeline contract.
 *
 * One language, multiple capability entry modes. All surfaces lower to
 * Canonical Semantic IR before governance, Cognitive IR execution, and observability.
 *
 * @see docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md
 */

const { SURFACES, CORE_SURFACE, SURFACE_ROLES } = require('./surfaces');

const ARCHITECTURE_VERSION = '1.0.0';

/** Frozen capability entry extensions — no new `.xxx` surfaces without ADR. */
const FROZEN_ENTRY_EXTENSIONS = Object.freeze({
  '.noeon': SURFACES.GENERAL,
  '.next': SURFACES.NEXT,
  '.lim': SURFACES.LIMINAL,
  '.ael': SURFACES.AEL
});

/** Organizational metaphor — not biological simulation. */
const SURFACE_METAPHORS = Object.freeze({
  [SURFACES.GENERAL]: 'hand',
  [SURFACES.NEXT]: 'will',
  [SURFACES.AEL]: 'contract',
  [SURFACES.LIMINAL]: 'conscience',
  [SURFACES.COGNITIVE]: 'neural-structure'
});

const CAPABILITY_BUCKETS = Object.freeze([
  'general',
  'governance',
  'contract',
  'alignment',
  'runtime-kernel'
]);

const SURFACE_TO_BUCKET = Object.freeze({
  [SURFACES.GENERAL]: 'general',
  [SURFACES.NEXT]: 'governance',
  [SURFACES.AEL]: 'contract',
  [SURFACES.LIMINAL]: 'alignment',
  [SURFACES.COGNITIVE]: 'runtime-kernel'
});

/**
 * Official execution pipeline — all surfaces must traverse these stages.
 */
const PIPELINE_STAGES = Object.freeze([
  {
    id: 'surface',
    label: 'Surface Syntax',
    description: 'Capability entry modes (.noeon / .next / .lim / .ael)',
    modules: ['grammar/detect', 'grammar/general-parser', 'grammar/next-parser']
  },
  {
    id: 'ast',
    label: 'Parse AST',
    description: 'Single legacy AST boundary for all surfaces',
    modules: ['parser', 'runtime/unified-runtime']
  },
  {
    id: 'canonical',
    label: 'Canonical Semantic IR',
    description: 'Unified intent, governance, alignment, execution plan',
    modules: ['core/canonical-lower', 'core/canonical-ir']
  },
  {
    id: 'governance',
    label: 'Governance & Route',
    description: 'Arbitration, phase plan, execution route',
    modules: ['core/canonical-governance', 'core/canonical-plan', 'core/canonical-route']
  },
  {
    id: 'cognitive',
    label: 'Cognitive IR',
    description: 'Kernel program — perceive, decide, act, learn',
    modules: ['core/cognitive-ir', 'compiler']
  },
  {
    id: 'runtime',
    label: 'Runtime Phases',
    description: 'Unified VM executor phases',
    modules: ['vm/unified-executor', 'vm/phases', 'vm/consciousness-scheduler']
  },
  {
    id: 'observability',
    label: 'Trace / Memory / Feedback',
    description: 'Reports, audit, field memory, reflections',
    modules: ['core/canonical-report', 'runtime/next/field-memory']
  }
]);

const GOLDEN_MANIFEST_PATH = 'examples/golden/manifest.json';

/** Runtime artifact suffixes — not capability entry surfaces. */
const ARTIFACT_FILENAME_SUFFIXES = ['.next.evolved'];

/** Liminal variant sidecars — same alignment bucket as `.lim`. */
const LIMINAL_VARIANT_SUFFIXES = ['.lim.human', '.lim.machine'];

function classifyExtension(ext) {
  const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return FROZEN_ENTRY_EXTENSIONS[normalized] || null;
}

function classifySurfaceCapability(surface) {
  const bucket = SURFACE_TO_BUCKET[surface];
  if (!bucket) {
    return { valid: false, surface, bucket: null, error: `Unknown surface: ${surface}` };
  }
  return {
    valid: true,
    surface,
    bucket,
    role: SURFACE_ROLES[surface] || null,
    metaphor: SURFACE_METAPHORS[surface] || null,
    isCore: surface === CORE_SURFACE
  };
}

function assertFrozenEntryExtension(ext) {
  const surface = classifyExtension(ext);
  if (!surface) {
    throw new Error(
      `Frozen surface policy: "${ext}" is not a registered capability entry. ` +
        `Allowed: ${Object.keys(FROZEN_ENTRY_EXTENSIONS).join(', ')}. ` +
        'New syntax families require an ADR before implementation.'
    );
  }
  return surface;
}

function shouldSkipFrozenFilenameCheck(filename) {
  const name = String(filename || '');
  if (!name || name.startsWith('<')) return true;
  const lower = name.toLowerCase();
  if (ARTIFACT_FILENAME_SUFFIXES.some((s) => lower.endsWith(s))) return true;
  return false;
}

function resolveFrozenExtension(filename) {
  const lower = String(filename || '').toLowerCase();
  for (const suffix of LIMINAL_VARIANT_SUFFIXES) {
    if (lower.endsWith(suffix)) return '.lim';
  }
  return path.extname(lower) || null;
}

function assertFrozenFilename(filename, options = {}) {
  if (options.skipFrozenCheck || shouldSkipFrozenFilenameCheck(filename)) {
    return null;
  }
  const ext = resolveFrozenExtension(filename);
  if (!ext) return null;
  return assertFrozenEntryExtension(ext);
}

function buildArchitectureManifest() {
  return {
    version: ARCHITECTURE_VERSION,
    coreSurface: CORE_SURFACE,
    frozenExtensions: { ...FROZEN_ENTRY_EXTENSIONS },
    metaphors: { ...SURFACE_METAPHORS },
    capabilityBuckets: [...CAPABILITY_BUCKETS],
    pipeline: PIPELINE_STAGES.map((s) => ({ id: s.id, label: s.label })),
    goldenManifest: GOLDEN_MANIFEST_PATH,
    rule: 'One language — capability entry modes, not parallel language branches.'
  };
}

module.exports = {
  ARCHITECTURE_VERSION,
  FROZEN_ENTRY_EXTENSIONS,
  SURFACE_METAPHORS,
  CAPABILITY_BUCKETS,
  SURFACE_TO_BUCKET,
  PIPELINE_STAGES,
  GOLDEN_MANIFEST_PATH,
  classifyExtension,
  classifySurfaceCapability,
  assertFrozenEntryExtension,
  assertFrozenFilename,
  resolveFrozenExtension,
  shouldSkipFrozenFilenameCheck,
  ARTIFACT_FILENAME_SUFFIXES,
  LIMINAL_VARIANT_SUFFIXES,
  buildArchitectureManifest
};
