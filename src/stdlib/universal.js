'use strict';

/**
 * Epoch 10 — std.universal: AI general programming primitives.
 */

module.exports = {
  module: 'std.universal',
  effect: 'pure',
  exports: {
    intent: {
      effect: 'pure',
      dimension: 'INTENT',
      params: ['goal', 'metrics'],
      description: 'Declare measurable intent anchor'
    },
    epistemic: {
      effect: 'pure',
      dimension: 'EPISTEMIC',
      params: ['require_citation', 'confidence_floor', 'sources'],
      description: 'Evidence and confidence constraints'
    },
    cognize: {
      effect: 'ai',
      dimension: 'COGNITION',
      params: ['flow'],
      description: 'Cognitive loop — perceive, reason, decide, act, reflect'
    },
    equip: {
      effect: 'io',
      dimension: 'CAPABILITY',
      params: ['tools', 'plugins', 'memory'],
      description: 'Typed tools and compute boundaries'
    },
    govern: {
      effect: 'external',
      dimension: 'GOVERNANCE',
      params: ['policy', 'budget', 'human_must_approve'],
      description: 'Policy, budget, human-in-the-loop gates'
    },
    evolve: {
      effect: 'pure',
      dimension: 'EVOLUTION',
      params: ['learn', 'self_improve', 'dream'],
      description: 'Learning and self-improvement hooks'
    },
    scaffold: {
      effect: 'pure',
      dimension: 'META',
      params: ['name', 'intent'],
      description: 'Generate six-dimension Universal program template'
    }
  }
};
