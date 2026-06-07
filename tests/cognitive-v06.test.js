'use strict';

/**
 * Noeon v0.6 Integration Tests
 * Tests: Type System, Standard Library, Module System, REPL Session
 */

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { passed++; process.stdout.write('.'); }
  else { failed++; console.error(`\n  FAIL: ${msg}`); }
}

// ============================================================
// TYPE SYSTEM TESTS
// ============================================================

const {
  CognitiveValue, Belief, Uncertain, Temporal, Emotion,
  Intention, Percept, MemoryTrace, CognitiveCollection, TypeChecker,
  belief, uncertain, temporal, emotion, intention, percept, memory, collection
} = require('../src/runtime/cognitive/type-system');

console.log('\n=== Type System Tests ===');

// CognitiveValue basics
const cv = new CognitiveValue('test', { confidence: 0.8, salience: 0.6 });
assert(cv.value === 'test', 'CognitiveValue stores value');
assert(cv.confidence === 0.8, 'CognitiveValue stores confidence');
assert(cv.isReliable === true, 'CognitiveValue isReliable when conf >= 0.5');
assert(cv.effectiveConfidence === 0.8, 'No decay when decay_rate=0');

cv.strengthen(0.1);
assert(cv.confidence === 0.9, 'strengthen increases confidence');
cv.weaken(0.3);
assert(Math.abs(cv.confidence - 0.6) < 0.001, 'weaken decreases confidence');

// Belief
const b = new Belief('AI will transform education', { confidence: 0.7 });
assert(b._type === 'Belief', 'Belief has correct type');
b.support('Study shows 30% improvement');
assert(b.evidence.length === 1, 'Belief tracks evidence');
assert(b.confidence > 0.7, 'Supporting evidence strengthens belief');

b.contradict('Some schools report no change');
assert(b.contradictions.length === 1, 'Belief tracks contradictions');
assert(b.coherence < 1.0, 'Contradictions reduce coherence');

const revision = b.revise('AI will partially transform education', 'new evidence');
assert(revision.old === 'AI will transform education', 'Revision tracks old value');
assert(b.value === 'AI will partially transform education', 'Belief value updated');
assert(b.revision_count === 1, 'Revision count incremented');

// Uncertain
const u = new Uncertain(100, { variance: 25 });
assert(u.mean === 100, 'Uncertain stores mean');
assert(u.std === 5, 'Uncertain computes std');
assert(u.relativeUncertainty === 0.05, 'Relative uncertainty correct');
assert(u.isPreciseEnough(0.1) === true, 'Precise enough check');

u.observe(102, 10);
assert(u.mean !== 100, 'Bayesian update changes mean');
assert(u.variance < 25, 'Observation reduces variance');

const u2 = new Uncertain(50, { variance: 16 });
const sum = u.add(u2);
assert(Math.abs(sum.mean - (u.mean + 50)) < 0.1, 'Uncertain addition propagates');

const sample = u.sample();
assert(typeof sample === 'number', 'Sampling produces number');

const prob = u.probAbove(105);
assert(prob >= 0 && prob <= 1, 'probAbove returns valid probability');

// Temporal
const t = new Temporal(10);
assert(t.value === 10, 'Temporal stores initial value');
assert(t.trend === 'stable', 'Initial trend is stable');

t.update(12);
t.update(14);
t.update(16);
assert(t.trend === 'increasing', 'Trend detected as increasing');
assert(t.velocity > 0, 'Positive velocity');

const predicted = t.predict(5);
assert(predicted instanceof Uncertain, 'Prediction returns Uncertain');
assert(predicted.mean > 16, 'Prediction extrapolates forward');

const ma = t.movingAverage(3);
assert(typeof ma === 'number', 'Moving average returns number');

// Emotion
const e = new Emotion('excited', { valence: 0.8, arousal: 0.9, dominance: 0.7 });
assert(e._type === 'Emotion', 'Emotion has correct type');
assert(e.discreteLabel === 'excited', 'Correct discrete label');
assert(e.actionBias > 0, 'Positive emotion has positive action bias');
assert(e.riskModifier > 1, 'Positive emotion increases risk tolerance');

const sad = new Emotion('sad', { valence: -0.5, arousal: 0.3 });
assert(sad.discreteLabel === 'sad', 'Sad emotion labeled correctly');

const blended = e.blend(sad);
assert(blended._type === 'Emotion', 'Blended emotion is Emotion type');

// Intention
const intent = new Intention('learn Noeon', { priority: 0.8, urgency: 0.6, feasibility: 0.9 });
assert(intent.status === 'pending', 'Initial status is pending');
intent.activate();
assert(intent.status === 'active', 'Activated status');
assert(intent.effectivePriority > 0.4, 'Effective priority computed');

intent.advance('Read documentation', 0.3);
assert(intent.progress === 0.3, 'Progress tracked');
assert(intent.plan.length === 1, 'Plan step recorded');

intent.block('Time constraint');
assert(intent.blockers.length === 1, 'Blocker recorded');
assert(intent.feasibility < 0.9, 'Feasibility reduced');

// Percept
const p = new Percept('market data', { modality: 'numerical', novelty: 0.8 });
assert(p._type === 'Percept', 'Percept has correct type');
assert(p.capturesAttention === true, 'High novelty captures attention');

p.process(raw => ({ length: String(raw).length }));
assert(p.processed === true, 'Processing marks as processed');
assert(p.features.length === 11, 'Features extracted');

const p2 = new Percept('news headline', { modality: 'textual', novelty: 0.5 });
const bound = p.bind(p2);
assert(bound.modality === 'numerical+textual', 'Cross-modal binding');

// MemoryTrace
const mem = new MemoryTrace('first meeting', { encoding_strength: 0.7, memory_type: 'episodic' });
assert(mem._type === 'MemoryTrace', 'MemoryTrace has correct type');
assert(mem.retrieval_count === 0, 'Initial retrieval count is 0');

mem.retrieve();
assert(mem.retrieval_count === 1, 'Retrieval count incremented');
assert(mem.encoding_strength > 0.7, 'Retrieval strengthens memory');

mem.associate('meeting_room', 0.6);
assert(mem.associations.length === 1, 'Association added');

mem.reconsolidate({ detail: 'it was raining' });
assert(mem.value.detail === 'it was raining', 'Reconsolidation modifies memory');

// CognitiveCollection
const coll = new CognitiveCollection([
  new CognitiveValue(1, { confidence: 0.9, salience: 0.3 }),
  new CognitiveValue(2, { confidence: 0.5, salience: 0.8 }),
  new CognitiveValue(3, { confidence: 0.3, salience: 0.5 })
]);
assert(coll.length === 3, 'Collection has 3 items');

const reliable = coll.reliable(0.5);
assert(reliable.length === 2, 'Reliable filter works');

const attended = coll.attend(2);
assert(attended.length === 2, 'Attend limits to N items');
assert(attended.items[0].salience >= attended.items[1].salience, 'Attend sorts by salience');

const consensus = coll.consensus();
assert(consensus instanceof CognitiveValue, 'Consensus returns CognitiveValue');

// TypeChecker
const tc = new TypeChecker();
const check1 = tc.checkInput('REASON', new Belief('test', { confidence: 0.6 }));
assert(check1.valid === true, 'Belief is valid input for REASON');

const check2 = tc.checkInput('DECIDE', new CognitiveValue('test', { confidence: 0.3 }));
assert(check2.valid === false, 'CognitiveValue is not valid for DECIDE');

const pipeline_check = tc.validatePipeline([
  { operation: 'PERCEIVE' },
  { operation: 'REASON' },
  { operation: 'DECIDE' }
]);
assert(pipeline_check.valid === true, 'Valid pipeline passes check');

// Factory functions
const fb = belief('test belief', 0.8);
assert(fb instanceof Belief, 'belief() creates Belief');
const fu = uncertain(50, 10);
assert(fu instanceof Uncertain, 'uncertain() creates Uncertain');
const ft = temporal(0);
assert(ft instanceof Temporal, 'temporal() creates Temporal');
const fe = emotion('happy', 0.7, 0.5);
assert(fe instanceof Emotion, 'emotion() creates Emotion');
const fi = intention('test goal', 0.6);
assert(fi instanceof Intention, 'intention() creates Intention');
const fp = percept('data', 'numerical');
assert(fp instanceof Percept, 'percept() creates Percept');
const fm = memory('event', 'episodic');
assert(fm instanceof MemoryTrace, 'memory() creates MemoryTrace');

// ============================================================
// STANDARD LIBRARY TESTS
// ============================================================

console.log('\n\n=== Standard Library Tests ===');

const { Reasoning, Decision, Learning, Attention, Pattern, Probability } = require('../src/stdlib');

// Reasoning.deductive
const deduction = Reasoning.deductive(
  [{ statement: 'All humans are mortal', confidence: 0.95 },
   { statement: 'Socrates is human', confidence: 0.99 }],
  'modus_ponens'
);
assert(deduction.type === 'deductive', 'Deductive reasoning type');
assert(deduction.confidence > 0.9, 'High confidence deduction');
assert(deduction.valid === true, 'Valid deduction');

// Reasoning.inductive
const induction = Reasoning.inductive([1, 1, 1, 1, 1, 1, 1], 5);
assert(induction.type === 'inductive', 'Inductive reasoning type');
assert(induction.sufficient === true, 'Sufficient observations');
assert(induction.confidence > 0.5, 'Reasonable inductive confidence');

// Reasoning.abductive
const abduction = Reasoning.abductive(
  { observation: 'wet grass' },
  [
    { explanation: 'it rained', prior: 0.6, likelihood: 0.9 },
    { explanation: 'sprinkler', prior: 0.3, likelihood: 0.7 },
    { explanation: 'dew', prior: 0.1, likelihood: 0.4 }
  ]
);
assert(abduction.type === 'abductive', 'Abductive reasoning type');
assert(abduction.best_explanation.explanation === 'it rained', 'Best explanation found');
assert(abduction.confidence > 0.4, 'Reasonable abductive confidence');

// Reasoning.analogical
const analogy = Reasoning.analogical(
  { features: { wings: true, flies: true, lays_eggs: true }, conclusion: 'is a bird' },
  { features: { wings: true, flies: true, has_fur: true } },
  0.5
);
assert(analogy.type === 'analogical', 'Analogical reasoning type');
assert(analogy.similarity > 0.5, 'Sufficient similarity');
assert(analogy.transferable === true, 'Transfer is valid');

// Reasoning.dialectical
const dialectic = Reasoning.dialectical(
  { statement: 'AI is beneficial', confidence: 0.7 },
  { statement: 'AI is dangerous', confidence: 0.6 }
);
assert(dialectic.type === 'dialectical', 'Dialectical reasoning type');
assert(dialectic.synthesis.incorporates_both === true, 'Synthesis incorporates both');

// Decision.multiCriteria
const decision = Decision.multiCriteria(
  [
    { name: 'Option A', criteria: { cost: 0.8, quality: 0.6, speed: 0.9 } },
    { name: 'Option B', criteria: { cost: 0.5, quality: 0.9, speed: 0.7 } }
  ],
  { cost: 0.3, quality: 0.5, speed: 0.2 }
);
assert(decision.type === 'multi_criteria', 'Multi-criteria decision type');
assert(decision.winner.name !== undefined, 'Winner selected');
assert(decision.ranking.length === 2, 'All options ranked');

// Decision.satisfice
const satisficed = Decision.satisfice(
  [
    { name: 'A', criteria: { cost: 0.3, quality: 0.8 } },
    { name: 'B', criteria: { cost: 0.6, quality: 0.7 } }
  ],
  { cost: 0.5, quality: 0.6 }
);
assert(satisficed.type === 'satisficing', 'Satisficing decision type');
assert(satisficed.chosen.name === 'B', 'First satisfactory option chosen');

// Decision.expectedValue
const ev = Decision.expectedValue([
  { name: 'Safe', probability: 0.9, payoff: 10 },
  { name: 'Risky', probability: 0.3, payoff: 50 }
]);
assert(ev.type === 'expected_value', 'Expected value decision type');
assert(ev.winner.name === 'Risky', 'Higher EV option wins');

// Decision.minimax
const mm = Decision.minimax([
  { name: 'Conservative', outcomes: [5, 10] },
  { name: 'Aggressive', outcomes: [-5, 30] }
]);
assert(mm.type === 'minimax', 'Minimax decision type');
assert(mm.winner.name === 'Conservative', 'Conservative wins minimax');

// Learning
const q_new = Learning.reinforcementUpdate(0.5, 1.0, 0.1, 0.9, 0.8);
assert(q_new > 0.5, 'Positive reward increases Q-value');

const w_new = Learning.hebbianUpdate(0.5, 0.8, 0.9, 0.01);
assert(w_new > 0.5, 'Correlated activity strengthens connection');

const posterior = Learning.bayesianUpdate(0.5, 0.9, 0.6);
assert(posterior > 0.5, 'Strong likelihood increases posterior');
assert(posterior <= 1.0, 'Posterior is valid probability');

const schedule = Learning.spacedRepetition(2.5, 6, 4);
assert(schedule.interval > 6, 'Good response increases interval');
assert(schedule.ease_factor >= 1.3, 'Ease factor stays above minimum');

// Attention
const saliency = Attention.saliencyMap([
  { content: 'urgent', novelty: 0.9, relevance: 0.8, urgency: 0.9 },
  { content: 'boring', novelty: 0.1, relevance: 0.2, urgency: 0.1 },
  { content: 'medium', novelty: 0.5, relevance: 0.5, urgency: 0.5 }
]);
assert(saliency[0].content === 'urgent', 'Most salient item first');
assert(saliency[0].attention_weight > saliency[2].attention_weight, 'Attention weights ordered');

const novelty = Attention.noveltyScore(100, [1, 2, 3, 4, 5]);
assert(novelty > 0.5, 'Distant value is novel');

const novelty_low = Attention.noveltyScore(3, [1, 2, 3, 4, 5]);
assert(novelty_low < 0.5, 'Similar value is not novel');

const change = Attention.changeDetection([1, 1, 1, 1, 1, 5, 6, 7], 0.7);
assert(change.changed === true, 'Change detected');
assert(change.direction === 'increase', 'Direction is increase');

// Pattern
const seq = Pattern.detectSequence([2, 4, 6, 8, 10]);
assert(seq.has_pattern === true, 'Pattern found in arithmetic sequence');
assert(seq.best_pattern.type === 'arithmetic', 'Arithmetic pattern detected');

const anomaly = Pattern.detectAnomaly(100, [10, 12, 11, 13, 10, 11]);
assert(anomaly.is_anomaly === true, '100 is anomaly in ~10 distribution');
assert(anomaly.severity === 'extreme', 'Extreme anomaly');

const sim = Pattern.similarity([1, 0, 1], [1, 0, 1]);
assert(Math.abs(sim - 1.0) < 0.001, 'Identical vectors have similarity ~1');

const sim2 = Pattern.similarity('hello', 'hallo');
assert(sim2 > 0.2, 'Similar strings have positive similarity');

// Probability
const softmax = Probability.softmax([1, 2, 3]);
assert(Math.abs(softmax.reduce((a, b) => a + b, 0) - 1.0) < 0.001, 'Softmax sums to 1');
assert(softmax[2] > softmax[1], 'Higher score gets higher probability');

const ent = Probability.entropy([0.5, 0.5]);
assert(Math.abs(ent - 1.0) < 0.001, 'Binary uniform has entropy 1');

const ci = Probability.confidenceInterval(70, 100);
assert(ci.point === 0.7, 'Point estimate correct');
assert(ci.lower < 0.7, 'Lower bound below point');
assert(ci.upper > 0.7, 'Upper bound above point');

// ============================================================
// MODULE SYSTEM TESTS
// ============================================================

console.log('\n\n=== Module System Tests ===');

const {
  CognitiveModule, ModuleRegistry, ModuleComposer,
  ModuleLoader, defineModule
} = require('../src/runtime/cognitive/module-system');

// CognitiveModule
const mod = new CognitiveModule({
  name: 'test_module',
  description: 'A test module',
  inputs: ['text'],
  outputs: ['Belief'],
  capabilities: ['analysis'],
  execute: (input) => ({ analyzed: input, confidence: 0.8 })
});
assert(mod.name === 'test_module', 'Module has name');
assert(mod.signature.inputs[0] === 'text', 'Module signature correct');

// Module execution
(async () => {
  const result = await mod.run('hello world');
  assert(result.success === true, 'Module executes successfully');
  assert(result.result.analyzed === 'hello world', 'Module produces correct output');
  assert(mod.usage_count === 1, 'Usage count incremented');

  // ModuleRegistry
  const registry = new ModuleRegistry();
  assert(registry.list().length >= 5, 'Registry has built-in modules');

  registry.register(mod);
  assert(registry.get('test_module') === mod, 'Module registered and retrievable');

  const found = registry.findByCapability('analysis');
  assert(found.length >= 1, 'Find by capability works');

  const recommended = registry.recommend('analyze data', ['analysis']);
  assert(recommended !== null, 'Recommendation works');

  // ModuleComposer
  const composer = new ModuleComposer(registry);
  const pipeline = composer.compose('test_pipeline', [
    { module: 'quick_analyzer', role: 'perceive' },
    { module: 'deep_reasoner', role: 'reason' }
  ]);
  assert(pipeline.name === 'test_pipeline', 'Pipeline created');
  assert(pipeline.describe().includes('perceive'), 'Pipeline describes steps');

  const pipe_result = await pipeline.execute([1, 2, 3, 4, 5]);
  assert(pipe_result.success === true, 'Pipeline executes');
  assert(pipe_result.trace.length === 2, 'Pipeline trace has 2 steps');

  // Auto-compose
  const auto = composer.autoCompose('analyze market');
  assert(auto.steps.length >= 2, 'Auto-compose creates pipeline');

  // defineModule fluent API
  const fluent_mod = defineModule('fluent_test')
    .version('2.0.0')
    .description('Built with fluent API')
    .accepts('numerical')
    .produces('Belief')
    .can('prediction')
    .tags('test', 'fluent')
    .does((input) => ({ predicted: input * 2, confidence: 0.7 }))
    .build();
  
  assert(fluent_mod.name === 'fluent_test', 'Fluent module has name');
  assert(fluent_mod.version === '2.0.0', 'Fluent module has version');
  
  const fluent_result = await fluent_mod.run(42);
  assert(fluent_result.success === true, 'Fluent module executes');
  assert(fluent_result.result.predicted === 84, 'Fluent module logic correct');

  // ============================================================
  // REPL SESSION TESTS (Programmatic API)
  // ============================================================

  console.log('\n\n=== REPL Session Tests ===');

  const { NoeonSession } = require('../src/repl');
  const session = new NoeonSession();

  // Think
  const think_result = await session.think('AI is transforming the world');
  assert(think_result.thought === 'AI is transforming the world', 'Think processes input');
  assert(think_result.cycle === 1, 'Cycle count incremented');

  // Believe
  const believe_result = await session.believe('Machine learning is powerful', 0.8);
  assert(believe_result.action === 'belief_asserted', 'Belief asserted');
  assert(believe_result.confidence === 0.8, 'Confidence stored');

  // Predict
  const predict_result = await session.predict('AI will surpass human reasoning');
  assert(predict_result.prediction === 'AI will surpass human reasoning', 'Prediction stored');
  assert(predict_result.confidence > 0, 'Prediction has confidence');

  // Reason
  const reason_result = await session.reason('Is AI beneficial?');
  assert(reason_result !== null, 'Reasoning produces result');

  // Reflect
  const reflect_result = await session.reflect();
  assert(reflect_result.session_duration_s !== undefined, 'Reflection includes duration');
  assert(reflect_result.beliefs_count >= 1, 'Reflection counts beliefs');
  assert(reflect_result.cognitive_state !== undefined, 'Reflection assesses state');

  // Memory
  const mem_result = await session.memory();
  assert(mem_result.working_memory.length > 0, 'Working memory has items');

  // Beliefs
  const beliefs_result = await session.beliefs();
  assert(beliefs_result.total >= 1, 'Beliefs inventory works');

  // Workspace
  const ws_result = await session.workspace();
  assert(ws_result.cycles > 0, 'Workspace shows cycles');

  // Status
  const status_result = await session.status();
  assert(status_result.engine.includes('Noeon'), 'Status shows engine name');
  assert(status_result.modules.registered >= 5, 'Status shows modules');

  // Type
  const type_result = await session.type('belief');
  assert(type_result.description.includes('Belief'), 'Type info for belief');

  // Evolve
  const evolve_result = await session.evolve();
  assert(evolve_result.total_interactions > 0, 'Evolution sees interactions');

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log(`\n\n=== Results ===`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  
  if (failed > 0) process.exit(1);
  else console.log('\n  All tests passed!\n');
})();
