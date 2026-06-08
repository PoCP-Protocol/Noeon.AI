'use strict';

/**
 * Semantic Pulse — cross-layer coherence signal injected into cognitive context.
 * Extends triad relay with canonical convergence awareness.
 */

const PULSE_SCHEMA = 'noeon.semantic.pulse/v1';

function computeSemanticPulse(convergence = null, context = {}) {
  const triadScore = context.triadCoherence ?? context.triad?.coherence?.score ?? null;
  const matrixScore = convergence?.coherence?.score ?? context.convergenceScore ?? null;
  const fusionLayers = context.fusionLayers || [];

  let score = matrixScore;
  if (score == null && triadScore != null) score = triadScore;
  if (score == null && fusionLayers.length >= 2) score = 0.55;
  if (score == null && context.canonicalRoute && context.hasCanonicalGoal) {
    return {
      schema: PULSE_SCHEMA,
      triggered: true,
      action: 'semantic_single',
      score: 0.72,
      message: 'Single-surface canonical intent locked'
    };
  }
  if (score == null) {
    return { schema: PULSE_SCHEMA, triggered: false, action: 'idle', score: null };
  }

  const unanimous = convergence?.coherence?.unanimous_goal ?? context.unanimousGoal ?? false;
  const drift = (convergence?.drift?.length ?? 0) > 0;

  if (drift && score < 0.5) {
    return {
      schema: PULSE_SCHEMA,
      triggered: true,
      action: 'semantic_drift',
      score: Number(score.toFixed(4)),
      alert: true,
      message: 'Cross-surface semantic drift detected — review governance alignment'
    };
  }

  if (score >= 0.85 && unanimous) {
    return {
      schema: PULSE_SCHEMA,
      triggered: true,
      action: 'semantic_lock',
      score: Number(score.toFixed(4)),
      unanimous_goal: true,
      message: 'Surfaces locked on shared intent and governance tier'
    };
  }

  if (score >= 0.75) {
    return {
      schema: PULSE_SCHEMA,
      triggered: true,
      action: 'semantic_align',
      score: Number(score.toFixed(4)),
      message: 'Layers aligned — relay permitted'
    };
  }

  if (score >= 0.5) {
    return {
      schema: PULSE_SCHEMA,
      triggered: true,
      action: 'semantic_caution',
      score: Number(score.toFixed(4)),
      message: 'Partial alignment — observe before act'
    };
  }

  return {
    schema: PULSE_SCHEMA,
    triggered: true,
    action: 'semantic_drift',
    score: Number(score.toFixed(4)),
    alert: true,
    message: 'Low cross-layer coherence'
  };
}

function injectSemanticPulse(ast, pulse) {
  if (!ast || !pulse?.triggered) return ast;
  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};
  ast.cognition.context._semantic_pulse = {
    action: pulse.action,
    score: pulse.score,
    message: pulse.message,
    at: new Date().toISOString()
  };
  return ast;
}

function attachPulseToResult(result, pulse, convergence = null) {
  result.semanticPulse = pulse;
  if (convergence) result.convergence = convergence;
  if (pulse.triggered && result.injectedContext) {
    result.injectedContext._semantic_pulse = result.injectedContext._semantic_pulse ||
      astPulseContext(pulse);
  }
  return result;
}

function astPulseContext(pulse) {
  return {
    action: pulse.action,
    score: pulse.score,
    message: pulse.message
  };
}

module.exports = {
  PULSE_SCHEMA,
  computeSemanticPulse,
  injectSemanticPulse,
  attachPulseToResult
};
