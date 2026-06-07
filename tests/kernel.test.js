'use strict';

/**
 * Noeon v0.7 Unified Cognitive Kernel Tests
 * Tests the unified execution pipeline: AEL → IR → Kernel
 */

const { AELtoIRCompiler, IRNode, IRNodeType, IRProgram, ProcessMode, MemoryOp, CollabMode } = require('../src/core/cognitive-ir');
const { CognitiveKernel, ExecutionContext, KernelState } = require('../src/core/kernel');
const { ObservabilitySystem, CognitiveLogger, ThoughtTracer, MetricsCollector, LogLevel } = require('../src/core/observability');
const { parseAel } = require('../src/parser');
const fs = require('fs');

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

// ============================================================
// COGNITIVE IR TESTS
// ============================================================

console.log('\n\x1b[36m═══ Cognitive IR Tests ═══\x1b[0m\n');

// Test IRNode creation
const node = new IRNode(IRNodeType.INTENT, { name: 'test', source: 'ael' });
assert(node.type === 'intent', 'IRNode type is correct');
assert(node.id.startsWith('ir_'), 'IRNode has auto-generated ID');
assert(node.params.name === 'test', 'IRNode params stored correctly');
assert(node.priority === 0.5, 'IRNode default priority is 0.5');

// Test IRProgram
const prog = new IRProgram('test_program');
prog.add(new IRNode(IRNodeType.INTENT, { name: 'goal1' }));
prog.add(new IRNode(IRNodeType.PROCESS, { mode: 'analytical' }));
prog.add(new IRNode(IRNodeType.VALIDATE, { type: 'reflection' }));
assert(prog.intents.length === 1, 'Program stores intents');
assert(prog.processes.length === 1, 'Program stores processes');
assert(prog.validators.length === 1, 'Program stores validators');
assert(prog.getAllNodes().length === 3, 'getAllNodes returns all nodes');
assert(prog.getStats().total_nodes === 3, 'getStats counts correctly');

// Test AEL → IR Compilation
const compiler = new AELtoIRCompiler();

// Test TASK → INTENT mapping
const { program: p1 } = compiler.compile({ task: { name: 'my_task', description: 'Do something' } });
assert(p1.intents.length === 1, 'TASK compiles to INTENT');
assert(p1.intents[0].params.name === 'my_task', 'TASK name preserved');
assert(p1.intents[0].source === 'ael', 'Source marked as ael');

// Test BUDGET → CONSTRAINT mapping
const { program: p2 } = compiler.compile({ task: { name: 't' }, budget: { max: 500, currency: 'token' } });
assert(p2.constraints.length === 1, 'BUDGET compiles to CONSTRAINT');
assert(p2.constraints[0].params.max_amount === 500, 'Budget amount preserved');

// Test COLLATERAL → COMMIT mapping
const { program: p3 } = compiler.compile({ task: { name: 't' }, collateral: { amount: 100 } });
assert(p3.commitments.length === 1, 'COLLATERAL compiles to COMMIT');
assert(p3.commitments[0].params.motivation_weight > 0, 'Motivation weight calculated');

// Test VERIFY → VALIDATE mapping
const { program: p4 } = compiler.compile({ task: { name: 't' }, verify: [{ method: 'test', threshold: 0.9 }] });
assert(p4.validators.length === 1, 'VERIFY compiles to VALIDATE');
assert(p4.validators[0].params.threshold === 0.9, 'Threshold preserved');

// Test REWARD → LEARN mapping
const { program: p5 } = compiler.compile({ task: { name: 't' }, reward: { amount: 2.0 } });
assert(p5.learners.length === 1, 'REWARD compiles to LEARN');
assert(p5.learners[0].params.signal_type === 'reward', 'Signal type is reward');

// Test COMPUTE → PROCESS mapping
const { program: p6 } = compiler.compile({ task: { name: 't' }, compute: { model: 'gpt-4', steps: ['a', 'b'] } });
assert(p6.processes.length === 3, 'COMPUTE with model + 2 steps = 3 PROCESS nodes');
assert(p6.processes[0].params.model === 'gpt-4', 'Model preserved');

// Test FLOW → DECIDE mapping
const { program: p7 } = compiler.compile({ task: { name: 't' }, stateFlow: { states: ['a', 'b', 'c'], initial: 'a' } });
assert(p7.decisions.length === 1, 'FLOW compiles to DECIDE');
assert(p7.decisions[0].params.type === 'state_machine', 'Decision type is state_machine');

// Test PLUGIN → PERCEIVE mapping
const { program: p8 } = compiler.compile({ task: { name: 't' }, plugins: [{ name: 'web' }, { name: 'vision' }] });
assert(p8.perceivers.length === 2, 'PLUGINS compile to PERCEIVE nodes');

// Test META_RULE → META mapping
const { program: p9 } = compiler.compile({ task: { name: 't' }, metaRules: [{ condition: 'x', action: 'y' }] });
assert(p9.metas.length === 1, 'META_RULE compiles to META');

// Test cognitive block compilation
const { program: p10 } = compiler.compile({
  task: { name: 't' },
  cognitive: {
    drives: [{ goal: 'learn', importance: 0.9 }],
    intuitions: [{ pattern: 'fast_match' }],
    reasonings: [{ strategy: 'deductive', depth: 3 }],
    reflections: [{ target: 'self', criteria: 'coherence' }],
    consolidations: [{ target: 'recent' }],
    decisions: [{ options: ['a', 'b'], strategy: 'satisfice' }],
    beliefs: [{ content: 'sky is blue', confidence: 0.95 }],
    recalls: [{ query: 'color of sky' }],
    debates: [{ topic: 'ethics', rounds: 3 }]
  }
});
assert(p10.intents.length === 2, 'DRIVE + TASK = 2 intents');
assert(p10.processes.length === 2, 'INTUIT + REASON = 2 processes');
assert(p10.validators.length === 1, 'REFLECT = 1 validator');
assert(p10.memories.length === 3, 'CONSOLIDATE + BELIEVE + RECALL = 3 memories');
assert(p10.decisions.length === 1, 'DECIDE = 1 decision');
assert(p10.collaborators.length === 1, 'DEBATE = 1 collaborator');

// Test execution order
const { program: p11 } = compiler.compile({
  task: { name: 't' },
  cognitive: {
    perceptions: [{ modality: 'text' }],
    predictions: [{ target: 'next' }],
    reasonings: [{ strategy: 'inductive' }],
    decisions: [{ options: ['x'] }],
    reflections: [{ target: 'self' }]
  }
});
assert(p11.execution_order.length > 0, 'Execution order computed');
// Perceive should come before Process
const perceiveIdx = p11.execution_order.indexOf(p11.perceivers[0].id);
const processIdx = p11.execution_order.indexOf(p11.processes[0].id);
assert(perceiveIdx < processIdx, 'Perceive executes before Process');

// Test full contract compilation
const { program: p12 } = compiler.compile({
  task: { name: 'full_contract', description: 'Complete test' },
  budget: { max: 1000 },
  collateral: { amount: 200 },
  verify: [{ method: 'check', threshold: 0.85 }],
  reward: { amount: 5 },
  compute: { model: 'claude-3' },
  stateFlow: { states: ['start', 'end'] },
  plugins: [{ name: 'search' }],
  metaRules: [{ condition: 'fail', action: 'retry' }],
  cognitive: {
    drives: [{ goal: 'optimize' }],
    reasonings: [{ strategy: 'abductive' }],
    reflections: [{ target: 'output' }]
  }
});
assert(p12.getStats().total_nodes >= 10, 'Full contract produces many IR nodes');
assert(p12.intents.length === 2, 'TASK + DRIVE = 2 intents in full contract');

// ============================================================
// KERNEL TESTS
// ============================================================

console.log('\n\x1b[36m═══ Kernel Execution Tests ═══\x1b[0m\n');

async function runKernelTests() {
  const kernel = new CognitiveKernel();

  // Test basic execution
  const r1 = await kernel.execute({ task: { name: 'basic' } });
  assert(r1.success === true, 'Kernel executes basic task successfully');
  assert(r1.program === 'basic', 'Program name preserved');
  assert(r1.stats.cycles === 1, 'One cognitive cycle completed');

  // Test with full contract
  const r2 = await kernel.execute({
    task: { name: 'full' },
    budget: { max: 100 },
    collateral: { amount: 50 },
    verify: [{ method: 'test', threshold: 0.8 }],
    reward: { amount: 1 },
    compute: { model: 'test-model' }
  });
  assert(r2.success === true, 'Kernel executes full contract');
  assert(r2.stats.nodes_processed >= 3, 'Multiple nodes processed');
  assert(r2.decisions.length >= 0, 'Decisions array exists');

  // Test with cognitive primitives
  const r3 = await kernel.execute({
    task: { name: 'cognitive_test' },
    cognitive: {
      drives: [{ goal: 'understand' }],
      perceptions: [{ modality: 'text', source: 'input' }],
      intuitions: [{ pattern: 'quick_match' }],
      reasonings: [{ strategy: 'deductive', depth: 3 }],
      decisions: [{ options: ['yes', 'no'], strategy: 'satisfice' }],
      reflections: [{ target: 'self', criteria: 'coherence' }],
      consolidations: [{ target: 'recent' }]
    }
  });
  assert(r3.success === true, 'Kernel executes cognitive contract');
  assert(r3.stats.nodes_processed >= 6, 'All cognitive nodes processed');

  // Test kernel state management
  assert(kernel.state === KernelState.IDLE, 'Kernel returns to IDLE after execution');
  assert(kernel.stats.programs_executed === 3, 'Stats track program count');

  // Test custom handler registration
  kernel.registerHandler(IRNodeType.PROCESS, async (node, ctx) => {
    ctx.addBelief('custom_processed', true, 0.99);
    return { custom: true };
  });
  const r4 = await kernel.execute({ task: { name: 'custom' }, compute: { model: 'x' } });
  assert(r4.beliefs['custom_processed'] !== undefined, 'Custom handler creates beliefs');

  // Test ExecutionContext
  const ctx = new ExecutionContext({ name: 'test' });
  ctx.broadcast('key1', 'value1', 0.8);
  assert(ctx.getFromWorkspace('key1') === 'value1', 'Context workspace stores/retrieves');
  ctx.addBelief('belief1', 'earth is round', 0.95);
  assert(ctx.getBelief('belief1') === 'earth is round', 'Context beliefs store/retrieve');
  ctx.recordTrace('test_phase', 'test_op', { result: 'ok' });
  assert(ctx.trace.length === 1, 'Context records trace');

  // Test kernel with real .ael file
  const source = fs.readFileSync('./examples/cognitive_minimal.ael', 'utf-8');
  const ast = parseAel(source);
  const r5 = await kernel.execute(ast);
  assert(r5.success === true, 'Kernel executes real .ael file');

  // Test kernel status
  const status = kernel.getStatus();
  assert(status.state === 'idle', 'Status shows idle state');
  assert(status.handlers === 14, 'Status shows handler count');
  assert(status.stats.programs_executed >= 4, 'Status shows execution count');

  return { passed, failed };
}

// ============================================================
// OBSERVABILITY TESTS
// ============================================================

console.log('\n\x1b[36m═══ Observability Tests ═══\x1b[0m\n');

// Test CognitiveLogger
const logger = new CognitiveLogger({ console: false, level: LogLevel.TRACE });
logger.info('test.event', { key: 'value' });
logger.thought('I think therefore I am', 0.9);
logger.decision('go_left', ['go_right', 'stay'], 'less traffic');
logger.confusion('quantum_physics', 'severe');
assert(logger.buffer.length === 4, 'Logger buffers all events');
assert(logger.buffer[0].event === 'test.event', 'Logger stores event name');
assert(logger.buffer[1].event === 'cognitive.thought', 'Logger stores cognitive thought');

// Test ThoughtTracer
const tracer = new ThoughtTracer();
const traceId = tracer.startTrace('test_reasoning');
tracer.step('perceive', 'raw input', 'processed input', { confidence: 0.8 });
tracer.step('reason', 'processed input', 'conclusion', { confidence: 0.9 });
tracer.step('decide', 'conclusion', 'action', { confidence: 0.85 });
const trace = tracer.endTrace('success');
assert(trace.steps.length === 3, 'Tracer records all steps');
assert(trace.outcome === 'success', 'Tracer records outcome');
assert(trace.duration_ms >= 0, 'Tracer records duration');

// Test explain
const explanation = tracer.explain(traceId);
assert(explanation.includes('Thought Trace'), 'Explain generates readable output');
assert(explanation.includes('perceive'), 'Explain includes operations');

// Test MetricsCollector
const metrics = new MetricsCollector();
metrics.increment('requests', 1);
metrics.increment('requests', 1);
assert(metrics.get('requests') === 2, 'Counter increments correctly');
metrics.gauge('temperature', 0.7);
assert(metrics.get('temperature') === 0.7, 'Gauge sets correctly');
metrics.observe('latency', 10);
metrics.observe('latency', 20);
metrics.observe('latency', 30);
assert(metrics.get('latency') === 20, 'Histogram computes average');
const snap = metrics.snapshot();
assert(snap.requests === 2, 'Snapshot captures counters');
assert(snap.temperature === 0.7, 'Snapshot captures gauges');

// Test ObservabilitySystem
const obs = new ObservabilitySystem({ console: false, log_level: 'debug' });
obs.traceExecution('test_program');
obs.recordStep('perceive', 'input', 'output', { confidence: 0.8 });
obs.recordStep('reason', 'data', 'conclusion', { confidence: 0.9 });
const endTrace = obs.endExecution('success');
assert(endTrace !== null, 'ObservabilitySystem tracks execution');
const dashboard = obs.getDashboard();
assert(dashboard.metrics['executions.total'] === 1, 'Dashboard shows execution count');
assert(dashboard.recent_traces.length === 1, 'Dashboard shows recent traces');

// ============================================================
// INTEGRATION TESTS (Full Pipeline)
// ============================================================

console.log('\n\x1b[36m═══ Integration Tests (Full Pipeline) ═══\x1b[0m\n');

async function runIntegrationTests() {
  // Test: AEL contract → IR → Kernel → Result
  const kernel = new CognitiveKernel();
  
  // Legacy AEL contract goes through unified pipeline
  const legacyAst = {
    task: { name: 'legacy_task', description: 'Old-style contract' },
    budget: { max: 500, currency: 'token' },
    collateral: { amount: 100 },
    verify: [{ method: 'quality_check', threshold: 0.85 }],
    reward: { amount: 2.0 },
    compute: { model: 'gpt-4', steps: ['analyze'] },
    stateFlow: { states: ['pending', 'active', 'done'], initial: 'pending' },
    plugins: [{ name: 'web_search' }]
  };
  
  const r1 = await kernel.execute(legacyAst);
  assert(r1.success === true, 'Legacy AEL contract executes through unified kernel');
  assert(r1.stats.nodes_processed >= 5, 'Legacy contract processes multiple nodes');

  // Cognitive contract goes through same pipeline
  const cogAst = {
    task: { name: 'cognitive_task' },
    cognitive: {
      drives: [{ goal: 'learn_physics', importance: 0.95 }],
      perceptions: [{ modality: 'text', source: 'textbook' }],
      predictions: [{ target: 'next_concept', model: 'bayesian' }],
      intuitions: [{ pattern: 'physics_intuition' }],
      reasonings: [{ strategy: 'deductive', depth: 5 }],
      decisions: [{ options: ['study_more', 'practice', 'rest'], strategy: 'satisfice' }],
      reflections: [{ target: 'understanding', criteria: 'depth' }],
      consolidations: [{ target: 'physics_knowledge' }]
    }
  };
  
  const r2 = await kernel.execute(cogAst);
  assert(r2.success === true, 'Cognitive contract executes through unified kernel');
  assert(r2.stats.nodes_processed >= 7, 'Cognitive contract processes all nodes');

  // Mixed contract (AEL + Cognitive) goes through same pipeline
  const mixedAst = {
    task: { name: 'hybrid_intelligence', description: 'Best of both worlds' },
    budget: { max: 1000 },
    verify: [{ method: 'coherence', threshold: 0.9 }],
    reward: { amount: 3.0 },
    cognitive: {
      drives: [{ goal: 'solve_problem' }],
      reasonings: [{ strategy: 'abductive' }],
      reflections: [{ target: 'solution' }]
    }
  };
  
  const r3 = await kernel.execute(mixedAst);
  assert(r3.success === true, 'Mixed AEL+Cognitive contract executes');
  assert(r3.stats.nodes_processed >= 4, 'Mixed contract processes nodes from both sources');

  // Test that kernel stats accumulate
  assert(kernel.stats.programs_executed >= 3, 'Kernel tracks total executions');
  assert(kernel.stats.total_nodes_processed > 10, 'Kernel tracks total nodes');

  // Test observability integration
  const obs = new ObservabilitySystem({ console: false });
  const kernel2 = new CognitiveKernel();
  obs.traceExecution('integration_test');
  const r4 = await kernel2.execute(mixedAst);
  obs.endExecution(r4.success ? 'success' : 'failure');
  const dash = obs.getDashboard();
  assert(dash.metrics['executions.total'] === 1, 'Observability integrates with kernel');
}

// ============================================================
// RUN ALL ASYNC TESTS
// ============================================================

async function main() {
  await runKernelTests();
  await runIntegrationTests();
  
  console.log(`\n\x1b[36m══════════════════════════════════════════\x1b[0m`);
  console.log(`Results: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} failed\x1b[0m, ${passed + failed} total`);
  console.log(`\x1b[36m══════════════════════════════════════════\x1b[0m`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
