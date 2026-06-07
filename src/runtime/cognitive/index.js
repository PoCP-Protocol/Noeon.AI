/**
 * Noeon AI Cognitive Runtime — v0.4
 * 
 * A brain-inspired cognitive architecture for AI programming.
 * 
 * Core Modules:
 * - GlobalWorkspace: Shared attention-weighted memory (Baars' GWT)
 * - MemorySystem: Episodic/Semantic/Procedural memory (Hippocampus model)
 * - DualProcessEngine: System 1 + System 2 reasoning (Kahneman)
 * - PredictiveEngine: Prediction-error minimization (Friston's FEP)
 * - MetacognitiveMonitor: Self-monitoring and adaptation (ACC/PFC)
 * - CognitiveEngine: The unified SuperBrain orchestrator
 * 
 * Advanced Modules (v0.4):
 * - LLMBridge: Real AI inference integration (Language Center)
 * - SemanticMemory: Vector-based associative memory (Temporal Cortex)
 * - SocialBrain: Multi-agent collaboration (Mirror Neurons + ToM)
 * - EvolutionEngine: Self-modification & neuroplasticity (Epigenetics)
 * - CognitiveFlow: Brain-native control structures (Executive Function)
 */

const { GlobalWorkspace, WorkspaceSlot } = require("./workspace");
const { MemorySystem, MemoryTrace } = require("./memory-system");
const { DualProcessEngine, System1, System2, ConflictMonitor } = require("./dual-process");
const { PredictiveEngine, Prediction, InternalModel } = require("./predictive-engine");
const { MetacognitiveMonitor } = require("./metacognition");
const { CognitiveEngine, CognitiveState } = require("./cognitive-engine");
const { LLMBridge } = require("./llm-bridge");
const { SemanticMemory, VectorIndex } = require("./semantic-memory");
const { SocialBrain, AgentRole, AgentMessage } = require("./social-brain");
const { EvolutionEngine, Genome, Gene } = require("./evolution-engine");
const { CognitiveFlow } = require("./cognitive-flow");

module.exports = {
  // Main engine
  CognitiveEngine,
  CognitiveState,

  // Core subsystems
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
  MetacognitiveMonitor,

  // Advanced modules (v0.4)
  LLMBridge,
  SemanticMemory,
  VectorIndex,
  SocialBrain,
  AgentRole,
  AgentMessage,
  EvolutionEngine,
  Genome,
  Gene,
  CognitiveFlow
};
