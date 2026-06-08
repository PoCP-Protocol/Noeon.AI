'use strict';

const {
  buildEvolution,
  cloneNextState,
  applyEvolutionSelection
} = require('../src/vm/evolution-kernel');

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

console.log('\n\x1b[36m═══ Evolution Kernel v1 Tests ═══\x1b[0m\n');

(() => {
  const next = {
    goal: { text: 'ship safely', priority: 0.9 },
    models: [{ name: 'market' }],
    strategies: [{ name: 'alpha', risk: 'high' }, { name: 'beta', risk: 'low' }],
    guarantees: [{ name: 'risk_guard', expr: 'portfolio_risk <= policy.max_risk' }],
    vows: [{ name: 'user_safety', level: 'hard', expr: 'incidents == 0' }],
    constitutions: [{ name: 'carbon_guard', level: 'hard', expr: 'carbon_intensity <= policy.max_carbon' }],
    rituals: [{ name: 'alpha_r', mode: 'strict', action: 'ship', active: true }],
    acts: [{ action: 'ship', capability: 'runtime.deploy' }],
    reflects: [{ target: 'ship', method: 'causal' }],
    evolves: [{ scope: 'cell', mutation: 'spawn-from:alpha_cell' }],
    selfModels: [{ identity: 'ops-core' }],
    myths: [{ directive: 'protect users' }],
    fields: [],
    cells: [],
    weaves: [],
    dreams: [],
    echoes: [],
    spawns: [],
    fluxes: [],
    bonds: [],
    mycelium: []
  };

  const reflection = {
    summary: { passed: 0, failed: 1, unknown: 1 }
  };

  const evolution = buildEvolution(next, {
    guarantees: [{ name: 'risk_guard', status: 'evaluated', passed: false }],
    vows: [{ name: 'user_safety', status: 'evaluated', passed: false }],
    constitutions: [{ name: 'carbon_guard', status: 'evaluated', passed: false }],
    rituals: [{ name: 'alpha_r', status: 'unknown', active: true, action: 'ship' }],
    actsPlanned: [{ action: 'ship' }],
    ritualConflicts: [{ type: 'override', controller: 'alpha_r' }],
    reflection,
    selectedStrategy: { name: 'alpha', risk: 'high' },
    field: { dominant: { name: 'alpha_cell', energy: 0.9 } }
  });

  assert(evolution.count > 0, 'buildEvolution emits proposals under risk and conflict signals');
  assert(evolution.selected && evolution.selected.kind === 'constitutional-realignment', 'buildEvolution picks highest confidence proposal deterministically');

  const cloned = cloneNextState(next);
  cloned.models.push({ name: 'local-only' });
  assert(next.models.length === 1 && cloned.models.length === 2, 'cloneNextState deep-clones top-level arrays');

  const runtime1 = cloneNextState(next);
  const apply1 = applyEvolutionSelection(runtime1, { kind: 'safety-tightening', reason: 'guard failed' }, {
    selectedStrategy: { name: 'alpha' },
    field: null,
    rituals: [],
    ritualConflicts: []
  });
  assert(apply1.changed === true && runtime1.runtimeSelection && runtime1.runtimeSelection.strategy === 'beta', 'applyEvolutionSelection can switch to lowest-risk runtime selection');

  const runtime2 = cloneNextState(next);
  const apply2 = applyEvolutionSelection(runtime2, { kind: 'declared-evolve', scope: 'cell', mutation: 'spawn-from:alpha_cell', reason: 'declared' }, {
    selectedStrategy: { name: 'alpha' },
    field: null,
    rituals: [],
    ritualConflicts: []
  });
  assert(apply2.changed === true && runtime2.spawns.some((s) => s.name === 'alpha_cell_declared_fork'), 'applyEvolutionSelection materializes declared spawn-from evolution');

  const runtime3 = cloneNextState(next);
  const apply3 = applyEvolutionSelection(runtime3, { kind: 'ritual-topology-reorder', reason: 'conflicts' }, {
    selectedStrategy: { name: 'alpha' },
    field: null,
    rituals: [
      { name: 'a', mode: 'adaptive', priority: 1, declarationOrder: 1, effectivePriority: 1 },
      { name: 'b', mode: 'strict', priority: 0, declarationOrder: 0, effectivePriority: 0 }
    ],
    ritualConflicts: [{ type: 'override' }, { type: 'override' }]
  });
  assert(apply3.changed === true && Array.isArray(runtime3.ritualOrder) && runtime3.ritualOrder[0] === 'b', 'applyEvolutionSelection reorders ritual topology by governance priority');
  assert(runtime3.ritualConflictCount === 2, 'applyEvolutionSelection stores conflict count');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
