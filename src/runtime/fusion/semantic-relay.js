'use strict';

/**
 * Unified Semantic Relay — merges triad field coherence with cross-surface convergence.
 */

const RELAY_SCHEMA = 'noeon.semantic.relay/v1';

function average(nums) {
  if (!nums.length) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4));
}

function buildSemanticRelay(triadResult, convergence, pulse, options = {}) {
  const threshold = options.threshold ?? 0.6;
  const triad = triadResult?.coherence || null;
  const triadRelay = triadResult?.relay || null;
  const convScore = convergence?.coherence?.score ?? null;
  const pulseScore = pulse?.score ?? null;
  const triadScore = triad?.score ?? null;

  const components = {
    triad: triadScore,
    convergence: convScore,
    pulse: pulseScore
  };

  const scores = [triadScore, convScore, pulseScore].filter((s) => s != null);
  const composite = average(scores);

  let action = 'idle';
  let triggered = false;
  let message = 'No relay signal';

  if (triadRelay?.triggered) {
    triggered = true;
    action = triadRelay.shifted ? 'dominant_shift' : 'field_pulse';
    message = `Triad relay: ${triadRelay.action} (${triadRelay.from} → ${triadRelay.to})`;
  }

  if (convergence?.drift?.length && (convScore == null || convScore < threshold)) {
    triggered = true;
    action = 'semantic_drift';
    message = `Cross-surface drift (${convergence.drift.length} signals)`;
  } else if (composite != null && composite >= 0.85 && convergence?.coherence?.unanimous_goal) {
    triggered = true;
    action = 'semantic_lock';
    message = 'Triad + convergence locked on shared intent';
  } else if (composite != null && composite >= threshold && action === 'idle') {
    triggered = true;
    action = 'semantic_align';
    message = 'Composite coherence permits relay';
  } else if (composite != null && composite < threshold * 0.75) {
    triggered = true;
    action = 'semantic_caution';
    message = 'Low composite coherence — observe before act';
  }

  if (triad?.aligned && convScore != null && convScore >= threshold && action === 'idle') {
    triggered = true;
    action = 'triad_convergence_harmony';
    message = 'Triad aligned and surfaces convergent';
  }

  return {
    schema: RELAY_SCHEMA,
    triggered,
    action,
    composite,
    threshold,
    components,
    triad_relay: triadRelay?.triggered ? triadRelay : null,
    convergence_aligned: convergence?.aligned ?? null,
    pulse_action: pulse?.action || null,
    message
  };
}

function formatSemanticRelayText(relay) {
  if (!relay) return 'Semantic relay: idle';
  return [
    `Semantic Relay (${relay.schema})`,
    `Action: ${relay.action} | Composite: ${relay.composite ?? '—'} | Triggered: ${relay.triggered}`,
    relay.message || ''
  ].filter(Boolean).join('\n');
}

module.exports = {
  RELAY_SCHEMA,
  buildSemanticRelay,
  formatSemanticRelayText
};
