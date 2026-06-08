'use strict';

const {
  summarizeGuarantees,
  buildReflection
} = require('../src/vm/reflection-kernel');

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

console.log('\n\x1b[36m═══ Reflection Kernel v1 Tests ═══\x1b[0m\n');

(() => {
  const summary = summarizeGuarantees([
    { status: 'evaluated', passed: true },
    { status: 'evaluated', passed: false },
    { status: 'unknown' }
  ]);
  assert(summary.passed === 1 && summary.failed === 1 && summary.unknown === 1, 'summarizeGuarantees counts pass/fail/unknown correctly');

  const reflection = buildReflection(
    {
      reflects: [{ target: 'ship', method: 'counterfactual' }],
      selfModels: [{ identity: 'ops-core', creator: 'team', paradigm: 'safe-first' }],
      myths: [{ text: 'protect value', tone: 'firm', directive: 'avoid losses' }]
    },
    {
      guarantees: [
        { name: 'risk_guard', status: 'evaluated', passed: false },
        { name: 'budget_guard', status: 'unknown' }
      ],
      vows: [{ name: 'user_safety', level: 'hard', status: 'evaluated', passed: false }],
      constitutions: [{ name: 'carbon_guard', level: 'hard', status: 'evaluated', passed: false }],
      rituals: [
        { name: 'alpha', status: 'active' },
        { name: 'beta', status: 'dependency-blocked' }
      ],
      ritualConflicts: [{ type: 'override', controller: 'alpha', target: 'beta' }],
      actsPlanned: [{ action: 'ship', rituals: ['alpha'], ritualBoost: 0.35 }],
      governanceDecision: { winner: 'constitution', blocked: true, blockReason: 'constitution-failed-hard', detail: 'carbon_guard', precedence: ['constitution', 'vow', 'ritual', 'strategy'] },
      field: { dominant: { name: 'alpha_cell', energy: 0.91, claim: 'stability' } },
      selectedStrategy: { name: 'alpha', risk: 'high', utility: 0.41 },
      feedback: { friction: { latency: 0.8, noise: 0.2 } }
    }
  );

  assert(reflection.verdict === 'needs-correction', 'buildReflection sets correction verdict when guarantees fail');
  assert(reflection.summary.failed >= 1 && reflection.summary.unknown >= 1, 'buildReflection includes guarantee summary with failures and unknowns');
  assert(Array.isArray(reflection.methodScores) && reflection.methodScores[0].method === 'counterfactual', 'buildReflection emits method score for reflection methods');
  assert(reflection.insights.some((i) => i.type === 'governance-arbitration' && i.winner === 'constitution'), 'buildReflection includes governance arbitration insight');
  assert(reflection.insights.some((i) => i.type === 'ritual-conflicts' && i.count === 1), 'buildReflection includes ritual conflict insight');
  assert(reflection.insights.some((i) => i.type === 'friction-hotspots' && i.hotspots.some((h) => h.pattern === 'latency')), 'buildReflection captures friction hotspots above threshold');
  assert(reflection.insights.some((i) => i.type === 'self-model' && i.identity === 'ops-core'), 'buildReflection includes self-model insight');
  assert(reflection.insights.some((i) => i.type === 'mythic-core' && i.directive === 'avoid losses'), 'buildReflection includes mythic-core insight');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
