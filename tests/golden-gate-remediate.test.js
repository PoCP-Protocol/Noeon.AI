'use strict';

const fs = require('fs');
const path = require('path');
const {
  runGoldenGateRemediate,
  remediateProgram,
  REMEDIATE_CI_SCHEMA,
  buildRemediatePrBody
} = require('../scripts/golden-gate-remediate');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 5 — Golden Gate CI Remediate ═══\x1b[0m\n');

(async () => {
  assert(REMEDIATE_CI_SCHEMA === 'noeon.golden.remediate/v1', 'remediate CI schema');

  const root = path.join(__dirname, '..');
  const helloSpec = { file: 'examples/hello.noeon', minGrade: 'B' };

  const entry = await remediateProgram(helloSpec, root, {
    max_rounds: 1,
    outDir: path.join(root, 'artifacts/golden-gate/remediated-test')
  });

  assert(entry.suggestedSource != null, 'remediateProgram produces source');
  assert(entry.artifactPath != null, 'artifact path set');
  assert(fs.existsSync(path.join(root, entry.artifactPath)), 'artifact file exists');
  assert(entry.staticLens?.delta > 0, 'static lens delta positive');
  assert(entry.verify != null, 'golden verify after remediate');

  const payload = await runGoldenGateRemediate({
    root,
    forceFiles: ['examples/hello.noeon'],
    max_rounds: 1
  });

  assert(payload.summary.attempted === 1, 'force remediate one file');
  assert(payload.summary.improved >= 1, 'improved count');
  assert(fs.existsSync(path.join(root, 'artifacts/golden-gate/remediate.manifest.json')), 'manifest written');

  const body = buildRemediatePrBody(payload);
  assert(body.includes('Auto-Remediate'), 'PR body template');

  const skip = await runGoldenGateRemediate({
    root,
    gatePayload: { ok: true, programs: [{ file: 'examples/ai_native_copilot.noeon', ok: true }] }
  });
  assert(skip.skipped === true, 'skips when gate passed');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
