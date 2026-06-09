'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { deriveExecutionRoute } = require('../src/core/canonical-route');
const { resolveCanonicalPhases } = require('../src/vm/canonical-phase-resolver');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { detectFusionPlan } = require('../src/runtime/fusion/unified-fusion');
const { executeProgram } = require('../src/vm/unified-executor');
const { detectProfile } = require('../src/core/profile');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Phase D — IR-First Canonical Execution ═══\x1b[0m\n');

const semanticPath = path.join(__dirname, '../examples/semantic_fusion.noeon');
const source = fs.readFileSync(semanticPath, 'utf8');
const ast = parseAel(source, { filename: semanticPath });
const profile = detectProfile(ast);
const prep = prepareCanonicalExecution(ast, { filename: semanticPath });
const route = deriveExecutionRoute(prep, profile, 'full', { with_protocol: 'off' });
const fusionPlan = detectFusionPlan(ast);
const irPhases = resolveCanonicalPhases(route, prep, ast, { with_protocol: 'off' }, fusionPlan);

assert(route?.ir_first === true, 'execution route marks ir_first');
assert(route?.coherence === true, 'route enables coherence from canonical');
assert(route?.relay === true, 'route enables relay from canonical');
assert(irPhases?.ir_first === true, 'phase resolver ir_first');
assert(irPhases?.coherence === true, 'phase resolver coherence');
assert(irPhases?.relay === true, 'phase resolver relay');
assert(prep.plan?.coherence === true, 'canonical plan includes coherence');
assert(prep.canonical?.fusion?.relay === true, 'canonical IR lowers relay flag');

(async () => {
  const memDir = path.join(__dirname, '../artifacts/ir-first-mem');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: semanticPath,
    field_memory_dir: memDir,
    triad: false
  });

  assert(run.irFirst === true, 'executor sets irFirst');
  assert(run.canonicalPhases?.engine === 'canonical', 'executor attaches canonicalPhases');
  assert(run.executionRoute?.ir_first === true, 'result route is IR-first');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
