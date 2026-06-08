'use strict';

const path = require('path');
const {
  parseNoeonInput,
  planNoeonProgram,
  runNoeonPipeline,
  CORE_SURFACE
} = require('../src/core/pipeline');
const { dispatchParseSurface } = require('../src/grammar/parse-dispatch');
const { buildStackManifest } = require('../src/core/stack');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ Noeon Pipeline System ═══\x1b[0m\n');

assert(CORE_SURFACE === 'next', 'pipeline declares next as core');

const agentFile = path.join(__dirname, '../examples/agent_research.noeon');
const parsed = parseNoeonInput(agentFile);
assert(parsed.ast?.agents?.length === 1, 'parseNoeonInput reads agent file');
assert(parsed.ast.noeonStack?.core === 'next', 'parseNoeonInput attaches noeonStack');

const plan = planNoeonProgram(parsed.ast, { filename: agentFile, with_protocol: 'off' });
assert(plan.route?.engine === 'canonical', 'planNoeonProgram yields canonical route');
assert(plan.canonical?.intent?.goal, 'plan attaches canonical intent');
assert(plan.stack?.layers?.includes('general'), 'plan stack includes general layer');

const source = require('fs').readFileSync(agentFile, 'utf8');
const dispatched = dispatchParseSurface(source, { filename: agentFile });
assert(dispatched?.detectedSurface === 'general', 'dispatchParseSurface matches agent file');

(async () => {
  const planOnly = await runNoeonPipeline(agentFile, {
    filename: agentFile,
    plan_only: true,
    with_protocol: 'off'
  });
  assert(planOnly.result === null, 'plan_only skips execution');
  assert(planOnly.routeLabel.includes('canonical'), 'plan_only includes route label');

  const full = await runNoeonPipeline(agentFile, {
    filename: agentFile,
    with_protocol: 'off',
    quiet: true
  });
  assert(full.result?.success === true, 'runNoeonPipeline executes agent file');
  assert(full.report?.schema === 'noeon.canonical.report/v1', 'pipeline emits unified report');
  assert(full.stack?.core === buildStackManifest(full.ast).core, 'stack consistent across pipeline');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
