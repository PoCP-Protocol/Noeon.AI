'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runNoeonPipeline } = require('../src/core/pipeline');
const { loadWorldModelMemory } = require('../src/core/cognitive-memory-store');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Cognitive Integration (predict · causal · dual · memory) ═══\x1b[0m\n');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-mem-'));
  const memOpts = { memory_dir: tmp, persistMemory: true, agent_id: 'hello_world' };

  const helloFile = path.join(__dirname, '../examples/hello.noeon');
  const run1 = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true,
    memory_dir: tmp,
    persistMemory: true,
    agent_id: 'hello_world'
  });

  const wm1 = run1.report?.worldModel;
  assert(wm1?.graph?.causalLinks >= 1, 'hello run builds causal links in knowledge graph');
  assert(wm1?.causalInsights?.length >= 0, 'causal insights array present after reflect');

  const reasonArtifact = run1.report?.cognitiveEvidence?.artifacts?.find((a) => a.phase === 'reason');
  assert(
    reasonArtifact?.evidence?.some((e) => e.source === 'system1' || e.source === 'system2' || e.source === 'inference'),
    'dual-process or deterministic reason produces evidence'
  );

  assert(fs.existsSync(path.join(tmp, 'hello_world', 'world-model.json')), 'persisted world model to disk');

  const run2 = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true,
    memory_dir: tmp,
    persistMemory: true,
    agent_id: 'hello_world'
  });
  const recalled = run2.report?.worldModel?.revisions?.some((r) => r.op === 'memory_recall');
  assert(recalled === true, 'second run recalls prior beliefs from memory store');

  const prior = loadWorldModelMemory({ memory_dir: tmp, agent_id: 'hello_world' });
  assert(prior?.worldModel?.beliefs?.length >= 2, 'memory file stores beliefs');

  const predictFile = path.join(__dirname, '../examples/cognitive_agent_demo.ael');
  if (fs.existsSync(predictFile)) {
    const predRun = await runNoeonPipeline(predictFile, {
      filename: predictFile,
      with_protocol: 'auto',
      quiet: true
    });
    const predWm = predRun.report?.worldModel;
    assert(
      (predWm?.predictionErrors?.length || predWm?.revisions?.some((r) => r.op === 'predict')) ?? false,
      'predict-enabled program records predictions or errors'
    );
  } else {
    assert(true, 'predict demo skipped (file missing)');
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  failed += 1;
  console.error(error);
  process.exit(1);
});
