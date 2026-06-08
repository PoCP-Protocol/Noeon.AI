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

console.log('\n\x1b[36m═══ Next Phase Baseline v1 Tests ═══\x1b[0m\n');

(async () => {
  const ast = {
    program: 'baseline_next_phase',
    next: {
      goal: { text: 'stabilize baseline', priority: 0.9 },
      strategies: [
        { name: 'alpha', risk: 'medium' },
        { name: 'beta', risk: 'low' }
      ],
      guarantees: [
        { name: 'risk_guard', expr: 'portfolio_risk <= policy.max_risk' }
      ],
      vows: [
        { name: 'budget_oath', level: 'hard', expr: 'projected_spend <= approved_budget' }
      ],
      constitutions: [
        { name: 'carbon_guard', level: 'hard', action: 'ship', expr: 'carbon_intensity <= policy.max_carbon' }
      ],
      rituals: [
        { name: 'base', action: 'ship', cadence: 1, mode: 'adaptive', trigger: 'projected_spend <= approved_budget' },
        { name: 'alpha', action: 'ship', cadence: 1, mode: 'strict', overrides: 'base', trigger: 'projected_spend <= approved_budget' }
      ],
      acts: [
        { action: 'ship', capability: 'runtime.deploy' }
      ],
      reflects: [
        { target: 'ship', method: 'causal' }
      ],
      evolves: [
        { scope: 'strategy', mutation: 'shift-to-low-risk' }
      ],
      fields: [],
      cells: [],
      echoes: [],
      mycelium: []
    }
  };

  const result = await runNextPhase(ast, {
    strict_next: true,
    with_protocol: 'off',
    feedback: {
      projected_spend: 80,
      approved_budget: 100,
      portfolio_risk: 0.45,
      carbon_intensity: 220,
      policy: { max_risk: 0.4, max_carbon: 180 }
    }
  });

  assert(result && result.profile === 'next', 'runNextPhase returns next profile result');
  assert(typeof result.blocked === 'boolean', 'result exposes blocked boolean');
  assert(result.blockReason === 'constitution-failed-hard', 'hard constitution failure blocks as highest precedence');
  assert(Array.isArray(result.guarantees) && result.guarantees.length === 1, 'result includes guarantee evaluations');
  assert(Array.isArray(result.rituals) && result.rituals.some((r) => r.name === 'base'), 'result includes ritual evaluations');
  assert(result.governance && result.governance.winner === 'constitution', 'result includes governance winner');
  assert(result.reflection && typeof result.reflection.verdict === 'string', 'result includes reflection payload');
  assert(result.evolution && result.evolution.applied && result.evolution.applied.enabled === false, 'result includes evolution applied status in non-auto mode');
  assert(result.nextMemory && Number(result.nextMemory.runCount) >= 1, 'result includes updated next memory');
  assert(result.fieldMemory === null, 'result keeps field memory null when no field is active');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
