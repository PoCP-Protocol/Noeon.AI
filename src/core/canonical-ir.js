'use strict';

/**
 * Noeon Canonical Semantic IR v1.0
 *
 * Single semantic model for all capability layers (general / next / ael / liminal).
 * Surfaces lower here before unified governance and runtime execution.
 */

const CANONICAL_VERSION = '1.0.0';

const GOVERNANCE_TIERS = ['constitution', 'vow', 'ritual', 'strategy', 'policy'];

const CAPABILITIES = ['general', 'next', 'ael', 'liminal', 'cognitive'];

function createCanonicalProgram(meta = {}) {
  return {
    version: CANONICAL_VERSION,
    surface: meta.surface || null,
    module: meta.module || null,
    task: meta.task || null,
    intent: {
      goal: null,
      objectives: [],
      constraints: {}
    },
    governance: {
      constitutions: [],
      vows: [],
      rituals: [],
      strategies: [],
      policies: []
    },
    execution: {
      acts: [],
      flow: [],
      budget: null,
      deadline: null,
      verify: null
    },
    alignment: {
      covenant: null,
      beliefs: [],
      resonates: [],
      approvals: [],
      veto: [],
      resonance_floor: null
    },
    learning: {
      memory: null,
      evolution: [],
      field: null,
      context: {}
    },
    observability: {
      reflections: [],
      traces: [],
      audit: []
    },
    capabilities: {
      general: false,
      next: false,
      ael: false,
      liminal: false,
      cognitive: false
    },
    agents: [],
    fusion: {
      plan: [],
      layers: [],
      triad: false,
      bidirectional: false
    }
  };
}

function canonicalSnapshot(program) {
  return {
    version: program.version,
    surface: program.surface,
    goal: program.intent?.goal || null,
    capabilities: { ...program.capabilities },
    governance_counts: {
      constitution: program.governance.constitutions.length,
      vow: program.governance.vows.length,
      ritual: program.governance.rituals.length,
      strategy: program.governance.strategies.length,
      policy: program.governance.policies.length
    },
    fusion_layers: [...(program.fusion.layers || [])],
    act_count: program.execution.acts.length,
    belief_count: program.alignment.beliefs.length
  };
}

module.exports = {
  CANONICAL_VERSION,
  GOVERNANCE_TIERS,
  CAPABILITIES,
  createCanonicalProgram,
  canonicalSnapshot
};
