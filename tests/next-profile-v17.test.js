'use strict';

const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { executeProgram } = require('../src/vm/unified-executor');

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

console.log('\n\x1b[36m═══ Next Profile v17 Ritual Arbitration Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.7.0"',
    'PROGRAM "ritual_arbitration"',
    'GOAL "validate ritual overrides and dependencies" priority=0.9',
    'MODEL name=context source=workspace confidence=0.82',
    'STRATEGY name=ship objective=delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'RITUAL name=foundation action=ship cadence=1 mode=adaptive trigger="projected_spend <= approved_budget"',
    'RITUAL name=strict_guard action=ship cadence=1 mode=strict depends_on=foundation trigger="projected_spend <= approved_budget"',
    'RITUAL name=legacy_flow action=reflect cadence=1 mode=adaptive overrides=strict_guard trigger="projected_spend <= approved_budget"',
    'RITUAL name=dependent_only action=reflect cadence=1 mode=adaptive depends_on=missing_ritual trigger="projected_spend <= approved_budget"',
    'ACT action=ship capability=runtime.deploy budget_ms=300',
    'ACT action=reflect capability=runtime.inspect budget_ms=100',
    'REFLECT target=ship method=causal',
    'EVOLVE scope=act guard=foundation mutation=ritual-priority'
  ].join('\n');

  const ast = parseAel(source, { filename: 'ritual_arbitration.noeon' });
  const validation = validateAel(ast);
  assert(validation.valid === true, 'program validates with ritual arbitration fields');
  assert((validation.warnings || []).some((w) => w.includes("depends_on unknown ritual 'missing_ritual'")), 'validator warns on missing ritual dependency');

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100
    }
  });

  assert(run.success === true, 'execution succeeds with ritual arbitration');

  const strictGuard = (run.next?.rituals || []).find((r) => r.name === 'strict_guard');
  const legacyFlow = (run.next?.rituals || []).find((r) => r.name === 'legacy_flow');
  const dependentOnly = (run.next?.rituals || []).find((r) => r.name === 'dependent_only');

  assert(strictGuard?.status === 'overridden', 'overrides marks target ritual as overridden');
  assert(legacyFlow?.status === 'active', 'controller ritual remains active');
  assert(dependentOnly?.status === 'dependency-blocked', 'missing dependency blocks ritual');

  const ritualSummary = (run.next?.reflection?.insights || []).find((x) => x.type === 'ritual-summary') || {};
  assert(Number(ritualSummary.overridden || 0) >= 1, 'ritual summary counts overridden rituals');
  assert(Number(ritualSummary.dependencyBlocked || 0) >= 1, 'ritual summary counts dependency-blocked rituals');
  assert(run.next?.governance?.winner === 'ritual', 'governance winner becomes ritual when no higher blockers');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
