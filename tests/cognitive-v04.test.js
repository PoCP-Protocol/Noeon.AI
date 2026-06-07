/**
 * Noeon AI v0.4 Cognitive Architecture Tests
 * 
 * Tests for:
 * - LLM Bridge
 * - Semantic Memory (Vector Index)
 * - Social Brain (Multi-Agent)
 * - Evolution Engine
 * - Cognitive Flow Control
 * - Extended Parser (new primitives)
 */

const {
  LLMBridge,
  SemanticMemory,
  VectorIndex,
  SocialBrain,
  EvolutionEngine,
  Gene,
  CognitiveFlow,
  CognitiveEngine
} = require("../src/runtime/cognitive");

const { parseAel } = require("../src/parser");
const fs = require("fs");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function section(title) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(50));
}

// ==================== Vector Index Tests ====================
section("Vector Index");

(function testVectorIndex() {
  const index = new VectorIndex(4);

  // Add vectors
  index.add("a", [1, 0, 0, 0], { tags: ["first"] });
  index.add("b", [0.9, 0.1, 0, 0], { tags: ["similar"] });
  index.add("c", [0, 0, 1, 0], { tags: ["different"] });
  index.add("d", [0, 1, 0, 0], { tags: ["orthogonal"] });

  assert(index.size === 4, "Index stores 4 entries");

  // Search
  const results = index.search([1, 0, 0, 0], 2);
  assert(results.length === 2, "Search returns top 2");
  assert(results[0].id === "a", "Exact match is first");
  assert(results[1].id === "b", "Similar vector is second");
  assert(results[0].similarity > 0.99, "Exact match has ~1.0 similarity");

  // Neighborhood
  const neighbors = index.neighborhood([1, 0, 0, 0], 0.8);
  assert(neighbors.length === 2, "Neighborhood finds 2 vectors above 0.8");

  // Cluster
  const clusters = index.cluster(2);
  assert(clusters.length >= 1, "Clustering produces at least 1 cluster");
  assert(clusters.reduce((sum, c) => sum + c.length, 0) === 4, "All entries are in clusters");

  // Remove
  index.remove("c");
  assert(index.size === 3, "Remove reduces size");
})();

// ==================== LLM Bridge Tests ====================
section("LLM Bridge (offline mode)");

(function testLLMBridge() {
  const bridge = new LLMBridge({
    apiBase: "http://localhost:99999", // Intentionally unreachable for offline test
    apiKey: "test-key",
    model: "test-model",
    timeout: 1000
  });

  assert(bridge.defaultModel === "test-model", "Model configured correctly");
  assert(bridge.apiKey === "test-key", "API key configured");
  assert(bridge.stats.totalCalls === 0, "Stats start at 0");

  // Test pseudo-embedding (fallback)
  bridge.embed("hello world").then(result => {
    assert(result.vector.length === 64, "Pseudo-embed returns 64-dim vector");
    assert(result.model === "pseudo-hash", "Fallback model is pseudo-hash");
  });

  // Test different embeddings for different texts
  Promise.all([
    bridge.embed("hello world"),
    bridge.embed("completely different text")
  ]).then(([e1, e2]) => {
    const dot = e1.vector.reduce((sum, v, i) => sum + v * e2.vector[i], 0);
    assert(dot < 0.99, "Different texts produce different embeddings");
  });
})();

// ==================== Semantic Memory Tests ====================
section("Semantic Memory");

(async function testSemanticMemory() {
  const bridge = new LLMBridge({ apiBase: "http://localhost:99999", timeout: 100 });
  const memory = new SemanticMemory(bridge, { dimensions: 64, maxMemories: 100 });

  // Store
  const m1 = await memory.store("The cat sat on the mat", { tags: ["animal", "location"] });
  assert(m1.id.startsWith("smem_"), "Memory ID has correct prefix");
  assert(m1.embedding.length === 64, "Memory has embedding");
  assert(m1.tags.includes("animal"), "Tags preserved");

  const m2 = await memory.store("The dog ran in the park", { tags: ["animal", "action"] });
  const m3 = await memory.store("Quantum physics is complex", { tags: ["science"] });

  assert(memory.memories.size === 3, "Three memories stored");

  // Recall
  const recalled = await memory.recall("animals doing things", { limit: 2 });
  assert(recalled.length >= 1, "Recall returns results");

  // Consolidate
  const consolidated = memory.consolidate();
  assert(consolidated.totalMemories === 3, "Consolidation reports correct count");

  // Stats
  const stats = memory.getStats();
  assert(stats.stored === 3, "Stats track stored count");
  assert(stats.recalled >= 1, "Stats track recall count");

  // Concepts
  const concepts = memory.getConcepts(2);
  assert(concepts.length >= 1, "Concepts extracted");
})();

// ==================== Social Brain Tests ====================
section("Social Brain (Multi-Agent)");

(async function testSocialBrain() {
  const social = new SocialBrain({
    name: "research_team",
    protocol: "democratic",
    consensusThreshold: 0.5
  });

  // Spawn agents
  const a1 = social.spawn("analyst", { specialty: "data_analysis", weight: 1.2 });
  const a2 = social.spawn("theorist", { specialty: "hypothesis_generation", weight: 1.0 });
  const a3 = social.spawn("critic", { specialty: "logical_validation", weight: 1.1 });

  assert(social.agents.size === 3, "Three agents spawned");
  assert(a1.role.specialty === "data_analysis", "Agent has correct specialty");
  assert(a1.role.weight === 1.2, "Agent has correct weight");

  // Messaging
  const msg = social.broadcast("analyst", "proposal", "Let's analyze the data first");
  assert(msg.from === "analyst", "Message has correct sender");
  assert(msg.to === null, "Broadcast has null target");
  assert(social.stats.messagesExchanged === 1, "Message counted");

  const dm = social.send("analyst", "critic", "query", "What do you think?");
  assert(dm.to === "critic", "Direct message has target");

  // Share knowledge
  const shared = social.shareKnowledge("analyst", { finding: "correlation found" }, ["data"]);
  assert(shared.key.startsWith("knowledge_"), "Knowledge has ID");
  assert(social.sharedMemory.size === 1, "Shared memory updated");

  // Dismiss
  social.dismiss("critic");
  assert(social.agents.size === 2, "Agent dismissed");

  // Social state
  const state = social.getSocialState();
  assert(state.agentCount === 2, "State reports correct count");
  assert(state.protocol === "democratic", "Protocol reported");
  assert(state.sharedKnowledge === 1, "Shared knowledge reported");
})();

// ==================== Evolution Engine Tests ====================
section("Evolution Engine");

(function testEvolutionEngine() {
  const evo = new EvolutionEngine({
    genome: { mutationRate: 0.3, crossoverRate: 0.5, pruneThreshold: 0.1 }
  });

  // Register rules
  const g1 = evo.registerRule("hypothesis_gen", { strategy: "brainstorm", creativity: 0.8 });
  const g2 = evo.registerRule("validation", { strategy: "rigorous", threshold: 0.9 });
  const g3 = evo.registerRule("synthesis", { strategy: "combine", breadth: 3 });

  assert(evo.genome.size === 3, "Three genes registered");
  assert(g1.fitness === 0.5, "Initial fitness is 0.5");
  assert(g1.type === "rule", "Gene type is rule");

  // Evaluate
  const eval1 = evo.evaluate(g1.id, 0.9);
  assert(eval1.newFitness > 0.5, "Positive outcome increases fitness");

  const eval2 = evo.evaluate(g2.id, 0.1);
  assert(eval2.newFitness < 0.5, "Negative outcome decreases fitness");

  // Mutate
  const mutant = evo.mutate(g1.id, "parameter_shift");
  assert(mutant !== null, "Mutation produces offspring");
  assert(mutant.parentIds.includes(g1.id), "Mutant tracks parent");
  assert(evo.stats.mutations === 1, "Mutation counted");

  // Crossover
  const offspring = evo.crossover(g1.id, g3.id);
  assert(offspring !== null, "Crossover produces offspring");
  assert(offspring.parentIds.length === 2, "Offspring has two parents");
  assert(evo.stats.crossovers === 1, "Crossover counted");

  // Self-modify
  const mod = evo.selfModify("hypothesis_gen", { strategy: "evolved_brainstorm", creativity: 0.95 }, "improved through experience");
  assert(mod.success, "Self-modification succeeds");
  assert(mod.version === 2, "Version incremented");
  assert(evo.stats.selfModifications === 1, "Self-modification counted");

  // Learn pattern
  const pat1 = evo.learnPattern({ signature: "predict_then_validate", template: { steps: ["predict", "validate"] } });
  assert(pat1.occurrences === 1, "Pattern recorded once");

  // Repeat pattern to trigger promotion
  for (let i = 0; i < 5; i++) {
    evo.learnPattern({ signature: "predict_then_validate", template: { steps: ["predict", "validate"] } });
  }
  const pat2 = evo.patternLibrary.find(p => p.signature === "predict_then_validate");
  assert(pat2.occurrences === 6, "Pattern count accumulated");
  assert(pat2.promoted === true, "Frequent pattern promoted to gene");

  // Evolve
  const results = evo.evolve();
  assert(results.generation > 0, "Generation incremented");
  assert(evo.stats.generations === 1, "Generation counted");

  // Synthesize
  const synth = evo.synthesize({ name: "new_strategy", type: "strategy" });
  assert(synth.success, "Synthesis succeeds");

  // Freeze
  evo.registerRule("proven_method", { strategy: "tested" });
  const frozenGene = Array.from(evo.genome.genes.values()).find(g => g.name === "proven_method");
  frozenGene.frozen = true;
  const failedMutate = evo.mutate(frozenGene.id);
  assert(failedMutate === null, "Frozen gene cannot be mutated");

  // State
  const state = evo.getEvolutionState();
  assert(state.genome.geneCount > 3, "Genome grew through evolution");
  assert(state.patterns.promoted === 1, "State reports promoted patterns");
})();

// ==================== Cognitive Flow Tests ====================
section("Cognitive Flow Control");

(async function testCognitiveFlow() {
  const engine = new CognitiveEngine();
  const flow = new CognitiveFlow(engine);

  // WHEN_SALIENT
  const salientResult = await flow.whenSalient([
    { check: "urgent_task", threshold: 0.5, relevance: 0.8, urgency: 0.9, then: "handle_urgent" },
    { check: "routine_task", threshold: 0.5, relevance: 0.3, urgency: 0.2, then: "handle_routine" }
  ], { exclusive: true });
  assert(salientResult.type === "when_salient", "WhenSalient returns correct type");
  assert(salientResult.results.length >= 1, "WhenSalient evaluates conditions");
  assert(salientResult.results[0].executed === true, "High-salience condition executes");

  // HABITUATE
  const habit = flow.habituate("greeting", { response: "Hello!", confidence: 0.99 });
  assert(habit.habituated === true, "Habit created");

  const cached = flow.getHabit("greeting");
  assert(cached !== null, "Habit retrieved");
  assert(cached.response === "Hello!", "Habit returns cached response");
  assert(flow.stats.habitsUsed === 1, "Habit use counted");

  const noHabit = flow.getHabit("unknown");
  assert(noHabit === null, "Non-existent habit returns null");

  // PRIME
  const primed = flow.prime("science", ["hypothesis", "experiment", "data"]);
  assert(primed.concept === "science", "Priming returns concept");
  assert(primed.associations.length === 3, "Priming stores associations");

  const boost = flow.getPriming("science");
  assert(boost > 0, "Primed concept has boost");

  const noBoost = flow.getPriming("unprimed");
  assert(noBoost === 0, "Unprimed concept has no boost");

  // INHIBIT
  const inhibited = flow.inhibit("distraction", 1000);
  assert(inhibited.inhibited === true, "Pathway inhibited");
  assert(flow.isInhibited("distraction"), "Inhibition check works");
  assert(!flow.isInhibited("focus"), "Non-inhibited pathway is free");

  // DREAM
  const dream = flow.dream("consolidate memories", { priority: "low", delay: 0 });
  assert(dream.status === "queued", "Dream queued");
  assert(dream.id.startsWith("dream_"), "Dream has ID");

  const dreamResults = await flow.processDreams();
  assert(dreamResults.processed >= 0, "Dreams processed");

  // ON_SURPRISE
  let surpriseTriggered = false;
  flow.onSurprise(async (error, ctx) => {
    surpriseTriggered = true;
    return { handled: true };
  }, { threshold: 0.5 });

  await flow.triggerSurprise(0.8, { source: "test" });
  assert(surpriseTriggered, "Surprise handler triggered");
  assert(flow.stats.surprisesHandled === 1, "Surprise counted");

  // RUMINATE
  const rumination = await flow.ruminate("meaning of life", {
    maxIterations: 3,
    confidenceTarget: 0.99,
    decay: 0.1
  });
  assert(rumination.type === "ruminate", "Rumination returns correct type");
  assert(rumination.iterations <= 3, "Rumination respects max iterations");
  assert(rumination.insights.length > 0, "Rumination produces insights");

  // COMPETE
  const competition = await flow.compete([
    { name: "option_a", query: "fast approach" },
    { name: "option_b", query: "thorough approach" }
  ], { strategy: "strongest" });
  assert(competition.type === "compete", "Competition returns correct type");
  assert(competition.winner !== undefined, "Competition has a winner");

  // State
  const state = flow.getState();
  assert(state.habits >= 1, "State reports habits");
  assert(state.primes >= 1, "State reports primes");
  assert(state.stats.flowsExecuted >= 3, "Flows executed counted");
})();

// ==================== Extended Parser Tests ====================
section("Extended Parser (v0.4 primitives)");

(function testExtendedParser() {
  // Test parsing the advanced contract
  const src = fs.readFileSync(__dirname + "/../examples/cognitive_advanced.ael", "utf8");
  const ast = parseAel(src);

  assert(ast.version === "0.4-cognitive", "Version parsed correctly");
  assert(ast.task === "autonomous_research_team", "Task parsed");

  // Cognitive primitives
  assert(ast.cognitive.drives.length === 2, "Two drives parsed");
  assert(ast.cognitive.workspace !== null, "Workspace parsed");
  assert(ast.cognitive.emotions.length === 1, "Emotion parsed");
  assert(ast.cognitive.predictions.length === 1, "Prediction parsed");
  assert(ast.cognitive.intuitions.length === 1, "Intuition parsed");
  assert(ast.cognitive.reasonings.length === 1, "Reasoning parsed");
  assert(ast.cognitive.decisions.length === 1, "Decision parsed");
  assert(ast.cognitive.monitors.length === 1, "Monitor parsed");
  assert(ast.cognitive.reflections.length === 1, "Reflection parsed");
  assert(ast.cognitive.consolidations.length === 1, "Consolidation parsed");
  assert(ast.cognitive.adaptations.length === 1, "Adaptation parsed");

  // Flow control
  assert(ast.cognitiveFlow.primes.length === 2, "Two primes parsed");
  assert(ast.cognitiveFlow.ruminations.length === 1, "Rumination parsed");
  assert(ast.cognitiveFlow.perceiveAll.length === 1, "PerceiveAll parsed");
  assert(ast.cognitiveFlow.competitions.length === 1, "Competition parsed");
  assert(ast.cognitiveFlow.surpriseHandlers.length === 1, "Surprise handler parsed");
  assert(ast.cognitiveFlow.dreams.length === 1, "Dream parsed");

  // Social
  assert(ast.social.spawns.length === 4, "Four agents spawned");
  assert(ast.social.debates.length === 1, "Debate parsed");
  assert(ast.social.votes.length === 1, "Vote parsed");
  assert(ast.social.shares.length === 1, "Share parsed");
  assert(ast.social.dismissals.length === 1, "Dismissal parsed");

  // Evolution
  assert(ast.evolution.evolves.length === 1, "Evolve parsed");
  assert(ast.evolution.mutations.length === 1, "Mutation parsed");
  assert(ast.evolution.syntheses.length === 1, "Synthesis parsed");
  assert(ast.evolution.freezes.length === 1, "Freeze parsed");

  // LLM
  assert(ast.llm.asks.length === 1, "ASK parsed");
  assert(ast.llm.thinkWiths.length === 1, "THINK_WITH parsed");

  // Verify parsed values
  const spawn = ast.social.spawns[0];
  assert(spawn.name === "analyst", "Spawn name correct");
  assert(spawn.specialty === "data_analysis", "Spawn specialty correct");
  assert(spawn.weight === 1.2, "Spawn weight correct");

  const evolve = ast.evolution.evolves[0];
  assert(evolve.generations === 3, "Evolve generations correct");
  assert(evolve.mutation_rate === 0.15, "Evolve mutation rate correct");

  const ruminate = ast.cognitiveFlow.ruminations[0];
  assert(ruminate.topic === "synthesize findings into coherent theory", "Ruminate topic correct");
  assert(ruminate.maxIterations === 8, "Ruminate max iterations correct");
  assert(ruminate.confidenceTarget === 0.8, "Ruminate confidence target correct");

  const ask = ast.llm.asks[0];
  assert(ask.query === "What are the key factors in this research domain?", "ASK query correct");
  assert(ask.temperature === 0.5, "ASK temperature correct");
})();

// ==================== Backward Compatibility Tests ====================
section("Backward Compatibility");

(function testBackwardCompat() {
  // Legacy contract should still parse
  const legacySrc = fs.readFileSync(__dirname + "/../examples/noeon_superbrain.ael", "utf8");
  const legacyAst = parseAel(legacySrc);
  assert(legacyAst.network !== null, "Legacy contract parses network");
  assert(legacyAst.task !== null, "Legacy contract parses task");

  // Cognitive minimal should still work
  const minSrc = fs.readFileSync(__dirname + "/../examples/cognitive_minimal.ael", "utf8");
  const minAst = parseAel(minSrc);
  assert(minAst.cognitive.drives.length > 0, "Minimal cognitive contract parses drives");
  assert(minAst.cognitive.decisions.length > 0, "Minimal cognitive contract parses decisions");
})();

// ==================== Integration Test ====================
section("Integration: Full Cognitive Pipeline");

(async function testIntegration() {
  // Create a full cognitive system with all components
  const engine = new CognitiveEngine();
  const bridge = new LLMBridge({ apiBase: "http://localhost:99999", timeout: 100 });
  const semanticMem = new SemanticMemory(bridge, { dimensions: 64 });
  const social = new SocialBrain({ protocol: "meritocratic" });
  const evo = new EvolutionEngine({ genome: { mutationRate: 0.2 } });
  const flow = new CognitiveFlow(engine);

  // 1. Store knowledge
  await semanticMem.store("Machine learning uses data to learn patterns", { tags: ["ml"] });
  await semanticMem.store("Neural networks are inspired by the brain", { tags: ["nn"] });
  assert(semanticMem.memories.size === 2, "Integration: memories stored");

  // 2. Spawn agents
  social.spawn("researcher", { specialty: "ml" });
  social.spawn("engineer", { specialty: "systems" });
  assert(social.agents.size === 2, "Integration: agents spawned");

  // 3. Register evolving rules
  evo.registerRule("learning_rate", { value: 0.01 });
  evo.registerRule("batch_size", { value: 32 });
  assert(evo.genome.size === 2, "Integration: rules registered");

  // 4. Use cognitive flow
  flow.prime("machine_learning", ["data", "model", "training"]);
  const priming = flow.getPriming("machine_learning");
  assert(priming > 0, "Integration: priming active");

  // 5. Evolve
  evo.evaluate(Array.from(evo.genome.genes.keys())[0], 0.8);
  const evolved = evo.evolve();
  assert(evolved.generation === 1, "Integration: evolution ran");

  // 6. Full pipeline works together
  assert(true, "Integration: Full cognitive pipeline operational");
})();

// ==================== Summary ====================
setTimeout(() => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("=".repeat(50));
  if (failed > 0) process.exitCode = 1;
}, 2000);
