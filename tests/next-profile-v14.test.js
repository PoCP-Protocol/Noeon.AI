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

console.log('\n\x1b[36m═══ Next Profile v14 Ritual Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.4.0"',
    'PROGRAM "ritual_scheduler"',
    'GOAL "turn values into repeatable execution rhythms" priority=0.86',
    'MODEL name=context source=workspace confidence=0.84',
    'STRATEGY name=craft objective=stable_delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'RITUAL name=daily_alignment action=ship cadence=1 mode=strict trigger="projected_spend <= approved_budget"',
    'RITUAL name=weekly_review action=reflect cadence=3 mode=adaptive trigger="warehouse_utilization <= 0.9"',
    'ACT action=ship capability=runtime.deploy budget_ms=300',
    'ACT action=reflect capability=runtime.inspect budget_ms=100',
    'REFLECT target=ship method=causal',
    'EVOLVE scope=act guard=daily_alignment mutation=ritual-reorder'
  ].join('\n');

  const ast = parseAel(source, { filename: 'ritual_scheduler.noeon' });
  assert(Array.isArray(ast.next?.rituals) && ast.next.rituals.length === 2, 'parser captures RITUAL statements');

  const validation = validateAel(ast);
  assert(validation.valid === true, 'program with RITUAL passes validation');

  const run1 = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      warehouse_utilization: 0.8
    }
  });

  assert(run1.success === true, 'execution with ritual baseline succeeds');
  assert(Array.isArray(run1.next?.rituals) && run1.next.rituals.some((r) => r.name === 'daily_alignment' && r.status === 'active'), 'cadence-1 ritual activates');
  assert(run1.next?.rituals.some((r) => r.name === 'weekly_review' && r.status === 'deferred'), 'cadence-3 ritual is deferred on first run');
  assert(Array.isArray(run1.next?.actsPlanned) && run1.next.actsPlanned[0]?.action === 'ship', 'ritual planning prioritizes bound action');
  assert((run1.next?.reflection?.insights || []).some((x) => x.type === 'ritual-summary'), 'reflection includes ritual summary');

  const run3 = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    next_memory: { runCount: 2, strategyStats: {}, evolutionHistory: [] },
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      warehouse_utilization: 0.8
    }
  });

  assert(run3.success === true, 'execution with preloaded memory succeeds');
  assert(run3.next?.rituals.some((r) => r.name === 'weekly_review' && r.status === 'active'), 'cadence-3 ritual activates on third run');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
