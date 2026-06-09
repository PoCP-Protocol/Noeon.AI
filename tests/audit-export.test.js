'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  AUDIT_EXPORT_SCHEMA,
  AUDIT_SCHEMA,
  buildCanonicalAuditEntry,
  exportCanonicalAudit
} = require('../src/core/canonical-report');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Canonical Audit Export ═══\x1b[0m\n');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-audit-export-'));
const auditDir = path.join(tmpDir, 'canonical');
fs.mkdirSync(auditDir, { recursive: true });
const auditFile = path.join(auditDir, 'audit.jsonl');

const entries = [
  buildCanonicalAuditEntry({
    generatedAt: '2026-06-09T10:00:00.000Z',
    surface: 'general',
    success: true,
    blocked: false,
    intent: { goal: 'fetch' },
    execution: { phases: ['cognitive'] },
    observability: { runtime_trace: null },
    governance: { arbitration: { winner_tier: 'constitution' } },
    fusion: { layers: ['general'], triad: false, coherence: 0.8 },
    ecosystem: { runtime: { executor: 'canonical' }, mcp: { attached_tools: [] }, packages: { imports: [] } }
  }),
  buildCanonicalAuditEntry({
    generatedAt: '2026-06-09T11:00:00.000Z',
    surface: 'ael',
    success: false,
    blocked: true,
    intent: { goal: 'simulate' },
    execution: { phases: ['protocol'] },
    observability: { runtime_trace: null },
    governance: { arbitration: null },
    fusion: { layers: [], triad: false, coherence: null },
    ecosystem: { runtime: { executor: 'protocol' }, mcp: { attached_tools: [] }, packages: { imports: [] } }
  })
];

for (const entry of entries) {
  fs.appendFileSync(auditFile, `${JSON.stringify(entry)}\n`, 'utf8');
}

const empty = exportCanonicalAudit({ dir: path.join(tmpDir, 'missing') });
assert(empty.schema === AUDIT_EXPORT_SCHEMA, 'empty export uses export schema');
assert(empty.exists === false, 'missing audit file reports exists=false');
assert(empty.summary.total === 0, 'empty export summary total is 0');

const bundle = exportCanonicalAudit({ dir: auditDir });
assert(bundle.schema === AUDIT_EXPORT_SCHEMA, 'export bundle schema');
assert(bundle.exists === true, 'export bundle exists=true');
assert(bundle.entries.length === 2, 'export includes all entries');
assert(bundle.summary.total === 2, 'summary total counts all entries');
assert(bundle.summary.success === 1, 'summary success count');
assert(bundle.summary.blocked === 1, 'summary blocked count');
assert(bundle.entries[0].schema === AUDIT_SCHEMA, 'exported entry retains audit schema');

const limited = exportCanonicalAudit({ dir: auditDir, limit: 1 });
assert(limited.entries.length === 1, 'limit restricts exported entries');
assert(limited.summary.total === 2, 'summary still reflects full audit log');

const cli = path.join(__dirname, '..', 'src', 'cli.js');
const outFile = path.join(tmpDir, 'export.json');
const cliRun = spawnSync(process.execPath, [cli, 'report', 'export', '--json', '--dir', auditDir, '--out', outFile], {
  encoding: 'utf8'
});
assert(cliRun.status === 0, 'noeon report export exits 0');
const cliPayload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
assert(cliPayload.schema === AUDIT_EXPORT_SCHEMA, 'CLI export writes export schema');

const auditAlias = spawnSync(process.execPath, [cli, 'audit', 'export', '--json', '--dir', auditDir], {
  encoding: 'utf8'
});
assert(auditAlias.status === 0, 'noeon audit export alias exits 0');
const aliasPayload = JSON.parse(auditAlias.stdout.trim());
assert(aliasPayload.summary.total === 2, 'audit export alias returns bundle');

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
