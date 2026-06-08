'use strict';

const path = require('path');
const { parseNoeonInput, planNoeonProgram, runNoeonPipeline } = require('../src/core/pipeline');
const { buildArchitectureMermaid } = require('../src/core/cognitive-architecture');
const { getArchitectureSummary, getBrainLineDecorations, getCodeLenses, buildArchitectureViewModel, resolveArchitectureRequest, buildBrainApiPayload, runPipelineRequest, mergePipelineBrainView } = require('../language-server/noeon-service');

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

console.log('\n\x1b[36m═══ Playground Pipeline Integration ═══\x1b[0m\n');

const agentFile = path.join(__dirname, '../examples/agent_research.noeon');
const source = require('fs').readFileSync(agentFile, 'utf8');

const { ast } = parseNoeonInput(source, { filename: agentFile });
assert(ast.noeonStack?.core === 'next', 'parseNoeonInput attaches Next-centric stack');

const plan = planNoeonProgram(ast, { filename: agentFile, with_protocol: 'off' });
assert(plan.architecture?.active_regions?.includes('sensory_cortex'), 'plan exposes brain regions');
assert(plan.routeLabel, 'plan exposes route label');

const mermaid = buildArchitectureMermaid(plan.architecture);
assert(typeof mermaid === 'string' && mermaid.includes('flowchart'), 'buildArchitectureMermaid renders flowchart');
assert(mermaid.includes('agent_0') || mermaid.includes('ResearchAnalyst'), 'mermaid includes agent flow subgraph');

const lspSummary = getArchitectureSummary(source, agentFile);
assert(lspSummary.active_regions?.includes('prefrontal_cortex'), 'LSP architecture summary uses pipeline');
assert(lspSummary.routeLabel, 'LSP summary includes route');

const decorations = getBrainLineDecorations(source);
assert(decorations.some((d) => d.keyword === 'PERCEIVE' && d.region === 'sensory_cortex'), 'PERCEIVE line maps to sensory cortex');
assert(decorations.some((d) => d.keyword === 'AGENT' && d.region === 'prefrontal_cortex'), 'AGENT line maps to executive');
assert(decorations.every((d) => d.color), 'decorations include colors');

const lenses = getCodeLenses(source, agentFile);
assert(lenses.some((l) => l.title.includes('route:')), 'AGENT line gets route CodeLens');
assert(lenses.some((l) => l.title.includes('cycle:')), 'FLOW line gets cycle CodeLens');
assert(lenses.some((l) => l.title.includes('perception') || l.title.includes('Perception')), 'cognitive line gets region CodeLens');

const viewModel = buildArchitectureViewModel(source, agentFile);
assert(viewModel.routeLabel, 'view model includes route');
assert(viewModel.decorations?.length > 0, 'view model includes decorations');
assert(viewModel.code_lenses?.length > 0, 'view model includes code lenses');
assert(viewModel.cognitive_cycle?.length >= 6, 'view model includes cognitive cycle');
assert(viewModel.architectureMermaid?.includes('flowchart'), 'view model exports mermaid diagram');

const lspView = resolveArchitectureRequest(source, agentFile, 'view');
assert(lspView.routeLabel === viewModel.routeLabel, 'LSP view mode matches local view model route');
assert(lspView.code_lenses?.length === viewModel.code_lenses?.length, 'LSP view mode includes code lenses');

const brainPayload = buildBrainApiPayload(source, agentFile);
assert(brainPayload.routeLabel === viewModel.routeLabel, 'brain API payload uses unified view resolver');
assert(brainPayload.code_lenses?.length > 0, 'brain API payload includes code lenses');
assert(brainPayload.regions?.length > 0, 'brain API payload includes region list');

(async () => {
  const run = await runNoeonPipeline(source, {
    filename: agentFile,
    with_protocol: 'off',
    quiet: true
  });
  assert(run.architecture?.pipeline_phases != null, 'pipeline run attaches phase regions');
  assert(run.report?.execution?.architecture?.executive === 'prefrontal_cortex', 'report includes executive region');

  const lspRun = await runPipelineRequest(source, agentFile, { with_protocol: 'off' });
  assert(lspRun.phases?.length > 0, 'LSP runPipelineRequest records phases');
  assert(lspRun.architecture?.pipeline_phases != null, 'LSP run returns architecture phases');

  const merged = mergePipelineBrainView(source, agentFile, lspRun);
  assert(merged?.runtime?.phases?.length === lspRun.phases?.length, 'mergePipelineBrainView attaches runtime');
  assert(merged?.pipeline_phases?.length > 0, 'merged view includes pipeline phase regions');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
