'use strict';

const { runNextPhase } = require('../src/vm/next-phase');

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

console.log('\n\x1b[36m═══ Next Phase Baseline v3 Tests ═══\x1b[0m\n');

async function runScenario(next, feedback) {
  return runNextPhase(
    {
      program: 'baseline_next_phase_v3',
      next
    },
    {
      strict_next: true,
      with_protocol: 'off',
      feedback
    }
  );
}

(async () => {
  const constitutionUnknown = await runScenario(
    {
      goal: { text: 'strict unknown constitution should block', priority: 0.8 },
      strategies: [{ name: 'alpha', risk: 'low' }],
      guarantees: [],
      vows: [],
      constitutions: [
        { name: 'carbon_guard', level: 'hard', expr: 'external.carbon_intensity <= policy.max_carbon' }
      ],
      rituals: [],
      acts: [],
      reflects: [],
      evolves: [],
      fields: [],
      cells: [],
      echoes: [],
      mycelium: []
    },
    { policy: { max_carbon: 180 } }
  );

  assert(constitutionUnknown.blocked === true, 'strict + hard constitution unknown blocks execution');
  assert(constitutionUnknown.blockReason === 'constitution-unknown-hard', 'block reason is constitution-unknown-hard');
  assert(constitutionUnknown.governance && constitutionUnknown.governance.winner === 'constitution', 'governance winner is constitution for hard unknown');

  const vowUnknown = await runScenario(
    {
      goal: { text: 'strict unknown vow should block', priority: 0.8 },
      strategies: [{ name: 'alpha', risk: 'low' }],
      guarantees: [],
      vows: [
        { name: 'budget_oath', level: 'hard', expr: 'external.projected_spend <= approved_budget' }
      ],
      constitutions: [],
      rituals: [],
      acts: [],
      reflects: [],
      evolves: [],
      fields: [],
      cells: [],
      echoes: [],
      mycelium: []
    },
    { approved_budget: 100 }
  );

  assert(vowUnknown.blocked === true, 'strict + hard vow unknown blocks execution');
  assert(vowUnknown.blockReason === 'vow-unknown-hard', 'block reason is vow-unknown-hard');
  assert(vowUnknown.governance && vowUnknown.governance.winner === 'vow', 'governance winner is vow for hard unknown');

  const guaranteeUnknown = await runScenario(
    {
      goal: { text: 'strict unknown guarantee should block when no hard blockers', priority: 0.8 },
      strategies: [{ name: 'alpha', risk: 'low' }],
      guarantees: [
        { name: 'risk_guard', expr: 'external.portfolio_risk <= policy.max_risk' }
      ],
      vows: [],
      constitutions: [],
      rituals: [],
      acts: [],
      reflects: [],
      evolves: [],
      fields: [],
      cells: [],
      echoes: [],
      mycelium: []
    },
    { policy: { max_risk: 0.5 } }
  );

  assert(guaranteeUnknown.blocked === true, 'strict + unknown guarantee blocks execution');
  assert(guaranteeUnknown.blockReason === 'guarantee-unknown', 'block reason is guarantee-unknown');
  assert(guaranteeUnknown.governance && guaranteeUnknown.governance.winner === 'strategy', 'governance winner is strategy for guarantee unknown');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
