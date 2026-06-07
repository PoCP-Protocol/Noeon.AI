/**
 * Cognitive Compiler
 * 
 * Transforms the parsed cognitive AST into an executable cognitive plan
 * that can be run by the CognitiveEngine.
 * 
 * This bridges the gap between the declarative Noeon syntax and
 * the runtime cognitive architecture.
 */

const { CognitiveEngine } = require("./runtime/cognitive");

/**
 * Compile a full Noeon AST (with cognitive section) into a runnable plan
 */
function compileCognitive(ast) {
  const plan = {
    metadata: {
      language: ast.language,
      version: ast.version,
      task: ast.task,
      compiledAt: new Date().toISOString()
    },
    // Traditional contract fields (backward compatible)
    contract: {
      network: ast.network,
      budget: ast.budget,
      deadline: ast.deadline,
      verify: ast.verify,
      cognition: ast.cognition,
      collateral: ast.collateral
    },
    // New cognitive execution plan
    cognitivePlan: null,
    // Execution mode
    mode: "cognitive" // "legacy" | "cognitive" | "hybrid"
  };

  // Determine execution mode
  const hasCognitive = ast.cognitive &&
    (ast.cognitive.drives.length > 0 ||
     ast.cognitive.predictions.length > 0 ||
     ast.cognitive.intuitions.length > 0 ||
     ast.cognitive.reasonings.length > 0);

  if (!hasCognitive) {
    plan.mode = "legacy";
    return plan;
  }

  // Compile cognitive plan
  plan.cognitivePlan = compileCognitivePlan(ast.cognitive);
  plan.mode = ast.cognition.goal ? "hybrid" : "cognitive";

  return plan;
}

/**
 * Compile the cognitive section into an ordered execution plan
 */
function compileCognitivePlan(cognitive) {
  return {
    // Phase 1: Motivation & Context Setup
    initialization: {
      drives: cognitive.drives,
      workspace: cognitive.workspace,
      attentions: cognitive.attentions,
      emotions: cognitive.emotions
    },
    // Phase 2: Perception & Prediction
    perception: {
      predictions: cognitive.predictions,
      perceptions: cognitive.perceptions,
      monitors: cognitive.monitors
    },
    // Phase 3: Thinking (System 1 + System 2)
    thinking: {
      intuitions: cognitive.intuitions,
      reasonings: cognitive.reasonings,
      focuses: cognitive.focuses
    },
    // Phase 4: Decision & Action
    decision: {
      decisions: cognitive.decisions
    },
    // Phase 5: Learning & Adaptation
    learning: {
      reflections: cognitive.reflections,
      consolidations: cognitive.consolidations,
      adaptations: cognitive.adaptations
    }
  };
}

/**
 * Execute a compiled cognitive plan
 */
async function executeCognitivePlan(compiledPlan, options = {}) {
  if (compiledPlan.mode === "legacy") {
    return { mode: "legacy", message: "No cognitive primitives found. Use legacy executor." };
  }

  const engineConfig = {
    workspace: compiledPlan.cognitivePlan.initialization.workspace || { name: "default", capacity: 7 },
    reasoning: options.reasoning || {}
  };

  const engine = new CognitiveEngine(engineConfig);

  // Flatten the phased plan back into the format the engine expects
  const executionAST = {
    drives: compiledPlan.cognitivePlan.initialization.drives,
    workspace: compiledPlan.cognitivePlan.initialization.workspace,
    attentions: compiledPlan.cognitivePlan.initialization.attentions,
    emotions: compiledPlan.cognitivePlan.initialization.emotions,
    predictions: compiledPlan.cognitivePlan.perception.predictions,
    perceptions: compiledPlan.cognitivePlan.perception.perceptions,
    monitors: compiledPlan.cognitivePlan.perception.monitors,
    intuitions: compiledPlan.cognitivePlan.thinking.intuitions,
    reasonings: compiledPlan.cognitivePlan.thinking.reasonings,
    focuses: compiledPlan.cognitivePlan.thinking.focuses,
    decisions: compiledPlan.cognitivePlan.decision.decisions,
    reflections: compiledPlan.cognitivePlan.learning.reflections,
    consolidations: compiledPlan.cognitivePlan.learning.consolidations,
    adaptations: compiledPlan.cognitivePlan.learning.adaptations
  };

  const results = await engine.execute(executionAST);

  return {
    mode: compiledPlan.mode,
    metadata: compiledPlan.metadata,
    results,
    engine // Return engine for further interaction if needed
  };
}

module.exports = { compileCognitive, compileCognitivePlan, executeCognitivePlan };
