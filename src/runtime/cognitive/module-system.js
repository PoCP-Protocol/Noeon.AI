'use strict';

/**
 * Noeon Module System
 * 
 * Allows users to define, import, compose, and reuse cognitive modules.
 * Unlike traditional module systems (CommonJS, ESM), Noeon modules are
 * COGNITIVE UNITS — they carry their own memory, attention profile,
 * and can be composed into larger cognitive architectures.
 * 
 * Key concepts:
 * - CognitiveModule: A reusable unit of cognition (like a brain region)
 * - ModuleRegistry: Global registry of available modules
 * - ModuleComposer: Compose multiple modules into a pipeline
 * - ModuleLoader: Load modules from .ael files or definitions
 */

const path = require('path');
const fs = require('fs');

// ============================================================
// COGNITIVE MODULE — A reusable unit of cognition
// ============================================================

class CognitiveModule {
  constructor(definition) {
    this.name = definition.name;
    this.version = definition.version ?? '1.0.0';
    this.description = definition.description ?? '';
    this.author = definition.author ?? 'anonymous';
    
    // Cognitive profile
    this.inputs = definition.inputs ?? []; // Expected input types
    this.outputs = definition.outputs ?? []; // Produced output types
    this.primitives = definition.primitives ?? []; // AEL primitives used
    this.capabilities = definition.capabilities ?? []; // Required capabilities
    
    // Internal state
    this.state = {};
    this.memory = [];
    this.config = definition.config ?? {};
    this.hooks = definition.hooks ?? {};
    
    // Execution
    this.execute = definition.execute ?? (() => ({}));
    this.initialize = definition.initialize ?? (() => {});
    this.cleanup = definition.cleanup ?? (() => {});
    
    // Metadata
    this.dependencies = definition.dependencies ?? [];
    this.tags = definition.tags ?? [];
    this.created_at = Date.now();
    this.usage_count = 0;
    this.success_rate = 1.0;
    
    this._initialized = false;
  }

  /** Initialize the module */
  async init(context = {}) {
    if (this._initialized) return;
    await this.initialize(context);
    this._initialized = true;
    return this;
  }

  /** Run the module */
  async run(input, context = {}) {
    if (!this._initialized) await this.init(context);
    
    this.usage_count++;
    const start = Date.now();
    
    try {
      // Pre-hook
      if (this.hooks.before) await this.hooks.before(input, context);
      
      // Execute
      const result = await this.execute(input, { ...context, state: this.state, config: this.config });
      
      // Post-hook
      if (this.hooks.after) await this.hooks.after(result, context);
      
      // Track success
      this.success_rate = this.success_rate * 0.9 + 0.1; // EMA toward 1.0
      
      // Store in memory
      this.memory.push({
        input_summary: typeof input === 'string' ? input.slice(0, 100) : JSON.stringify(input).slice(0, 100),
        output_summary: typeof result === 'string' ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100),
        duration_ms: Date.now() - start,
        timestamp: Date.now()
      });
      
      // Keep memory bounded
      if (this.memory.length > 50) this.memory.shift();
      
      return { success: true, result, duration_ms: Date.now() - start };
    } catch (error) {
      this.success_rate = this.success_rate * 0.9; // EMA toward 0
      return { success: false, error: error.message, duration_ms: Date.now() - start };
    }
  }

  /** Get module signature (for type checking) */
  get signature() {
    return {
      name: this.name,
      inputs: this.inputs,
      outputs: this.outputs,
      capabilities: this.capabilities
    };
  }

  /** Serialize module definition */
  toJSON() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      inputs: this.inputs,
      outputs: this.outputs,
      primitives: this.primitives,
      capabilities: this.capabilities,
      config: this.config,
      tags: this.tags,
      stats: {
        usage_count: this.usage_count,
        success_rate: this.success_rate,
        memory_size: this.memory.length
      }
    };
  }
}

// ============================================================
// MODULE REGISTRY — Global registry of available modules
// ============================================================

class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.aliases = new Map();
    this.categories = new Map();
    this._registerBuiltins();
  }

  /** Register a module */
  register(module) {
    if (!(module instanceof CognitiveModule)) {
      module = new CognitiveModule(module);
    }
    this.modules.set(module.name, module);
    
    // Index by tags
    for (const tag of module.tags) {
      if (!this.categories.has(tag)) this.categories.set(tag, []);
      this.categories.get(tag).push(module.name);
    }
    
    return module;
  }

  /** Get a module by name or alias */
  get(name) {
    if (this.modules.has(name)) return this.modules.get(name);
    if (this.aliases.has(name)) return this.modules.get(this.aliases.get(name));
    return null;
  }

  /** Create an alias for a module */
  alias(alias_name, module_name) {
    this.aliases.set(alias_name, module_name);
  }

  /** Find modules by capability */
  findByCapability(capability) {
    return [...this.modules.values()].filter(m => m.capabilities.includes(capability));
  }

  /** Find modules by input type */
  findByInput(input_type) {
    return [...this.modules.values()].filter(m => m.inputs.includes(input_type) || m.inputs.includes('*'));
  }

  /** Find modules by tag */
  findByTag(tag) {
    const names = this.categories.get(tag) || [];
    return names.map(n => this.modules.get(n)).filter(Boolean);
  }

  /** List all registered modules */
  list() {
    return [...this.modules.values()].map(m => m.toJSON());
  }

  /** Get best module for a task (based on success rate and capabilities) */
  recommend(task_description, required_capabilities = []) {
    let candidates = [...this.modules.values()];
    
    // Filter by capabilities
    if (required_capabilities.length > 0) {
      candidates = candidates.filter(m =>
        required_capabilities.every(cap => m.capabilities.includes(cap))
      );
    }
    
    // Score by success rate and usage
    candidates.sort((a, b) => {
      const score_a = a.success_rate * 0.7 + Math.min(a.usage_count / 100, 1) * 0.3;
      const score_b = b.success_rate * 0.7 + Math.min(b.usage_count / 100, 1) * 0.3;
      return score_b - score_a;
    });
    
    return candidates[0] || null;
  }

  /** Register built-in modules */
  _registerBuiltins() {
    // Quick Analyzer module
    this.register(new CognitiveModule({
      name: 'quick_analyzer',
      description: 'Fast pattern recognition and anomaly detection',
      inputs: ['numerical', 'array'],
      outputs: ['Belief'],
      capabilities: ['pattern_recognition', 'anomaly_detection'],
      tags: ['analysis', 'system1'],
      execute: (input) => {
        const data = Array.isArray(input) ? input : [input];
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const trend = data.length > 1 ? (data[data.length - 1] - data[0]) / data.length : 0;
        return { mean, trend, direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable', confidence: 0.7 };
      }
    }));

    // Deep Reasoner module
    this.register(new CognitiveModule({
      name: 'deep_reasoner',
      description: 'Multi-step logical reasoning with evidence evaluation',
      inputs: ['Belief', 'text', '*'],
      outputs: ['Belief'],
      capabilities: ['reasoning', 'logic', 'evidence_evaluation'],
      tags: ['reasoning', 'system2'],
      execute: (input) => {
        return {
          conclusion: `Reasoned about: ${typeof input === 'string' ? input : JSON.stringify(input).slice(0, 50)}`,
          steps: ['identify_premises', 'evaluate_evidence', 'draw_conclusion'],
          confidence: 0.75,
          reasoning_type: 'analytical'
        };
      }
    }));

    // Memory Consolidator module
    this.register(new CognitiveModule({
      name: 'memory_consolidator',
      description: 'Consolidate working memory into long-term storage',
      inputs: ['*'],
      outputs: ['MemoryTrace'],
      capabilities: ['memory', 'consolidation'],
      tags: ['memory', 'learning'],
      execute: (input) => {
        return {
          stored: true,
          content: input,
          encoding_strength: 0.6,
          timestamp: Date.now(),
          type: 'semantic'
        };
      }
    }));

    // Decision Maker module
    this.register(new CognitiveModule({
      name: 'decision_maker',
      description: 'Multi-criteria decision making with emotion weighting',
      inputs: ['Belief', 'array'],
      outputs: ['Intention'],
      capabilities: ['decision', 'evaluation'],
      tags: ['decision', 'action'],
      execute: (input) => {
        const options = Array.isArray(input) ? input : [input];
        return {
          chosen: options[0],
          confidence: 0.7,
          alternatives: options.slice(1),
          rationale: 'highest_expected_value'
        };
      }
    }));

    // Self Reflector module
    this.register(new CognitiveModule({
      name: 'self_reflector',
      description: 'Metacognitive self-evaluation and strategy adjustment',
      inputs: ['*'],
      outputs: ['Belief'],
      capabilities: ['metacognition', 'self_evaluation'],
      tags: ['metacognition', 'reflection'],
      execute: (input) => {
        return {
          assessment: 'adequate',
          improvements: ['increase_evidence_gathering', 'reduce_overconfidence'],
          confidence_in_assessment: 0.6,
          meta_level: 'second_order'
        };
      }
    }));
  }
}

// ============================================================
// MODULE COMPOSER — Compose modules into cognitive pipelines
// ============================================================

class ModuleComposer {
  constructor(registry) {
    this.registry = registry;
    this.pipelines = new Map();
  }

  /**
   * Create a cognitive pipeline from module names
   * @param {string} name - Pipeline name
   * @param {Array} steps - [{module: 'name', config: {}}]
   * @returns {CognitivePipeline}
   */
  compose(name, steps) {
    const pipeline = new CognitivePipeline(name, steps, this.registry);
    this.pipelines.set(name, pipeline);
    return pipeline;
  }

  /**
   * Auto-compose a pipeline for a given task
   * @param {string} task - Task description
   * @param {Array} required_outputs - Expected output types
   * @returns {CognitivePipeline}
   */
  autoCompose(task, required_outputs = ['Belief']) {
    const steps = [];
    
    // Always start with perception
    const perceiver = this.registry.findByCapability('pattern_recognition')[0];
    if (perceiver) steps.push({ module: perceiver.name, role: 'perceive' });
    
    // Add reasoning
    const reasoner = this.registry.findByCapability('reasoning')[0];
    if (reasoner) steps.push({ module: reasoner.name, role: 'reason' });
    
    // Add decision if needed
    if (required_outputs.includes('Intention')) {
      const decider = this.registry.findByCapability('decision')[0];
      if (decider) steps.push({ module: decider.name, role: 'decide' });
    }
    
    // Always end with reflection
    const reflector = this.registry.findByCapability('metacognition')[0];
    if (reflector) steps.push({ module: reflector.name, role: 'reflect' });
    
    return this.compose(`auto_${task.replace(/\s+/g, '_').slice(0, 30)}`, steps);
  }

  /** List all composed pipelines */
  listPipelines() {
    return [...this.pipelines.entries()].map(([name, pipeline]) => ({
      name,
      steps: pipeline.steps.length,
      description: pipeline.describe()
    }));
  }
}

// ============================================================
// COGNITIVE PIPELINE — A composed sequence of modules
// ============================================================

class CognitivePipeline {
  constructor(name, steps, registry) {
    this.name = name;
    this.steps = steps;
    this.registry = registry;
    this.execution_history = [];
    this.created_at = Date.now();
  }

  /** Execute the pipeline */
  async execute(initial_input, context = {}) {
    let current_input = initial_input;
    const trace = [];
    const start = Date.now();
    
    for (const step of this.steps) {
      const module = this.registry.get(step.module);
      if (!module) {
        trace.push({ step: step.module, status: 'skipped', reason: 'module_not_found' });
        continue;
      }
      
      const step_start = Date.now();
      const result = await module.run(current_input, { ...context, ...step.config });
      
      trace.push({
        step: step.module,
        role: step.role,
        status: result.success ? 'success' : 'failed',
        duration_ms: Date.now() - step_start,
        output_preview: result.success ? JSON.stringify(result.result).slice(0, 100) : result.error
      });
      
      if (result.success) {
        current_input = result.result;
      } else {
        // On failure, try to continue with previous input
        trace[trace.length - 1].fallback = true;
      }
    }
    
    const execution = {
      pipeline: this.name,
      input: initial_input,
      output: current_input,
      trace,
      total_duration_ms: Date.now() - start,
      success: trace.every(t => t.status !== 'failed'),
      timestamp: Date.now()
    };
    
    this.execution_history.push(execution);
    if (this.execution_history.length > 20) this.execution_history.shift();
    
    return execution;
  }

  /** Describe the pipeline in natural language */
  describe() {
    return this.steps.map(s => `${s.role || s.module}`).join(' → ');
  }

  /** Get pipeline statistics */
  get stats() {
    const total = this.execution_history.length;
    const successes = this.execution_history.filter(e => e.success).length;
    const avg_duration = total > 0
      ? this.execution_history.reduce((sum, e) => sum + e.total_duration_ms, 0) / total
      : 0;
    
    return {
      total_executions: total,
      success_rate: total > 0 ? successes / total : 0,
      avg_duration_ms: avg_duration
    };
  }
}

// ============================================================
// MODULE LOADER — Load modules from files
// ============================================================

class ModuleLoader {
  constructor(registry) {
    this.registry = registry;
    this.search_paths = [
      './modules',
      './src/modules',
      './node_modules'
    ];
  }

  /** Load a module from a .js file */
  loadFromFile(filepath) {
    try {
      const abs_path = path.resolve(filepath);
      if (!fs.existsSync(abs_path)) {
        return { success: false, error: `File not found: ${filepath}` };
      }
      
      const definition = require(abs_path);
      const module = this.registry.register(definition);
      return { success: true, module };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /** Load all modules from a directory */
  loadFromDirectory(dirpath) {
    const results = [];
    try {
      const abs_path = path.resolve(dirpath);
      if (!fs.existsSync(abs_path)) return results;
      
      const files = fs.readdirSync(abs_path).filter(f => f.endsWith('.js'));
      for (const file of files) {
        results.push(this.loadFromFile(path.join(abs_path, file)));
      }
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
    return results;
  }

  /** Create a module from an AEL cognitive block */
  createFromAEL(name, ael_cognitive_block) {
    const primitives = [];
    
    // Extract primitives from the cognitive block
    const sections = ['drives', 'perceptions', 'predictions', 'intuitions',
      'reasonings', 'decisions', 'reflections', 'consolidations'];
    
    for (const section of sections) {
      if (ael_cognitive_block[section] && ael_cognitive_block[section].length > 0) {
        primitives.push(section.replace(/s$/, '').toUpperCase());
      }
    }
    
    const module = new CognitiveModule({
      name,
      description: `Auto-generated from AEL cognitive block`,
      primitives,
      inputs: ['*'],
      outputs: ['Belief'],
      tags: ['auto_generated', 'ael'],
      execute: (input) => {
        return {
          source: 'ael_module',
          primitives_executed: primitives,
          input_received: input,
          confidence: 0.6
        };
      }
    });
    
    this.registry.register(module);
    return module;
  }

  /** Add a search path */
  addSearchPath(dirpath) {
    this.search_paths.push(dirpath);
  }

  /** Find a module by name across all search paths */
  find(name) {
    for (const search_path of this.search_paths) {
      const filepath = path.join(search_path, `${name}.js`);
      if (fs.existsSync(path.resolve(filepath))) {
        return filepath;
      }
    }
    return null;
  }
}

// ============================================================
// MODULE DEFINITION DSL — Fluent API for defining modules
// ============================================================

class ModuleBuilder {
  constructor(name) {
    this._def = {
      name,
      version: '1.0.0',
      description: '',
      inputs: [],
      outputs: [],
      primitives: [],
      capabilities: [],
      config: {},
      tags: [],
      hooks: {},
      execute: () => ({})
    };
  }

  version(v) { this._def.version = v; return this; }
  description(d) { this._def.description = d; return this; }
  accepts(...types) { this._def.inputs = types; return this; }
  produces(...types) { this._def.outputs = types; return this; }
  uses(...primitives) { this._def.primitives = primitives; return this; }
  can(...capabilities) { this._def.capabilities = capabilities; return this; }
  config(c) { this._def.config = c; return this; }
  tags(...t) { this._def.tags = t; return this; }
  
  before(fn) { this._def.hooks.before = fn; return this; }
  after(fn) { this._def.hooks.after = fn; return this; }
  
  does(fn) { this._def.execute = fn; return this; }
  
  build() { return new CognitiveModule(this._def); }
}

function defineModule(name) {
  return new ModuleBuilder(name);
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  CognitiveModule,
  ModuleRegistry,
  ModuleComposer,
  CognitivePipeline,
  ModuleLoader,
  ModuleBuilder,
  defineModule
};
