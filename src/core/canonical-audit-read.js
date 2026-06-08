'use strict';

const fs = require('fs');
const path = require('path');

function readCanonicalAudit(options = {}) {
  const dir = options.dir || path.join(process.cwd(), 'artifacts', 'canonical');
  const file = path.join(dir, 'audit.jsonl');
  const limit = Math.max(1, Math.min(options.limit ?? 50, 500));

  if (!fs.existsSync(file)) {
    return {
      file,
      exists: false,
      entries: [],
      stats: { total: 0, success: 0, blocked: 0, bySurface: {} }
    };
  }

  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  const slice = lines.slice(-limit);
  const entries = slice.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { schema: 'parse_error', raw: line.slice(0, 120) };
    }
  });

  const stats = {
    total: lines.length,
    returned: entries.length,
    success: entries.filter((e) => e.success === true).length,
    blocked: entries.filter((e) => e.blocked === true).length,
    bySurface: {}
  };

  for (const e of entries) {
    const s = e.surface || 'unknown';
    stats.bySurface[s] = (stats.bySurface[s] || 0) + 1;
  }

  return { file, exists: true, entries, stats };
}

function formatAuditReport(report) {
  if (!report.exists) {
    return `No audit log at ${report.file}`;
  }
  const lines = [
    `Canonical Audit (${report.stats.total} total, showing ${report.stats.returned})`,
    `Success: ${report.stats.success} | Blocked: ${report.stats.blocked}`,
    ''
  ];
  for (const e of report.entries.slice().reverse()) {
    const ts = e.ts?.slice(0, 19) || '—';
    lines.push(
      `  ${ts}  ${String(e.surface || '—').padEnd(10)}  ok=${e.success ? '✓' : '✗'}  phases=[${(e.phases || []).join(',')}]  gov=${e.governance_winner || '—'}`
    );
  }
  return lines.join('\n');
}

module.exports = {
  readCanonicalAudit,
  formatAuditReport
};
