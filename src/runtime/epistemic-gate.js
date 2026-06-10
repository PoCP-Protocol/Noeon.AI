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

// Opt-in human sign-off. POLICY require_human_approval accepts:
//   true            → always gate (irreversible ACT needs a one-time token).
//   critical|high|… → gate only when the run contains an ACT at/above that risk.
// Returns the mode: 'always', a risk level, or null when not configured.
function humanApprovalMode(ast) {
  const { RISK_ORDER } = require('./act-risk');
  for (const a of (ast?.agents || [])) {
    const v = a.policy?.require_human_approval;
    if (v === true || v === 'true') return 'always';
    if (typeof v === 'string' && RISK_ORDER.includes(v.toLowerCase())) return v.toLowerCase();
  }
  return null;
}

function agentRequiresHumanApproval(ast) {
  return humanApprovalMode(ast) != null;
}

// Gather executed/declared acts from a result for risk classification.
function actsForRisk(result) {
  const buckets = [
    result.canonicalActs?.acts,
    result.canonicalActs?.cognitive?.acts,
    result.canonical?.execution?.acts
  ];
  for (const acts of buckets) {
    if (Array.isArray(acts) && acts.length) return acts;
  }
  return [];
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
    result.canonicalActs?.cognitive?.acts,
    result.canonical?.execution?.acts   // path-robust: declared external fetches survive every canonical route
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

// Honest run confidence: aggregate the REAL confidence signals the run actually
// produced (perception/understanding/reasoning/decision results in the trace),
// rather than fabricating a perfect 1 when no signal exists. A run that did no
// real reasoning has no basis to claim high confidence.
function averageConfidence(result) {
  const stats = result.cognitive?.stats || result.stats;
  if (typeof stats?.avg_confidence === 'number') return stats.avg_confidence;

  const trace = result.cognitive?.trace || result.trace ||
    result.canonicalActs?.cognitive?.trace || [];
  if (Array.isArray(trace)) {
    const vals = [];
    for (const s of trace) {
      const c = (s && typeof s === 'object')
        ? (typeof s.result?.confidence === 'number' ? s.result.confidence
           : (typeof s.confidence === 'number' ? s.confidence : null))
        : null;
      if (typeof c === 'number' && c >= 0 && c <= 1) vals.push(c);
    }
    if (vals.length) return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const ctxC = result.cognitive?.context?.confidence;
  if (typeof ctxC === 'number') return ctxC;
  return 0.5; // conservative neutral — never assume perfect confidence
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

  // Human sign-off gate. In 'always' mode it blocks unconditionally; in a
  // risk-level mode (e.g. require_human_approval=critical) it blocks only when
  // the run actually contains an ACT at or above that risk. Does not rely on the
  // confidence/evidence heuristic below — it is an explicit, auditable gate.
  const haMode = humanApprovalMode(ast);
  let mustGate = haMode === 'always';
  let gateRisk = null;
  if (haMode && haMode !== 'always') {
    const { maxActRisk, rank } = require('./act-risk');
    gateRisk = maxActRisk(actsForRisk(result));
    mustGate = rank(gateRisk) >= rank(haMode);
  }
  if (needsHumanApproval && mustGate) {
    const goal = ast?.agents?.find((a) => agentRequiresHumanApproval({ agents: [a] }))?.goal;
    const message = haMode === 'always'
      ? 'require_human_approval policy: irreversible action requires human sign-off before ACT'
      : `require_human_approval=${haMode} policy: a ${gateRisk}-risk action requires human sign-off before ACT`;
    const pending = createPendingGate({
      action: 'human_approval',
      kind: 'epistemic',
      goal: goal || ast?.cognition?.goal,
      file: options.filename || options.source_path,
      surface: result.profile,
      risk: gateRisk,
      message
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

  // The remaining checks are the citation/confidence gate. If the agent only
  // requested human approval (and its risk gate did not trigger), there is
  // nothing further to enforce.
  if (!needsCitation) {
    return { blocked: false, schema: EPISTEMIC_SCHEMA, enforced: true,
      message: 'human-approval risk gate not triggered' };
  }

  const evidence = countEvidence(result, ast);
  const confidence = averageConfidence(result);
  // Citation and confidence are SEPARATE requirements:
  //  - require_citation  → at least one real piece of evidence before ACT.
  //  - confidence_floor   → only enforced when the policy explicitly declares it
  //    (a citation requirement is not a confidence requirement).
  const policy = ast.agents?.find((a) => a.policy?.require_citation)?.policy || {};
  const floor = policy.confidence_floor != null ? Number(policy.confidence_floor) : null;
  const evidenceOk = evidence >= 1;
  const confidenceOk = floor == null ? true : confidence >= floor;

  if (evidenceOk && confidenceOk) {
    return {
      blocked: false,
      schema: EPISTEMIC_SCHEMA,
      enforced: true,
      evidence,
      confidence,
      threshold: floor,
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
    threshold: floor,
    message: !evidenceOk
      ? 'require_citation policy: no citations or evidence attached before ACT'
      : `confidence_floor policy: confidence ${confidence.toFixed(2)} below floor ${floor}`
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
    threshold: floor,
    pending,
    blockReason: evidenceOk ? 'epistemic_gate_low_confidence' : 'epistemic_gate_uncited'
  };
}

module.exports = {
  EPISTEMIC_SCHEMA,
  agentRequiresCitation,
  agentRequiresHumanApproval,
  countEvidence,
  averageConfidence,
  enforceEpistemicGate
};
