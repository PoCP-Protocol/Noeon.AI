'use strict';

/**
 * Epistemic gate — hard constraint when POLICY require_citation=true.
 * Uncited external claims route to human approval instead of silent ACT.
 */

const { createPendingGate, consumeApprovalToken, findGateByToken } = require('./human-gate-store');

const EPISTEMIC_SCHEMA = 'noeon.epistemic.gate/v1';

function agentRequiresCitation(ast) {
  return (ast?.agents || []).some((a) => {
    const v = a.policy?.require_citation;
    return v === true || v === 'true';
  });
}

function countEvidence(result, ast) {
  let count = 0;

  const beliefs = result.cognitive?.beliefs || result.beliefs;
  if (beliefs && typeof beliefs === 'object') {
    for (const b of Object.values(beliefs)) {
      if (b?.source || b?.citation || b?.evidence) count += 1;
    }
  }

  const ctx = ast?.cognition?.context || result.injectedContext || {};
  if (Array.isArray(ctx.citations)) count += ctx.citations.length;
  if (Array.isArray(ctx.evidence)) count += ctx.evidence.length;

  const trace = result.cognitive?.trace || result.trace;
  if (Array.isArray(trace)) {
    for (const step of trace) {
      const text = JSON.stringify(step).toLowerCase();
      if (text.includes('citation') || text.includes('source') || text.includes('evidence')) {
        count += 1;
      }
    }
  }

  if (result.report?.observability?.citations) {
    count += Number(result.report.observability.citations) || 0;
  }

  return count;
}

function averageConfidence(result) {
  const stats = result.cognitive?.stats || result.stats;
  if (stats?.avg_confidence != null) return stats.avg_confidence;
  if (result.cognitive?.context?.confidence != null) return result.cognitive.context.confidence;
  return 1;
}

function enforceEpistemicGate(result, ast, options = {}) {
  if (!agentRequiresCitation(ast)) {
    return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: false };
  }

  if (options._epistemicGateApproved) {
    return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: true, approved: true };
  }

  if (options.approval_token && !options._epistemicGateApproved) {
    const gate = findGateByToken(options.approval_token, options);
    if (gate?.action === 'uncited_claim' || gate?.kind === 'epistemic') {
      const approved = consumeApprovalToken(options.approval_token, options);
      if (approved) {
        options._epistemicGateApproved = true;
        result.epistemicGateApproval = approved;
        return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: true, approved: true };
      }
    }
  }

  const evidence = countEvidence(result, ast);
  const confidence = averageConfidence(result);
  const threshold = Number(
    ast.agents?.find((a) => a.policy?.require_citation)?.policy?.confidence_floor || 0.72
  );

  if (evidence >= 1 && confidence >= threshold) {
    return {
      blocked: false,
      schema: EPISTEMIC_SCHEMA,
      enforced: true,
      evidence,
      confidence,
      message: 'Epistemic requirements satisfied'
    };
  }

  const pending = createPendingGate({
    action: 'uncited_claim',
    kind: 'epistemic',
    goal: ast?.cognition?.goal || result.canonical?.intent?.goal,
    file: options.filename || options.source_path,
    surface: result.profile,
    evidence_count: evidence,
    confidence,
    threshold,
    message: evidence < 1
      ? 'require_citation policy: no citations or evidence attached before ACT'
      : `require_citation policy: confidence ${confidence.toFixed(2)} below floor ${threshold}`
  }, options);

  result.epistemicGate = true;
  result.humanGate = true;
  result.pendingApproval = result.pendingApproval || {
    id: pending.id,
    token: pending.token,
    action: pending.action,
    kind: 'epistemic',
    message: pending.message,
    approve_hint: `noeon gate approve ${pending.id}  or re-run with --approval-token ${pending.token}`
  };

  return {
    blocked: true,
    awaitingHuman: true,
    schema: EPISTEMIC_SCHEMA,
    enforced: true,
    evidence,
    confidence,
    threshold,
    pending,
    blockReason: 'epistemic_gate_uncited'
  };
}

module.exports = {
  EPISTEMIC_SCHEMA,
  agentRequiresCitation,
  countEvidence,
  enforceEpistemicGate
};
