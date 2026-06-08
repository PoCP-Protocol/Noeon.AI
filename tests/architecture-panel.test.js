'use strict';

const { buildArchitectureViewModel, mergeRuntimeIntoViewModel } = require('../language-server/noeon-service');

const source = `PROFILE "general"
AGENT "Demo"
  GOAL "test"
  FLOW
    PERCEIVE source=x modality=text
    ACT action=run channel=console
`;

const model = buildArchitectureViewModel(source, 'demo.noeon');

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

console.log('\n\x1b[36m═══ Architecture Panel / ViewModel ═══\x1b[0m\n');

assert(!model.error, 'view model parses demo agent');
assert(model.routeLabel, 'view model has route label');
assert(model.agent_flows?.length === 1, 'view model has agent flow');
assert(model.code_lenses.some((l) => l.title.includes('route:')), 'view model route lens');
assert(model.cognitive_cycle?.length >= 6, 'view model cognitive cycle');
assert(model.architectureMermaid?.includes('flowchart'), 'view model includes mermaid');

const merged = mergeRuntimeIntoViewModel(model, {
  success: true,
  phases: ['canonical', 'consciousness', 'cognitive'],
  scheduler: 'consciousness',
  architecture: {
    pipeline_phases: [
      { phase: 'canonical', regions: ['prefrontal_cortex', 'thalamus'] },
      { phase: 'cognitive', regions: ['association_cortex', 'motor_cortex'] }
    ],
    phase_regions: ['prefrontal_cortex', 'thalamus', 'association_cortex', 'motor_cortex']
  }
});
assert(merged.runtime?.phases?.length === 3, 'merged runtime phases');
assert(merged.pipeline_phases?.length === 2, 'merged pipeline phase regions');
assert(merged.architectureMermaid?.includes('pipe'), 'merged mermaid includes pipeline subgraph');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
