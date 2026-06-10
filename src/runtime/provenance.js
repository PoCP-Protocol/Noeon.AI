'use strict';

/**
 * Decision Provenance — a first-class, machine-verifiable accountability chain.
 *
 * This is Noeon's differentiating artifact: for any governed run it assembles a
 * tamper-evident record linking
 *
 *     evidence  →  decision (confidence vs threshold)  →  act  →  human approval
 *
 * from REAL run signals (fetched sources with content hashes, the actual
 * DECIDE confidences/thresholds, executed plugin acts and their signature
 * status, and consumed approval tokens). It is sealed with a content hash so an
 * auditor can independently verify the chain was not altered after the fact.
 *
 * Why this matters: an LLM+prompt (or a generic agent framework) can emit a
 * narrative "here's my reasoning", but it cannot structurally guarantee that
 * the action it took is backed by a complete, unaltered evidence→decision→act
 * chain. Noeon makes that chain a language-level, enforceable object.
 */

const crypto = require('crypto');
const { averageConfidence } = require('./epistemic-gate');
const { classifyActRisk, maxActRisk } = require('./act-risk');

const SCHEMA = 'noeon.provenance/v1';

// Honest run-level confidence (aggregated real signals), shared with the gate.
function realRunConfidence(result) {
  try { return averageConfidence(result); } catch { return 0.5; }
}
function roundConf(v) {
  return typeof v === 'number' ? Math.round(v * 1000) / 1000 : null;
}

function sha256(value) {
  return 'sha256:' + crypto.createHash('sha256').update(value).digest('hex');
}

// Deterministic JSON: object keys sorted recursively so the seal is stable.
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function actBuckets(result) {
  return [
    result.canonicalActs?.acts,
    result.canonicalActs?.cognitive?.acts,
    result.canonical?.execution?.acts
  ].filter(Array.isArray);
}

/** Extract structured evidence items (real provenance), each with a stable id. */
function collectEvidence(result, ast) {
  const items = [];
  const byKey = new Map();
  const push = (it) => {
    // Dedup on the logical source (type+source/claim); the declared and
    // executed buckets describe the same source — keep the richest (hashed) one.
    const key = `${it.type}|${it.source || it.claim || ''}`;
    const existing = byKey.get(key);
    if (existing) {
      if (it.contentHash && !existing.contentHash) Object.assign(existing, it);
      return;
    }
    const entry = { id: `ev_${items.length + 1}`, ...it };
    byKey.set(key, entry);
    items.push(entry);
  };

  // 1) Executed/declared external source retrievals.
  for (const acts of actBuckets(result)) {
    for (const a of acts) {
      if (!a || typeof a !== 'object') continue;
      const url = a.receipt?.pluginMeta?.url || a.url || a.params?.url;
      const plugin = a.plugin || a.receipt?.plugin;
      if (url && (plugin === 'http_call' || a.channel === 'web')) {
        push({
          type: 'source_fetch',
          source: url,
          contentHash: a.receipt?.evidenceHash || (a.content ? sha256(String(a.content)) : null),
          retrievedBy: a.step || a.action || plugin
        });
      }
    }
  }

  // 2) Injected context citations / evidence.
  const ctx = ast?.cognition?.context || result.injectedContext || {};
  for (const c of (Array.isArray(ctx.citations) ? ctx.citations : [])) {
    push({ type: 'citation', source: typeof c === 'string' ? c : (c.source || c.url), claim: c.claim });
  }
  for (const e of (Array.isArray(ctx.evidence) ? ctx.evidence : [])) {
    push({ type: 'context_evidence', source: e.source, claim: e.claim || (typeof e === 'string' ? e : null) });
  }

  // 3) Beliefs carrying a structured source/citation.
  const beliefs = result.cognitive?.beliefs || result.beliefs;
  if (beliefs && typeof beliefs === 'object' && !Array.isArray(beliefs)) {
    for (const [k, b] of Object.entries(beliefs)) {
      if (b && typeof b === 'object' && (b.citation || (typeof b.source === 'string' && b.source))) {
        push({ type: 'belief', source: b.source || b.citation, claim: k });
      }
    }
  }

  return items;
}

function collectDecisions(result, evidenceIds) {
  const all = result.decisions || result.cognitive?.decisions || [];
  if (!Array.isArray(all)) return [];
  // Keep accountable decisions (those that chose an action); drop internal
  // choice nodes with no resolved action.
  const decisions = all.filter((d) => d.chosen || d.action);
  return decisions.map((d, i) => {
    const confidence = typeof d.confidence === 'number' ? d.confidence : null;
    const threshold = d.threshold != null ? Number(d.threshold) : null;
    return {
      id: `dec_${i + 1}`,
      action: d.chosen || d.action || null,
      strategy: d.strategy || d.mode || null,
      confidence,
      threshold,
      met: (confidence != null && threshold != null) ? confidence >= threshold : null,
      influencedBy: d.influenced_by || null,
      // every decision is held accountable to the run's evidence set
      evidenceRefs: evidenceIds
    };
  });
}

function collectActs(result) {
  const out = [];
  for (const acts of actBuckets(result)) {
    for (const a of acts) {
      if (!a || typeof a !== 'object') continue;
      const action = a.step || a.action;
      if (!action) continue;
      out.push({
        id: `act_${out.length + 1}`,
        action,
        plugin: a.plugin || a.receipt?.plugin || null,
        signed: a.receipt?.signatureVerified === true,
        status: a.status || a.receipt?.status || null,
        risk: classifyActRisk(a)
      });
    }
    if (out.length) break; // first populated bucket is the executed one
  }
  return out;
}

function collectApproval(result) {
  const approved = result.epistemicGateApproval;
  if (approved) {
    return { required: true, status: 'approved', gateId: approved.id || null,
             approver: approved.approver || 'human', tokenConsumed: true };
  }
  if (result.pendingApproval) {
    return { required: true, status: 'pending', gateId: result.pendingApproval.id || null,
             approver: null, tokenConsumed: false };
  }
  return { required: false, status: 'not_required', gateId: null, approver: null, tokenConsumed: false };
}

function policyOf(ast) {
  const a = (ast?.agents || [])[0];
  const p = a?.policy || {};
  return {
    require_citation: p.require_citation === true || p.require_citation === 'true',
    require_human_approval: p.require_human_approval === true || p.require_human_approval === 'true',
    confidence_floor: p.confidence_floor != null ? Number(p.confidence_floor) : null
  };
}

/**
 * Assemble the provenance record. Pure and deterministic given the same run.
 * The `contentHash` seals the substantive chain (timestamps excluded) so it is
 * stable across runs and independently verifiable.
 */
function buildProvenance(result, ast, options = {}) {
  const evidence = collectEvidence(result, ast);
  const evidenceIds = evidence.map((e) => e.id);
  const decisions = collectDecisions(result, evidenceIds);
  const acts = collectActs(result);
  const approval = collectApproval(result);
  const policy = policyOf(ast);

  const verdict = result.blocked
    ? (result.awaitingHuman ? 'blocked_awaiting_human' : 'blocked')
    : (result.success === false ? 'failed' : 'executed');

  const core = {
    schema: SCHEMA,
    goal: (ast?.agents || [])[0]?.goal || ast?.cognition?.goal || result.program || null,
    policy,
    evidence,
    decisions,
    acts,
    approval,
    verdict,
    // gaps the chain should never have: an executed act with no evidence under
    // a citation policy, or an unapproved irreversible act under an approval policy.
    integrity: {
      evidence_count: evidence.length,
      cited_when_required: !policy.require_citation || evidence.length >= 1,
      approved_when_required: !policy.require_human_approval || approval.status === 'approved' || verdict.startsWith('blocked'),
      decisions_meeting_threshold: decisions.filter((d) => d.met === true).length,
      decisions_total: decisions.length,
      max_act_risk: maxActRisk(acts),
      run_confidence: roundConf(realRunConfidence(result)),
      confidence_floor_met: policy.confidence_floor == null ? null : realRunConfidence(result) >= policy.confidence_floor
    }
  };

  const contentHash = sha256(stableStringify(core));
  return { ...core, sealedAt: options.sealed_at || null, contentHash };
}

/** Recompute the seal and report whether the record is intact. */
function verifyProvenance(record) {
  if (!record || record.schema !== SCHEMA) {
    return { valid: false, reason: 'not a provenance record' };
  }
  const { contentHash, sealedAt, ...core } = record;
  const expected = sha256(stableStringify(core));
  return { valid: expected === contentHash, expected, actual: contentHash };
}

function formatProvenance(record) {
  const lines = [];
  lines.push(`Decision Provenance (${record.schema})`);
  lines.push(`  goal: ${record.goal}`);
  lines.push(`  verdict: ${record.verdict}`);
  const pol = Object.entries(record.policy).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(' ') || '(none)';
  lines.push(`  policy: ${pol}`);
  lines.push(`  evidence (${record.evidence.length}):`);
  for (const e of record.evidence) lines.push(`    • ${e.id} [${e.type}] ${e.source || e.claim || ''} ${e.contentHash ? `(${e.contentHash.slice(0, 16)}…)` : ''}`);
  lines.push(`  decisions:`);
  for (const d of record.decisions.slice(0, 6)) lines.push(`    • ${d.id} ${d.action} · conf=${d.confidence} thr=${d.threshold} met=${d.met} ← [${d.evidenceRefs.join(',') || '∅'}]`);
  lines.push(`  acts:`);
  for (const a of record.acts) lines.push(`    • ${a.id} ${a.action} · plugin=${a.plugin || '-'} signed=${a.signed} status=${a.status || '-'}`);
  lines.push(`  approval: required=${record.approval.required} status=${record.approval.status}${record.approval.tokenConsumed ? ' (token consumed)' : ''}`);
  const ig = record.integrity;
  lines.push(`  integrity: cited_when_required=${ig.cited_when_required} approved_when_required=${ig.approved_when_required} run_confidence=${ig.run_confidence}${ig.confidence_floor_met == null ? '' : ` floor_met=${ig.confidence_floor_met}`} decisions_met=${ig.decisions_meeting_threshold}/${ig.decisions_total}`);
  lines.push(`  seal: ${record.contentHash}`);
  return lines.join('\n');
}

module.exports = { SCHEMA, buildProvenance, verifyProvenance, formatProvenance, stableStringify, sha256 };
