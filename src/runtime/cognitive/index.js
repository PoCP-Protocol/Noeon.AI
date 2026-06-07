/**
 * Noeon AI Cognitive Runtime
 * 
 * A brain-inspired cognitive architecture for AI programming.
 * 
 * Modules:
 * - GlobalWorkspace: Shared attention-weighted memory (Baars' GWT)
 * - MemorySystem: Episodic/Semantic/Procedural memory (Hippocampus model)
 * - DualProcessEngine: System 1 + System 2 reasoning (Kahneman)
 * - PredictiveEngine: Prediction-error minimization (Friston's FEP)
 * - MetacognitiveMonitor: Self-monitoring and adaptation (ACC/PFC)
 * - CognitiveEngine: The unified SuperBrain orchestrator
 */

const { GlobalWorkspace, WorkspaceSlot } = require("./workspace");
const { MemorySystem, MemoryTrace } = require("./memory-system");
const { DualProcessEngine, System1, System2, ConflictMonitor } = require("./dual-process");
const { PredictiveEngine, Prediction, InternalModel } = require("./predictive-engine");
const { MetacognitiveMonitor } = require("./metacognition");
const { CognitiveEngine, CognitiveState } = require("./cognitive-engine");

module.exports = {
  // Main engine
  CognitiveEngine,
  CognitiveState,

  // Subsystems
  GlobalWorkspace,
  WorkspaceSlot,
  MemorySystem,
  MemoryTrace,
  DualProcessEngine,
  System1,
  System2,
  ConflictMonitor,
  PredictiveEngine,
  Prediction,
  InternalModel,
  MetacognitiveMonitor
};
