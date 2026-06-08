'use strict';

/**
 * Noeon Cognitive Intermediate Representation (Cognitive IR)
 * 
 * THE UNIFICATION LAYER
 * 
 * This is the single representation that both AEL contract primitives
 * and cognitive primitives compile down to. The key insight:
 * 
 *   TASK     = DRIVE (a goal the brain pursues)
 *   BUDGET   = RESOURCE_CONSTRAINT (cognitive resource limits)
 *   VERIFY   = REFLECT (self-checking against criteria)
 *   REWARD   = REINFORCEMENT (learning signal)
 *   COLLATERAL = COMMITMENT (skin in the game → motivation)
 *   COMPUTE  = REASON (processing information)
 *   FLOW     = ATTENTION_FLOW (state transitions = attention shifts)
 *   PLUGIN   = MODALITY (external capability = sensory modality)
 * 
 * Everything is a cognitive operation. A contract IS a thought.
 * 
 * IR Node Types:
 *   - Intent: What the system wants to achieve (from TASK, DRIVE)
 *   - Constraint: Limits on how it can act (from BUDGET, ATTEND)
 *   - Process: How it thinks (from COMPUTE, REASON, INTUIT, PREDICT)
 *   - Validate: How it checks itself (from VERIFY, REFLECT)
 *   - Learn: How it improves (from REWARD, CONSOLIDATE)
 *   - Perceive: How it senses (from PLUGIN, PERCEIVE)
 *   - Decide: How it chooses (from FLOW, DECIDE)
 *   - Commit: What it stakes (from COLLATERAL, DRIVE importance)
 *   - Collaborate: How it works with others (from DEBATE, CONSENSUS)
 *   - Evolve: How it changes itself (from META_RULE, MUTATE)
 */

// ============================================================
// IR NODE TYPES
// ============================================================

const IRNodeType = {
  // Core cognitive operations
  INTENT: 'intent',               // Goal/objective
  CONSTRAINT: 'constraint',       // Resource/behavior limits
  PROCESS: 'process',             // Reasoning/computation
  VALIDATE: 'validate',           // Self-checking
  LEARN: 'learn',                 // Reinforcement/update
  PERCEIVE: 'perceive',           // Sensing/input
  DECIDE: 'decide',               // Choice/branching
  COMMIT: 'commit',               // Staking/motivation
  COLLABORATE: 'collaborate',     // Multi-agent
  EVOLVE: 'evolve',               // Self-modification
  REMEMBER: 'remember',           // Memory operations
  ATTEND: 'attend',               // Attention focus
  PREDICT: 'predict',             // Anticipation
  META: 'meta'                    // Meta-cognitive operations
};

// Sub-types for finer granularity
const ProcessMode = {
  INTUITIVE: 'intuitive',         // Fast, System 1
  ANALYTICAL: 'analytical',       // Slow, System 2
  CREATIVE: 'creative',           // Divergent
  CRITICAL: 'critical',           // Evaluative
  DIALECTICAL: 'dialectical'      // Thesis-antithesis-synthesis
};

const MemoryOp = {
  STORE: 'store',
  RECALL: 'recall',
  CONSOLIDATE: 'consolidate',
  FORGET: 'forget',
  ASSOCIATE: 'associate'
};

const CollabMode = {
  DEBATE: 'debate',
  CONSENSUS: 'consensus',
  DELEGATE: 'delegate',
  VOTE: 'vote',
  SWARM: 'swarm'
};

// ============================================================
// IR NODE
// ============================================================

class IRNode {
  constructor(type, params = {}) {
    this.id = `ir_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = type;
    this.params = params;
    this.children = [];
    this.dependencies = [];   // Other IR nodes this depends on
    this.priority = params.priority || 0.5;
    this.confidence = params.confidence || 1.0;
    this.source = params.source || 'unknown'; // 'ael' or 'cognitive'
    this.metadata = params.metadata || {};
  }

  addChild(node) {
    this.children.push(node);
    return this;
  }

  dependsOn(nodeId) {
    this.dependencies.push(nodeId);
    return this;
  }

  toJSON() {
    return {
      id: this.id, type: this.type, params: this.params,
      children: this.children.map(c => c.toJSON ? c.toJSON() : c),
      dependencies: this.dependencies,
      priority: this.priority, confidence: this.confidence,
      source: this.source
    };
  }
}

// ============================================================
// IR PROGRAM (Complete cognitive program)
// ============================================================

class IRProgram {
  constructor(name = 'unnamed') {
    this.name = name;
    this.version = '0.7.0';
    this.created_at = Date.now();
    this.intents = [];        // What to achieve
    this.constraints = [];    // Limits
    this.processes = [];      // How to think
    this.validators = [];     // How to check
    this.learners = [];       // How to improve
    this.perceivers = [];     // How to sense
    this.decisions = [];      // How to choose
    this.commitments = [];    // What's at stake
    this.collaborators = [];  // Who to work with
    this.evolvers = [];       // How to change
    this.memories = [];       // Memory operations
    this.attentions = [];     // Focus directives
    this.predictions = [];    // Anticipations
    this.metas = [];          // Meta-cognitive ops
    this.execution_order = []; // Topological sort of all nodes
  }

  add(node) {
    const category = this._getCategory(node.type);
    if (category) category.push(node);
    this.execution_order.push(node.id);
    return this;
  }

  _getCategory(type) {
    const map = {
      [IRNodeType.INTENT]: this.intents,
      [IRNodeType.CONSTRAINT]: this.constraints,
      [IRNodeType.PROCESS]: this.processes,
      [IRNodeType.VALIDATE]: this.validators,
      [IRNodeType.LEARN]: this.learners,
      [IRNodeType.PERCEIVE]: this.perceivers,
      [IRNodeType.DECIDE]: this.decisions,
      [IRNodeType.COMMIT]: this.commitments,
      [IRNodeType.COLLABORATE]: this.collaborators,
      [IRNodeType.EVOLVE]: this.evolvers,
      [IRNodeType.REMEMBER]: this.memories,
      [IRNodeType.ATTEND]: this.attentions,
      [IRNodeType.PREDICT]: this.predictions,
      [IRNodeType.META]: this.metas
    };
    return map[type] || null;
  }

  getAllNodes() {
    return [
      ...this.intents, ...this.constraints, ...this.processes,
      ...this.validators, ...this.learners, ...this.perceivers,
      ...this.decisions, ...this.commitments, ...this.collaborators,
      ...this.evolvers, ...this.memories, ...this.attentions,
      ...this.predictions, ...this.metas
    ];
  }

  getNodeById(id) {
    return this.getAllNodes().find(n => n.id === id);
  }

  getStats() {
    return {
      name: this.name,
      total_nodes: this.getAllNodes().length,
      intents: this.intents.length,
      constraints: this.constraints.length,
      processes: this.processes.length,
      validators: this.validators.length,
      learners: this.learners.length,
      perceivers: this.perceivers.length,
      decisions: this.decisions.length,
      commitments: this.commitments.length,
      collaborators: this.collaborators.length,
      evolvers: this.evolvers.length,
      memories: this.memories.length,
      predictions: this.predictions.length
    };
  }

  toJSON() {
    return {
      name: this.name, version: this.version, created_at: this.created_at,
      stats: this.getStats(),
      nodes: this.getAllNodes().map(n => n.toJSON()),
      execution_order: this.execution_order
    };
  }
}

// ============================================================
// AEL → IR COMPILER (Unifies contract into cognitive operations)
// ============================================================

class AELtoIRCompiler {
  constructor() {
    this.warnings = [];
  }

  /**
   * Compile a parsed AEL AST into a unified Cognitive IR Program
   */
  compile(ast) {
    this.warnings = [];
    // Handle both object and string task formats
    const taskName = typeof ast.task === 'string' ? ast.task : (ast.task?.name || ast.contractName || 'unnamed');
    const program = new IRProgram(taskName);

    // --- TASK → INTENT ---
    if (ast.task) {
      const intent = new IRNode(IRNodeType.INTENT, {
        name: taskName,
        description: typeof ast.task === 'object' ? (ast.task.description || ast.task.name) : ast.task,
        deadline: typeof ast.task === 'object' ? (ast.task.deadline || null) : null,
        success_criteria: typeof ast.task === 'object' ? (ast.task.acceptance || []) : [],
        priority: 0.9,
        source: 'ael'
      });
      program.add(intent);
    }

    // --- BUDGET → CONSTRAINT ---
    if (ast.budget) {
      const budgetMax = typeof ast.budget === 'number' ? ast.budget : ast.budget.max;
      const constraint = new IRNode(IRNodeType.CONSTRAINT, {
        type: 'resource_budget',
        max_amount: budgetMax,
        currency: typeof ast.budget === 'object' ? (ast.budget.currency || 'token') : 'token',
        allocation_strategy: ast.budget.strategy || 'proportional',
        source: 'ael'
      });
      program.add(constraint);
    }

    // --- COLLATERAL → COMMIT ---
    if (ast.collateral) {
      const commit = new IRNode(IRNodeType.COMMIT, {
        type: 'stake',
        amount: ast.collateral.amount,
        condition: ast.collateral.condition || 'task_completion',
        motivation_weight: this._collateralToMotivation(ast.collateral.amount),
        source: 'ael'
      });
      program.add(commit);
    }

    // --- VERIFY → VALIDATE ---
    if (ast.verify && ast.verify.length > 0) {
      for (const v of ast.verify) {
        const validator = new IRNode(IRNodeType.VALIDATE, {
          type: 'verification',
          method: v.method || v.type || 'assertion',
          criteria: v.criteria || v.condition || v.value,
          threshold: v.threshold || 0.8,
          source: 'ael'
        });
        program.add(validator);
      }
    }

    // --- REWARD → LEARN ---
    if (ast.reward) {
      const learner = new IRNode(IRNodeType.LEARN, {
        type: 'reinforcement',
        signal_type: 'reward',
        amount: ast.reward.amount,
        condition: ast.reward.condition || 'task_success',
        learning_rate: 0.1,
        source: 'ael'
      });
      program.add(learner);
    }

    // --- COMPUTE → PROCESS ---
    if (ast.compute) {
      if (ast.compute.model) {
        const process = new IRNode(IRNodeType.PROCESS, {
          mode: ProcessMode.ANALYTICAL,
          model: ast.compute.model,
          parameters: ast.compute.params || {},
          returnExpr: ast.compute.returnExpr,
          source: 'ael'
        });
        program.add(process);
      }
      if (ast.compute.steps && ast.compute.steps.length > 0) {
        for (const step of ast.compute.steps) {
          const proc = new IRNode(IRNodeType.PROCESS, {
            mode: ProcessMode.ANALYTICAL,
            operation: step.operation || step,
            source: 'ael'
          });
          program.add(proc);
        }
      }
    }

    // --- FLOW (stateFlow) → DECIDE ---
    if (ast.stateFlow) {
      let states, transitions, initial;
      if (Array.isArray(ast.stateFlow)) {
        // Legacy format: array of {from, to, event} transitions
        const allStates = new Set();
        ast.stateFlow.forEach(t => { allStates.add(t.from); allStates.add(t.to); });
        states = [...allStates];
        transitions = ast.stateFlow;
        initial = ast.stateFlow[0]?.from || states[0];
      } else {
        states = ast.stateFlow.states || [];
        transitions = ast.stateFlow.transitions || [];
        initial = ast.stateFlow.initial || states[0];
      }
      if (states.length > 0) {
        const decision = new IRNode(IRNodeType.DECIDE, {
          type: 'state_machine',
          states,
          transitions,
          initial,
          source: 'ael'
        });
        program.add(decision);
      }
    }

    // --- PLUGINS → PERCEIVE ---
    if (ast.plugins && ast.plugins.length > 0) {
      for (const plugin of ast.plugins) {
        const perceiver = new IRNode(IRNodeType.PERCEIVE, {
          type: 'external_modality',
          name: plugin.name || plugin,
          capabilities: plugin.capabilities || [],
          source: 'ael'
        });
        program.add(perceiver);
      }
    }

    // --- META_RULE → META ---
    if (ast.metaRules && ast.metaRules.length > 0) {
      for (const rule of ast.metaRules) {
        const meta = new IRNode(IRNodeType.META, {
          type: 'governance_rule',
          condition: rule.condition || rule.when,
          action: rule.action || rule.then,
          priority: rule.priority || 0.5,
          source: 'ael'
        });
        program.add(meta);
      }
    }

    // --- COGNITIVE PRIMITIVES (already cognitive, direct mapping) ---
    if (ast.cognitive) {
      this._compileCognitiveBlock(ast.cognitive, program);
    }

    // --- GENERAL PROFILE AGENT BLOCKS ---
    if (Array.isArray(ast.agents) && ast.agents.length > 0) {
      this._compileAgents(ast.agents, program);
    }

    // --- EXTENDED COGNITIVE (v0.4+) ---
    if (ast.cognitiveFlow) {
      this._compileCognitiveFlow(ast.cognitiveFlow, program);
    }
    if (ast.social) {
      this._compileSocial(ast.social, program);
    }
    if (ast.evolution) {
      this._compileEvolution(ast.evolution, program);
    }

    const bridge = ast.cognition?.context?._cognitiveBridge;
    if (bridge) {
      const { injectCanonicalBridge } = require('./canonical-cognitive-bridge');
      injectCanonicalBridge(program, bridge);
    }

    // Compute execution order based on dependencies
    this._computeExecutionOrder(program);

    return { program, warnings: this.warnings };
  }

  // --- Cognitive Block Compilation ---

  _compileCognitiveBlock(cog, program) {
    // DRIVE → INTENT
    if (cog.drives) {
      for (const d of cog.drives) {
        program.add(new IRNode(IRNodeType.INTENT, {
          name: d.name || d.goal,
          description: d.goal || d.name,
          importance: d.importance || 0.8,
          source: 'cognitive'
        }));
      }
    }

    // ATTEND → ATTEND
    if (cog.attentions) {
      for (const a of cog.attentions) {
        program.add(new IRNode(IRNodeType.ATTEND, {
          focus: a.focus || a.target,
          filter: a.filter || null,
          duration: a.duration || null,
          source: 'cognitive'
        }));
      }
    }

    // WORKSPACE → ATTEND (workspace is attention management)
    if (cog.workspaces) {
      for (const w of cog.workspaces) {
        program.add(new IRNode(IRNodeType.ATTEND, {
          type: 'workspace',
          capacity: w.capacity || 7,
          broadcast: w.broadcast || false,
          source: 'cognitive'
        }));
      }
    }

    // PREDICT → PREDICT
    if (cog.predictions) {
      for (const p of cog.predictions) {
        program.add(new IRNode(IRNodeType.PREDICT, {
          target: p.target || p.what,
          horizon: p.horizon || 1,
          model: p.model || 'bayesian',
          source: 'cognitive'
        }));
      }
    }

    // PERCEIVE → PERCEIVE
    if (cog.perceptions) {
      for (const p of cog.perceptions) {
        program.add(new IRNode(IRNodeType.PERCEIVE, {
          modality: p.modality || 'text',
          source_input: p.source || p.input,
          preprocessing: p.preprocessing || null,
          source: 'cognitive'
        }));
      }
    }

    // INTUIT → PROCESS (intuitive mode)
    if (cog.intuitions) {
      for (const i of cog.intuitions) {
        program.add(new IRNode(IRNodeType.PROCESS, {
          mode: ProcessMode.INTUITIVE,
          pattern: i.pattern || i.heuristic,
          confidence_floor: i.confidence || 0.3,
          source: 'cognitive'
        }));
      }
    }

    // REASON → PROCESS (analytical mode)
    if (cog.reasonings) {
      for (const r of cog.reasonings) {
        program.add(new IRNode(IRNodeType.PROCESS, {
          mode: ProcessMode.ANALYTICAL,
          strategy: r.strategy || 'deductive',
          premises: r.premises || [],
          max_depth: r.depth || 5,
          source: 'cognitive'
        }));
      }
    }

    // UNDERSTAND → PROCESS (semantic/contextual understanding)
    if (cog.understandings) {
      for (const u of cog.understandings) {
        program.add(new IRNode(IRNodeType.PROCESS, {
          mode: ProcessMode.ANALYTICAL,
          operation: 'understand',
          context: u.context || u.domain || 'current_context',
          method: u.method || 'semantic',
          confidence: u.confidence !== undefined ? Number(u.confidence) : null,
          source: 'general'
        }));
      }
    }

    // REFLECT → VALIDATE (self-check)
    if (cog.reflections) {
      for (const r of cog.reflections) {
        program.add(new IRNode(IRNodeType.VALIDATE, {
          type: 'reflection',
          target: r.target || 'self',
          criteria: r.criteria || 'coherence',
          source: 'cognitive'
        }));
      }
    }

    // CONSOLIDATE → REMEMBER
    if (cog.consolidations) {
      for (const c of cog.consolidations) {
        program.add(new IRNode(IRNodeType.REMEMBER, {
          operation: MemoryOp.CONSOLIDATE,
          target: c.target || 'recent',
          strength: c.strength || 0.7,
          source: 'cognitive'
        }));
      }
    }

    // DECIDE → DECIDE
    if (cog.decisions) {
      for (const d of cog.decisions) {
        program.add(new IRNode(IRNodeType.DECIDE, {
          type: 'cognitive_decision',
          options: d.options || [],
          strategy: d.strategy || 'satisfice',
          threshold: d.threshold || 0.6,
          source: 'cognitive'
        }));
      }
    }

    // ACT → COLLABORATE (tool/action boundary until Action IR is promoted)
    if (cog.acts) {
      for (const a of cog.acts) {
        program.add(new IRNode(IRNodeType.COLLABORATE, {
          mode: CollabMode.DELEGATE,
          action: a.action || a.name || 'act',
          channel: a.channel || 'runtime',
          safety: a.safety || 'standard',
          source: 'general'
        }));
      }
    }

    // FEEDBACK → LEARN
    if (cog.feedback) {
      for (const f of cog.feedback) {
        program.add(new IRNode(IRNodeType.LEARN, {
          type: 'feedback',
          signal_type: f.signal || 'feedback',
          source_name: f.source || 'runtime',
          window: f.window || null,
          source: 'general'
        }));
      }
    }

    // BELIEVE → REMEMBER (store belief)
    if (cog.beliefs) {
      for (const b of cog.beliefs) {
        program.add(new IRNode(IRNodeType.REMEMBER, {
          operation: MemoryOp.STORE,
          type: 'belief',
          content: b.content || b.proposition,
          confidence: b.confidence || 0.7,
          source: 'cognitive'
        }));
      }
    }

    // RECALL → REMEMBER (retrieve)
    if (cog.recalls) {
      for (const r of cog.recalls) {
        program.add(new IRNode(IRNodeType.REMEMBER, {
          operation: MemoryOp.RECALL,
          query: r.query || r.cue,
          type: r.type || 'any',
          source: 'cognitive'
        }));
      }
    }

    // DEBATE → COLLABORATE
    if (cog.debates) {
      for (const d of cog.debates) {
        program.add(new IRNode(IRNodeType.COLLABORATE, {
          mode: CollabMode.DEBATE,
          topic: d.topic || d.proposition,
          participants: d.participants || 2,
          rounds: d.rounds || 3,
          source: 'cognitive'
        }));
      }
    }
  }

  // --- Agent Block Compilation (General Profile) ---

  _compileAgents(agents, program) {
    for (const agent of agents) {
      const intent = new IRNode(IRNodeType.INTENT, {
        type: 'agent',
        name: agent.name,
        description: agent.goal,
        tools: agent.tools || [],
        policy: agent.policy || {},
        memory: agent.memory || null,
        source: 'general'
      });
      program.add(intent);

      for (const step of agent.flow || []) {
        switch (step.kind) {
          case 'perceive':
            program.add(new IRNode(IRNodeType.PERCEIVE, {
              modality: step.modality || 'text',
              source_input: step.source || step.input,
              preprocessing: step.preprocessing || null,
              agent: agent.name,
              source: 'general'
            }));
            break;
          case 'reason':
            program.add(new IRNode(IRNodeType.PROCESS, {
              mode: ProcessMode.ANALYTICAL,
              strategy: step.strategy || 'deductive',
              max_depth: step.depth ? Number(step.depth) : 5,
              agent: agent.name,
              source: 'general'
            }));
            break;
          case 'act':
            program.add(new IRNode(IRNodeType.COLLABORATE, {
              mode: CollabMode.DELEGATE,
              action: step.action || step.name || 'act',
              channel: step.channel || 'runtime',
              safety: step.safety || 'standard',
              agent: agent.name,
              source: 'general'
            }));
            break;
          case 'reflect':
            program.add(new IRNode(IRNodeType.VALIDATE, {
              type: 'reflection',
              target: step.subject || 'self',
              criteria: step.criteria || 'coherence',
              depth: step.depth || 'standard',
              agent: agent.name,
              source: 'general'
            }));
            break;
          case 'understand':
            program.add(new IRNode(IRNodeType.PROCESS, {
              mode: ProcessMode.ANALYTICAL,
              operation: 'understand',
              context: step.context || step.domain || 'current_context',
              method: step.method || 'semantic',
              confidence: step.confidence !== undefined ? Number(step.confidence) : null,
              agent: agent.name,
              source: 'general'
            }));
            break;
          case 'decide':
            program.add(new IRNode(IRNodeType.DECIDE, {
              type: 'cognitive_decision',
              options: step.options || [],
              strategy: step.strategy || 'satisfice',
              threshold: step.threshold ? Number(step.threshold) : 0.6,
              agent: agent.name,
              source: 'general'
            }));
            break;
          case 'feedback':
            program.add(new IRNode(IRNodeType.LEARN, {
              type: 'feedback',
              signal_type: step.signal || 'feedback',
              source_name: step.source || 'runtime',
              window: step.window || null,
              agent: agent.name,
              source: 'general'
            }));
            break;
          default:
            this.warnings.push(`unsupported agent flow step kind '${step.kind}'`);
            break;
        }
      }
    }
  }

  // --- Cognitive Flow Compilation ---

  _compileCognitiveFlow(flow, program) {
    if (flow.conditionals) {
      for (const c of flow.conditionals) {
        program.add(new IRNode(IRNodeType.DECIDE, {
          type: 'conditional_cognition',
          condition: c.condition,
          if_branch: c.then,
          else_branch: c.else || null,
          source: 'cognitive'
        }));
      }
    }

    if (flow.loops) {
      for (const l of flow.loops) {
        program.add(new IRNode(IRNodeType.PROCESS, {
          mode: ProcessMode.ANALYTICAL,
          type: 'iterative_thinking',
          condition: l.until || l.while,
          max_iterations: l.max || 10,
          source: 'cognitive'
        }));
      }
    }

    if (flow.parallels) {
      for (const p of flow.parallels) {
        program.add(new IRNode(IRNodeType.PERCEIVE, {
          type: 'parallel_perception',
          streams: p.streams || p.tasks || [],
          merge_strategy: p.merge || 'attention_weighted',
          source: 'cognitive'
        }));
      }
    }
  }

  // --- Social Compilation ---

  _compileSocial(social, program) {
    if (social.debates) {
      for (const d of social.debates) {
        program.add(new IRNode(IRNodeType.COLLABORATE, {
          mode: CollabMode.DEBATE,
          topic: d.topic,
          agents: d.agents || [],
          rounds: d.rounds || 3,
          source: 'cognitive'
        }));
      }
    }

    if (social.consensus) {
      for (const c of social.consensus) {
        program.add(new IRNode(IRNodeType.COLLABORATE, {
          mode: CollabMode.CONSENSUS,
          proposal: c.proposal,
          quorum: c.quorum || 0.67,
          source: 'cognitive'
        }));
      }
    }

    if (social.swarms) {
      for (const s of social.swarms) {
        program.add(new IRNode(IRNodeType.COLLABORATE, {
          mode: CollabMode.SWARM,
          task: s.task,
          agent_count: s.count || 5,
          source: 'cognitive'
        }));
      }
    }
  }

  // --- Evolution Compilation ---

  _compileEvolution(evo, program) {
    if (evo.mutations) {
      for (const m of evo.mutations) {
        program.add(new IRNode(IRNodeType.EVOLVE, {
          type: 'mutation',
          target: m.target,
          strategy: m.strategy || 'random',
          rate: m.rate || 0.1,
          source: 'cognitive'
        }));
      }
    }

    if (evo.selections) {
      for (const s of evo.selections) {
        program.add(new IRNode(IRNodeType.EVOLVE, {
          type: 'selection',
          fitness_fn: s.fitness,
          population: s.population || 10,
          source: 'cognitive'
        }));
      }
    }
  }

  // --- Execution Order ---

  _computeExecutionOrder(program) {
    // Default cognitive execution order (brain-inspired):
    // 1. Perceive (sense the world)
    // 2. Attend (focus attention)
    // 3. Predict (anticipate)
    // 4. Process (reason about it)
    // 5. Decide (choose action)
    // 6. Validate (check ourselves)
    // 7. Learn (update from outcome)
    // 8. Remember (consolidate)
    // 9. Evolve (long-term adaptation)
    // 10. Meta (self-governance)

    const order = [
      ...program.perceivers.map(n => n.id),
      ...program.attentions.map(n => n.id),
      ...program.predictions.map(n => n.id),
      ...program.intents.map(n => n.id),
      ...program.constraints.map(n => n.id),
      ...program.commitments.map(n => n.id),
      ...program.processes.map(n => n.id),
      ...program.collaborators.map(n => n.id),
      ...program.decisions.map(n => n.id),
      ...program.validators.map(n => n.id),
      ...program.learners.map(n => n.id),
      ...program.memories.map(n => n.id),
      ...program.evolvers.map(n => n.id),
      ...program.metas.map(n => n.id)
    ];

    program.execution_order = order;
  }

  // --- Utility ---

  _collateralToMotivation(amount) {
    // Higher stake → higher motivation (logarithmic)
    if (!amount || amount <= 0) return 0.1;
    return Math.min(1.0, 0.3 + Math.log10(amount + 1) * 0.3);
  }
}

module.exports = {
  IRNodeType,
  ProcessMode,
  MemoryOp,
  CollabMode,
  IRNode,
  IRProgram,
  AELtoIRCompiler
};
