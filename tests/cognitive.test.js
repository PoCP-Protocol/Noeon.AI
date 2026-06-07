/**
 * Cognitive Architecture Tests
 * 
 * Tests the full pipeline: Parse -> Compile -> Execute
 * for Noeon AI cognitive contracts.
 */

const fs = require("fs");
const path = require("path");
const { parseAel } = require("../src/parser");
const { compileCognitive, executeCognitivePlan } = require("../src/cognitive-compiler");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
  }
}

// =============================================
// Test 1: Parse cognitive primitives
// =============================================
console.log("\n=== Test 1: Cognitive Parser ===");

const minimalSource = fs.readFileSync(
  path.join(__dirname, "../examples/cognitive_minimal.ael"), "utf-8"
);

try {
  const ast = parseAel(minimalSource);
  assert(ast.cognitive !== undefined, "AST has cognitive section");
  assert(ast.cognitive.drives.length === 1, "Parsed 1 DRIVE");
  assert(ast.cognitive.drives[0].description === "answer user questions accurately", "DRIVE description correct");
  assert(ast.cognitive.drives[0].priority === "high", "DRIVE priority correct");
  assert(ast.cognitive.workspace !== null, "Parsed WORKSPACE");
  assert(ast.cognitive.workspace.name === "query_processing", "WORKSPACE name correct");
  assert(ast.cognitive.workspace.capacity === 5, "WORKSPACE capacity correct");
  assert(ast.cognitive.predictions.length === 1, "Parsed 1 PREDICT");
  assert(ast.cognitive.predictions[0].confidence === 0.8, "PREDICT confidence correct");
  assert(ast.cognitive.intuitions.length === 1, "Parsed 1 INTUIT");
  assert(ast.cognitive.reasonings.length === 1, "Parsed 1 REASON");
  assert(ast.cognitive.reasonings[0].strategy === "deductive", "REASON strategy correct");
  assert(ast.cognitive.decisions.length === 1, "Parsed 1 DECIDE");
  assert(ast.cognitive.decisions[0].action === "respond_to_user", "DECIDE action correct");
  assert(ast.cognitive.reflections.length === 1, "Parsed 1 REFLECT");
  assert(ast.cognitive.consolidations.length === 1, "Parsed 1 CONSOLIDATE");
  assert(ast.cognitive.consolidations[0].to === "episodic", "CONSOLIDATE target correct");
} catch (e) {
  failed++;
  console.log(`  ✗ Parse failed: ${e.message}`);
}

// =============================================
// Test 2: Parse full superbrain contract
// =============================================
console.log("\n=== Test 2: SuperBrain Contract Parse ===");

const superbrainSource = fs.readFileSync(
  path.join(__dirname, "../examples/cognitive_superbrain.ael"), "utf-8"
);

try {
  const ast = parseAel(superbrainSource);
  assert(ast.cognitive.drives.length === 2, "Parsed 2 DRIVEs");
  assert(ast.cognitive.attentions.length === 2, "Parsed 2 ATTENDs");
  assert(ast.cognitive.emotions.length === 1, "Parsed 1 EMOTION");
  assert(ast.cognitive.emotions[0].valence === 0.2, "EMOTION valence correct");
  assert(ast.cognitive.predictions.length === 2, "Parsed 2 PREDICTs");
  assert(ast.cognitive.perceptions.length === 2, "Parsed 2 PERCEIVEs");
  assert(ast.cognitive.intuitions.length === 1, "Parsed 1 INTUIT");
  assert(ast.cognitive.reasonings.length === 1, "Parsed 1 REASON");
  assert(ast.cognitive.reasonings[0].strategy === "abductive", "REASON strategy=abductive");
  assert(ast.cognitive.focuses.length === 1, "Parsed 1 FOCUS");
  assert(ast.cognitive.monitors.length === 1, "Parsed 1 MONITOR");
  assert(ast.cognitive.decisions.length === 1, "Parsed 1 DECIDE");
  assert(ast.cognitive.reflections.length === 1, "Parsed 1 REFLECT");
  assert(ast.cognitive.consolidations.length === 1, "Parsed 1 CONSOLIDATE");
  assert(ast.cognitive.adaptations.length === 2, "Parsed 2 ADAPTs");
  assert(ast.cognitive.adaptations[0].signal === "reward", "First ADAPT signal=reward");
  assert(ast.cognitive.adaptations[1].signal === "punish", "Second ADAPT signal=punish");
} catch (e) {
  failed++;
  console.log(`  ✗ Parse failed: ${e.message}`);
}

// =============================================
// Test 3: Compile cognitive plan
// =============================================
console.log("\n=== Test 3: Cognitive Compiler ===");

try {
  const ast = parseAel(superbrainSource);
  const compiled = compileCognitive(ast);
  assert(compiled.mode === "hybrid", "Compilation mode is hybrid (has both legacy + cognitive)");
  assert(compiled.cognitivePlan !== null, "Cognitive plan generated");
  assert(compiled.cognitivePlan.initialization.drives.length === 2, "Plan has 2 drives");
  assert(compiled.cognitivePlan.thinking.intuitions.length === 1, "Plan has 1 intuition");
  assert(compiled.cognitivePlan.learning.adaptations.length === 2, "Plan has 2 adaptations");
  assert(compiled.metadata.version === "0.3-cognitive", "Version is 0.3-cognitive");
} catch (e) {
  failed++;
  console.log(`  ✗ Compile failed: ${e.message}`);
}

// =============================================
// Test 4: Execute cognitive plan
// =============================================
console.log("\n=== Test 4: Cognitive Execution ===");

async function testExecution() {
  try {
    const ast = parseAel(minimalSource);
    const compiled = compileCognitive(ast);
    const result = await executeCognitivePlan(compiled);

    assert(result.mode === "cognitive", "Execution mode is cognitive");
    assert(result.results !== undefined, "Results returned");
    assert(result.results.drives.length === 1, "1 drive activated");
    assert(result.results.predictions.length === 1, "1 prediction made");
    assert(result.results.thoughts.length >= 1, "At least 1 thought generated");
    assert(result.results.decisions.length === 1, "1 decision made");
    assert(result.results.reflections.length === 1, "1 reflection performed");
    assert(result.results.finalState !== null, "Final state captured");
    assert(result.results.finalState.workspaceSnapshot !== undefined, "Workspace snapshot available");
    assert(result.results.finalState.memoryStats.total > 0, "Memories were created");
    assert(result.engine !== undefined, "Engine instance returned for further interaction");
  } catch (e) {
    failed++;
    console.log(`  ✗ Execution failed: ${e.message}`);
  }
}

// =============================================
// Test 5: Keyword aliases (neural vocabulary)
// =============================================
console.log("\n=== Test 5: Neural Aliases ===");

const aliasSource = `
VERSION "0.3-cognitive"
NETWORK "noeon-testnet"
TASK "alias_test"
GOAL "Test neural aliases"
IMPULSE "test drive via alias" priority=low
FORESEE "something will happen" confidence=0.5
GUT "quick judgment" using=pattern_match threshold=0.5
THINK_DEEP strategy=inductive depth=2 breadth=2 context=workspace timeout_ms=5000
INTROSPECT "self analysis" depth=shallow trigger=periodic
REMEMBER from=workspace to=semantic strength=0.7 decay_rate=0.01
FEEL valence=0.5 arousal=0.3 tag=calm influence=decision
CHOOSE action=proceed threshold=0.5 mode=satisfice fallback=wait valence_weight=0.2
`;

try {
  const ast = parseAel(aliasSource);
  assert(ast.cognitive.drives.length === 1, "IMPULSE alias -> DRIVE works");
  assert(ast.cognitive.predictions.length === 1, "FORESEE alias -> PREDICT works");
  assert(ast.cognitive.intuitions.length === 1, "GUT alias -> INTUIT works");
  assert(ast.cognitive.reasonings.length === 1, "THINK_DEEP alias -> REASON works");
  assert(ast.cognitive.reflections.length === 1, "INTROSPECT alias -> REFLECT works");
  assert(ast.cognitive.consolidations.length === 1, "REMEMBER alias -> CONSOLIDATE works");
  assert(ast.cognitive.emotions.length === 1, "FEEL alias -> EMOTION works");
  assert(ast.cognitive.decisions.length === 1, "CHOOSE alias -> DECIDE works");
} catch (e) {
  failed++;
  console.log(`  ✗ Alias test failed: ${e.message}`);
}

// =============================================
// Test 6: Workspace & Memory Integration
// =============================================
console.log("\n=== Test 6: Workspace & Memory ===");

const { GlobalWorkspace } = require("../src/runtime/cognitive");
const { MemorySystem } = require("../src/runtime/cognitive");

const ws = new GlobalWorkspace({ name: "test", capacity: 3, decay: "none" });
ws.focus("item1", "first thought", 0.8);
ws.focus("item2", "second thought", 0.5);
ws.focus("item3", "third thought", 0.9);

assert(ws.snapshot().used === 3, "Workspace holds 3 items");
assert(ws.retrieve("item1") === "first thought", "Can retrieve from workspace");

// Overflow: adding 4th item should evict lowest weight
ws.focus("item4", "fourth thought", 1.0);
assert(ws.snapshot().used === 3, "Workspace respects capacity limit");
assert(ws.retrieve("item2") === null, "Lowest weight item was evicted");

const mem = new MemorySystem();
const trace = mem.store("test knowledge", "semantic", { tags: ["test"], strength: 0.9 });
assert(trace.id.startsWith("mem_"), "Memory trace has valid ID");
const recalled = mem.recall("test", { type: "semantic" });
assert(recalled.length > 0, "Can recall stored memory");
assert(recalled[0].content === "test knowledge", "Recalled content matches");

// =============================================
// Test 7: Dual Process Engine
// =============================================
console.log("\n=== Test 7: Dual Process Engine ===");

const { DualProcessEngine } = require("../src/runtime/cognitive");

async function testDualProcess() {
  const mem2 = new MemorySystem();
  // Seed some knowledge
  mem2.store("stocks go up when economy is strong", "semantic", { strength: 0.9, tags: ["stocks", "economy"] });
  mem2.store("AI companies are growing fast", "semantic", { strength: 0.8, tags: ["AI", "growth"] });

  const dp = new DualProcessEngine(mem2);

  // Test System 1 (should miss since no cached patterns)
  const intuition = await dp.system1.intuit("Will AI stocks rise?");
  assert(intuition.system === 1, "System 1 returns system=1");

  // Test System 2
  const reasoning = await dp.system2.reason("AI economy growth", { strategy: "deductive", depth: 3 });
  assert(reasoning.system === 2, "System 2 returns system=2");

  // Test unified think()
  const thought = await dp.think("What about AI stocks?");
  assert(thought.system === 1 || thought.system === 2, "think() routes to a system");
  assert(typeof thought.confidence === "number", "think() returns confidence");
}

// =============================================
// Run async tests
// =============================================
async function runAllAsync() {
  await testExecution();
  await testDualProcess();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"=".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllAsync().catch(e => {
  console.error("Test runner error:", e);
  process.exit(1);
});
