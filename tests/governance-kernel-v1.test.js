'use strict';

const {
  evaluateExpr,
  evaluateRituals,
  resolveRitualGovernance,
  evaluateConstitutions,
  planActsWithRituals,
  buildGovernanceDecision
} = require('../src/vm/governance-kernel');

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

console.log('\n\x1b[36m═══ Governance Kernel v1 Tests ═══\x1b[0m\n');

(() => {
  const exprPass = evaluateExpr('portfolio_risk <= policy.max_risk', {
    portfolio_risk: 0.3,
    policy: { max_risk: 0.4 }
  });
  assert(exprPass.status === 'evaluated' && exprPass.passed === true, 'evaluateExpr supports dotted operands');

  const exprUnknown = evaluateExpr('portfolio_risk <= policy.max_risk', {
    portfolio_risk: 0.3
  });
  assert(exprUnknown.status === 'unknown', 'evaluateExpr returns unknown when operand data is missing');

  const env = {
    projected_spend: 80,
    approved_budget: 100
  };

  const ritualsRun1 = evaluateRituals([
    { name: 'base', action: 'ship', cadence: 1, mode: 'adaptive', trigger: 'projected_spend <= approved_budget' },
    { name: 'alpha', action: 'ship', cadence: 1, mode: 'strict', overrides: 'base', trigger: 'projected_spend <= approved_budget' },
    { name: 'beta', action: 'ship', cadence: 1, mode: 'strict', overrides: 'base', trigger: 'projected_spend <= approved_budget' }
  ], env, { runCount: 0, ritualStats: {} });
  const governedRun1 = resolveRitualGovernance(ritualsRun1);
  const baseRun1 = governedRun1.rituals.find((r) => r.name === 'base');
  assert(baseRun1 && baseRun1.overriddenBy === 'alpha', 'declaration order wins strict tie by default');

  const ritualsRun2 = evaluateRituals([
    { name: 'base', action: 'ship', cadence: 1, mode: 'adaptive', trigger: 'projected_spend <= approved_budget' },
    { name: 'alpha', action: 'ship', cadence: 1, mode: 'strict', overrides: 'base', trigger: 'projected_spend <= approved_budget' },
    { name: 'beta', action: 'ship', cadence: 1, mode: 'strict', overrides: 'base', trigger: 'projected_spend <= approved_budget' }
  ], env, {
    runCount: 1,
    ritualStats: {
      beta: { learnedPriority: 2 }
    }
  });
  const governedRun2 = resolveRitualGovernance(ritualsRun2);
  const baseRun2 = governedRun2.rituals.find((r) => r.name === 'base');
  assert(baseRun2 && baseRun2.overriddenBy === 'beta', 'learned priority can flip strict tie winner');

  const constitutions = evaluateConstitutions([
    { name: 'carbon_guard', expr: 'carbon_intensity <= policy.max_carbon', level: 'hard', action: 'ship' }
  ], {
    carbon_intensity: 240,
    policy: { max_carbon: 150 }
  });
  assert(constitutions[0] && constitutions[0].passed === false, 'evaluateConstitutions computes hard-fail signals');

  const planned = planActsWithRituals([
    { action: 'ship' }
  ], governedRun2.rituals, constitutions);
  assert(Array.isArray(planned) && planned[0] && Number(planned[0].ritualBoost) < 0, 'planActsWithRituals applies constitution penalty');

  const decision = buildGovernanceDecision({
    guarantees: [{ name: 'risk_guard', status: 'evaluated', passed: true }],
    vows: [{ name: 'user_safety', level: 'hard', status: 'evaluated', passed: true }],
    constitutions,
    rituals: governedRun2.rituals,
    actsPlanned: planned,
    ritualConflicts: governedRun2.conflicts,
    strict: true,
    hasUnknownGuarantee: false,
    hasHardVowUnknown: false,
    hasHardConstitutionUnknown: false
  });
  assert(decision.blocked === true && decision.winner === 'constitution', 'buildGovernanceDecision enforces constitution precedence');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
