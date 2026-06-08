'use strict';

const {
  setupMycelium,
  initializeFieldMemory,
  runFieldAndFlux,
  publishFieldToMycelium,
  processEchoes,
  persistFieldMemory,
  applyHotReloadIfNeeded
} = require('../src/vm/runtime-orchestration-kernel');

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

console.log('\n\x1b[36m═══ Runtime Orchestration Kernel v1 Tests ═══\x1b[0m\n');

(() => {
  const setup = setupMycelium({ mycelium: [] }, { task: 't' }, {});
  assert(setup.myceliumRuntime === null, 'setupMycelium returns null runtime when no mycelium meshes');
  assert(Array.isArray(setup.myceliumEnv.absorbed) && setup.myceliumEnv.absorbed.length === 0, 'setupMycelium returns empty absorbed list when no meshes');

  const initMemory = initializeFieldMemory('program', { field_memory: false });
  assert(initMemory === null, 'initializeFieldMemory respects disabled field memory flag');

  const noField = runFieldAndFlux({}, {}, false, setup.myceliumEnv, null);
  assert(noField.field === null, 'runFieldAndFlux skips field engine when hasLivingField is false');
  assert(Array.isArray(noField.fluxCrystals) && noField.fluxCrystals.length === 0, 'runFieldAndFlux returns empty flux crystals when no field');

  const runtimeAfterPublish = publishFieldToMycelium({ mycelium: [] }, { task: 't' }, {}, null, null);
  assert(runtimeAfterPublish === null, 'publishFieldToMycelium no-ops without dominant field');

  const echoState = processEchoes({ echoes: [] }, null, null, { runCount: 0 }, null);
  assert(echoState.fieldMemory === null, 'processEchoes keeps field memory unchanged when no echoes');
  assert(Array.isArray(echoState.echoResult.written) && echoState.echoResult.written.length === 0, 'processEchoes returns empty echo output when no echoes');

  const persistedMemory = persistFieldMemory({ fields: [] }, { field_memory: false }, null, null, 'program');
  assert(persistedMemory === null, 'persistFieldMemory no-ops when field memory is disabled and field missing');

  const hotReload = applyHotReloadIfNeeded({}, { hot_reload: false }, null, []);
  assert(hotReload && hotReload.applied === false, 'applyHotReloadIfNeeded returns disabled state when hot reload is off');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
