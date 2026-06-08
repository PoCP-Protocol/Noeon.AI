'use strict';

const kernels = require('../src/vm/next-kernels');

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

console.log('\n\x1b[36m═══ Next Kernels Index v1 Tests ═══\x1b[0m\n');

(() => {
  assert(typeof kernels.buildGovernanceDecision === 'function', 'index exports governance kernel function');
  assert(typeof kernels.chooseStrategyWithMemory === 'function', 'index exports strategy-memory function');
  assert(typeof kernels.buildEvolution === 'function', 'index exports evolution function');
  assert(typeof kernels.buildReflection === 'function', 'index exports reflection function');
  assert(typeof kernels.buildExecutionContext === 'function', 'index exports execution-context function');
  assert(typeof kernels.setupMycelium === 'function', 'index exports runtime orchestration function');
  assert(typeof kernels.buildNextPhaseResult === 'function', 'index exports result assembly function');

  assert(kernels.kernels && typeof kernels.kernels === 'object', 'index also exposes grouped kernel namespaces');
  assert(typeof kernels.kernels.governance.evaluateExpr === 'function', 'grouped governance namespace includes evaluateExpr');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
