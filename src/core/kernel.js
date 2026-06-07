'use strict';

/**
 * Noeon Unified Cognitive Kernel
 * 
 * THE BRAIN OF THE BRAIN
 * 
 * This is the single execution engine that runs ALL Noeon programs.
 * Whether you write an AEL contract or a cognitive flow, it all
 * compiles to Cognitive IR and executes here.
 * 
 * The Kernel implements the full cognitive cycle:
 *   Perceive → Attend → Predict → Process → Decide → Act → Validate → Learn → Remember → Evolve
 * 
 * It orchestrates all subsystems:
 *   - Workspace (Global Workspace Theory)
 *   - DualProcess (System 1 / System 2)
 *   - Memory (Episodic / Semantic / Procedural)
 *   - Prediction (Free Energy Minimization)
 *   - MetaCognition (Self-monitoring)
 *   - FaultTolerance (Error recovery)
 *   - ResourceManager (Cognitive load)
 *   - Lifecycle (Birth → Death)
 *   - EventBus (Inter-module communication)
 *   - Persistence (Cross-session memory)
 * 
 * Neural Correlate: Thalamo-cortical loop — the central integrator of consciousness
 */

const { IRNodeType, ProcessMode, MemoryOp, CollabMode, AELtoIRCompiler } = require('./cognitive-ir');

// ============================================================
// KERNEL STATE
// ============================================================

const KernelState = {
  IDLE: 'idle',
  PERCEIVING: 'perceiving',
  ATTENDING: 'attending',
  PREDICTING: 'predicting',
  PROCESSING: 'processing',
  DECIDING: 'deciding',
  VALIDATING: 'validating',
  LEARNING: 'learning',
  REMEMBERING: 'remembering',
  EVOLVING: 'evolving',
  REFLECTING: 'reflecting'
};

// ============================================================
// EXECUTION CONTEXT
// ============================================================

class ExecutionContext {
  constructor(program) {
    this.program = program;
    this.workspace = new Map();       // Global workspace (shared attention)
    this.beliefs = new Map();         // Current beliefs
    this.goals = [];                  // Active goals/intents
    this.constraints = [];            // Active constraints
    this.predictions = new Map();     // Current predictions
    this.decisions = [];              // Decisions made
    this.trace = [];                  // Execution trace
    this.emotions = { valence: 0, arousal: 0.5 }; // Emotional state
    this.confidence = 1.0;           // Overall confidence
    this.cycle_count = 0;
    this.start_time = Date.now();
    this.results = {};               // Final outputs
    this.errors = [];                // Errors encountered
  }

  broadcast(key, value, salience = 0.5) {
    this.workspace.set(key, { value, salience, timestamp: Date.now() });
  }

  getFromWorkspace(key) {
    const item = this.workspace.get(key);
    return item ? item.value : undefined;
  }

  addBelief(key, value, confidence = 0.7) {
    this.beliefs.set(key, { value, confidence, formed_at: Date.now() });
  }

  getBelief(key) {
    const b = this.beliefs.get(key);
    return b ? b.value : undefined;
  }

  recordTrace(phase, operation, result) {
    this.trace.push({
      cycle: this.cycle_count,
      phase,
      operation,
      result: typeof result === 'object' ? { ...result } : result,
      timestamp: Date.now()
    });
  }

  getElapsed() { return Date.now() - this.start_time; }
}

// ============================================================
// UNIFIED COGNITIVE KERNEL
// ============================================================

class CognitiveKernel {
  constructor(options = {}) {
    this.state = KernelState.IDLE;
    this.compiler = new AELtoIRCompiler();
    this.options = {
      max_cycles: options.max_cycles || 100,
      cycle_timeout_ms: options.cycle_timeout_ms || 30000,
      confidence_threshold: options.confidence_threshold || 0.6,
      enable_prediction: options.enable_prediction !== false,
      enable_evolution: options.enable_evolution !== false,
      enable_metacognition: options.enable_metacognition !== false,
      ...options
    };

    // Subsystem references (injected or created)
    this.subsystems = {
      workspace: null,
      dualProcess: null,
      memory: null,
      prediction: null,
      metacognition: null,
      faultTolerance: null,
      resources: null,
      lifecycle: null,
      events: null,
      persistence: null,
      knowledgeGraph: null,
      socialBrain: null,
      evolution: null
    };

    // Execution handlers for each IR node type
    this.handlers = new Map();
    this._registerDefaultHandlers();

    // Stats
    this.stats = {
      programs_executed: 0,
      total_cycles: 0,
      total_nodes_processed: 0,
      errors_recovered: 0,
      avg_cycle_time_ms: 0
    };

    // LLM bridge (optional — live when API key configured)
    this.llm = null;
    if (options.enable_llm !== false && process.env.NOEON_LLM_MODE !== 'off') {
      try {
        const { LLMBridge } = require('../runtime/cognitive/llm-bridge');
        this.llm = new LLMBridge(options.llm || {});
      } catch {
        this.llm = null;
      }
    }
  }

  // --- Subsystem Injection ---

  use(name, subsystem) {
    if (name in this.subsystems) {
      this.subsystems[name] = subsystem;
    }
    return this; // Fluent API
  }

  // --- Main Entry Point ---

  /**
   * Execute a Noeon program (from AST or IR)
   * This is THE single entry point for all execution.
   */
  async execute(input, options = {}) {
    // Step 1: Compile to IR if needed
    let program;
    if (input.intents && input.processes) {
      // Already an IR program
      program = input;
    } else {
      // AST → IR
      const { program: compiled, warnings } = this.compiler.compile(input);
      program = compiled;
      if (warnings.length > 0 && options.verbose) {
        console.warn('[Kernel] Compilation warnings:', warnings);
      }
    }

    // Step 2: Create execution context
    const ctx = new ExecutionContext(program);

    // Step 3: Run the cognitive cycle
    const result = await this._runCognitiveCycle(program, ctx, options);

    // Step 4: Update stats
    this.stats.programs_executed++;
    this.stats.total_cycles += ctx.cycle_count;

    return result;
  }

  // --- The Cognitive Cycle ---

  async _runCognitiveCycle(program, ctx, options) {
    const startTime = Date.now();

    try {
      // Phase 1: PERCEIVE — Sense inputs
      this.state = KernelState.PERCEIVING;
      await this._executePhase(program.perceivers, ctx, 'perceive');

      // Phase 2: ATTEND — Focus attention
      this.state = KernelState.ATTENDING;
      await this._executePhase(program.attentions, ctx, 'attend');

      // Phase 3: PREDICT — Anticipate outcomes
      if (this.options.enable_prediction) {
        this.state = KernelState.PREDICTING;
        await this._executePhase(program.predictions, ctx, 'predict');
      }

      // Phase 4: PROCESS — Reason about the situation
      this.state = KernelState.PROCESSING;
      // Load intents and constraints into context first
      await this._loadIntents(program.intents, ctx);
      await this._loadConstraints(program.constraints, ctx);
      await this._loadCommitments(program.commitments, ctx);
      // Then process
      await this._executePhase(program.processes, ctx, 'process');
      // Collaborations (if any)
      await this._executePhase(program.collaborators, ctx, 'collaborate');

      // Phase 5: DECIDE — Make choices
      this.state = KernelState.DECIDING;
      await this._executePhase(program.decisions, ctx, 'decide');

      // Phase 6: VALIDATE — Check ourselves
      this.state = KernelState.VALIDATING;
      await this._executePhase(program.validators, ctx, 'validate');

      // Phase 7: LEARN — Update from outcomes
      this.state = KernelState.LEARNING;
      await this._executePhase(program.learners, ctx, 'learn');

      // Phase 8: REMEMBER — Consolidate
      this.state = KernelState.REMEMBERING;
      await this._executePhase(program.memories, ctx, 'remember');

      // Phase 9: EVOLVE — Long-term adaptation
      if (this.options.enable_evolution) {
        this.state = KernelState.EVOLVING;
        await this._executePhase(program.evolvers, ctx, 'evolve');
      }

      // Phase 10: META — Self-governance
      if (this.options.enable_metacognition) {
        this.state = KernelState.REFLECTING;
        await this._executePhase(program.metas, ctx, 'meta');
      }

      ctx.cycle_count++;
      this.state = KernelState.IDLE;

      // Compute cycle time
      const cycleTime = Date.now() - startTime;
      this.stats.avg_cycle_time_ms = 
        (this.stats.avg_cycle_time_ms * (this.stats.programs_executed) + cycleTime) / 
        (this.stats.programs_executed + 1);

      return {
        success: true,
        program: program.name,
        results: ctx.results,
        beliefs: Object.fromEntries(ctx.beliefs),
        decisions: ctx.decisions,
        workspace: Object.fromEntries(ctx.workspace),
        confidence: ctx.confidence,
        trace: ctx.trace,
        stats: {
          cycles: ctx.cycle_count,
          nodes_processed: ctx.trace.length,
          elapsed_ms: cycleTime,
          errors: ctx.errors.length
        }
      };

    } catch (error) {
      this.state = KernelState.IDLE;
      ctx.errors.push({ error: error.message, phase: this.state, timestamp: Date.now() });

      return {
        success: false,
        program: program.name,
        error: error.message,
        partial_results: ctx.results,
        trace: ctx.trace,
        stats: { cycles: ctx.cycle_count, elapsed_ms: Date.now() - startTime, errors: ctx.errors }
      };
    }
  }

  // --- Phase Execution ---

  async _executePhase(nodes, ctx, phaseName) {
    if (!nodes || nodes.length === 0) return;

    for (const node of nodes) {
      const handler = this.handlers.get(node.type);
      if (handler) {
        try {
          const result = await handler(node, ctx, this);
          ctx.recordTrace(phaseName, node.type, result);
          this.stats.total_nodes_processed++;
        } catch (e) {
          ctx.errors.push({ node_id: node.id, type: node.type, error: e.message });
          ctx.recordTrace(phaseName, node.type, { error: e.message });
          // Don't crash — cognitive systems are fault-tolerant
        }
      }
    }
  }

  // --- Intent/Constraint Loading ---

  async _loadIntents(intents, ctx) {
    for (const intent of intents) {
      ctx.goals.push({
        name: intent.params.name,
        description: intent.params.description,
        priority: intent.priority,
        status: 'active'
      });
      ctx.broadcast('goal:' + intent.params.name, intent.params, intent.priority);
    }
  }

  async _loadConstraints(constraints, ctx) {
    for (const constraint of constraints) {
      ctx.constraints.push({
        type: constraint.params.type,
        limit: constraint.params.max_amount || constraint.params.limit,
        enforced: true
      });
      ctx.broadcast('constraint:' + constraint.params.type, constraint.params, 0.8);
    }
  }

  async _loadCommitments(commitments, ctx) {
    for (const commit of commitments) {
      ctx.broadcast('commitment', commit.params, commit.params.motivation_weight || 0.5);
      // Commitments boost emotional arousal (motivation)
      ctx.emotions.arousal = Math.min(1.0, ctx.emotions.arousal + (commit.params.motivation_weight || 0.1));
    }
  }

  // --- Default Handlers ---

  _registerDefaultHandlers() {
    // INTENT handler
    this.handlers.set(IRNodeType.INTENT, async (node, ctx) => {
      return { goal_registered: node.params.name, priority: node.priority };
    });

    // CONSTRAINT handler
    this.handlers.set(IRNodeType.CONSTRAINT, async (node, ctx) => {
      return { constraint_applied: node.params.type, limit: node.params.max_amount };
    });

    // PROCESS handler
    this.handlers.set(IRNodeType.PROCESS, async (node, ctx, kernel) => {
      const mode = node.params.mode || ProcessMode.ANALYTICAL;
      const query = node.params.pattern || node.params.strategy || node.params.name || 'general cognition';
      const llmContext = {
        strategy: node.params.strategy,
        workspace: Object.fromEntries(ctx.workspace),
        memories: [...ctx.beliefs.values()].slice(0, 5)
      };

      if (mode === ProcessMode.INTUITIVE) {
        let result;
        if (kernel.llm) {
          const llmOut = await kernel.llm.intuit(query, llmContext);
          result = {
            mode: 'intuitive',
            pattern: node.params.pattern,
            confidence: llmOut.confidence || node.params.confidence_floor || 0.5,
            result: llmOut.judgment,
            llm: llmOut.model === 'noeon-mock' ? 'mock' : 'live'
          };
        } else {
          result = {
            mode: 'intuitive',
            pattern: node.params.pattern,
            confidence: node.params.confidence_floor || 0.5,
            result: `intuition:${node.params.pattern || 'general'}`
          };
        }
        ctx.broadcast('intuition', result, 0.6);
        return result;
      } else if (mode === ProcessMode.ANALYTICAL) {
        let result;
        if (kernel.llm) {
          const llmOut = await kernel.llm.reason(query, llmContext);
          result = {
            mode: 'analytical',
            strategy: node.params.strategy || 'deductive',
            model: llmOut.model,
            confidence: llmOut.confidence,
            result: llmOut.conclusion,
            llm: llmOut.model === 'noeon-mock' ? 'mock' : 'live'
          };
          ctx.confidence = Math.max(ctx.confidence * 0.5, llmOut.confidence || ctx.confidence);
        } else {
          result = {
            mode: 'analytical',
            strategy: node.params.strategy || 'deductive',
            model: node.params.model || null,
            result: `reasoning:${node.params.strategy || 'general'}`
          };
        }
        ctx.broadcast('reasoning_result', result, 0.8);
        return result;
      } else if (mode === ProcessMode.DIALECTICAL) {
        let synthesis;
        if (kernel.llm && node.params.thesis) {
          const debate = await kernel.llm.debate(
            `${node.params.thesis} vs ${node.params.antithesis}`,
            2,
            1
          );
          synthesis = debate.synthesis;
        } else {
          synthesis = `synthesis of ${node.params.thesis} and ${node.params.antithesis}`;
        }
        const result = {
          mode: 'dialectical',
          thesis: node.params.thesis,
          antithesis: node.params.antithesis,
          synthesis
        };
        ctx.broadcast('dialectic_result', result, 0.7);
        return result;
      }
      return { mode, processed: true };
    });

    // VALIDATE handler
    this.handlers.set(IRNodeType.VALIDATE, async (node, ctx, kernel) => {
      const type = node.params.type || 'assertion';
      let passed = true;
      let details = {};

      if (type === 'reflection') {
        const beliefCount = ctx.beliefs.size;
        const avgConfidence = beliefCount > 0
          ? [...ctx.beliefs.values()].reduce((s, b) => s + b.confidence, 0) / beliefCount
          : 0;

        if (kernel.llm && node.params.criteria) {
          const reflection = await kernel.llm.reflect(
            node.params.criteria,
            [...ctx.beliefs.values()].slice(0, 5),
            { workspace: Object.fromEntries(ctx.workspace) }
          );
          details = {
            belief_count: beliefCount,
            avg_confidence: avgConfidence,
            insights: reflection.insights?.slice(0, 3),
            llm: reflection.latency ? 'engaged' : 'mock'
          };
          passed = avgConfidence >= (node.params.threshold || 0.5);
        } else {
          passed = avgConfidence >= (node.params.threshold || 0.5);
          details = { belief_count: beliefCount, avg_confidence: avgConfidence };
        }
      } else if (type === 'verification') {
        passed = ctx.confidence >= (node.params.threshold || 0.8);
        details = { confidence: ctx.confidence, threshold: node.params.threshold };
      }

      if (!passed) ctx.confidence *= 0.9;
      ctx.broadcast('validation', { passed, type, details }, 0.7);
      return { type, passed, details };
    });

    // LEARN handler
    this.handlers.set(IRNodeType.LEARN, async (node, ctx) => {
      const signal = node.params.signal_type || 'reward';
      const amount = node.params.amount || 0.1;
      
      // Update emotional state based on learning signal
      if (signal === 'reward') {
        ctx.emotions.valence = Math.min(1.0, ctx.emotions.valence + amount * 0.1);
      } else if (signal === 'punishment') {
        ctx.emotions.valence = Math.max(-1.0, ctx.emotions.valence - amount * 0.1);
      }

      ctx.broadcast('learning_signal', { signal, amount }, 0.5);
      return { signal, amount, emotional_update: ctx.emotions };
    });

    // PERCEIVE handler
    this.handlers.set(IRNodeType.PERCEIVE, async (node, ctx) => {
      const modality = node.params.modality || node.params.type || 'text';
      const percept = {
        modality,
        source: node.params.source_input || node.params.name,
        processed: true,
        timestamp: Date.now()
      };
      ctx.broadcast('percept:' + modality, percept, 0.7);
      return percept;
    });

    // DECIDE handler
    this.handlers.set(IRNodeType.DECIDE, async (node, ctx) => {
      const type = node.params.type || 'choice';
      const threshold = node.params.threshold || 0.6;
      let decision;

      if (type === 'state_machine') {
        decision = {
          type: 'state_transition',
          states: node.params.states,
          current: node.params.initial || node.params.states?.[0]
        };
      } else if (type === 'cognitive_decision') {
        const options = node.params.options || [];
        const reasoning = ctx.getFromWorkspace('reasoning_result');
        const chosen = ctx.confidence >= threshold
          ? (options[0] || node.params.action || 'proceed')
          : (node.params.fallback || options[1] || 'wait');
        decision = {
          type: 'cognitive',
          chosen,
          strategy: node.params.strategy || node.params.mode,
          confidence: ctx.confidence,
          threshold,
          influenced_by: reasoning ? 'reasoning_result' : null
        };
      } else {
        const action = node.params.action || node.params.chosen;
        decision = {
          type,
          chosen: ctx.confidence >= threshold ? action : (node.params.fallback || 'escalate'),
          confidence: ctx.confidence,
          threshold
        };
      }

      ctx.decisions.push(decision);
      ctx.broadcast('decision', decision, 0.8);
      return decision;
    });

    // COMMIT handler
    this.handlers.set(IRNodeType.COMMIT, async (node, ctx) => {
      return { committed: true, motivation: node.params.motivation_weight };
    });

    // COLLABORATE handler
    this.handlers.set(IRNodeType.COLLABORATE, async (node, ctx, kernel) => {
      const mode = node.params.mode || CollabMode.DEBATE;
      const topic = node.params.topic || node.params.proposal || 'collaboration topic';
      let outcome = `${mode}_completed`;

      if (kernel.llm && (mode === CollabMode.DEBATE || mode === 'debate')) {
        const debate = await kernel.llm.debate(topic, node.params.participants?.length || 2, 1);
        outcome = debate.synthesis?.slice(0, 200) || outcome;
      }

      const result = {
        mode,
        topic,
        participants: node.params.participants || node.params.agents || [],
        outcome
      };
      ctx.broadcast('collaboration', result, 0.6);
      return result;
    });

    // EVOLVE handler
    this.handlers.set(IRNodeType.EVOLVE, async (node, ctx) => {
      const type = node.params.type || 'mutation';
      return {
        type,
        target: node.params.target,
        applied: true,
        generation: ctx.cycle_count
      };
    });

    // REMEMBER handler
    this.handlers.set(IRNodeType.REMEMBER, async (node, ctx) => {
      const op = node.params.operation || MemoryOp.STORE;
      
      if (op === MemoryOp.STORE) {
        ctx.addBelief(
          node.params.content || node.params.key || `mem_${Date.now()}`,
          node.params.content,
          node.params.confidence || 0.7
        );
        return { stored: true, type: node.params.type };
      } else if (op === MemoryOp.RECALL) {
        const value = ctx.getBelief(node.params.query);
        return { recalled: value !== undefined, query: node.params.query, value };
      } else if (op === MemoryOp.CONSOLIDATE) {
        return { consolidated: true, target: node.params.target };
      }
      return { operation: op, completed: true };
    });

    // ATTEND handler
    this.handlers.set(IRNodeType.ATTEND, async (node, ctx) => {
      const focus = node.params.focus || node.params.type;
      ctx.broadcast('attention_focus', { focus, capacity: node.params.capacity }, 0.9);
      return { attending: focus, capacity: node.params.capacity };
    });

    // PREDICT handler
    this.handlers.set(IRNodeType.PREDICT, async (node, ctx, kernel) => {
      const target = node.params.target || node.params.statement || 'unknown';
      let prediction;

      if (kernel.llm && target !== 'unknown') {
        const llmPred = await kernel.llm.predict(target, [], {
          workspace: Object.fromEntries(ctx.workspace)
        });
        prediction = {
          target,
          horizon: node.params.horizon || 1,
          model: llmPred.model || node.params.model || 'llm',
          confidence: llmPred.confidence ?? node.params.confidence ?? 0.6,
          assessment: llmPred.assessment || llmPred.reasoning
        };
      } else {
        prediction = {
          target,
          horizon: node.params.horizon || 1,
          model: node.params.model || 'bayesian',
          confidence: node.params.confidence ?? (0.5 + Math.random() * 0.3)
        };
      }

      ctx.predictions.set(target, prediction);
      ctx.broadcast('prediction', prediction, 0.6);
      return prediction;
    });

    // META handler
    this.handlers.set(IRNodeType.META, async (node, ctx) => {
      return {
        type: 'governance',
        rule: node.params.condition,
        action: node.params.action,
        applied: true
      };
    });
  }

  // --- Custom Handler Registration ---

  registerHandler(nodeType, handler) {
    this.handlers.set(nodeType, handler);
    return this;
  }

  // --- Convenience: Parse + Execute ---

  async run(source, parser, options = {}) {
    // Parse source → AST
    const ast = parser(source);
    // Execute AST through unified pipeline
    return this.execute(ast, options);
  }

  // --- Status ---

  getStatus() {
    return {
      state: this.state,
      stats: { ...this.stats },
      subsystems: Object.fromEntries(
        Object.entries(this.subsystems).map(([k, v]) => [k, v ? 'connected' : 'disconnected'])
      ),
      handlers: this.handlers.size
    };
  }
}

module.exports = {
  KernelState,
  ExecutionContext,
  CognitiveKernel
};
