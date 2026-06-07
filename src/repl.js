'use strict';

/**
 * Noeon REPL — Interactive Cognitive Environment
 * 
 * Unlike traditional REPLs that evaluate expressions,
 * the Noeon REPL maintains a persistent cognitive state:
 * - Working memory persists across inputs
 * - Beliefs accumulate and can be queried
 * - The system can reflect on its own reasoning
 * - You can "think" interactively
 * 
 * Commands:
 *   .think <text>      — Process a thought through the cognitive engine
 *   .believe <text>    — Assert a belief with optional confidence
 *   .predict <text>    — Make a prediction
 *   .reason <text>     — Engage deep reasoning
 *   .reflect           — Trigger metacognitive reflection
 *   .memory            — Show current working memory
 *   .beliefs           — Show all active beliefs
 *   .workspace         — Show workspace state
 *   .trace             — Show last cognitive trace
 *   .module <name>     — Load and run a cognitive module
 *   .pipeline <steps>  — Create and run a cognitive pipeline
 *   .type <expr>       — Show the cognitive type of an expression
 *   .evolve            — Trigger self-evolution cycle
 *   .status            — Show cognitive engine status
 *   .help              — Show available commands
 *   .exit              — Exit the REPL
 * 
 * Or just type natural language — the REPL will route it through
 * the appropriate cognitive pathway automatically.
 */

const readline = require('readline');
const { CognitiveEngine } = require('./runtime/cognitive/cognitive-engine');
const { ModuleRegistry, ModuleComposer } = require('./runtime/cognitive/module-system');
const {
  CognitiveValue, Belief, Uncertain, Temporal, Emotion,
  Intention, Percept, MemoryTrace, TypeChecker,
  belief, uncertain, temporal, emotion, intention, percept, memory
} = require('./runtime/cognitive/type-system');
const { Reasoning, Decision, Learning, Attention, Pattern, Probability } = require('./stdlib');

// ============================================================
// REPL STATE — Persistent cognitive context
// ============================================================

class ReplState {
  constructor() {
    this.beliefs = new Map();
    this.working_memory = [];
    this.intentions = [];
    this.emotions = [];
    this.history = [];
    this.trace = [];
    this.cycle_count = 0;
    this.session_start = Date.now();
    this.modules = new ModuleRegistry();
    this.composer = new ModuleComposer(this.modules);
    this.type_checker = new TypeChecker();
    this.engine = null;
    this.last_result = null;
  }

  addToMemory(item) {
    this.working_memory.push({
      content: item,
      timestamp: Date.now(),
      salience: 0.7
    });
    // Miller's number: keep only 7±2 items in working memory
    if (this.working_memory.length > 9) {
      // Evict least salient
      this.working_memory.sort((a, b) => b.salience - a.salience);
      this.working_memory = this.working_memory.slice(0, 7);
    }
  }

  addBelief(key, proposition, confidence = 0.7) {
    const b = new Belief(proposition, { confidence, provenance: 'repl_assertion' });
    this.beliefs.set(key || `belief_${this.beliefs.size}`, b);
    return b;
  }

  getSessionDuration() {
    return ((Date.now() - this.session_start) / 1000).toFixed(0);
  }
}

// ============================================================
// COMMAND HANDLERS
// ============================================================

const handlers = {
  async think(state, input) {
    state.cycle_count++;
    const thought = input.trim();
    
    // Route through cognitive pathway
    const percept_val = new Percept(thought, { modality: 'textual', novelty: 0.6 });
    state.addToMemory(percept_val);
    
    // Quick pattern check (System 1)
    const similar_beliefs = [...state.beliefs.values()].filter(b => {
      const words_thought = new Set(thought.toLowerCase().split(/\s+/));
      const words_belief = new Set(String(b.value).toLowerCase().split(/\s+/));
      const overlap = [...words_thought].filter(w => words_belief.has(w)).length;
      return overlap > 0;
    });
    
    // Generate response
    const result = {
      thought,
      associations: similar_beliefs.map(b => ({ belief: b.value, confidence: b.confidence })),
      novelty: similar_beliefs.length === 0 ? 'high' : 'low',
      working_memory_size: state.working_memory.length,
      cycle: state.cycle_count
    };
    
    state.last_result = result;
    state.trace.push({ type: 'think', input: thought, result, timestamp: Date.now() });
    
    return result;
  },

  async believe(state, input) {
    // Parse: "proposition" confidence=0.8
    const match = input.match(/^"?([^"]+)"?\s*(?:confidence=)?([\d.]+)?$/);
    const proposition = match ? match[1].trim() : input.trim();
    const confidence = match && match[2] ? parseFloat(match[2]) : 0.7;
    
    const key = proposition.toLowerCase().replace(/\s+/g, '_').slice(0, 30);
    const b = state.addBelief(key, proposition, confidence);
    state.addToMemory(b);
    
    return {
      action: 'belief_asserted',
      key,
      proposition,
      confidence,
      total_beliefs: state.beliefs.size
    };
  },

  async predict(state, input) {
    const prediction = input.trim();
    const u = new Uncertain(0.5, { variance: 0.15, confidence: 0.6 });
    
    // Check if we have supporting beliefs
    const support = [...state.beliefs.values()].filter(b => b.confidence > 0.5);
    const base_confidence = support.length > 0 ? 0.5 + support.length * 0.05 : 0.4;
    
    const result = {
      prediction,
      confidence: Math.min(0.9, base_confidence),
      uncertainty: u.std.toFixed(3),
      supporting_beliefs: support.length,
      type: 'Uncertain'
    };
    
    state.addToMemory({ type: 'prediction', ...result });
    state.last_result = result;
    return result;
  },

  async reason(state, input) {
    const question = input.trim();
    
    // Gather relevant beliefs as premises
    const premises = [...state.beliefs.values()]
      .filter(b => b.confidence > 0.4)
      .slice(0, 5)
      .map(b => ({ statement: b.value, confidence: b.confidence }));
    
    // Apply reasoning
    let result;
    if (premises.length >= 2) {
      result = Reasoning.deductive(premises, `Analyze: ${question}`);
    } else if (premises.length === 1) {
      result = Reasoning.abductive(
        { observation: question },
        [
          { explanation: premises[0].statement, prior: premises[0].confidence, likelihood: 0.7 },
          { explanation: 'Unknown factors', prior: 0.3, likelihood: 0.5 }
        ]
      );
    } else {
      result = {
        type: 'insufficient_evidence',
        message: 'Not enough beliefs to reason from. Use .believe to add premises.',
        confidence: 0.2
      };
    }
    
    state.addToMemory({ type: 'reasoning', question, result });
    state.last_result = result;
    state.trace.push({ type: 'reason', input: question, result, timestamp: Date.now() });
    return result;
  },

  async reflect(state, _input) {
    const reflection = {
      session_duration_s: state.getSessionDuration(),
      total_cycles: state.cycle_count,
      beliefs_count: state.beliefs.size,
      working_memory_load: `${state.working_memory.length}/9`,
      memory_utilization: (state.working_memory.length / 9 * 100).toFixed(0) + '%',
      strongest_belief: null,
      weakest_belief: null,
      cognitive_state: 'active',
      recommendations: []
    };
    
    if (state.beliefs.size > 0) {
      const sorted = [...state.beliefs.values()].sort((a, b) => b.confidence - a.confidence);
      reflection.strongest_belief = { value: sorted[0].value, confidence: sorted[0].confidence };
      reflection.weakest_belief = { value: sorted[sorted.length - 1].value, confidence: sorted[sorted.length - 1].confidence };
    }
    
    // Metacognitive recommendations
    if (state.beliefs.size === 0) {
      reflection.recommendations.push('No beliefs established. Start with .believe to build knowledge.');
    }
    if (state.working_memory.length > 7) {
      reflection.recommendations.push('Working memory near capacity. Consider consolidating.');
    }
    if (state.cycle_count > 10 && state.beliefs.size < 3) {
      reflection.recommendations.push('Many cycles but few beliefs. Consider formalizing observations.');
    }
    if (state.trace.length > 5) {
      const recent_types = state.trace.slice(-5).map(t => t.type);
      if (new Set(recent_types).size === 1) {
        reflection.recommendations.push(`Cognitive pattern detected: repeated ${recent_types[0]}. Try diversifying.`);
      }
    }
    
    reflection.cognitive_state = state.working_memory.length > 5 ? 'loaded' :
      state.beliefs.size > 5 ? 'knowledge_rich' : 'exploratory';
    
    state.last_result = reflection;
    return reflection;
  },

  async showMemory(state) {
    return {
      working_memory: state.working_memory.map((item, i) => ({
        slot: i + 1,
        content: typeof item.content === 'object' ? (item.content._type || item.content.type || 'object') : item.content,
        salience: item.salience?.toFixed(2) ?? 'N/A',
        age_s: ((Date.now() - item.timestamp) / 1000).toFixed(0)
      })),
      capacity: `${state.working_memory.length}/9`,
      oldest_item_age_s: state.working_memory.length > 0
        ? ((Date.now() - state.working_memory[0].timestamp) / 1000).toFixed(0)
        : 'N/A'
    };
  },

  async showBeliefs(state) {
    const beliefs = {};
    for (const [key, b] of state.beliefs) {
      beliefs[key] = {
        proposition: b.value,
        confidence: b.confidence.toFixed(2),
        coherence: b.coherence.toFixed(2),
        evidence_count: b.evidence.length,
        contradictions: b.contradictions.length
      };
    }
    return { beliefs, total: state.beliefs.size };
  },

  async showWorkspace(state) {
    return {
      session_id: state.session_start,
      duration_s: state.getSessionDuration(),
      cycles: state.cycle_count,
      beliefs: state.beliefs.size,
      working_memory: state.working_memory.length,
      intentions: state.intentions.length,
      trace_length: state.trace.length,
      modules_loaded: state.modules.list().length,
      last_result_type: state.last_result ? (state.last_result.type || typeof state.last_result) : 'none'
    };
  },

  async showTrace(state) {
    return {
      recent_trace: state.trace.slice(-5).map(t => ({
        type: t.type,
        input: typeof t.input === 'string' ? t.input.slice(0, 50) : '...',
        timestamp: new Date(t.timestamp).toISOString(),
        has_result: !!t.result
      })),
      total_entries: state.trace.length
    };
  },

  async runModule(state, input) {
    const module_name = input.trim();
    const module = state.modules.get(module_name);
    if (!module) {
      return { error: `Module '${module_name}' not found. Available: ${state.modules.list().map(m => m.name).join(', ')}` };
    }
    
    const last_input = state.last_result || state.working_memory[state.working_memory.length - 1]?.content || {};
    const result = await module.run(last_input);
    state.last_result = result.result;
    state.addToMemory({ type: 'module_output', module: module_name, result: result.result });
    return result;
  },

  async createPipeline(state, input) {
    const steps = input.trim().split(/\s*->\s*|\s*,\s*/);
    const pipeline_steps = steps.map(s => ({ module: s.trim(), role: s.trim() }));
    
    const pipeline = state.composer.compose(`repl_pipeline_${Date.now()}`, pipeline_steps);
    const last_input = state.last_result || 'default_input';
    const result = await pipeline.execute(last_input);
    
    state.last_result = result.output;
    return {
      pipeline: pipeline.describe(),
      success: result.success,
      output: result.output,
      trace: result.trace
    };
  },

  async showType(state, input) {
    const expr = input.trim();
    // Check if it's a known type
    const type_map = {
      'belief': 'Belief — A proposition held to be true with confidence and evidence',
      'uncertain': 'Uncertain — A value with probability distribution (mean ± variance)',
      'temporal': 'Temporal — A time-varying value with history, trend, and prediction',
      'emotion': 'Emotion — An affective state (valence × arousal × dominance)',
      'intention': 'Intention — A goal-directed state with priority and feasibility',
      'percept': 'Percept — A sensory input with modality and attention weight',
      'memory': 'MemoryTrace — A stored experience with encoding strength and associations'
    };
    
    if (type_map[expr.toLowerCase()]) {
      return { type: expr, description: type_map[expr.toLowerCase()] };
    }
    
    // Check last result
    if (state.last_result) {
      return {
        expression: expr || 'last_result',
        inferred_type: state.last_result._type || state.last_result.type || typeof state.last_result,
        confidence: state.last_result.confidence ?? 'N/A'
      };
    }
    
    return { type: 'unknown', hint: 'Available types: belief, uncertain, temporal, emotion, intention, percept, memory' };
  },

  async evolve(state) {
    // Trigger self-evolution: analyze patterns and suggest improvements
    const patterns = state.trace.map(t => t.type);
    const unique_patterns = [...new Set(patterns)];
    
    const evolution = {
      patterns_observed: unique_patterns,
      total_interactions: state.cycle_count,
      suggested_optimizations: [],
      new_rules: []
    };
    
    // Analyze and suggest
    if (patterns.filter(p => p === 'think').length > patterns.length * 0.7) {
      evolution.suggested_optimizations.push('Heavy thinking pattern — consider adding .believe to formalize insights');
      evolution.new_rules.push({ trigger: 'repeated_think', action: 'auto_believe', confidence: 0.5 });
    }
    
    if (state.beliefs.size > 10) {
      evolution.suggested_optimizations.push('Rich belief base — ready for complex reasoning chains');
      evolution.new_rules.push({ trigger: 'belief_threshold', action: 'enable_deep_reasoning', confidence: 0.7 });
    }
    
    if (state.working_memory.length >= 7) {
      evolution.suggested_optimizations.push('Memory pressure — auto-consolidation recommended');
      evolution.new_rules.push({ trigger: 'memory_full', action: 'auto_consolidate', confidence: 0.8 });
    }
    
    state.last_result = evolution;
    return evolution;
  },

  async status(state) {
    return {
      engine: 'Noeon Cognitive REPL v0.6.0',
      session: {
        duration: `${state.getSessionDuration()}s`,
        cycles: state.cycle_count,
        beliefs: state.beliefs.size,
        working_memory: `${state.working_memory.length}/9`,
        trace_entries: state.trace.length
      },
      modules: {
        registered: state.modules.list().length,
        available: state.modules.list().map(m => m.name)
      },
      cognitive_load: (state.working_memory.length / 9 * 100).toFixed(0) + '%',
      health: state.cycle_count > 0 ? 'active' : 'idle'
    };
  }
};

// ============================================================
// REPL MAIN LOOP
// ============================================================

function startRepl(options = {}) {
  const state = new ReplState();
  const quiet = options.quiet ?? false;
  
  if (!quiet) {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════════╗');
    console.log('  ║         Noeon AI — Cognitive REPL v0.6.0                ║');
    console.log('  ║     "Think interactively. Reason in real-time."         ║');
    console.log('  ╠══════════════════════════════════════════════════════════╣');
    console.log('  ║  Commands:                                              ║');
    console.log('  ║    .think <text>    — Process a thought                 ║');
    console.log('  ║    .believe <text>  — Assert a belief                   ║');
    console.log('  ║    .predict <text>  — Make a prediction                 ║');
    console.log('  ║    .reason <text>   — Deep reasoning                    ║');
    console.log('  ║    .reflect         — Metacognitive reflection          ║');
    console.log('  ║    .memory          — Show working memory               ║');
    console.log('  ║    .beliefs         — Show all beliefs                  ║');
    console.log('  ║    .status          — Show engine status                ║');
    console.log('  ║    .help            — Full command list                 ║');
    console.log('  ║    .exit            — Exit                              ║');
    console.log('  ║                                                         ║');
    console.log('  ║  Or just type naturally — I\'ll think about it.          ║');
    console.log('  ╚══════════════════════════════════════════════════════════╝');
    console.log('');
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'noeon> '
  });
  
  rl.prompt();
  
  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    
    try {
      let result;
      
      if (input === '.exit' || input === '.quit') {
        console.log(`\n  Session ended. ${state.cycle_count} cognitive cycles, ${state.beliefs.size} beliefs formed.\n`);
        rl.close();
        return;
      }
      
      if (input === '.help') {
        console.log(`
  Available commands:
    .think <text>       Process a thought through cognitive pathways
    .believe <text>     Assert a belief (optional: confidence=0.8)
    .predict <text>     Make a prediction about the future
    .reason <text>      Engage deep reasoning about a question
    .reflect            Metacognitive self-reflection
    .memory             Show current working memory (7±2 slots)
    .beliefs            Show all active beliefs with confidence
    .workspace          Show full workspace state
    .trace              Show recent cognitive trace
    .module <name>      Run a cognitive module
    .pipeline <a -> b>  Create and run a module pipeline
    .type <expr>        Show cognitive type information
    .evolve             Trigger self-evolution analysis
    .status             Show engine status
    .exit               Exit the REPL
    
  Or type any text — it will be processed as a thought.
`);
        rl.prompt();
        return;
      }
      
      // Parse command
      const cmd_match = input.match(/^\.(\w+)\s*(.*)?$/);
      if (cmd_match) {
        const [, cmd, arg] = cmd_match;
        switch (cmd) {
          case 'think': result = await handlers.think(state, arg || ''); break;
          case 'believe': result = await handlers.believe(state, arg || ''); break;
          case 'predict': result = await handlers.predict(state, arg || ''); break;
          case 'reason': result = await handlers.reason(state, arg || ''); break;
          case 'reflect': result = await handlers.reflect(state); break;
          case 'memory': result = await handlers.showMemory(state); break;
          case 'beliefs': result = await handlers.showBeliefs(state); break;
          case 'workspace': result = await handlers.showWorkspace(state); break;
          case 'trace': result = await handlers.showTrace(state); break;
          case 'module': result = await handlers.runModule(state, arg || ''); break;
          case 'pipeline': result = await handlers.createPipeline(state, arg || ''); break;
          case 'type': result = await handlers.showType(state, arg || ''); break;
          case 'evolve': result = await handlers.evolve(state); break;
          case 'status': result = await handlers.status(state); break;
          default:
            result = { error: `Unknown command: .${cmd}. Type .help for available commands.` };
        }
      } else {
        // Natural language input — route through .think
        result = await handlers.think(state, input);
      }
      
      // Display result
      if (result) {
        console.log('');
        console.log('  ' + JSON.stringify(result, null, 2).split('\n').join('\n  '));
        console.log('');
      }
    } catch (error) {
      console.log(`\n  Error: ${error.message}\n`);
    }
    
    rl.prompt();
  });
  
  rl.on('close', () => {
    process.exit(0);
  });
  
  return { state, rl };
}

// ============================================================
// PROGRAMMATIC API (for testing and embedding)
// ============================================================

class NoeonSession {
  constructor() {
    this.state = new ReplState();
  }

  async think(text) { return handlers.think(this.state, text); }
  async believe(text, confidence) { return handlers.believe(this.state, `"${text}" confidence=${confidence || 0.7}`); }
  async predict(text) { return handlers.predict(this.state, text); }
  async reason(text) { return handlers.reason(this.state, text); }
  async reflect() { return handlers.reflect(this.state); }
  async memory() { return handlers.showMemory(this.state); }
  async beliefs() { return handlers.showBeliefs(this.state); }
  async workspace() { return handlers.showWorkspace(this.state); }
  async trace() { return handlers.showTrace(this.state); }
  async module(name) { return handlers.runModule(this.state, name); }
  async pipeline(steps) { return handlers.createPipeline(this.state, steps); }
  async type(expr) { return handlers.showType(this.state, expr); }
  async evolve() { return handlers.evolve(this.state); }
  async status() { return handlers.status(this.state); }
}

// ============================================================
// ENTRY POINT
// ============================================================

if (require.main === module) {
  startRepl();
}

module.exports = { startRepl, NoeonSession, ReplState, handlers };
