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

// Opt-in mandatory human sign-off: POLICY require_human_approval=true forces an
// irreversible ACT through a human approval gate regardless of the model's own
// confidence — the runtime will not act until a one-time token is consumed.
function agentRequiresHumanApproval(ast) {
  return (ast?.agents || []).some((a) => {
    const v = a.policy?.require_human_approval;
    return v === true || v === 'true';
  });
}

// Count REAL evidence backing the run — genuine provenance, not the mere
// appearance of the words "source"/"evidence" in serialized trace JSON (the
// old heuristic counted the PERCEIVE `source=` field name itself, so every
// agent trivially "had evidence"). Real evidence is: a structured citation on a
// belief, an injected citation/evidence array, an executed source-retrieval ACT
// (an external fetch that actually returned content), or reported citations.
function countEvidence(result, ast) {
  let count = 0;

  // 1) Beliefs carrying a structured source/citation (not a bare truthy field).
  const beliefs = result.cognitive?.beliefs || result.beliefs;
  if (beliefs && typeof beliefs === 'object') {
    for (const b of Object.values(beliefs)) {
      if (!b || typeof b !== 'object') continue;
      if (b.citation || (typeof b.source === 'string' && b.source) ||
          (Array.isArray(b.evidence) && b.evidence.length > 0)) count += 1;
    }
  }

  // 2) Citations / evidence explicitly injected into the program context.
  const ctx = ast?.cognition?.context || result.injectedContext || {};
  if (Array.isArray(ctx.citations)) count += ctx.citations.length;
  if (Array.isArray(ctx.evidence)) count += ctx.evidence.length;

  // 3) Executed source-retrieval ACTs: an external fetch (http_call / web
  //    channel) that ran and carries a URL is one piece of cited provenance.
  const actBuckets = [
    result.canonicalActs?.acts,
    result.canonicalActs?.cognitive?.acts
  ];
  for (const acts of actBuckets) {
    if (!Array.isArray(acts)) continue;
    for (const a of acts) {
      if (!a || typeof a !== 'object') continue;
      const url = a.receipt?.pluginMeta?.url || a.url || a.params?.url;
      const plugin = a.plugin || a.receipt?.plugin;
      if (url && (plugin === 'http_call' || a.channel === 'web')) count += 1;
    }
  }

  // 4) Observability-reported citation count.
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
  const needsCitation = agentRequiresCitation(ast);
  const needsHumanApproval = agentRequiresHumanApproval(ast);
  if (!needsCitation && !needsHumanApproval) {
    return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: false };
  }

  if (options._epistemicGateApproved) {
    return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: true, approved: true };
  }

  if (options.approval_token && !options._epistemicGateApproved) {
    const gate = findGateByToken(options.approval_token, options);
    if (gate?.action === 'uncited_claim' || gate?.action === 'human_approval' || gate?.kind === 'epistemic') {
      const approved = consumeApprovalToken(options.approval_token, options);
      if (approved) {
        options._epistemicGateApproved = true;
        result.epistemicGateApproval = approved;
        return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: true, approved: true };
      }
    }
  }

  // Mandatory human sign-off: block unconditionally until a token is consumed.
  // This does not rely on the confidence/evidence heuristic below (which can be
  // satisfied by ordinary trace content) — it is an explicit, auditable gate.
  if (needsHumanApproval) {
    const goal = ast?.agents?.find((a) => agentRequiresHumanApproval({ agents: [a] }))?.goal;
    const pending = createPendingGate({
      action: 'human_approval',
      kind: 'epistemic',
      goal: goal || ast?.cognition?.goal,
      file: options.filename || options.source_path,
      surface: result.profile,
      message: 'require_human_approval policy: irreversible action requires human sign-off before ACT'
    }, options);
    result.epistemicGate = true;
    result.humanGate = true;
    result.pendingApproval = result.pendingApproval || {
      id: pending.id,
      token: pending.token,
      action: pending.action,
      kind: 'human_approval',
      message: pending.message,
      approve_hint: `noeon gate approve ${pending.id}  or re-run with --approval-token ${pending.token}`
    };
    return {
      blocked: true,
      awaitingHuman: true,
      schema: EPISTEMIC_SCHEMA,
      enforced: true,
      pending,
      blockReason: 'human_approval_required'
    };
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
  agentRequiresHumanApproval,
  countEvidence,
  enforceEpistemicGate
};
