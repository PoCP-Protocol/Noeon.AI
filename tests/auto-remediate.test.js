'use strict';

const fs = require('fs');
const path = require('path');
const {
  runAutoRemediate,
  REMEDIATE_SCHEMA,
  formatAutoRemediateText,
  writeRemediatedSource,
  evaluateSource
} = require('../src/core/auto-remediate');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 4 — Auto-Remediate Closed Loop ═══\x1b[0m\n');

const helloPath = path.join(__dirname, '../examples/hello.noeon');
const original = fs.readFileSync(helloPath, 'utf8');

(async () => {
  assert(REMEDIATE_SCHEMA === 'noeon.auto.remediate/v1', 'remediate schema');

  const payload = await runAutoRemediate(helloPath, {
    filename: helloPath,
    min_grade: 'B',
    max_rounds: 1
  });

  assert(payload.rounds.length >= 1, 'at least 1 round for hello');
  assert(payload.suggestedSource != null, 'suggestedSource produced');
  assert(payload.suggestedSource !== original, 'patch merged');
  assert(payload.suggestedSource.includes('require_citation') || payload.suggestedSource.length > original.length, 'epistemic patch present');

  const beforeEval = await evaluateSource(original, helloPath, { run: false });
  const afterEval = await evaluateSource(payload.suggestedSource, helloPath, { run: false });
  assert(afterEval.lens.score > beforeEval.lens.score, `static lens improves (${beforeEval.lens.score}→${afterEval.lens.score})`);
  assert(payload.improved || payload.remediated || payload.verdict === 'grade_met' || afterEval.lens.score > beforeEval.lens.score, 'hello remediate outcome');

  const tmpOut = path.join(__dirname, '../artifacts/auto-remediate/hello.patched.noeon');
  fs.mkdirSync(path.dirname(tmpOut), { recursive: true });
  const write = writeRemediatedSource(payload, tmpOut);
  assert(write.written === true, 'writeRemediatedSource');

  const verify = await runAutoRemediate(fs.readFileSync(tmpOut, 'utf8'), {
    filename: tmpOut,
    min_grade: 'C',
    max_rounds: 0
  });
  assert(verify.after.score >= payload.before.score, 'patched file retains lift');

  const copilotPath = path.join(__dirname, '../examples/ai_native_copilot.noeon');
  const copilot = await runAutoRemediate(copilotPath, {
    filename: copilotPath,
    min_grade: 'B',
    max_rounds: 1
  });
  assert(copilot.before.grade >= 'B' || copilot.verdict === 'remediated' || copilot.verdict === 'unchanged', 'copilot remediate stable');

  const text = formatAutoRemediateText(payload);
  assert(text.includes('Auto-Remediate'), 'format text');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
