'use strict';

/**
 * Noeon unified surface model — General / Next / Liminal / AEL under one stack.
 * Next is the semantic core (field, memory, evolution); other surfaces are layers.
 */

const SURFACES = {
  GENERAL: 'general',
  NEXT: 'next',
  LIMINAL: 'liminal',
  AEL: 'ael',
  COGNITIVE: 'cognitive'
};

/** Evolution and field semantics anchor on Next. */
const CORE_SURFACE = SURFACES.NEXT;

const SURFACE_ROLES = {
  [SURFACES.GENERAL]: 'authoring',
  [SURFACES.NEXT]: 'core',
  [SURFACES.LIMINAL]: 'alignment',
  [SURFACES.AEL]: 'governance-contract',
  [SURFACES.COGNITIVE]: 'kernel'
};

const SURFACE_DESCRIPTIONS = {
  [SURFACES.GENERAL]:
    'Authoring layer — AGENT blocks, program blocks, cognitive FLOW for human-written workflows.',
  [SURFACES.NEXT]:
    'Core layer — field, memory, evolution, constitution/vow/ritual/strategy governance.',
  [SURFACES.LIMINAL]:
    'Alignment layer — covenant, resonance, approve/veto gates on execution.',
  [SURFACES.AEL]:
    'Governance-contract layer — budget, verify, protocol settlement.',
  [SURFACES.COGNITIVE]:
    'Kernel research scripts — raw cognitive primitives.'
};

/** Organizational metaphor — see docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md */
const SURFACE_METAPHORS = {
  [SURFACES.GENERAL]: 'hand',
  [SURFACES.NEXT]: 'will',
  [SURFACES.AEL]: 'contract',
  [SURFACES.LIMINAL]: 'conscience',
  [SURFACES.COGNITIVE]: 'neural-structure'
};

/**
 * Resolve canonical intent.goal with Next-first precedence.
 * `task` is program id, never intent.
 */
function resolveIntentGoal(ast) {
  if (ast?.next?.goal?.text) return ast.next.goal.text;
  if (ast?.agents?.[0]?.goal) return ast.agents[0].goal;
  if (ast?.cognition?.goal) return ast.cognition.goal;
  if (ast?.liminal?.covenant?.intent) return ast.liminal.covenant.intent;
  if (ast?.general?.objective) return ast.general.objective;
  if (ast?.objective) return ast.objective;
  return null;
}

function resolveProgramTask(ast) {
  return (
    ast?.task ||
    ast?.next?.program ||
    ast?.agents?.[0]?.name ||
    ast?.liminal?.covenant?.name ||
    ast?.general?.name ||
    null
  );
}

function getSurfaceInfo(surface) {
  const name = Object.values(SURFACES).includes(surface) ? surface : SURFACES.AEL;
  return {
    name,
    role: SURFACE_ROLES[name] || 'unknown',
    description: SURFACE_DESCRIPTIONS[name] || '',
    metaphor: SURFACE_METAPHORS[name] || null,
    isCore: name === CORE_SURFACE
  };
}

module.exports = {
  SURFACES,
  CORE_SURFACE,
  SURFACE_ROLES,
  SURFACE_DESCRIPTIONS,
  SURFACE_METAPHORS,
  resolveIntentGoal,
  resolveProgramTask,
  getSurfaceInfo
};
