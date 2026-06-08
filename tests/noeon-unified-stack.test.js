'use strict';

const fs = require('fs');
const path = require('path');
const { parseNoeonSource } = require('../src/grammar');
const { parseAel } = require('../src/parser');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { executeProgram } = require('../src/vm/unified-executor');
const { CORE_SURFACE, buildStackManifest } = require('../src/core/noeon-unified');

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

console.log('\n\x1b[36m═══ Noeon Unified Stack Integration ═══\x1b[0m\n');

assert(CORE_SURFACE === 'next', 'stack core is next');

const agentPath = path.join(__dirname, '../examples/agent_research.noeon');
const agentAst = parseNoeonSource(fs.readFileSync(agentPath, 'utf8'), { filename: agentPath });
assert(agentAst?.agents?.length === 1, 'parseNoeonSource parses AGENT file');
assert(agentAst.next?.goal?.text, 'agent syncs goal to next.goal');
assert(agentAst.noeonStack?.core === 'next', 'noeonStack declares next core');
assert(agentAst.noeonStack?.capabilities?.general === true, 'noeonStack marks general capability');

const fieldPath = path.join(__dirname, '../examples/agent_field.noeon');
if (fs.existsSync(fieldPath)) {
  const fieldAst = parseAel(fs.readFileSync(fieldPath, 'utf8'), { filename: fieldPath });
  const prep = prepareCanonicalExecution(fieldAst, { filename: fieldPath });
  assert(prep.canonical.fusion.layers.includes('next'), 'agent_field fusion lowers next layer');
  assert(prep.canonical.fusion.layers.includes('liminal'), 'agent_field fusion lowers liminal layer');
  assert(prep.canonical.capabilities.next === true, 'fusion enables next capability flag');
  assert(fieldAst.noeonStack?.layers?.includes('next'), 'hydrated stack includes next layer');
}

const nextPath = path.join(__dirname, '../examples/parity/risk_assess.next');
const nextAst = parseNoeonSource(fs.readFileSync(nextPath, 'utf8'), { filename: nextPath });
assert(nextAst.next?.goal?.text, 'next surface has goal.text');
assert(buildStackManifest(nextAst).capabilities.next === true, 'next manifest capability');

(async () => {
  const run = await executeProgram(agentAst, {
    quiet: true,
    with_protocol: 'off',
    filename: agentPath
  });
  assert(run.noeonStack || run.canonical, 'executor result ties to unified stack');
  assert(run.report?.schema === 'noeon.canonical.report/v1', 'unified report emitted');
  assert(Array.isArray(run.phases), 'phases recorded');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
