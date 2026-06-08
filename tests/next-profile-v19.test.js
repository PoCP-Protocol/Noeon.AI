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

console.log('\n\x1b[36m═══ Next Profile v19 Ritual Learning Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.9.0"',
    'PROGRAM "ritual_learning_cycle"',
    'GOAL "learn ritual dominance across runs" priority=0.9',
    'MODEL name=context source=workspace confidence=0.85',
    'STRATEGY name=ship objective=delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'RITUAL name=base action=ship cadence=1 mode=adaptive trigger="projected_spend <= approved_budget"',
    'RITUAL name=alpha action=ship cadence=1 mode=strict overrides=base trigger="projected_spend <= approved_budget"',
    'RITUAL name=beta action=ship cadence=1 mode=strict overrides=base trigger="projected_spend <= approved_budget"',
    'ACT action=ship capability=runtime.deploy budget_ms=300',
    'REFLECT target=ship method=causal',
    'EVOLVE scope=ritual guard=base mutation=learn-dominance'
  ].join('\n');

  const ast = parseAel(source, { filename: 'ritual_learning_cycle.noeon' });
  const validation = validateAel(ast);
  assert(validation.valid === true, 'program validates for ritual learning');

  const run1 = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100
    }
  });

  assert(run1.success === true, 'run1 succeeds');
  const baseRun1 = (run1.next?.rituals || []).find((r) => r.name === 'base');
  assert(baseRun1?.overriddenBy === 'alpha', 'run1 uses declaration-order winner under tie');
  assert((run1.next?.nextMemory?.ritualStats || {}).alpha != null, 'run1 records ritual stats in memory');

  const learnedMemory = {
    runCount: run1.next?.nextMemory?.runCount || 1,
    strategyStats: run1.next?.nextMemory?.strategyStats || {},
    evolutionHistory: run1.next?.nextMemory?.evolutionHistory || [],
    ritualStats: {
      ...(run1.next?.nextMemory?.ritualStats || {}),
      beta: {
        ...(run1.next?.nextMemory?.ritualStats?.beta || {}),
        learnedPriority: 2
      }
    }
  };

  const run2 = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    next_memory: learnedMemory,
    feedback: {
      projected_spend: 80,
      approved_budget: 100
    }
  });

  assert(run2.success === true, 'run2 succeeds with learned memory');
  const baseRun2 = (run2.next?.rituals || []).find((r) => r.name === 'base');
  assert(baseRun2?.overriddenBy === 'beta', 'run2 winner shifts by learned priority');
  assert((run2.next?.governance?.winner || '') === 'ritual', 'governance winner remains ritual');
  assert(Number(run2.next?.governance?.conflictCount || 0) > 0, 'governance exposes conflict count');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
