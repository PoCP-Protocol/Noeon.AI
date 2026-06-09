'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { governanceFingerprint } = require('../src/core/canonical-governance');
const { validateCanonicalReport, REPORT_SCHEMA } = require('../src/core/canonical-contract');
const { executeProgram } = require('../src/vm/unified-executor');
const { runNoeonPipeline } = require('../src/core/pipeline');

const PARITY_GOAL = 'Assess market risk with evidence';
const parityDir = path.join(__dirname, '../examples/parity');
const surfaces = ['risk_assess.noeon', 'risk_assess.next', 'risk_assess.ael', 'risk_assess.lim'];

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Phase E — Observability & Governance Parity ═══\x1b[0m\n');

assert(typeof validateCanonicalReport === 'function', 'validateCanonicalReport exported');
assert(REPORT_SCHEMA === 'noeon.canonical.report/v1', 'report schema constant');

(async () => {
  const memDir = path.join(__dirname, '../artifacts/canonical-observability-mem');
  const auditDir = path.join(__dirname, '../artifacts/canonical-observability-audit');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });
  if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

  const fingerprints = [];

  for (const file of surfaces) {
    const filePath = path.join(parityDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const ast = parseAel(source, { filename: filePath });

    const prep = prepareCanonicalExecution(ast, { filename: filePath });
    fingerprints.push({ file, fp: governanceFingerprint(prep.governance) });

    const run = await executeProgram(ast, {
      quiet: true,
      with_protocol: 'off',
      filename: filePath,
      field_memory_dir: memDir,
      canonical_audit: true,
      canonical_audit_dir: auditDir,
      triad: false
    });

    const contract = validateCanonicalReport(run.report);
    assert(contract.valid, `${file} report satisfies canonical contract (${contract.missing.join(', ') || 'ok'})`);
    assert(run.report?.schema === REPORT_SCHEMA, `${file} report schema`);
    assert(run.report?.intent?.goal === PARITY_GOAL, `${file} report intent.goal`);
    assert(run.report?.execution?.phases?.includes('canonical'), `${file} report phases include canonical`);
    assert(run.irFirst === true, `${file} irFirst`);
    assert(run.executor === 'canonical', `${file} canonical executor`);
    assert(run.canonicalAuditPath && fs.existsSync(run.canonicalAuditPath), `${file} writes canonical audit`);

    const pipeline = await runNoeonPipeline(source, {
      filename: filePath,
      quiet: true,
      with_protocol: 'off',
      field_memory_dir: memDir,
      triad: false
    });
    const pipelineContract = validateCanonicalReport(pipeline.report);
    assert(pipelineContract.valid, `${file} pipeline report contract`);
    assert(pipeline.report?.intent?.goal === PARITY_GOAL, `${file} pipeline goal parity`);
  }

  for (const entry of fingerprints) {
    const run2 = prepareCanonicalExecution(
      parseAel(fs.readFileSync(path.join(parityDir, entry.file), 'utf8'), { filename: entry.file }),
      { filename: path.join(parityDir, entry.file) }
    );
    const fp2 = governanceFingerprint(run2.governance);
    assert(JSON.stringify(fp2) === JSON.stringify(entry.fp), `${entry.file} governance fingerprint is deterministic`);
  }

  assert(fingerprints.every((e) => e.fp.precedence?.length >= 0), 'all surfaces produce governance precedence');

  const goals = new Set(
    fingerprints.map((_, i) => {
      const prep = prepareCanonicalExecution(
        parseAel(fs.readFileSync(path.join(parityDir, surfaces[i]), 'utf8'), { filename: surfaces[i] }),
        { filename: path.join(parityDir, surfaces[i]) }
      );
      return prep.canonical.intent.goal;
    })
  );
  assert(goals.size === 1 && goals.has(PARITY_GOAL), 'all parity surfaces share unified intent.goal');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
