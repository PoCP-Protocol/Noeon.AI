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

console.log('\n\x1b[36m═══ Next Profile v15 Governance Fusion Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.5.0"',
    'PROGRAM "governance_fusion"',
    'GOAL "fuse constitution vow and ritual into one runtime governance" priority=0.92',
    'MODEL name=context source=workspace confidence=0.88',
    'STRATEGY name=ship objective=delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'VOW name=ethics_guard level=hard expr="portfolio_risk <= policy.max_risk"',
    'CONSTITUTION name=green_compute level=hard action=ship principle=sustainability expr="carbon_intensity <= policy.max_carbon"',
    'RITUAL name=cadence_ship action=ship cadence=1 mode=strict trigger="projected_spend <= approved_budget"',
    'ACT action=ship capability=runtime.deploy budget_ms=300',
    'ACT action=reflect capability=runtime.inspect budget_ms=120',
    'REFLECT target=ship method=causal',
    'EVOLVE scope=governance guard=green_compute mutation=constitutional-realign'
  ].join('\n');

  const ast = parseAel(source, { filename: 'governance_fusion.noeon' });
  assert(Array.isArray(ast.next?.constitutions) && ast.next.constitutions.length === 1, 'parser captures CONSTITUTION');

  const validation = validateAel(ast);
  assert(validation.valid === true, 'program with constitution/vow/ritual passes validation');

  const blocked = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.2,
      carbon_intensity: 0.7,
      policy: { max_risk: 0.4, max_carbon: 0.3 }
    }
  });

  assert(blocked.success === false && blocked.blocked === true, 'hard constitution failure blocks execution');
  assert(blocked.next?.blockReason === 'constitution-failed-hard', 'block reason is constitution-failed-hard');
  assert((blocked.next?.reflection?.insights || []).some((x) => x.type === 'constitution-summary'), 'reflection includes constitution-summary');
  assert((blocked.next?.evolution?.proposals || []).some((x) => x.kind === 'constitutional-realignment'), 'evolution includes constitutional-realignment');

  const pass = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.2,
      carbon_intensity: 0.2,
      policy: { max_risk: 0.4, max_carbon: 0.3 }
    }
  });

  assert(pass.success === true, 'execution proceeds when constitution passes');
  assert(Array.isArray(pass.next?.actsPlanned) && pass.next.actsPlanned[0]?.action === 'ship', 'ritual still boosts ship action under passing constitution');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
