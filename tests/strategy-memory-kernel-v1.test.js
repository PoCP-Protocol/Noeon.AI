'use strict';

const {
  chooseStrategy,
  normalizeNextMemory,
  chooseStrategyWithMemory,
  updateStrategyMemory
} = require('../src/vm/strategy-memory-kernel');

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

console.log('\n\x1b[36m═══ Strategy Memory Kernel v1 Tests ═══\x1b[0m\n');

(() => {
  const baseline = chooseStrategy([
    { name: 'alpha', risk: 'medium' },
    { name: 'beta', risk: 'low' }
  ], 0.95);
  assert(baseline && baseline.name === 'beta', 'chooseStrategy prefers low risk for high-priority goal');

  const normalized = normalizeNextMemory({
    runCount: 2,
    strategyStats: { alpha: { failCount: 1 } }
  });
  assert(normalized.runCount === 2 && normalized.strategyStats.alpha.failCount === 1, 'normalizeNextMemory preserves known counters');

  const selectedWithMemory = chooseStrategyWithMemory([
    { name: 'alpha', risk: 'medium' },
    { name: 'beta', risk: 'low' }
  ], 0.95, {
    strategyStats: {
      beta: { failCount: 2, successCount: 0, lastOutcome: 'fail' },
      alpha: { failCount: 0, successCount: 3, lastOutcome: 'pass' }
    }
  });
  assert(selectedWithMemory && selectedWithMemory.name === 'alpha', 'chooseStrategyWithMemory can override baseline by memory bias');

  const memory1 = updateStrategyMemory(
    { runCount: 0 },
    { name: 'alpha', utility: 0.78, memoryBias: 0.15 },
    [{ name: 'risk_guard', status: 'evaluated', passed: true }],
    { selected: { kind: 'safety-tightening' } },
    { mutation: 'shift-to-low-risk', changed: true },
    [
      { name: 'alpha_r', active: true, effectivePriority: 1.1 },
      { name: 'beta_r', status: 'overridden', effectivePriority: 0.6 }
    ],
    [{ type: 'override', controller: 'alpha_r' }],
    { winner: 'ritual', detail: 'alpha_r' }
  );

  assert(memory1.runCount === 1, 'updateStrategyMemory increments run count');
  assert(memory1.lastSelected === 'alpha', 'updateStrategyMemory stores selected strategy key');
  assert(memory1.strategyStats.alpha && memory1.strategyStats.alpha.successCount === 1, 'updateStrategyMemory records strategy success');
  assert(memory1.ritualStats.alpha_r && Number(memory1.ritualStats.alpha_r.learnedPriority || 0) > 0, 'updateStrategyMemory computes positive learned priority for winning ritual');
  assert(Array.isArray(memory1.ritualOrder) && memory1.ritualOrder[0] === 'alpha_r', 'updateStrategyMemory ranks ritualOrder by learned priority');
  assert(Array.isArray(memory1.evolutionHistory) && memory1.evolutionHistory.length === 1, 'updateStrategyMemory appends evolution history');

  const memory2 = updateStrategyMemory(
    memory1,
    { name: 'alpha', utility: 0.62, memoryBias: -0.12 },
    [{ name: 'risk_guard', status: 'evaluated', passed: false }],
    { selected: { kind: 'risk-rebalance' } },
    { mutation: 'downgrade-risk', changed: true },
    [{ name: 'alpha_r', status: 'dependency-blocked', effectivePriority: 0.5 }],
    [],
    { winner: 'strategy', detail: 'alpha' }
  );

  assert(memory2.runCount === 2, 'updateStrategyMemory keeps accumulating run count');
  assert(memory2.strategyStats.alpha && memory2.strategyStats.alpha.failCount === 1, 'updateStrategyMemory records strategy failure');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
