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

console.log('\n\x1b[36m═══ Next Phase Baseline v2 Tests ═══\x1b[0m\n');

(async () => {
  const ast = {
    program: 'baseline_next_phase_v2',
    next: {
      goal: { text: 'keep execution non-blocking on unknown in non-strict mode', priority: 0.7 },
      strategies: [
        { name: 'safe_path', risk: 'low' }
      ],
      guarantees: [
        { name: 'unknown_signal_guard', expr: 'missing_metric <= policy.max_metric' }
      ],
      vows: [],
      constitutions: [],
      rituals: [],
      acts: [
        { action: 'ship', capability: 'runtime.deploy' }
      ],
      reflects: [
        { target: 'ship', method: 'causal' }
      ],
      evolves: [
        { scope: 'cell', mutation: 'spawn-from:seed_cell' }
      ],
      fields: [],
      cells: [],
      echoes: [],
      mycelium: [],
      spawns: []
    }
  };

  const result = await runNextPhase(ast, {
    strict_next: false,
    auto_evolve: true,
    with_protocol: 'off',
    feedback: {
      policy: { max_metric: 1 }
    }
  });

  assert(result && result.profile === 'next', 'runNextPhase returns next profile result');
  assert(result.blocked === false, 'unknown guarantee does not block in non-strict mode');
  assert(result.blockReason === null, 'non-strict unknown guarantee keeps block reason null');
  assert(result.evolution && result.evolution.applied && result.evolution.applied.enabled === true, 'auto_evolve enables evolution application');
  assert(result.evolution.applied.changed === true, 'auto_evolve applies a concrete mutation under unknown-signal pressure');
  assert(typeof result.evolution.applied.mutation === 'string' && result.evolution.applied.mutation.length > 0, 'applied mutation reports non-empty mutation marker');
  assert(
    result.runtimeNext && (
      (Array.isArray(result.runtimeNext.models) && result.runtimeNext.models.length >= 1) ||
      (Array.isArray(result.runtimeNext.spawns) && result.runtimeNext.spawns.length >= 1)
    ),
    'runtimeNext reflects applied mutation in models or spawns'
  );
  assert(result.governance && result.governance.winner === 'strategy', 'governance winner remains strategy when no hard blockers');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
