'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { prepareCanonicalExecution, finalizeCanonicalResult } = require('../src/core/canonical-runtime');
const { REPORT_SCHEMA } = require('../src/core/canonical-report');
const { planExecutionPhases } = require('../src/core/canonical-plan');
const { executeProgram } = require('../src/vm/unified-executor');

const parityDir = path.join(__dirname, '../examples/parity');
const auditDir = path.join(__dirname, '../artifacts/canonical-phase-b');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Canonical IR — Phase B Dual-Track Runtime ═══\x1b[0m\n');

(async () => {
  if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
  const auditFile = path.join(auditDir, 'audit.jsonl');
  if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);

  const noeonPath = path.join(parityDir, 'risk_assess.noeon');
  const source = fs.readFileSync(noeonPath, 'utf8');
  const ast = parseAel(source, { filename: noeonPath });
  const prep = prepareCanonicalExecution(ast, { filename: noeonPath });

  assert(prep.plan?.engine === 'canonical', 'planExecutionPhases marks canonical engine');
  assert(ast.cognition?.context?._canonical?.surface === 'general', 'hydrate injects _canonical context');
  assert(prep.plan?.governance_tier != null || prep.governance?.winner, 'plan receives governance tier');

  const plan = planExecutionPhases(prep.canonical, { with_protocol: 'off' });
  assert(plan.cognitive === true, 'general parity plan runs cognitive');
  assert(plan.protocol === false, 'with_protocol off skips protocol in plan');

  const memDir = path.join(auditDir, 'mem');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  const run = await executeProgram(parseAel(source), {
    quiet: true,
    with_protocol: 'off',
    filename: noeonPath,
    field_memory_dir: memDir,
    canonical_audit_dir: auditDir
  });

  assert(run.executionPlan?.engine === 'canonical', 'executor attaches canonical executionPlan');
  assert(run.report?.schema === REPORT_SCHEMA, 'executor emits unified report schema');
  assert(run.unifiedReport?.schema === REPORT_SCHEMA, 'unifiedReport alias present');
  assert(Array.isArray(run.report.execution?.phases), 'report includes execution phases');
  assert(run.report.execution.phases.includes('canonical'), 'report phases include canonical');
  assert(run.report.governance?.fingerprint != null, 'report carries governance fingerprint');
  assert(run.canonicalAuditPath === auditFile, 'audit path returned');
  assert(fs.existsSync(auditFile), 'audit.jsonl written');

  const auditLine = fs.readFileSync(auditFile, 'utf8').trim().split('\n').pop();
  const auditEntry = JSON.parse(auditLine);
  assert(auditEntry.schema === 'noeon.canonical.audit/v1', 'audit entry schema');
  assert(auditEntry.surface === 'general', 'audit entry surface');

  const stubResult = { success: false, blocked: true, phases: ['canonical'], governance: { valid: false } };
  finalizeCanonicalResult(stubResult, ast, prep, { canonical_audit_dir: auditDir, filename: noeonPath });
  assert(stubResult.report?.blocked === true, 'finalize attaches report on blocked stub');

  const limPath = path.join(parityDir, 'risk_assess.lim');
  if (fs.existsSync(limPath)) {
    const limAst = parseAel(fs.readFileSync(limPath, 'utf8'), { filename: limPath });
    const limPrep = prepareCanonicalExecution(limAst, { filename: limPath });
    assert(limPrep.plan?.alignment_gate === true, 'liminal parity enables alignment gate in plan');

    const limRun = await executeProgram(limAst, {
      quiet: true,
      with_protocol: 'off',
      filename: limPath,
      canonical_audit_dir: auditDir
    });
    assert(limRun.report?.schema === REPORT_SCHEMA, 'liminal run emits report');
    assert(
      limRun.phases.includes('alignment') || limRun.phases.includes('canonical'),
      'liminal run records alignment or canonical phase'
    );
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
