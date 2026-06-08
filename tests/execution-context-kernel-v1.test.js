'use strict';

const {
  buildFeedbackEnv,
  evaluateGuarantees,
  evaluateVows,
  buildExecutionContext
} = require('../src/vm/execution-context-kernel');

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

console.log('\n\x1b[36m═══ Execution Context Kernel v1 Tests ═══\x1b[0m\n');

(() => {
  const env = buildFeedbackEnv({
    facts: { carbon_intensity: 220 },
    projected_spend: '90',
    approved_budget: 100,
    portfolio_risk: '0.45',
    policy: { max_risk: '0.4', max_carbon: 180 }
  });

  assert(env.projected_spend === 90 && env.portfolio_risk === 0.45, 'buildFeedbackEnv converts numeric-like feedback values');
  assert(env.policy.max_risk === 0.4 && env.policy.max_carbon === 180, 'buildFeedbackEnv normalizes policy numeric values');

  const next = {
    goal: { priority: 0.92 },
    guarantees: [{ name: 'risk_guard', expr: 'portfolio_risk <= policy.max_risk' }],
    vows: [{ name: 'budget_oath', level: 'hard', expr: 'projected_spend <= approved_budget' }],
    constitutions: [{ name: 'carbon_guard', level: 'hard', action: 'ship', expr: 'carbon_intensity <= policy.max_carbon' }],
    rituals: [
      { name: 'base', action: 'ship', cadence: 1, mode: 'adaptive', trigger: 'projected_spend <= approved_budget' },
      { name: 'alpha', action: 'ship', cadence: 1, mode: 'strict', overrides: 'base', trigger: 'projected_spend <= approved_budget' }
    ],
    acts: [{ action: 'ship', capability: 'runtime.deploy' }]
  };

  const guarantees = evaluateGuarantees(next, env);
  const vows = evaluateVows(next, env);
  assert(guarantees[0] && guarantees[0].passed === false, 'evaluateGuarantees evaluates guarantee expression result');
  assert(vows[0] && vows[0].passed === true && vows[0].level === 'hard', 'evaluateVows evaluates expression and preserves normalized level');

  const executionContext = buildExecutionContext(next, {
    projected_spend: 90,
    approved_budget: 100,
    portfolio_risk: 0.45,
    carbon_intensity: 220,
    policy: { max_risk: 0.4, max_carbon: 180 }
  }, {
    runCount: 0,
    ritualStats: {}
  });

  assert(executionContext.goalPriority === 0.92, 'buildExecutionContext resolves goal priority');
  assert(Array.isArray(executionContext.rituals) && executionContext.rituals.some((r) => r.name === 'base' && r.status === 'overridden'), 'buildExecutionContext applies ritual override governance');
  assert(Array.isArray(executionContext.actsPlanned) && Number(executionContext.actsPlanned[0].ritualBoost || 0) < 0, 'buildExecutionContext applies constitution penalty during act planning');
  assert(executionContext.hasUnknownGuarantee === false && executionContext.hasHardVowUnknown === false, 'buildExecutionContext computes unknown flags for guarantee/vow');
  assert(executionContext.hasHardConstitutionUnknown === false, 'buildExecutionContext computes hard constitution unknown flag');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
