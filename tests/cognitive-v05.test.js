/**
 * Noeon AI v0.5 — Competitive Edge Test Suite
 * 
 * Tests for:
 * 1. ConsciousnessStream (continuous thinking)
 * 2. UncertainValue (uncertainty-native values)
 * 3. TemporalAwareness (time-native cognition)
 * 4. MetaLanguageEngine (self-modifying syntax)
 * 5. MultiModalPerception (multi-channel sensing)
 * 6. CognitiveDebugger (mind inspector)
 * 7. KnowledgeGraph (causal reasoning)
 */

const {
  ConsciousnessStream, Thought, UncertainValue, TemporalAwareness,
  MetaLanguageEngine, SyntaxRule, MacroDefinition,
  MultiModalPerception, PerceptualChannel, Percept,
  CognitiveDebugger, ThoughtTrace, DecisionTrace,
  KnowledgeGraph, Entity, Relation, CausalChain
} = require("../src/runtime/cognitive");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${msg}`);
  } else {
    failed++;
    console.log(`  \u2717 FAIL: ${msg}`);
  }
}

// ==================== 1. UncertainValue ====================
console.log("\n=== UncertainValue (Uncertainty-Native) ===");

const uv1 = new UncertainValue(42, 0.8, { source: "measurement" });
assert(uv1.value === 42, "UncertainValue stores value");
assert(uv1.confidence === 0.8, "UncertainValue stores confidence");
assert(Math.abs(uv1.uncertainty - 0.2) < 0.001, "Uncertainty is 1 - confidence");
assert(uv1.source === "measurement", "Source tracked");

uv1.update(44, 0.6, "observation");
assert(uv1.value > 42 && uv1.value < 44, "Bayesian update blends values");
assert(uv1.confidence > 0.8, "Confidence increases with evidence");
assert(uv1.history.length === 2, "History tracked");

const uv2 = new UncertainValue(100, 0.9);
assert(uv2.isActionable(0.8), "High confidence is actionable");
assert(!uv2.isActionable(0.95), "Very high threshold not actionable");

const bounds = uv2.withBounds();
assert(bounds.lower < bounds.value, "Lower bound exists");
assert(bounds.upper > bounds.value, "Upper bound exists");

const uv3 = new UncertainValue(50, 0.5);
uv3.merge(new UncertainValue(60, 0.7));
assert(uv3.value > 50, "Merge shifts toward higher confidence value");

assert(uv1.toString().includes("conf:"), "toString shows confidence");

// ==================== 2. TemporalAwareness ====================
console.log("\n=== TemporalAwareness (Time-Native) ===");

const temporal = new TemporalAwareness();
assert(temporal.uptime >= 0, "Uptime tracked");

temporal.record({ type: "event_a" });
temporal.record({ type: "event_b" });
assert(temporal.timeline.length === 2, "Events recorded");

const ant = temporal.anticipate({ type: "event_c" }, 5000, 0.7);
assert(ant.confidence === 0.7, "Anticipation created with confidence");
assert(!ant.fulfilled, "Anticipation not yet fulfilled");

const recalled = temporal.recall("event_a");
assert(recalled.length > 0, "Can recall past events");

temporal.record({ type: "tick" });
temporal.record({ type: "tick" });
temporal.record({ type: "tick" });
const prediction = temporal.predictNext("tick");
assert(prediction !== null, "Can predict rhythmic events");
assert(prediction.eventType === "tick", "Prediction matches event type");

temporal.adjustSpeed(0.9);
assert(temporal.subjective_speed > 1.0, "High load speeds up subjective time");

// ==================== 3. ConsciousnessStream ====================
console.log("\n=== ConsciousnessStream (Continuous Thinking) ===");

const stream = new ConsciousnessStream({ cycleInterval: 100 });
assert(stream.running === false, "Stream starts stopped");

stream.believe("sky_color", "blue", 0.95);
const belief = stream.getBelief("sky_color");
assert(belief.value === "blue", "Beliefs stored");
assert(belief.confidence <= 0.95, "Belief confidence stored");

const thought = stream.inject("important observation", { salience: 0.9, type: "observation" });
assert(thought.id.startsWith("thought_"), "Thought has ID");
assert(thought.salience === 0.9, "Thought salience set");
assert(thought.type === "observation", "Thought type set");

stream.setGoal("learn", { priority: 0.8 });
const state = stream.getState();
assert(state.goals.length === 1, "Goal registered");
assert(state.goals[0].name === "learn", "Goal name correct");

stream.registerReflex("danger", { action: "flee" });
assert(stream.reflexes.size === 1, "Reflex registered");

stream.inject("another thought", { salience: 0.5 });
assert(stream.thoughts.length >= 2, "Multiple thoughts in stream");

assert(stream.stats.thoughtsGenerated >= 2, "Stats track thoughts");

// ==================== 4. MetaLanguageEngine ====================
console.log("\n=== MetaLanguageEngine (Self-Modifying Syntax) ===");

const meta = new MetaLanguageEngine();
assert(meta.vocabulary.size > 30, "Built-in vocabulary loaded");

const result = meta.define("INVESTIGATE", {
  pattern: "quoted_or_kv",
  expansion: [
    { keyword: "ATTEND", template: "target={{input}}" },
    { keyword: "REASON", template: "strategy=abductive depth=3" },
    { keyword: "CONSOLIDATE", template: "from=workspace to=episodic" }
  ],
  description: "Deep investigation macro"
});
assert(result.success, "Custom keyword defined");
assert(meta.vocabulary.has("INVESTIGATE"), "Vocabulary updated");

const expansion = meta.expand("INVESTIGATE", '"anomaly detected"');
assert(expansion !== null, "Custom keyword expands");
assert(expansion.type === "rule", "Expansion type is rule");

const macro = meta.macro("QUICK_THINK", [
  { keyword: "INTUIT", template: "{{question}} using=pattern_match" },
  { keyword: "DECIDE", template: "threshold=0.6" }
], ["question"]);
assert(macro.name === "QUICK_THINK", "Macro created");

const macroExpansion = meta.expand("QUICK_THINK", '"Is this safe?"');
assert(macroExpansion.type === "macro", "Macro expansion works");
assert(macroExpansion.steps.length === 2, "Macro has 2 steps");

// Observe usage patterns
for (let i = 0; i < 10; i++) {
  meta.observe("INTUIT", "test");
  meta.observe("REASON", "test");
  meta.observe("DECIDE", "test");
}
assert(meta.usagePatterns.length === 30, "Usage patterns tracked");

const introspection = meta.introspect();
assert(introspection.grammarVersion >= 1, "Grammar version tracked");
assert(introspection.vocabularySize > 30, "Vocabulary size reported");
assert(introspection.topPatterns.length > 0, "Patterns detected");

const evolution = meta.evolveGrammar();
assert(evolution.version > 1, "Grammar evolved");

const suggestions = meta.suggest();
assert(Array.isArray(suggestions), "Suggestions returned");

// Define with aliases
meta.define("EXPLORE", {
  pattern: "quoted",
  expansion: [],
  aliases: ["DISCOVER", "SEARCH_DEEP"]
});
assert(meta.vocabulary.has("EXPLORE"), "EXPLORE defined");
assert(meta.vocabulary.has("DISCOVER"), "Alias DISCOVER registered");

// ==================== 5. MultiModalPerception ====================
console.log("\n=== MultiModalPerception (Multi-Channel Sensing) ===");

const perception = new MultiModalPerception();
assert(perception.channels.size === 6, "6 default channels");

const textPercept = perception.read("The market is showing strong growth signals");
assert(textPercept !== null, "Text perception works");
const textFeatures = textPercept.raw.features;
assert(textFeatures.keywords.length > 0, "Keywords extracted");
assert(textFeatures.sentiment !== undefined, "Sentiment analyzed");
assert(textFeatures.intent !== undefined, "Intent detected");

const numPercept = perception.measure([10, 12, 15, 18, 22, 25, 30]);
assert(numPercept !== null, "Numerical perception works");
const numFeatures = numPercept.raw.features;
assert(numFeatures.stats.mean > 0, "Mean calculated");
assert(numFeatures.trend === "rising", "Trend detected as rising");

const numPercept2 = perception.measure([100, 95, 88, 80, 72, 65]);
assert(numPercept2.raw.features.trend === "falling", "Falling trend detected");

const visualPercept = perception.look({ width: 1920, height: 1080, objects: [
  { id: "a", x: 10, y: 20 },
  { id: "b", x: 100, y: 20 }
]});
assert(visualPercept !== null, "Visual perception works");
assert(visualPercept.raw.features.dimensions !== undefined, "Dimensions extracted");

const audioPercept = perception.listen("Hello, this is a great product!");
assert(audioPercept !== null, "Auditory perception works");
assert(audioPercept.raw.features.hasSpeech, "Speech detected");
assert(audioPercept.raw.features.sentiment > 0, "Positive sentiment in speech");

const timePercept = perception.feelTime([1000, 2000, 3000, 4000, 5000]);
assert(timePercept !== null, "Temporal perception works");
assert(timePercept.raw.features.rhythm === "regular", "Regular rhythm detected");

const bodyPercept = perception.introspect({ cpuLoad: 0.95, memoryUsage: 0.5 });
assert(bodyPercept !== null, "Proprioceptive perception works");
assert(bodyPercept.raw.features.health === "stressed", "Stress detected");

// Attention shift
const shift = perception.attend("textual");
assert(shift.current === "textual", "Attention shifted");

const perceptionState = perception.getState();
assert(perceptionState.channels.length === 6, "State reports all channels");

// Multi-modal perception
const unified = perception.perceiveAll({
  textual: { input: "alert: anomaly detected", features: {} },
  numerical: { input: [99, 98, 95, 50, 10], features: {} }
});
assert(unified !== null, "Multi-modal perception works");

// ==================== 6. CognitiveDebugger ====================
console.log("\n=== CognitiveDebugger (Mind Inspector) ===");

const debugger_ = new CognitiveDebugger({ verbosity: "verbose" });
assert(debugger_.enabled, "Debugger enabled by default");

debugger_.traceThought({ id: "t1", content: "test thought", type: "observation", salience: 0.7 });
assert(debugger_.thoughtHistory.length === 1, "Thought traced");

debugger_.traceDecision(
  { action: "buy", confidence: 0.8, emotionalInfluence: 0.2 },
  [{ key: "price", value: 50, weight: 0.6 }, { key: "quality", value: 0.9, weight: 0.4 }],
  [{ action: "wait" }, { action: "sell" }]
);
assert(debugger_.decisionHistory.length === 1, "Decision traced");

const whyResult = debugger_.why(-1);
assert(whyResult.decision.action === "buy", "WHY returns correct decision");
assert(whyResult.reasoning.length > 0, "Reasoning explanation generated");
assert(whyResult.alternatives.length === 2, "Alternatives recorded");

const whatIfResult = debugger_.whatIf(-1, { price: 200 });
assert(whatIfResult.differences.length > 0, "What-if analysis works");

debugger_.traceAttention("idle", "analysis", "new data arrived");
debugger_.traceAttention("analysis", "decision", "analysis complete");
const attProfile = debugger_.attentionProfile(60000);
assert(attProfile.shifts === 2, "Attention shifts counted");

debugger_.traceSurprise("market up", "market crash", 0.9);
assert(debugger_.surpriseLog.length === 1, "Surprise logged");

debugger_.traceEmotion({ valence: -0.5, arousal: 0.8 }, "market crash");
assert(debugger_.emotionLog.length === 1, "Emotion logged");
assert(debugger_.emotionLog[0].label === "distressed", "Emotion labeled correctly");

// Breakpoints
let breakpointHit = false;
debugger_.setBreakpoint("high_surprise", 
  (type, data) => type === "surprise" && data.magnitude > 0.8,
  () => { breakpointHit = true; }
);
debugger_.traceSurprise("stable", "volatile", 0.95);
assert(breakpointHit, "Breakpoint triggered on condition");

// Watchpoints
let watchHit = false;
debugger_.watch("price", (belief) => { watchHit = true; });
const beliefs = new Map();
beliefs.set("price", { value: 100, confidence: 0.9, source: "market", timestamp: Date.now() });
debugger_.snapshotBeliefs(beliefs);
assert(watchHit, "Watchpoint triggered");

const metrics = debugger_.getMetrics();
assert(metrics.thoughtsPerSecond !== undefined, "Metrics calculated");

const fullState = debugger_.fullState();
assert(fullState.metrics !== undefined, "Full state includes metrics");
assert(fullState.recentThoughts !== undefined, "Full state includes thoughts");
assert(fullState.recentDecisions !== undefined, "Full state includes decisions");

// Event system
let eventReceived = false;
debugger_.on("thought", () => { eventReceived = true; });
debugger_.traceThought({ id: "t2", content: "event test", type: "plan", salience: 0.5 });
assert(eventReceived, "Event listener works");

// ==================== 7. KnowledgeGraph ====================
console.log("\n=== KnowledgeGraph (Causal Reasoning) ===");

const kg = new KnowledgeGraph();

// Build knowledge
kg.know("rain", "weather", { intensity: "heavy" });
kg.know("flood", "disaster", { severity: "high" });
kg.know("wet_roads", "condition", { danger: "medium" });
kg.know("traffic_jam", "event", { duration: "long" });
kg.know("late_arrival", "consequence", {});
kg.know("umbrella", "tool", { purpose: "protection" });

assert(kg.entities.size === 6, "Entities created");

// Create causal relations
kg.cause("rain", "wet_roads", 0.9);
kg.cause("rain", "flood", 0.6);
kg.cause("wet_roads", "traffic_jam", 0.7);
kg.cause("traffic_jam", "late_arrival", 0.8);
kg.relate("umbrella", "rain", "prevents", { confidence: 0.8 });
kg.relate("rain", "flood", "causes", { confidence: 0.6 });

assert(kg.relations.length >= 5, "Relations created");
assert(kg.causalLinks.length >= 4, "Causal links tracked");

// WHY: Why is there a traffic jam?
const whyCauses = kg.why("traffic_jam");
assert(whyCauses.length > 0, "WHY finds causal chains");
assert(whyCauses[0].steps.length > 0, "Causal chain has steps");

// WHAT_CAUSES
const causes = kg.whatCauses("traffic_jam");
assert(causes.direct.length > 0, "Direct causes found");
assert(causes.direct[0].cause === "wet_roads", "Correct direct cause");

// WHAT_EFFECTS
const effects = kg.whatEffects("rain");
assert(effects.length > 0, "Effects found");

// INTERVENE: What if we stop the rain?
const intervention = kg.intervene("rain", false);
assert(intervention.totalAffected > 0, "Intervention propagates");
assert(intervention.directEffects.length > 0, "Direct effects identified");

// COUNTERFACTUAL
const cf = kg.counterfactual("rain", { intensity: "none" });
assert(cf.wouldChange.length > 0, "Counterfactual identifies changes");

// CONNECT: How are rain and late_arrival related?
const connection = kg.connect("rain", "late_arrival");
assert(connection.found, "Connection found");
assert(connection.length > 0, "Path has length");

// SIMILAR
kg.know("snow", "weather", { intensity: "medium" });
kg.relate("snow", "rain", "similar_to", { weight: 0.7 });
const similar = kg.similar("rain");
assert(similar.length > 0, "Similar entities found");

// ANALOGIZE
kg.know("sun", "weather", {});
kg.know("dry_roads", "condition", {});
kg.relate("sun", "dry_roads", "causes", { confidence: 0.9 });
const analogy = kg.analogize("rain", "wet_roads", "sun");
assert(analogy.found, "Analogy found");
assert(analogy.answer === "dry_roads", "Correct analogical answer");

// GAPS
const gaps = kg.gaps();
assert(Array.isArray(gaps), "Gaps identified");

// CONTRADICTIONS
kg.relate("rain", "flood", "prevents", { confidence: 0.3 }); // Contradicts causes
const contradictions = kg.contradictions();
assert(contradictions.length > 0, "Contradiction detected");

// SPREADING ACTIVATION
const activated = kg.activate("rain", 1.0, 0.5, 3);
assert(activated.length > 1, "Activation spreads");
assert(activated[0].id === "rain", "Source has highest activation");

const mostActive = kg.mostActive(5);
assert(mostActive.length > 0, "Most active entities returned");

kg.decayAll(0.1);
const afterDecay = kg.mostActive(5);
assert(afterDecay[0].activation < activated[0].activation, "Decay reduces activation");

// Export
const exported = kg.export();
assert(exported.entities.length === kg.entities.size, "Export includes all entities");
assert(exported.relations.length === kg.relations.length, "Export includes all relations");

const graphState = kg.getState();
assert(graphState.entities > 0, "State reports entity count");
assert(graphState.relationTypes.length > 0, "State reports relation types");

// ==================== Results ====================
console.log("\n==================================================");
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log("==================================================");

process.exit(failed > 0 ? 1 : 0);
