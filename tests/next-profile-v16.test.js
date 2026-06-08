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

console.log('\n\x1b[36m═══ Next Profile v16 Governance Arbitration Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.6.0"',
    'PROGRAM "governance_precedence"',
    'GOAL "verify governance precedence matrix" priority=0.93',
    'MODEL name=context source=workspace confidence=0.88',
    'STRATEGY name=ship objective=delivery risk=medium',
    'GUARANTEE name=budget_guard expr="projected_spend <= approved_budget"',
    'VOW name=ethics_guard level=hard expr="portfolio_risk <= policy.max_risk"',
    'CONSTITUTION name=green_compute level=hard action=ship principle=sustainability expr="carbon_intensity <= policy.max_carbon"',
    'RITUAL name=cadence_ship action=ship cadence=1 mode=strict trigger="projected_spend <= approved_budget"',
    'ACT action=ship capability=runtime.deploy budget_ms=300',
    'REFLECT target=ship method=causal',
    'EVOLVE scope=governance guard=green_compute mutation=constitutional-realign'
  ].join('\n');

  const ast = parseAel(source, { filename: 'governance_precedence.noeon' });
  const validation = validateAel(ast);
  assert(validation.valid === true, 'program validates for arbitration tests');

  const bothHardFail = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.7,
      carbon_intensity: 0.9,
      policy: { max_risk: 0.4, max_carbon: 0.3 }
    }
  });

  assert(bothHardFail.success === false && bothHardFail.blocked === true, 'run blocks when both constitution and vow fail');
  assert(bothHardFail.next?.blockReason === 'constitution-failed-hard', 'constitution outranks vow in block reason');
  assert(bothHardFail.next?.governance?.winner === 'constitution', 'governance winner is constitution');
  assert(Array.isArray(bothHardFail.next?.governance?.precedence) && bothHardFail.next.governance.precedence[0] === 'constitution', 'precedence matrix starts with constitution');
  assert((bothHardFail.next?.reflection?.insights || []).some((x) => x.type === 'governance-arbitration' && x.winner === 'constitution'), 'reflection includes governance-arbitration insight');

  const onlyVowFail = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.7,
      carbon_intensity: 0.2,
      policy: { max_risk: 0.4, max_carbon: 0.3 }
    }
  });

  assert(onlyVowFail.success === false, 'run blocks when only hard vow fails');
  assert(onlyVowFail.next?.blockReason === 'vow-failed-hard', 'vow becomes governing blocker when constitution passes');
  assert(onlyVowFail.next?.governance?.winner === 'vow', 'governance winner switches to vow');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
