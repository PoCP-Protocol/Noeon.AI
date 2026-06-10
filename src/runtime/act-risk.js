'use strict';

/**
 * ACT risk classification.
 *
 * The runtime classifies each action by how hard it is to undo / how much it
 * can hurt, so governance can be applied per-action instead of per-agent:
 *
 *   critical — irreversible / money / data loss / deployment (pay, transfer,
 *              delete, deploy, drop, wipe). Default policy: human approval.
 *   high     — externally-visible writes (write, send, email, post, push,
 *              commit, publish). Default policy: require evidence.
 *   medium   — external reads (fetch, get, search, lookup, http GET).
 *   low      — local/observable (log, print, greet, notify, mock console).
 *
 * Pure and deterministic. Classification is by action verb, channel, and HTTP
 * method — conservative: when unsure, round UP (treat as higher risk).
 */

const RISK_ORDER = ['low', 'medium', 'high', 'critical'];

const CRITICAL = /\b(pay|payment|transfer|wire|remit|disburse|fund|refund|charge|settle|delete|destroy|drop|wipe|purge|erase|deploy|release|rollback|shutdown|terminate|revoke|liquidat)/i;
const HIGH = /\b(write|send|email|message|notify_external|post|put|patch|push|commit|publish|create|update|insert|upload|sign|grant|approve|provision|merge)/i;
const MEDIUM = /\b(fetch|get|read|search|lookup|query|list|scan|retrieve|load|fetch_sources|fraud_signals)/i;
const LOW = /\b(greet|log|print|echo|notify|display|render|preview|noop|ping)/i;

function rank(level) {
  const i = RISK_ORDER.indexOf(level);
  return i < 0 ? 0 : i;
}

function maxRisk(a, b) {
  return rank(a) >= rank(b) ? a : b;
}

/** Classify a single ACT (declared or executed) into a risk level. */
function classifyActRisk(act = {}) {
  const action = String(act.action || act.step || act.name || '').toLowerCase();
  const channel = String(act.channel || '').toLowerCase();
  const method = String(act.httpMethod || act.method || act.params?.method || '').toUpperCase();
  const mock = act.mock === true || act.mock === 'true';

  // Channel-driven floors for irreversible sinks.
  if (channel === 'ledger' || channel === 'payment' || channel === 'blockchain') {
    // money rails: writing/releasing is critical; a pure read may be lower.
    if (!MEDIUM.test(action) || CRITICAL.test(action)) return 'critical';
  }

  if (CRITICAL.test(action)) return 'critical';

  // Write-bearing HTTP verbs are high risk regardless of action verb.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return method === 'DELETE' ? 'critical' : 'high';
  }
  if (HIGH.test(action)) return 'high';

  if (MEDIUM.test(action) || channel === 'web' || act.plugin === 'http_call') {
    return 'medium';
  }
  if (LOW.test(action) || channel === 'console' || mock) return 'low';

  // Unknown action: be conservative — a side-effecting ACT we can't classify
  // is treated as 'high', not ignored.
  return 'high';
}

/** Highest risk across a list of acts (returns 'low' for empty). */
function maxActRisk(acts = []) {
  let level = 'low';
  for (const a of acts) level = maxRisk(level, classifyActRisk(a));
  return level;
}

module.exports = { RISK_ORDER, rank, maxRisk, classifyActRisk, maxActRisk };
