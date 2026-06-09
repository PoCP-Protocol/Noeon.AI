'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  appendCanonicalAudit,
  rotateCanonicalAuditIfNeeded,
  listAuditArchiveFiles,
  buildCanonicalAuditEntry
} = require('../src/core/canonical-report');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

function sampleReport(i) {
  return {
    generatedAt: `2026-06-09T12:00:0${i}.000Z`,
    surface: 'general',
    success: true,
    blocked: false,
    intent: { goal: `run-${i}` },
    execution: { phases: ['cognitive'] },
    observability: { runtime_trace: null },
    governance: { arbitration: { winner_tier: 'constitution' } },
    fusion: { layers: ['general'], triad: false, coherence: 0.8 },
    ecosystem: { runtime: { executor: 'canonical' }, mcp: { attached_tools: [] }, packages: { imports: [] } }
  };
}

console.log('\n\x1b[36m═══ Canonical Audit Rotation ═══\x1b[0m\n');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-audit-rotate-'));
const auditDir = path.join(tmpDir, 'canonical');
fs.mkdirSync(auditDir, { recursive: true });
const auditFile = path.join(auditDir, 'audit.jsonl');

const noRotate = rotateCanonicalAuditIfNeeded(auditFile, { audit: { maxLines: 10, maxBytes: 999999, rotateKeep: 2 } });
assert(noRotate.rotated === false, 'empty audit file does not rotate');

for (let i = 0; i < 4; i += 1) {
  fs.appendFileSync(auditFile, `${JSON.stringify(buildCanonicalAuditEntry(sampleReport(i)))}\n`, 'utf8');
}

const skipped = rotateCanonicalAuditIfNeeded(auditFile, { audit: { maxLines: 10, maxBytes: 999999, rotateKeep: 2 } });
assert(skipped.rotated === false, 'under maxLines threshold does not rotate');

const rotated = rotateCanonicalAuditIfNeeded(auditFile, { audit: { maxLines: 2, maxBytes: 999999, rotateKeep: 2 } });
assert(rotated.rotated === true, 'over maxLines triggers rotation');
assert(!fs.existsSync(auditFile), 'active audit file renamed after rotation');
assert(fs.existsSync(path.join(auditDir, 'audit.jsonl.1')), 'rotated archive audit.jsonl.1 exists');

const archives = listAuditArchiveFiles(auditDir);
assert(archives.includes('audit.jsonl.1'), 'listAuditArchiveFiles includes rotated archive');

const appended = appendCanonicalAudit(sampleReport(9), {
  canonical_audit_dir: auditDir,
  audit: { maxLines: 2, maxBytes: 999999, rotateKeep: 2 }
});
assert(appended === auditFile, 'appendCanonicalAudit returns audit file path');
assert(fs.existsSync(auditFile), 'append recreates active audit file after rotation');

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
