'use strict';

const { resolveRelayPolicy, applyRelayPolicy } = require('./fusion-relay-policy');
const { recordConvergenceEvent } = require('./convergence-stream');
const { createPendingGate, consumeApprovalToken } = require('../human-gate-store');

function finalizeSemanticRelay(result, ast, options = {}) {
  const policy = resolveRelayPolicy(ast, options);
  if (!result.semanticRelay && !policy) {
    return { blocked: false, humanGate: false };
  }

  let relay = result.semanticRelay;
  if (!relay && policy) {
    relay = {
      schema: 'noeon.semantic.relay/v1',
      triggered: false,
      action: 'idle',
      composite: result.convergence?.coherence?.score ?? null,
      message: 'Relay policy without active signal'
    };
  }

  const outcome = applyRelayPolicy(relay, policy, {
    threshold: options.threshold,
    convergence: result.convergence
  });

  if (options.approval_token && !options._humanGateApproved) {
    const approved = consumeApprovalToken(options.approval_token, options);
    if (approved) {
      options._humanGateApproved = true;
      result.humanGateApproval = approved;
    } else if (outcome.humanGate) {
      return {
        blocked: true,
        humanGate: true,
        blockReason: 'invalid_approval_token',
        relay: outcome.relay
      };
    }
  }

  if (options._humanGateApproved) {
    outcome.humanGate = false;
    if (outcome.blockReason === 'relay_human_gate') {
      outcome.blocked = false;
      outcome.blockReason = null;
    }
  }

  result.semanticRelay = outcome.relay;
  result.relayPolicy = policy
    ? { enabled: true, enforce: policy.enforce, threshold: outcome.relay.threshold }
    : null;

  if (outcome.humanGate && !options._humanGateApproved) {
    const pending = createPendingGate({
      action: outcome.relay.action,
      relay: outcome.relay,
      goal: ast?.cognition?.goal || result.canonical?.intent?.goal,
      file: options.filename || options.source_path,
      surface: result.profile,
      message: outcome.relay.message || 'Human approval required for relay action'
    }, options);

    result.humanGate = true;
    result.relayHumanGate = true;
    result.pendingApproval = {
      id: pending.id,
      token: pending.token,
      action: pending.action,
      message: pending.message,
      approve_hint: `noeon gate approve ${pending.id}  or re-run with --approval-token ${pending.token}`
    };
    outcome.pending = pending;
    outcome.blocked = true;
    outcome.awaitingHuman = true;
    outcome.blockReason = outcome.blockReason || 'human_gate_pending';
  } else if (outcome.humanGate) {
    result.humanGate = true;
    result.relayHumanGate = true;
  }

  recordConvergenceEvent({
    matrix: result.convergence,
    coherence: result.convergence?.coherence?.score,
    aligned: result.convergence?.aligned,
    pulse: result.semanticPulse,
    relay: outcome.relay,
    surface: result.profile,
    file: options.filename || options.source_path,
    blocked: outcome.blocked,
    human_gate: outcome.humanGate
  });

  return outcome;
}

module.exports = {
  finalizeSemanticRelay
};
