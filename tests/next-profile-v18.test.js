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

console.log('\n\x1b[36m═══ Next Profile v18 Ritual Conflict Determinism Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.8.0"',
    'PROGRAM "ritual_conflict_determinism"',
    'GOAL "ensure deterministic ritual override precedence" priority=0.91',
    'MODEL name=context source=workspace confidence=0.85',
    'STRATEGY name=ship objective=delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'RITUAL name=base action=ship cadence=1 mode=adaptive trigger="projected_spend <= approved_budget"',
    'RITUAL name=first_strict action=ship cadence=1 mode=strict priority=5 overrides=base trigger="projected_spend <= approved_budget"',
    'RITUAL name=second_strict action=ship cadence=1 mode=strict priority=8 overrides=base trigger="projected_spend <= approved_budget"',
    'RITUAL name=third_strict action=ship cadence=1 mode=strict priority=8 overrides=base trigger="projected_spend <= approved_budget"',
    'ACT action=ship capability=runtime.deploy budget_ms=300',
    'REFLECT target=ship method=causal',
    'EVOLVE scope=act guard=base mutation=ritual-resolution'
  ].join('\n');

  const ast = parseAel(source, { filename: 'ritual_conflict_determinism.noeon' });
  const validation = validateAel(ast);
  assert(validation.valid === true, 'program validates for deterministic ritual conflicts');

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100
    }
  });

  assert(run.success === true, 'execution succeeds under ritual conflict scenario');

  const base = (run.next?.rituals || []).find((r) => r.name === 'base');
  assert(base?.status === 'overridden', 'base ritual is overridden');
  assert(base?.overriddenBy === 'second_strict', 'higher priority strict ritual wins override');

  const conflicts = run.next?.ritualConflicts || [];
  assert(conflicts.some((c) => c.type === 'override' && c.controller === 'second_strict' && c.target === 'base'), 'override conflict records winning controller');
  assert(conflicts.some((c) => c.type === 'override-contended' && c.controller === 'third_strict' && c.winner === 'second_strict'), 'equal priority fallback uses declaration order deterministically');

  const governance = run.next?.governance || {};
  assert(governance.winner === 'ritual', 'governance winner is ritual in pure ritual arbitration');
  assert(Number(governance.conflictCount || 0) >= 2, 'governance reports ritual conflict count');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
