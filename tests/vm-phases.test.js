'use strict';

const { PHASE, regionsForPhase, buildPipelinePhaseEntries, ALL_PIPELINE_PHASES } = require('../src/vm/phases');
const { PIPELINE_PHASE_TO_REGIONS } = require('../src/core/cognitive-architecture');

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

console.log('\n\x1b[36m═══ VM Execution Phases ═══\x1b[0m\n');

assert(PHASE.COGNITIVE === 'cognitive', 'PHASE.COGNITIVE constant');
assert(ALL_PIPELINE_PHASES.includes(PHASE.CONSCIOUSNESS), 'consciousness in phase registry');
assert(regionsForPhase(PHASE.ALIGNMENT).includes('amygdala'), 'alignment maps to amygdala');
assert(regionsForPhase('unknown').includes('thalamus'), 'unknown phase defaults to thalamus');

const entries = buildPipelinePhaseEntries([PHASE.CANONICAL, PHASE.COGNITIVE]);
assert(entries.length === 2 && entries[0].phase === PHASE.CANONICAL, 'buildPipelinePhaseEntries');
assert(entries[1].regions.includes('motor_cortex'), 'cognitive phase regions');

assert(
  PIPELINE_PHASE_TO_REGIONS[PHASE.PROTOCOL]?.includes('prefrontal_cortex'),
  'cognitive-architecture re-exports phase map'
);

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
