'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { SURFACES, CORE_SURFACE, resolveIntentGoal } = require('../src/core/surfaces');
const { detectSurface } = require('../src/grammar/detect');
const { lowerToCanonical } = require('../src/core/canonical-lower');
const { deriveExecutionRoute } = require('../src/core/canonical-route');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { getProfileInfo } = require('../src/core/profile');

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

console.log('\n\x1b[36m═══ Noeon Surface Unification ═══\x1b[0m\n');

assert(CORE_SURFACE === SURFACES.NEXT, 'CORE_SURFACE is next');
assert(getProfileInfo(SURFACES.NEXT).role === 'core', 'Next surface role is core');
assert(getProfileInfo(SURFACES.GENERAL).role === 'authoring', 'General surface role is authoring');
assert(getProfileInfo(SURFACES.LIMINAL).role === 'alignment', 'Liminal surface role is alignment');

const parityDir = path.join(__dirname, '../examples/parity');
const PARITY_GOAL = 'Assess market risk with evidence';

for (const [file, surface] of [
  ['risk_assess.noeon', SURFACES.GENERAL],
  ['risk_assess.next', SURFACES.NEXT],
  ['risk_assess.ael', SURFACES.AEL],
  ['risk_assess.lim', SURFACES.LIMINAL]
]) {
  const filePath = path.join(parityDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  assert(detectSurface(source, { filename: filePath }) === surface, `detectSurface ${file}`);
  const ast = parseAel(source, { filename: filePath });
  assert(resolveIntentGoal(ast) === PARITY_GOAL, `resolveIntentGoal ${file}`);
  const canonical = lowerToCanonical(ast, { filename: filePath });
  assert(canonical.intent.goal === PARITY_GOAL, `canonical intent.goal ${file}`);
}

const agentSource = fs.readFileSync(path.join(__dirname, '../examples/agent_research.noeon'), 'utf8');
assert(detectSurface(agentSource, { filename: 'agent_research.noeon' }) === SURFACES.GENERAL, 'AGENT .noeon detects as general');
const agentAst = parseAel(agentSource, { filename: 'agent_research.noeon' });
assert(agentAst.detectedSurface === SURFACES.GENERAL, 'AGENT parse sets detectedSurface');

const fusionPath = path.join(__dirname, '../examples/fusion_triad.noeon');
if (fs.existsSync(fusionPath)) {
  const prep = prepareCanonicalExecution(parseAel(fs.readFileSync(fusionPath, 'utf8'), { filename: fusionPath }), {
    filename: fusionPath
  });
  const route = deriveExecutionRoute(prep, 'general', 'cognitive', {});
  assert(route.engine === 'canonical', 'fusion triad uses canonical route');
  assert(route.core_surface === SURFACES.NEXT, 'route declares next as core surface');
  assert(Array.isArray(route.fusion_layers), 'route exposes fusion_layers');
}

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
