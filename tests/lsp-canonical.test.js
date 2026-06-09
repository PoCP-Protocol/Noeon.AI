'use strict';

const fs = require('fs');
const path = require('path');
const {
  getArchitectureSummary,
  buildArchitectureViewModel,
  buildBrainApiPayload,
  buildCanonicalPlanSummary,
  getHover,
  HOVER_DOCS
} = require('../language-server/noeon-service');
const { planNoeonProgram, parseNoeonInput } = require('../src/core/pipeline');

const parityDir = path.join(__dirname, '../examples/parity');
const agentFile = path.join(__dirname, '../examples/agent_research.noeon');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ LSP — Canonical Semantic Summary ═══\x1b[0m\n');

assert(typeof buildCanonicalPlanSummary === 'function', 'buildCanonicalPlanSummary exported');
assert(HOVER_DOCS.PROFILE?.includes('Canonical'), 'PROFILE hover references canonical IR');

for (const file of ['risk_assess.noeon', 'risk_assess.next', 'risk_assess.ael', 'risk_assess.lim']) {
  const filePath = path.join(parityDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  const summary = getArchitectureSummary(source, filePath);

  assert(summary.canonical?.schema === 'noeon.canonical.summary/v1', `${file} LSP canonical summary`);
  assert(summary.canonical?.ir_first === true, `${file} LSP ir_first`);
  assert(summary.canonical?.engine === 'canonical', `${file} LSP canonical engine`);
  assert(summary.canonical?.goal === 'Assess market risk with evidence', `${file} LSP goal`);
}

const agentSource = fs.readFileSync(agentFile, 'utf8');
const agentView = buildArchitectureViewModel(agentSource, agentFile);
assert(agentView.canonical?.surface === 'general', 'agent view model canonical surface');
assert(agentView.canonical?.routeLabel, 'agent view model route label');

const brain = buildBrainApiPayload(agentSource, agentFile);
assert(brain.canonical?.surface === 'general', 'brain API payload includes canonical');
assert(brain.canonical?.goal, 'brain API payload includes goal');

const { ast } = parseNoeonInput(fs.readFileSync(path.join(parityDir, 'risk_assess.next'), 'utf8'), {
  filename: path.join(parityDir, 'risk_assess.next')
});
const plan = planNoeonProgram(ast, { filename: path.join(parityDir, 'risk_assess.next') });
const built = buildCanonicalPlanSummary(plan);
assert(built?.governance?.winner_tier === 'constitution', 'next plan governance tier in summary');

const profileHover = getHover('PROFILE "general"\n', 0, 8, 'test.noeon');
assert(profileHover?.doc?.includes('Canonical'), 'getHover PROFILE documents canonical lowering');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
