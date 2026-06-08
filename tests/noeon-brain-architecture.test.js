'use strict';

const path = require('path');
const { parseNoeonInput, planNoeonProgram, runNoeonPipeline } = require('../src/core/pipeline');
const {
  regionForPrimitive,
  buildArchitectureMap,
  buildArchitectureMermaid,
  COGNITIVE_CYCLE,
  BRAIN_REGIONS
} = require('../src/core/cognitive-architecture');

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

console.log('\n\x1b[36m═══ Cognitive Architecture (Brain Map) ═══\x1b[0m\n');

assert(regionForPrimitive('PERCEIVE') === 'sensory_cortex', 'PERCEIVE → sensory_cortex');
assert(regionForPrimitive('DECIDE') === 'basal_ganglia', 'DECIDE → basal_ganglia');
assert(regionForPrimitive('REFLECT') === 'cerebellum', 'REFLECT → cerebellum');
assert(regionForPrimitive('PREDICT') === 'default_mode_network', 'PREDICT → default mode network');
assert(BRAIN_REGIONS.default_mode_network.noeon.includes('FIELD'), 'Next field maps to default mode network');
assert(COGNITIVE_CYCLE.length >= 6, 'cognitive cycle has perceive→consolidate phases');

const agentFile = path.join(__dirname, '../examples/agent_research.noeon');
const { ast } = parseNoeonInput(agentFile);
const plan = planNoeonProgram(ast, { filename: agentFile, with_protocol: 'off' });

assert(plan.architecture?.active_regions?.includes('prefrontal_cortex'), 'plan includes executive region');
assert(plan.architecture?.active_regions?.includes('sensory_cortex'), 'agent flow activates sensory cortex');
assert(plan.architecture?.agent_flows?.[0]?.steps?.[0]?.region === 'sensory_cortex', 'first FLOW step mapped');
assert(ast.noeonStack?.architecture?.executive === 'prefrontal_cortex', 'stack embeds architecture summary');
assert(buildArchitectureMermaid(plan.architecture)?.includes('flowchart LR'), 'architecture mermaid renders');

const fieldFile = path.join(__dirname, '../examples/agent_field.noeon');
if (require('fs').existsSync(fieldFile)) {
  const fieldPlan = planNoeonProgram(parseNoeonInput(fieldFile).ast, {
    filename: fieldFile,
    with_protocol: 'off'
  });
  assert(
    fieldPlan.architecture?.active_regions?.includes('corpus_callosum'),
    'fusion activates corpus callosum integration'
  );
  assert(
    fieldPlan.architecture?.active_regions?.includes('amygdala'),
    'liminal fusion activates amygdala salience'
  );
}

(async () => {
  const run = await runNoeonPipeline(agentFile, {
    filename: agentFile,
    with_protocol: 'off',
    quiet: true
  });
  assert(run.architecture?.pipeline_phases != null, 'execution attaches pipeline phase regions');
  assert(
    run.result?.consciousness?.activeRegions?.includes('thalamus') ||
      run.result?.scheduler === 'consciousness' ||
      run.result?.phases?.includes('consciousness') ||
      run.result?.phases?.includes('cognitive'),
    'consciousness phase integrates thalamus routing'
  );
  assert(run.architecture?.phase_regions?.length > 0, 'execution maps phases to brain regions');
  assert(run.architecture?.active_regions?.includes('hippocampus'), 'agent memory activates hippocampus');
  assert(run.report?.execution?.architecture?.executive === 'prefrontal_cortex', 'report embeds executive region');
  assert(run.report?.observability?.runtime_trace?.phases?.length > 0, 'report observability runtime trace');
  assert(run.report?.observability?.runtime_trace?.architecture?.pipeline_phases != null, 'runtime trace includes phase regions');
  assert(run.report?.execution?.architecture?.pipeline_phases != null, 'execution architecture includes pipeline phases');
  assert(
    run.ast?.noeonStack?.runtime?.architecture?.active_regions?.length > 0,
    'stack runtime records architecture after execution'
  );

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
