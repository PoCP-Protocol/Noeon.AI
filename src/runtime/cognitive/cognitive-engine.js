/**
 * Cognitive Engine - The SuperBrain Runtime
 * 
 * This is the main orchestrator that integrates all cognitive modules
 * into a unified "thinking machine". It implements the continuous
 * cognitive loop: PERCEIVE -> PREDICT -> THINK -> DECIDE -> ACT -> REFLECT
 * 
 * Brain analogy: The entire cortex + subcortical structures working together
 */

const { GlobalWorkspace } = require("./workspace");
const { MemorySystem } = require("./memory-system");
const { DualProcessEngine } = require("./dual-process");
const { PredictiveEngine } = require("./predictive-engine");
const { MetacognitiveMonitor } = require("./metacognition");

/**
 * CognitiveState represents the current "mental state" of the engine
 */
class CognitiveState {
  constructor() {
    this.drives = [];        // Active motivations
    this.emotions = [];      // Current emotional state
    this.focus = null;       // Current attention focus
    this.phase = "idle";     // idle | perceiving | thinking | deciding | acting | reflecting
    this.energy = 1.0;       // Cognitive energy budget (0-1)
    this.cycle = 0;          // Number of cognitive cycles completed
  }

  toJSON() {
    return {
      drives: this.drives,
      emotions: this.emotions,
      focus: this.focus,
      phase: this.phase,
      energy: this.energy,
      cycle: this.cycle
    };
  }
}

class CognitiveEngine {
  constructor(config = {}) {
    // Initialize all cognitive subsystems
    this.workspace = new GlobalWorkspace(config.workspace || {});
    this.memory = new MemorySystem();
    this.dualProcess = new DualProcessEngine(this.memory, config.reasoning || {});
    this.predictiveEngine = new PredictiveEngine(this.workspace, this.memory);
    this.metacognition = new MetacognitiveMonitor(
      this.workspace, this.memory, this.dualProcess, this.predictiveEngine
    );

    // Engine state
    this.state = new CognitiveState();
    this.running = false;
    this.eventHandlers = new Map();
    this.executionTrace = [];

    // Wire up surprise handler
    this.predictiveEngine.onSurprise((data) => {
      this._onSurprise(data);
    });

    // Subscribe metacognition to workspace broadcasts
    this.workspace.subscribe("metacognition", (message) => {
      if (message.event === "focus") {
        this.metacognition.monitor("cognitiveLoad",
          this.workspace.snapshot().used / this.workspace.snapshot().capacity
        );
      }
    });
  }

  /**
   * Execute a cognitive AST (parsed from Noeon source)
   */
  async execute(cognitiveAST) {
    this.running = true;
    this.state.phase = "initializing";
    const results = {
      drives: [],
      perceptions: [],
      predictions: [],
      thoughts: [],
      decisions: [],
      reflections: [],
      adaptations: [],
      finalState: null
    };

    try {
      // Phase 1: Activate drives (motivation system)
      for (const drive of cognitiveAST.drives || []) {
        const activated = this._activateDrive(drive);
        results.drives.push(activated);
      }

      // Phase 2: Set up workspace
      if (cognitiveAST.workspace) {
        this.workspace = new GlobalWorkspace(cognitiveAST.workspace);
        // Reconnect modules
        this.predictiveEngine.workspace = this.workspace;
      }

      // Phase 3: Configure attention
      for (const attention of cognitiveAST.attentions || []) {
        this._configureAttention(attention);
      }

      // Phase 4: Set emotional context
      for (const emotion of cognitiveAST.emotions || []) {
        this._setEmotion(emotion);
      }

      // Phase 5: Execute predictions
      this.state.phase = "predicting";
      for (const pred of cognitiveAST.predictions || []) {
        const prediction = this.predictiveEngine.predict(
          pred.statement, pred.confidence, pred.model
        );
        results.predictions.push({
          id: prediction.id,
          statement: pred.statement,
          confidence: pred.confidence
        });
      }

      // Phase 6: Process perceptions
      this.state.phase = "perceiving";
      for (const perc of cognitiveAST.perceptions || []) {
        const perception = this.predictiveEngine.perceive(
          perc.source, perc.modality || "text"
        );
        results.perceptions.push(perception);
      }

      // Phase 7: Execute intuitions (System 1)
      for (const intuit of cognitiveAST.intuitions || []) {
        this.state.phase = "thinking";
        const result = await this.dualProcess.system1.intuit(intuit.query, {
          using: intuit.using,
          threshold: intuit.threshold
        });
        results.thoughts.push({
          type: "intuition",
          query: intuit.query,
          ...result
        });
      }

      // Phase 8: Execute deep reasoning (System 2)
      for (const reason of cognitiveAST.reasonings || []) {
        this.state.phase = "thinking";
        const result = await this.dualProcess.system2.reason(
          reason.context || "current_workspace",
          {
            strategy: reason.strategy,
            depth: reason.depth,
            breadth: reason.breadth,
            timeout_ms: reason.timeout_ms
          }
        );
        results.thoughts.push({
          type: "reasoning",
          strategy: reason.strategy,
          ...result
        });
      }

      // Phase 9: Set focus points
      for (const focus of cognitiveAST.focuses || []) {
        this.workspace.focus(focus.target, {
          type: "focus_point",
          intensity: focus.intensity,
          duration: focus.duration
        }, focus.intensity);
      }

      // Phase 10: Execute decisions
      this.state.phase = "deciding";
      for (const decision of cognitiveAST.decisions || []) {
        const result = this._makeDecision(decision, results);
        results.decisions.push(result);
      }

      // Phase 11: Configure monitors
      for (const monitor of cognitiveAST.monitors || []) {
        this._setupMonitor(monitor);
      }

      // Phase 12: Execute reflections
      this.state.phase = "reflecting";
      for (const refl of cognitiveAST.reflections || []) {
        const reflection = this.metacognition.reflect(refl.subject, refl.depth);
        results.reflections.push(reflection);
      }

      // Phase 13: Execute memory consolidations
      for (const cons of cognitiveAST.consolidations || []) {
        const consolidated = this._consolidate(cons);
        results.adaptations.push({ type: "consolidation", ...consolidated });
      }

      // Phase 14: Execute adaptations (neuroplasticity)
      for (const adapt of cognitiveAST.adaptations || []) {
        const adaptation = this.metacognition.adapt(adapt.rule, adapt.delta, adapt.signal);
        results.adaptations.push({ type: "adaptation", ...adaptation });
      }

      // Final: Capture state
      this.state.phase = "complete";
      this.state.cycle += 1;
      results.finalState = {
        cognitiveState: this.state.toJSON(),
        workspaceSnapshot: this.workspace.snapshot(),
        memoryStats: this.memory.stats(),
        metacognitiveAssessment: this.metacognition.assess(),
        predictiveModelState: this.predictiveEngine.getModelState()
      };

    } catch (error) {
      results.error = {
        message: error.message,
        phase: this.state.phase,
        stack: error.stack
      };
    } finally {
      this.running = false;
      this.executionTrace.push({
        timestamp: Date.now(),
        cycle: this.state.cycle,
        results: { ...results, finalState: undefined } // don't duplicate state in trace
      });
    }

    return results;
  }

  /**
   * Think: High-level API for single-query cognitive processing
   */
  async think(query, options = {}) {
    return this.dualProcess.think(query, options);
  }

  /**
   * RunContinuousLoop: Start the brain's continuous perception-action loop
   */
  async runContinuousLoop(config = {}) {
    const interval = config.interval || 1000; // ms between cycles
    const maxCycles = config.maxCycles || Infinity;

    this.running = true;
    let cycleCount = 0;

    while (this.running && cycleCount < maxCycles) {
      this.state.cycle += 1;
      cycleCount += 1;

      // 1. Metacognitive regulation
      const regulation = this.metacognition.regulate();

      // 2. Check energy
      if (this.state.energy <= 0) {
        this.state.phase = "resting";
        this.state.energy = Math.min(1.0, this.state.energy + 0.1);
        await this._sleep(interval * 2);
        continue;
      }

      // 3. Consume energy
      this.state.energy = Math.max(0, this.state.energy - 0.01);

      // 4. Execute regulation actions
      for (const action of regulation.actions) {
        await this._executeRegulationAction(action);
      }

      await this._sleep(interval);
    }

    this.running = false;
    return { cyclesCompleted: cycleCount, finalState: this.state.toJSON() };
  }

  /**
   * Stop the continuous loop
   */
  stop() {
    this.running = false;
  }

  // --- Private methods ---

  _activateDrive(drive) {
    const activated = {
      description: drive.description,
      priority: drive.priority,
      energy: drive.energy,
      activatedAt: Date.now(),
      status: "active"
    };
    this.state.drives.push(activated);
    this.workspace.focus(`drive:${drive.description}`, activated, this._priorityToWeight(drive.priority));
    return activated;
  }

  _configureAttention(attention) {
    // Register attention filter in workspace
    this.workspace.focus(`attention:${attention.source}`, {
      type: "attention_filter",
      source: attention.source,
      filter: attention.filter,
      weight: attention.weight
    }, attention.weight);
  }

  _setEmotion(emotion) {
    const emotionState = {
      valence: emotion.valence,
      arousal: emotion.arousal,
      tag: emotion.tag,
      influence: emotion.influence,
      setAt: Date.now()
    };
    this.state.emotions.push(emotionState);

    // Emotions influence decision thresholds
    if (emotion.influence === "decision") {
      // High arousal + negative valence = more cautious
      // High arousal + positive valence = more risk-taking
      const cautionModifier = emotion.arousal * (emotion.valence < 0 ? 0.2 : -0.1);
      this.metacognition.monitor("uncertainty",
        Math.max(0, this.metacognition.metrics.uncertainty + cautionModifier)
      );
    }
  }

  _makeDecision(decisionSpec, currentResults) {
    // Gather evidence from current results
    const thoughts = currentResults.thoughts || [];
    const avgConfidence = thoughts.length > 0
      ? thoughts.reduce((sum, t) => sum + (t.confidence || 0), 0) / thoughts.length
      : 0.5;

    // Apply emotional valence
    const emotionalBias = this.state.emotions.reduce(
      (sum, e) => sum + e.valence * decisionSpec.valence_weight, 0
    );

    const effectiveConfidence = Math.max(0, Math.min(1,
      avgConfidence + emotionalBias
    ));

    const decision = {
      action: decisionSpec.action,
      threshold: decisionSpec.threshold,
      confidence: effectiveConfidence,
      approved: effectiveConfidence >= decisionSpec.threshold,
      mode: decisionSpec.mode,
      reasoning: {
        thoughtConfidence: avgConfidence,
        emotionalBias,
        effectiveConfidence,
        threshold: decisionSpec.threshold
      }
    };

    if (!decision.approved && decisionSpec.fallback) {
      decision.fallbackAction = decisionSpec.fallback;
    }

    return decision;
  }

  _consolidate(consolidationSpec) {
    const workspaceSnapshot = this.workspace.snapshot();
    const trace = this.memory.consolidate(
      workspaceSnapshot,
      consolidationSpec.to,
      consolidationSpec.strength
    );
    return {
      memoryId: trace.id,
      type: consolidationSpec.to,
      strength: consolidationSpec.strength,
      itemsConsolidated: workspaceSnapshot.used
    };
  }

  _setupMonitor(monitorSpec) {
    // Set initial threshold
    this.metacognition.monitor(monitorSpec.metric, 0);
    // The actual monitoring happens in the continuous loop
  }

  _onSurprise(data) {
    // High surprise triggers automatic reflection
    if (data.surprise > this.predictiveEngine.surpriseThreshold) {
      this.metacognition.reflect(data.prediction.statement, "deep");
      this.metacognition.monitor("uncertainty", Math.min(1, data.surprise / 5));
    }
  }

  async _executeRegulationAction(action) {
    switch (action.action) {
      case "consolidate_workspace":
        const snapshot = this.workspace.snapshot();
        this.memory.consolidate(snapshot, "episodic");
        this.workspace.clear();
        break;
      case "reflect":
        this.metacognition.reflect("performance", "deep");
        break;
      case "prefer_system1":
      case "prefer_system2":
        // Adjust conflict monitor threshold
        const threshold = action.action === "prefer_system1" ? 0.8 : 0.2;
        this.dualProcess.conflictMonitor.uncertaintyThreshold = threshold;
        break;
    }
  }

  _priorityToWeight(priority) {
    const map = { low: 0.3, medium: 0.6, high: 0.85, critical: 1.0 };
    return map[priority] || 0.5;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CognitiveEngine, CognitiveState };
