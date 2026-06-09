'use strict';

const { formatArchitectureLines } = require('../src/core/architecture-view');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Architecture View Formatter ═══\x1b[0m\n');

const sample = {
  routeLabel: 'general → cognitive',
  compileMode: 'canonical-primary',
  primaryIr: 'canonical',
  canonicalPrimary: true,
  canonicalSource: 'general.lower.snapshot',
  executionDriver: 'snapshot-primary',
  snapshotActCount: 1,
  actDriver: 'canonical.execution.acts',
  snapshotActExecution: true,
  era: 'canonical-primary-era',
  stack: { core: 'next', surfaces: ['general'] },
  cognitiveCycle: [{ phase: 'PERCEIVE' }, { phase: 'ACT' }],
  architecture: {
    active_regions: ['sensory_cortex', 'motor_cortex'],
    pipeline_phases: [
      { phase: 'parse', regions: ['thalamus'] },
      { phase: 'execute', regions: ['motor_cortex'] }
    ],
    agent_flows: [
      { name: 'demo', steps: [{ kind: 'act', region: 'motor_cortex' }] }
    ]
  }
};

const lines = formatArchitectureLines(sample);
const text = lines.join('\n');

assert(text.includes('route: general → cognitive'), 'includes route');
assert(text.includes('compile: canonical-primary'), 'includes compile mode');
assert(text.includes('era: canonical-primary-era'), 'includes era line when canonicalPrimary');
assert(text.includes('driver: snapshot-primary · acts 1'), 'includes snapshot driver line');
assert(text.includes('act: canonical.execution.acts'), 'includes direct act driver line');
assert(text.includes('stack: next · general'), 'includes stack');
assert(text.includes('pipeline phases:'), 'includes pipeline phases');
assert(text.includes('parse → thalamus'), 'includes phase regions');
assert(text.includes('cognitive cycle: PERCEIVE → ACT'), 'includes cognitive cycle');
assert(text.includes('agent flows:'), 'includes agent flows');
assert(text.includes('demo: ACT→motor_cortex'), 'includes agent step summary');

const summaryLines = formatArchitectureLines({
  ...sample,
  executionSummary: {
    schema: 'noeon.execution.summary/v1',
    strategy: 'hybrid-canonical-acts',
    path: 'hybrid',
    hybrid: true,
    actDriver: 'canonical.execution.acts+kernel',
    phases: ['canonical-act', 'cognitive']
  }
});
const summaryText = summaryLines.join('\n');
assert(summaryText.includes('execution: hybrid'), 'executionSummary compact line');
assert(!summaryText.includes('driver: snapshot-primary'), 'skips legacy driver when executionSummary present');
assert(!summaryText.includes('act: canonical.execution.acts · direct'), 'skips legacy act line when executionSummary present');

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
