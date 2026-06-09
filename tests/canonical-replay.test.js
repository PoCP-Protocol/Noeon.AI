'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runNoeonPipeline } = require('../src/core/pipeline');
const { replayLastForFile, replayById } = require('../src/core/canonical-replay');
const { buildEffectReport } = require('../src/core/cognitive-effect');
const { loadExecutionTranscript } = require('../src/core/execution-transcript');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Canonical Replay & Effects ═══\x1b[0m\n');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-replay-'));
  const helloFile = path.resolve(__dirname, '../examples/hello.noeon');

  const run = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true,
    canonical_audit_dir: tmp
  });

  assert(run.executionTranscript?.id || run.result?.executionTranscript?.id, 'run saves execution transcript');
  assert(run.report?.transcriptMeta?.replay_fingerprint, 'report embeds replay fingerprint');
  assert(run.report?.effects?.schema === 'noeon.cognitive.effects/v1', 'report includes effect classification');
  assert(run.report?.effectsValid === true, 'hello effects within declared bounds');
  assert(Array.isArray(run.report?.effects?.runtime), 'runtime effects listed');

  const effects = buildEffectReport(run.ast, run.result || run);
  assert(effects.declared.includes('ai'), 'declared effects include ai');
  assert(effects.declared.includes('io'), 'hello greet act classified as io');

  const replay = await replayLastForFile(helloFile, { dir: tmp, save_replay: false });
  assert(replay.match === true, 'replay matches original transcript fingerprint');
  assert(replay.diffs?.length === 0, 'no replay diffs on unchanged source');

  const tid = run.executionTranscript?.id || run.result?.executionTranscript?.id;
  const stored = loadExecutionTranscript(tid, { canonical_audit_dir: tmp });
  assert(stored?.schema === 'noeon.execution.transcript/v1', 'transcript file readable');

  const replayByIdResult = await replayById(tid, { dir: tmp, save_replay: false });
  assert(replayByIdResult.match === true, 'replay by id matches');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  failed += 1;
  console.error(error);
  process.exit(1);
});
