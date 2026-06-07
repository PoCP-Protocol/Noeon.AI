/**
 * Noeon AI Cognitive Runtime — v0.6 Genesis
 * 
 * A brain-inspired cognitive architecture for AI programming.
 * The world's first programming language that THINKS like a human brain.
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
 * 
 * Competitive Edge Modules (v0.5):
 * - ConsciousnessStream: Continuous thinking loop (replaces sequential execution)
 * - UncertainValue: All values carry confidence distributions
 * - TemporalAwareness: Time-native cognition (past/present/future)
 * - MetaLanguageEngine: Self-modifying syntax (language invents new grammar)
 * - MultiModalPerception: See, hear, feel (multi-channel sensing)
 * - CognitiveDebugger: Debug thoughts, not variables (mind inspector)
 * - KnowledgeGraph: Structured world model with causal inference
 * 
 * Language Infrastructure (v0.6):
 * - TypeSystem: Formal cognitive types (Belief, Uncertain, Temporal, Emotion, Intention, Percept, MemoryTrace)
 * - ModuleSystem: Define, import, compose, and reuse cognitive modules
 * - StandardLibrary: Built-in algorithms (Reasoning, Decision, Learning, Attention, Pattern)
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
const { ConsciousnessStream, Thought, UncertainValue, TemporalAwareness } = require("./stream-of-consciousness");
const { MetaLanguageEngine, SyntaxRule, MacroDefinition } = require("./meta-language");
const { MultiModalPerception, PerceptualChannel, Percept: MultiPercept } = require("./multimodal-perception");
const { CognitiveDebugger, ThoughtTrace, DecisionTrace } = require("./cognitive-debugger");
const { KnowledgeGraph, Entity, Relation, CausalChain } = require("./knowledge-graph");

// v0.6 Language Infrastructure
const TypeSystem = require("./type-system");
const { CognitiveModule, ModuleRegistry, ModuleComposer, CognitivePipeline, ModuleLoader, ModuleBuilder, defineModule } = require("./module-system");

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
  CognitiveFlow,

  // Competitive Edge modules (v0.5)
  ConsciousnessStream,
  Thought,
  UncertainValue,
  TemporalAwareness,
  MetaLanguageEngine,
  SyntaxRule,
  MacroDefinition,
  MultiModalPerception,
  PerceptualChannel,
  MultiPercept,
  CognitiveDebugger,
  ThoughtTrace,
  DecisionTrace,
  KnowledgeGraph,
  Entity,
  Relation,
  CausalChain,

  // Language Infrastructure (v0.6)
  TypeSystem,
  CognitiveModule,
  ModuleRegistry,
  ModuleComposer,
  CognitivePipeline,
  ModuleLoader,
  ModuleBuilder,
  defineModule
};
