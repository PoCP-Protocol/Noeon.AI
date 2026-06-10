'use strict';

/**
 * Render a Decision Provenance record into an auditor/regulator-facing report.
 *
 * Two surfaces: a self-contained HTML page (inline CSS, no external deps — opens
 * anywhere) and Markdown. The report makes the accountability chain legible to a
 * non-engineer: what was decided, on what evidence, at what confidence, who
 * approved it — and whether the cryptographic seal still verifies.
 */

const { verifyProvenance } = require('./provenance');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const VERDICT_LABEL = {
  executed: { text: 'EXECUTED', cls: 'ok' },
  blocked_awaiting_human: { text: 'BLOCKED — AWAITING HUMAN APPROVAL', cls: 'warn' },
  blocked: { text: 'BLOCKED', cls: 'bad' },
  failed: { text: 'FAILED', cls: 'bad' }
};

function integrityChecks(record) {
  const ig = record.integrity || {};
  const checks = [];
  if (record.policy?.require_citation) {
    checks.push({ label: 'Cited when required', pass: ig.cited_when_required === true,
      detail: `${ig.evidence_count} evidence item(s)` });
  }
  if (record.policy?.require_human_approval) {
    checks.push({ label: 'Human approval obtained when required', pass: ig.approved_when_required === true,
      detail: record.approval?.status });
  }
  if (record.policy?.confidence_floor != null) {
    checks.push({ label: `Confidence ≥ floor (${record.policy.confidence_floor})`, pass: ig.confidence_floor_met === true,
      detail: `run confidence ${ig.run_confidence}` });
  }
  checks.push({ label: 'Decisions meeting their threshold', pass: ig.decisions_meeting_threshold === ig.decisions_total,
    detail: `${ig.decisions_meeting_threshold}/${ig.decisions_total}` });
  return checks;
}

function renderMarkdown(record, verification) {
  const v = verification || verifyProvenance(record);
  const vl = VERDICT_LABEL[record.verdict] || { text: record.verdict };
  const L = [];
  L.push(`# Decision Provenance Report`);
  L.push('');
  L.push(`**Goal:** ${record.goal}`);
  L.push(`**Verdict:** ${vl.text}`);
  const pol = Object.entries(record.policy || {}).filter(([, x]) => x).map(([k, x]) => `\`${k}=${x}\``).join(', ') || '_(none)_';
  L.push(`**Governing policy:** ${pol}`);
  L.push('');
  L.push(`## Integrity`);
  for (const c of integrityChecks(record)) L.push(`- ${c.pass ? '✅' : '❌'} ${c.label} — ${c.detail}`);
  L.push('');
  L.push(`## Evidence (${record.evidence.length})`);
  if (!record.evidence.length) L.push(`- _no evidence obtained_`);
  for (const e of record.evidence) L.push(`- **${e.id}** [${e.type}] ${e.source || e.claim || ''}${e.contentHash ? ` · \`${e.contentHash.slice(0, 24)}…\`` : ''}`);
  L.push('');
  L.push(`## Decisions`);
  for (const d of record.decisions) L.push(`- **${d.id}** \`${d.action}\` — confidence ${d.confidence} vs threshold ${d.threshold} → **${d.met === true ? 'MET' : d.met === false ? 'NOT MET' : 'n/a'}**`);
  L.push('');
  L.push(`## Actions (highest risk: ${(record.integrity?.max_act_risk || 'low').toUpperCase()})`);
  if (!record.acts.length) L.push(`- _no actions executed_`);
  for (const a of record.acts) L.push(`- **${a.id}** \`${a.action}\` · **risk=${(a.risk || '').toUpperCase()}** · plugin=${a.plugin || '-'} · signed=${a.signed} · ${a.status || '-'}`);
  L.push('');
  L.push(`## Human approval`);
  L.push(`- required: ${record.approval.required} · status: **${record.approval.status}**${record.approval.tokenConsumed ? ' · one-time token consumed' : ''}${record.approval.gateId ? ` · gate ${record.approval.gateId}` : ''}`);
  L.push('');
  L.push(`## Tamper-evident seal`);
  L.push(`\`\`\``);
  L.push(record.contentHash);
  L.push(`\`\`\``);
  L.push(`Verification: ${v.valid ? '✅ seal intact — chain has not been altered' : '❌ TAMPERED — recomputed hash does not match'}`);
  return L.join('\n');
}

function renderHtml(record, verification) {
  const v = verification || verifyProvenance(record);
  const vl = VERDICT_LABEL[record.verdict] || { text: esc(record.verdict), cls: '' };
  const checks = integrityChecks(record);

  const policyBadges = Object.entries(record.policy || {}).filter(([, x]) => x)
    .map(([k, x]) => `<span class="badge">${esc(k)}=${esc(x)}</span>`).join(' ') || '<span class="muted">none</span>';

  const evidenceRows = record.evidence.length
    ? record.evidence.map((e) => `<tr><td>${esc(e.id)}</td><td><span class="tag">${esc(e.type)}</span></td><td>${esc(e.source || e.claim || '')}</td><td class="mono">${e.contentHash ? esc(e.contentHash.slice(0, 28)) + '…' : '<span class="muted">—</span>'}</td></tr>`).join('')
    : `<tr><td colspan="4" class="muted">No evidence obtained.</td></tr>`;

  const decisionRows = record.decisions.map((d) => {
    const metCls = d.met === true ? 'ok' : d.met === false ? 'bad' : 'muted';
    const metTxt = d.met === true ? 'MET' : d.met === false ? 'NOT MET' : 'n/a';
    return `<tr><td>${esc(d.id)}</td><td class="mono">${esc(d.action)}</td><td>${esc(d.confidence)}</td><td>${esc(d.threshold)}</td><td class="${metCls} bold">${metTxt}</td></tr>`;
  }).join('') || `<tr><td colspan="5" class="muted">No decisions recorded.</td></tr>`;

  const riskCls = { critical: 'bad', high: 'warn', medium: 'muted', low: 'muted' };
  const actRows = record.acts.length
    ? record.acts.map((a) => `<tr><td>${esc(a.id)}</td><td class="mono">${esc(a.action)}</td><td><span class="${riskCls[a.risk] || 'muted'} bold">${esc((a.risk || '').toUpperCase())}</span></td><td>${esc(a.plugin || '-')}</td><td>${a.signed ? '🔏 signed' : '<span class="muted">unsigned</span>'}</td><td>${esc(a.status || '-')}</td></tr>`).join('')
    : `<tr><td colspan="6" class="muted">No actions executed.</td></tr>`;

  const checkItems = checks.map((c) =>
    `<li class="${c.pass ? 'ok' : 'bad'}"><span class="mark">${c.pass ? '✓' : '✗'}</span> ${esc(c.label)} <span class="muted">— ${esc(c.detail)}</span></li>`).join('');

  const ap = record.approval;
  const approvalLine = `required: <b>${ap.required}</b> · status: <b class="${ap.status === 'approved' ? 'ok' : ap.status === 'pending' ? 'warn' : 'muted'}">${esc(ap.status)}</b>`
    + (ap.tokenConsumed ? ' · <b>one-time token consumed</b>' : '')
    + (ap.gateId ? ` · gate <span class="mono">${esc(ap.gateId)}</span>` : '');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Decision Provenance — ${esc(record.goal || '')}</title>
<style>
:root{--bg:#0f1419;--card:#1a212b;--ink:#e6edf3;--muted:#8b98a5;--line:#2a323d;--ok:#3fb950;--bad:#f85149;--warn:#d29922;--accent:#58a6ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:28px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}
.sub{color:var(--muted);margin:0 0 18px}
.verdict{display:inline-block;padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;letter-spacing:.04em}
.verdict.ok{background:rgba(63,185,80,.15);color:var(--ok);border:1px solid var(--ok)}
.verdict.warn{background:rgba(210,153,34,.15);color:var(--warn);border:1px solid var(--warn)}
.verdict.bad{background:rgba(248,81,73,.15);color:var(--bad);border:1px solid var(--bad)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px}
.badge{display:inline-block;background:rgba(88,166,255,.12);color:var(--accent);border:1px solid rgba(88,166,255,.4);border-radius:6px;padding:2px 8px;font-size:12px;margin:2px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
ul.checks{list-style:none;padding:0;margin:0}ul.checks li{padding:6px 0}ul.checks .mark{display:inline-block;width:20px;font-weight:700}
.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}.muted{color:var(--muted)}.bold,.b,b{font-weight:700}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px}
.seal{background:#0b0f14;border:1px dashed var(--line);border-radius:8px;padding:14px;margin-top:8px}
.seal .hash{word-break:break-all;color:var(--accent)}
.flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--muted);font-size:13px;margin:6px 0 0}
.flow b{color:var(--ink)}.flow .arrow{color:var(--accent)}
.footer{margin-top:30px;color:var(--muted);font-size:12px}
</style></head><body><div class="wrap">
<h1>Decision Provenance Report</h1>
<p class="sub">${esc(record.goal || '')}</p>
<p><span class="verdict ${vl.cls}">${vl.text}</span></p>
<div class="flow"><b>evidence</b><span class="arrow">→</span><b>decision</b> (confidence vs threshold)<span class="arrow">→</span><b>action</b><span class="arrow">→</span><b>human approval</b></div>

<h2>Governing policy</h2>
<div>${policyBadges}</div>

<h2>Integrity</h2>
<div class="card"><ul class="checks">${checkItems}</ul></div>

<h2>Evidence (${record.evidence.length})</h2>
<div class="card"><table><thead><tr><th>id</th><th>type</th><th>source</th><th>content hash</th></tr></thead><tbody>${evidenceRows}</tbody></table></div>

<h2>Decisions</h2>
<div class="card"><table><thead><tr><th>id</th><th>action</th><th>confidence</th><th>threshold</th><th>verdict</th></tr></thead><tbody>${decisionRows}</tbody></table></div>

<h2>Actions <span class="muted" style="text-transform:none;letter-spacing:0">— highest risk: <b>${esc((record.integrity?.max_act_risk || 'low').toUpperCase())}</b></span></h2>
<div class="card"><table><thead><tr><th>id</th><th>action</th><th>risk</th><th>plugin</th><th>integrity</th><th>status</th></tr></thead><tbody>${actRows}</tbody></table></div>

<h2>Human approval</h2>
<div class="card">${approvalLine}</div>

<h2>Tamper-evident seal</h2>
<div class="seal"><div class="hash mono">${esc(record.contentHash)}</div>
<p style="margin:10px 0 0">${v.valid
    ? '<span class="ok bold">✓ Seal intact</span> — the chain has not been altered since it was sealed.'
    : '<span class="bad bold">✗ TAMPERED</span> — recomputed hash does not match the seal.'}</p></div>

<p class="footer">Generated by Noeon · schema ${esc(record.schema)} · This record is independently verifiable: recompute the SHA-256 over the chain (excluding the seal) and compare.</p>
</div></body></html>`;
}

module.exports = { renderHtml, renderMarkdown };
