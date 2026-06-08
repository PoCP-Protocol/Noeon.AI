'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { lowerToCanonical } = require('../src/core/canonical-lower');
const { arbitrateGovernance, governanceFingerprint } = require('../src/core/canonical-governance');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { executeProgram } = require('../src/vm/unified-executor');

const PARITY_GOAL = 'Assess market risk with evidence';
const parityDir = path.join(__dirname, '../examples/parity');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Canonical IR — Deep Fusion Parity ═══\x1b[0m\n');

const surfaces = [
  { name: 'general', file: 'risk_assess.noeon', capability: 'general' },
  { name: 'next', file: 'risk_assess.next', capability: 'next' },
  { name: 'ael', file: 'risk_assess.ael', capability: 'ael' },
  { name: 'liminal', file: 'risk_assess.lim', capability: 'liminal' }
];

const canonicals = [];
const arbitrations = [];

for (const s of surfaces) {
  const filePath = path.join(parityDir, s.file);
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parseAel(source, { filename: filePath });
  const prep = prepareCanonicalExecution(ast, { filename: filePath });

  canonicals.push(prep);
  arbitrations.push(prep.governance);

  assert(prep.canonical.intent.goal === PARITY_GOAL, `${s.name} lowers intent.goal`);
  assert(prep.canonical.capabilities[s.capability] === true, `${s.name} marks capability flag`);
  assert(prep.snapshot.goal === PARITY_GOAL, `${s.name} snapshot goal`);
}

assert(arbitrations[1].winner?.tier === 'constitution', 'next parity winner is constitution tier');
assert(arbitrations[3].winner?.tier === 'constitution', 'liminal covenant never maps to constitution tier');

const fp1 = governanceFingerprint(arbitrations[1]);
assert(fp1.precedence[0] === 'constitution', 'next precedence starts with constitution');

assert(canonicals[0].canonical.agents.length === 1, 'general lowers agent');
assert(canonicals[1].canonical.governance.constitutions.length >= 1, 'next lowers constitution');
assert(canonicals[2].canonical.execution.budget === '1000 msat' || canonicals[2].canonical.execution.budget === 1000, 'ael lowers budget');
assert(canonicals[3].canonical.alignment.beliefs.length >= 1, 'liminal lowers beliefs');

(async () => {
  const memDir = path.join(__dirname, '../artifacts/canonical-parity-mem');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  const run = await executeProgram(parseAel(fs.readFileSync(path.join(parityDir, 'risk_assess.noeon'), 'utf8')), {
    quiet: true,
    with_protocol: 'off',
    filename: path.join(parityDir, 'risk_assess.noeon'),
    field_memory_dir: memDir
  });

  assert(run.phases.includes('canonical'), 'executor includes canonical phase');
  assert(run.canonical?.intent?.goal === PARITY_GOAL, 'executor attaches canonical IR');
  assert(run.governanceArbitration?.model?.includes('constitution'), 'executor attaches governance arbitration');
  assert(run.report?.schema === 'noeon.canonical.report/v1', 'executor emits unified report');
  assert(run.executionPlan?.engine === 'canonical', 'executor uses canonical execution plan');

  const triadPath = path.join(__dirname, '../examples/fusion_triad.noeon');
  if (fs.existsSync(triadPath)) {
    const triadAst = parseAel(fs.readFileSync(triadPath, 'utf8'));
    const triadCanon = lowerToCanonical(triadAst, { filename: triadPath });
    assert(triadCanon.fusion.triad === true, 'fusion_triad lowers triad fusion flag');
    assert(triadCanon.fusion.layers.includes('next'), 'triad canonical includes next layer');
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
