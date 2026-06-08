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

console.log('\n\x1b[36m═══ Next Profile v13 Vow Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.3.0"',
    'PROGRAM "vow_guarded_runtime"',
    'GOAL "align execution with explicit vows" priority=0.9',
    'MODEL name=context source=workspace confidence=0.86',
    'STRATEGY name=ship objective=delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'VOW name=ethics_guard level=hard expr="portfolio_risk <= policy.max_risk"',
    'ACT action=deploy capability=runtime.deploy budget_ms=300',
    'REFLECT target=deploy method=causal',
    'EVOLVE scope=strategy guard=ethics_guard mutation=vow-alignment'
  ].join('\n');

  const ast = parseAel(source, { filename: 'vow_guarded_runtime.noeon' });
  assert(Array.isArray(ast.next?.vows) && ast.next.vows.length === 1, 'parser captures VOW');

  const validation = validateAel(ast);
  assert(validation.valid === true, 'program with VOW passes validation');

  const blocked = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.7,
      policy: { max_risk: 0.4 }
    }
  });

  assert(blocked.success === false && blocked.blocked === true, 'hard vow failure blocks execution');
  assert(blocked.next?.blockReason === 'vow-failed-hard', 'block reason is vow-failed-hard');
  assert((blocked.next?.reflection?.insights || []).some((x) => x.type === 'vow-summary'), 'reflection includes vow summary');
  assert((blocked.next?.evolution?.proposals || []).some((x) => x.kind === 'vow-realignment'), 'evolution includes vow-realignment proposal');

  const pass = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.3,
      policy: { max_risk: 0.4 }
    }
  });

  assert(pass.success === true, 'execution proceeds when hard vow passes');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
