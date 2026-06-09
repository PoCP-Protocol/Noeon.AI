'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runNoeonPipeline } = require('../src/core/pipeline');
const {
  loadExecutionCheckpoint,
  listExecutionCheckpoints
} = require('../src/core/execution-checkpoint');
const { resumeFromCheckpoint } = require('../src/core/canonical-checkpoint');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Execution Checkpoint & Resume ═══\x1b[0m\n');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-cp-'));
  const helloFile = path.join(__dirname, '../examples/hello.noeon');

  const run1 = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true,
    dir: tmp,
    canonical_audit_dir: tmp
  });

  const cpMeta = run1.report?.checkpointMeta || run1.result?.executionCheckpoint;
  assert(cpMeta?.id, 'run saves checkpoint meta');
  assert(fs.existsSync(path.join(tmp, 'checkpoints', `${cpMeta.id}.json`)), 'checkpoint file on disk');

  const loaded = loadExecutionCheckpoint(cpMeta.id, { dir: tmp });
  assert(loaded?.schema === 'noeon.execution.checkpoint/v1', 'checkpoint schema');
  assert(loaded?.worldModel?.beliefs?.length >= 1, 'checkpoint stores world model');
  assert(loaded?.resumable === true, 'checkpoint marked resumable');

  const list = listExecutionCheckpoints({ dir: tmp });
  assert(list.length >= 1, 'checkpoint list non-empty');

  const resumed = await resumeFromCheckpoint(cpMeta.id, {
    dir: tmp,
    quiet: true,
    with_protocol: 'off'
  });
  assert(resumed.schema === 'noeon.canonical.resume/v1', 'resume payload schema');
  assert(resumed.success === true, 'resume run succeeds');
  const recall = resumed.worldModel?.revisions?.some((r) => r.op === 'checkpoint_resume');
  assert(recall === true, 'resume merges prior checkpoint into world model');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
