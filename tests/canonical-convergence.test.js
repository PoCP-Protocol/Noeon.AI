'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const {
  loadConvergenceFromDir,
  pairConvergence,
  MATRIX_SCHEMA,
  DEFAULT_PARITY
} = require('../src/core/canonical-convergence');
const { computeSemanticPulse } = require('../src/core/canonical-pulse');
const { deriveExecutionRoute, routePhaseLabel } = require('../src/core/canonical-route');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { executeProgram } = require('../src/vm/unified-executor');
const { detectProfile } = require('../src/core/profile');

const parityDir = path.join(__dirname, '../examples/parity');
const PARITY_GOAL = 'Assess market risk with evidence';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Semantic Convergence + Phase C Route ═══\x1b[0m\n');

const matrix = loadConvergenceFromDir(parityDir, DEFAULT_PARITY);

assert(matrix.schema === MATRIX_SCHEMA, 'matrix schema v1');
assert(matrix.surfaces.length === 4, 'parity loads four surfaces');
assert(matrix.coherence.unanimous_goal === true, 'parity fixtures share goal');
assert(matrix.coherence.score >= 0.5, 'parity coherence above drift threshold');
assert(matrix.pairs.length === 6, 'four surfaces yield six pairs');
assert(matrix.mermaid.includes('flowchart LR'), 'matrix includes mermaid graph');

const generalNext = matrix.pairs.find((p) =>
  (p.a === 'general' && p.b === 'next') || (p.a === 'next' && p.b === 'general')
);
assert(generalNext?.goal_match === true, 'general ↔ next goal match');
assert(generalNext?.score >= 0.5, 'general ↔ next pair score healthy');

const pulse = computeSemanticPulse(matrix);
assert(pulse.triggered === true, 'parity matrix triggers semantic pulse');
assert(['semantic_lock', 'semantic_align', 'semantic_caution', 'semantic_single'].includes(pulse.action),
  'parity pulse is non-drift action');

const noeonPath = path.join(parityDir, 'risk_assess.noeon');
const ast = parseAel(fs.readFileSync(noeonPath, 'utf8'), { filename: noeonPath });
const prep = prepareCanonicalExecution(ast, { filename: noeonPath });
const profile = detectProfile(ast);
const route = deriveExecutionRoute(prep, profile, 'full', { with_protocol: 'off' });

assert(route?.engine === 'canonical', 'deriveExecutionRoute returns canonical engine');
assert(route?.cognitive === true, 'route enables cognitive for general parity');
assert(routePhaseLabel(route).includes('canonical'), 'route phase label includes canonical');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: noeonPath
  });

  assert(run.executionRoute?.engine === 'canonical', 'executor attaches executionRoute');
  assert(run.semanticPulse?.triggered === true, 'executor emits semanticPulse');
  assert(run.report?.semantic?.pulse?.action != null, 'report embeds semantic pulse');

  const triadPath = path.join(__dirname, '../examples/fusion_triad.noeon');
  if (fs.existsSync(triadPath)) {
    const triadAst = parseAel(fs.readFileSync(triadPath, 'utf8'), { filename: triadPath });
    const triadPrep = prepareCanonicalExecution(triadAst, { filename: triadPath });
    const triadRoute = deriveExecutionRoute(triadPrep, detectProfile(triadAst), 'full', {
      with_protocol: 'off'
    });
    assert(triadRoute?.triad === true, 'triad hub route enables triad phase');
    assert(routePhaseLabel(triadRoute).includes('triad'), 'triad route label');
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
