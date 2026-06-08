'use strict';

const fs = require('fs');
const path = require('path');
const { ConsciousnessStream } = require('../src/runtime/cognitive/stream-of-consciousness');
const {
  resolveScheduler,
  seedStreamFromAst,
  runConsciousnessPhase,
  DEFAULT_MAX_CYCLES
} = require('../src/vm/consciousness-scheduler');
const { executeProgram, buildKernel } = require('../src/vm/unified-executor');
const { parseAel } = require('../src/parser');
const { PROFILES, resolveExecutionMode } = require('../src/core/profile');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Consciousness Scheduler Phase 4 Tests ═══\x1b[0m\n');

assert(DEFAULT_MAX_CYCLES >= 16, 'default max cycles configured');

assert(
  resolveScheduler({}, PROFILES.GENERAL, resolveExecutionMode(PROFILES.GENERAL, { with_protocol: 'off' })) === 'consciousness',
  'general profile defaults to consciousness scheduler'
);
assert(
  resolveScheduler({ scheduler: 'sequential' }, PROFILES.GENERAL, 'cognitive') === 'sequential',
  'sequential scheduler opt-out'
);
assert(
  resolveScheduler({}, PROFILES.AEL, 'protocol') === 'sequential',
  'protocol-only mode stays sequential'
);

const stream = new ConsciousnessStream({ attentionThreshold: 0.2 });
seedStreamFromAst(stream, {
  task: 'demo',
  cognition: { goal: 'Think continuously', context: { threshold: 0.65 } },
  cognitive: {
    perceptions: [{ source: 'user', modality: 'text' }],
    reasonings: [{ strategy: 'abductive', depth: 2 }],
    decisions: [{ action: 'respond', threshold: 0.6 }]
  },
  llm: { asks: [{ query: 'hello', model: 'default' }] }
});
assert(stream.goals.size >= 1, 'seeds goal into stream');
assert(stream.thoughts.length >= 4, 'seeds cognitive thoughts from AST');
assert(stream.beliefs.has('threshold'), 'seeds context beliefs');

(async () => {
  const bounded = await stream.runBounded(24, { untilIdle: true });
  assert(bounded.cycles >= 1, 'runBounded executes at least one cycle');
  assert(bounded.state.stats.totalCycles >= 1, 'bounded run updates stream stats');

  const agentAst = parseAel(
    fs.readFileSync(path.join(__dirname, '../examples/cognitive_agent.noeon'), 'utf8'),
    { filename: 'cognitive_agent.noeon' }
  );
  const kernel = buildKernel({ quiet: true });
  const phase = await runConsciousnessPhase(agentAst, kernel, { quiet: true, consciousness_cycles: 20 });
  assert(phase.scheduler === 'consciousness', 'runConsciousnessPhase marks scheduler');
  assert(phase.prelude.cycles >= 1, 'prelude runs bounded cycles');
  assert(phase.cognitive.success === true, 'kernel executes after consciousness prelude');
  assert(phase.stream.goals.length >= 1, 'stream retains goals after prelude');

  const run = await executeProgram(agentAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'cognitive_agent.noeon'
  });
  assert(run.scheduler === 'consciousness', 'executeProgram uses consciousness scheduler by default');
  assert(run.phases.includes('consciousness'), 'executeProgram records consciousness phase');
  assert(run.phases.includes('cognitive'), 'executeProgram still runs cognitive phase');
  assert(run.consciousness?.prelude?.cycles >= 1, 'executeProgram attaches consciousness prelude');

  const seq = await executeProgram(agentAst, {
    quiet: true,
    with_protocol: 'off',
    filename: 'cognitive_agent.noeon',
    scheduler: 'sequential'
  });
  assert(seq.scheduler === 'sequential', 'sequential opt-out works');
  assert(!seq.phases.includes('consciousness'), 'sequential mode skips consciousness phase');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
