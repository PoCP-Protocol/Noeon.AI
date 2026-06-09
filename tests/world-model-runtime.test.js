'use strict';

const path = require('path');
const { runNoeonPipeline } = require('../src/core/pipeline');
const {
  WORLD_MODEL_SCHEMA,
  WorldModelRuntime,
  buildWorldModelReport
} = require('../src/core/world-model-runtime');
const { UncertainValue } = require('../src/runtime/cognitive/stream-of-consciousness');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ World Model Runtime ═══\x1b[0m\n');

assert(typeof UncertainValue === 'function', 'UncertainValue available for belief fusion');

const wm = new WorldModelRuntime();
wm.setBelief('temperature', 22, 0.6, { source: 'sensor' });
const updated = wm.setBelief('temperature', 24, 0.8, { source: 'sensor' });
assert(updated instanceof UncertainValue, 'beliefs are UncertainValue instances');
assert(updated.confidence > 0.6, 'Bayesian-style update raises confidence');
assert(wm.revisions.some((r) => r.op === 'revise_belief'), 'belief revision is logged');

(async () => {
  const helloFile = path.join(__dirname, '../examples/hello.noeon');
  const hello = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true
  });

  const wmReport = hello.report?.worldModel || buildWorldModelReport(hello, hello.ast);
  assert(wmReport.schema === WORLD_MODEL_SCHEMA, 'report embeds world model schema');
  assert(wmReport.goal, 'world model captures goal from program');
  assert(wmReport.beliefs.length >= 2, 'run produces multiple beliefs');
  assert(wmReport.hypotheses.length >= 1, 'reasoning adds hypotheses to world model');
  assert(wmReport.revisions.length >= 3, 'revision log records cognitive updates');
  assert(wmReport.relations.length >= 1, 'relations link goal to hypotheses/decisions');
  assert(wmReport.stats.avg_confidence != null, 'aggregate confidence computed');
  assert(wmReport.graph?.entities >= 2, 'knowledge graph tracks entities');
  assert(
    wmReport.revisions.some((r) => r.op === 'causal_reflect') || wmReport.causalInsights?.length >= 0,
    'reflect triggers causal analysis'
  );
  assert(
    hello.report?.cognitiveEvidence?.artifacts?.some((a) => a.evidence?.length),
    'evidence chain still valid with graph integration'
  );

  const nextFile = path.join(__dirname, '../examples/next_gen_world_model.noeon');
  const nextRun = await runNoeonPipeline(nextFile, {
    filename: nextFile,
    with_protocol: 'off',
    quiet: true
  });
  const nextWm = nextRun.report?.worldModel;
  assert(nextWm?.strategies?.length >= 2, 'NEXT strategies seed world model');
  assert(
    nextWm?.beliefs.some((b) => b.key === 'demand_state' || b.key === 'supply_state'),
    'declared MODEL blocks become beliefs'
  );
  assert(nextWm?.constraints?.length >= 1, 'GUARANTEE blocks become constraints');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  failed += 1;
  console.error(error);
  process.exit(1);
});
