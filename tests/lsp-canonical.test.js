'use strict';

const fs = require('fs');
const path = require('path');
const {
  getArchitectureSummary,
  buildArchitectureViewModel,
  buildBrainApiPayload,
  buildCanonicalPlanSummary,
  getHover,
  buildExecutionPathDoc,
  getFileExecutionSummary,
  getDocumentSymbols,
  getCodeLenses,
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
assert(agentView.executionSummary?.path === 'hybrid', 'view model includes static executionSummary');
assert(agentView.pluginActs?.total === 1, 'view model includes plugin act summary');
assert(agentView.pluginActs?.unsigned === 1, 'agent_research http_call marked unsigned');

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

const agentActLine = agentSource.split('\n').findIndex((l) => l.includes('plugin=http_call'));
const actLineText = agentSource.split('\n')[agentActLine];
const actCol = actLineText.indexOf('ACT') + 3;
const actHover = getHover(agentSource, agentActLine, actCol, agentFile);
assert(actHover?.keyword === 'ACT', 'getHover ACT on plugin line');
assert(actHover?.doc?.includes('Execution path'), 'ACT hover includes execution path');
assert(actHover?.doc?.includes('hybrid-canonical-acts'), 'ACT hover includes hybrid strategy');
assert(actHover?.doc?.includes('Production signing'), 'ACT hover includes production signing hint');
assert(actHover?.doc?.includes('version=0.9.0'), 'ACT hover includes http_call version template');

const signedDemoPath = path.join(__dirname, '../examples/signed_act_demo.noeon');
const signedSource = fs.readFileSync(signedDemoPath, 'utf8');
const signedView = buildArchitectureViewModel(signedSource, signedDemoPath);
assert(signedView.pluginActs?.signed === 1, 'signed_act_demo plugin act marked signed');
const signedActLine = signedSource.split('\n').findIndex((l) => l.includes('plugin=http_call'));
const signedActHover = getHover(signedSource, signedActLine, signedSource.split('\n')[signedActLine].indexOf('ACT') + 3, signedDemoPath);
assert(signedActHover?.doc?.includes('Signed ACT'), 'signed_act_demo ACT hover marks signed');

const agentLine = agentSource.split('\n').findIndex((l) => l.trimStart().startsWith('AGENT'));
const agentHover = getHover(agentSource, agentLine, 6, agentFile);
assert(agentHover?.doc?.includes('Execution path'), 'AGENT hover includes execution path');

const execDoc = buildExecutionPathDoc(agentSource, agentFile);
assert(execDoc?.strategy === 'hybrid-canonical-acts', 'buildExecutionPathDoc resolves hybrid for agent_research');
assert(execDoc?.path === 'hybrid', 'buildExecutionPathDoc path label');

const fileExec = getFileExecutionSummary(agentSource, agentFile);
assert(fileExec?.schema === 'noeon.execution.summary/v1', 'getFileExecutionSummary schema');
assert(fileExec?.strategy === 'hybrid-canonical-acts', 'getFileExecutionSummary hybrid strategy');

const symbols = getDocumentSymbols(agentSource, agentFile);
assert(symbols[0]?.kind === 'execution', 'document symbols lead with execution path');
assert(symbols[0]?.name.includes('hybrid'), 'execution symbol names hybrid path');
assert(symbols.some((s) => s.kind === 'plugin-act' && s.name.includes('unsigned')), 'document symbol for unsigned plugin act');

const lenses = getCodeLenses(agentSource, agentFile);
assert(lenses.some((l) => l.title.includes('exec: hybrid')), 'code lens shows file execution path');
assert(lenses.some((l) => l.title.includes('unsigned ACT')), 'code lens marks unsigned plugin ACT');

const signedLenses = getCodeLenses(signedSource, signedDemoPath);
assert(signedLenses.some((l) => l.title.includes('signed ACT')), 'code lens marks signed plugin ACT');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
