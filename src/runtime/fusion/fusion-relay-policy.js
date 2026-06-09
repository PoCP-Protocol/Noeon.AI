'use strict';

/**
 * Declarative FUSE relay policy — threshold, enforce, human gate, drift actions.
 */

const POLICY_SCHEMA = 'noeon.relay.policy/v1';

const DRIFT_ACTIONS = new Set(['semantic_drift', 'semantic_caution']);
const LOCK_ACTIONS = new Set(['semantic_lock', 'semantic_align', 'triad_convergence_harmony']);

function resolveRelayPolicy(ast, options = {}) {
  if (options.relay_policy) return { enabled: true, ...options.relay_policy };
  if (ast?.fusionRelay?.enabled !== false && ast?.fusionRelay) {
    return { enabled: true, ...ast.fusionRelay };
  }
  const block = (ast?.fusion || []).find((f) => f.target === 'relay' && f.enabled !== false);
  return block ? { enabled: true, ...block } : null;
}

function applyRelayPolicy(relay, policy, context = {}) {
  if (!relay || !policy?.enabled) {
    return { relay, blocked: false, humanGate: false, blockReason: null, policy: null };
  }

  const threshold = Number(policy.threshold ?? relay.threshold ?? context.threshold ?? 0.6);
  const onDrift = policy.on_drift || policy.onDrift || 'block';
  const onLock = policy.on_lock || policy.onLock || 'permit';

  const enriched = {
    ...relay,
    schema: relay.schema,
    threshold,
    policy: POLICY_SCHEMA,
    policy_mode: policy.mode || 'declarative'
  };

  let blocked = false;
  let humanGate = false;
  let blockReason = null;

  if (policy.enforce === true || policy.enforce === 'true') {
    if (DRIFT_ACTIONS.has(relay.action) && onDrift === 'block') {
      blocked = true;
      blockReason = 'relay_policy_drift';
    }
    if (relay.composite != null && relay.composite < threshold) {
      blocked = true;
      blockReason = blockReason || 'relay_below_threshold';
    }
    if (LOCK_ACTIONS.has(relay.action) && onLock === 'block') {
      blocked = true;
      blockReason = 'relay_policy_lock_blocked';
    }
  }

  const approveList = policy.human_must_approve || policy.humanMustApprove || [];
  const approveActions = Array.isArray(approveList)
    ? approveList
    : String(approveList).split(',').map((s) => s.trim()).filter(Boolean);

  if (approveActions.includes(relay.action) || approveActions.includes('*')) {
    humanGate = true;
    enriched.human_gate = true;
    enriched.message = `${relay.message || relay.action} — human approval required`;
    if (policy.enforce === true && policy.block_without_approval !== false) {
      blocked = true;
      blockReason = blockReason || 'relay_human_gate';
    }
  }

  if (context.convergence?.drift?.length && policy.enforce === true && onDrift === 'block') {
    blocked = true;
    blockReason = blockReason || 'relay_convergence_drift';
  }

  enriched.blocked = blocked;
  enriched.human_gate_pending = humanGate && !blocked;

  return { relay: enriched, blocked, humanGate, blockReason, policy: POLICY_SCHEMA };
}

function formatRelayPolicyText(outcome) {
  if (!outcome?.relay) return 'Relay policy: none';
  const r = outcome.relay;
  return [
    `Relay Policy (${POLICY_SCHEMA})`,
    `Action: ${r.action} | Composite: ${r.composite ?? '—'} | Threshold: ${r.threshold}`,
    `Blocked: ${outcome.blocked} | Human gate: ${outcome.humanGate}`,
    outcome.blockReason ? `Reason: ${outcome.blockReason}` : null,
    r.message || ''
  ].filter(Boolean).join('\n');
}

module.exports = {
  POLICY_SCHEMA,
  resolveRelayPolicy,
  applyRelayPolicy,
  formatRelayPolicyText
};
