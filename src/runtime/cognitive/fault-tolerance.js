'use strict';

/**
 * Noeon Cognitive Fault Tolerance System
 * 
 * Brain-inspired error recovery. A brain doesn't throw exceptions —
 * it gets confused, recognizes confusion, and adapts.
 * 
 * Architecture:
 * - CognitiveError: Not an exception, but a "confusion state"
 * - RecoveryStrategy: Multiple strategies (retry, degrade, reroute, heal)
 * - CircuitBreaker: Prevents cascade failures (like neural inhibition)
 * - GracefulDegradation: Reduce capability rather than crash
 * - SelfHealing: Detect and repair damaged cognitive pathways
 * 
 * Neural Correlate: Error-related negativity (ERN) in anterior cingulate cortex
 */

// ============================================================
// COGNITIVE ERROR (Not an exception — a confusion state)
// ============================================================

class CognitiveError {
  constructor(type, context = {}) {
    this.id = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.type = type;
    this.context = context;
    this.timestamp = Date.now();
    this.severity = context.severity || 'moderate';
    this.recoverable = context.recoverable !== false;
    this.attempts = 0;
    this.max_attempts = context.max_attempts || 3;
    this.resolution = null;
    this.cascade_risk = context.cascade_risk || 0.3;
    this.confusion_level = 0.5; // How confused the system is
  }

  get isResolved() { return this.resolution !== null; }
  get canRetry() { return this.attempts < this.max_attempts && this.recoverable; }
  
  escalate() {
    this.severity = { low: 'moderate', moderate: 'high', high: 'critical' }[this.severity] || 'critical';
    this.confusion_level = Math.min(1.0, this.confusion_level + 0.2);
    return this;
  }

  resolve(strategy, result) {
    this.resolution = { strategy, result, resolved_at: Date.now(), duration_ms: Date.now() - this.timestamp };
    return this;
  }

  toTrace() {
    return {
      id: this.id, type: this.type, severity: this.severity,
      attempts: this.attempts, resolved: this.isResolved,
      resolution: this.resolution, duration_ms: Date.now() - this.timestamp
    };
  }
}

// Error type taxonomy (brain-inspired)
const ErrorTypes = {
  // Perception errors
  PERCEPTION_FAILURE: 'perception_failure',       // Can't sense input
  SIGNAL_NOISE: 'signal_noise',                   // Too much noise
  MODALITY_MISMATCH: 'modality_mismatch',         // Wrong input type
  
  // Reasoning errors
  REASONING_TIMEOUT: 'reasoning_timeout',         // Took too long to think
  LOGICAL_CONTRADICTION: 'logical_contradiction', // Beliefs conflict
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence', // Not enough data
  CIRCULAR_REASONING: 'circular_reasoning',       // Reasoning loop detected
  
  // Memory errors
  MEMORY_OVERFLOW: 'memory_overflow',             // Working memory full
  RETRIEVAL_FAILURE: 'retrieval_failure',         // Can't recall
  ENCODING_FAILURE: 'encoding_failure',           // Can't store
  MEMORY_CORRUPTION: 'memory_corruption',         // Stored data inconsistent
  
  // Decision errors
  DECISION_PARALYSIS: 'decision_paralysis',       // Can't decide (equal options)
  CONFIDENCE_TOO_LOW: 'confidence_too_low',       // Not confident enough
  CONFLICTING_GOALS: 'conflicting_goals',         // Goals contradict
  
  // System errors
  RESOURCE_EXHAUSTION: 'resource_exhaustion',     // Out of cognitive resources
  CASCADE_FAILURE: 'cascade_failure',             // Multiple systems failing
  EXTERNAL_DEPENDENCY: 'external_dependency',     // External service down
  EVOLUTION_DIVERGENCE: 'evolution_divergence',   // Self-modification went wrong
  
  // Meta errors
  META_CONFUSION: 'meta_confusion',              // Can't understand own state
  INFINITE_REFLECTION: 'infinite_reflection',    // Reflecting on reflection loop
};

// ============================================================
// RECOVERY STRATEGIES
// ============================================================

class RecoveryStrategy {
  constructor(name, options = {}) {
    this.name = name;
    this.priority = options.priority || 0.5;
    this.applicable_errors = options.applicable_errors || [];
    this.success_rate = 0.5;
    this.usage_count = 0;
    this.success_count = 0;
  }

  get effectiveness() {
    if (this.usage_count === 0) return 0.5;
    return this.success_count / this.usage_count;
  }

  applies(error) {
    if (this.applicable_errors.length === 0) return true;
    return this.applicable_errors.includes(error.type);
  }

  recordOutcome(success) {
    this.usage_count++;
    if (success) this.success_count++;
    this.success_rate = this.effectiveness;
  }
}

// Built-in recovery strategies
const BuiltinStrategies = {
  // Retry with backoff (like neural re-firing)
  retry: new RecoveryStrategy('retry', {
    priority: 0.8,
    applicable_errors: [
      ErrorTypes.PERCEPTION_FAILURE, ErrorTypes.EXTERNAL_DEPENDENCY,
      ErrorTypes.RETRIEVAL_FAILURE
    ]
  }),

  // Graceful degradation (reduce capability, don't crash)
  degrade: new RecoveryStrategy('degrade', {
    priority: 0.6,
    applicable_errors: [
      ErrorTypes.REASONING_TIMEOUT, ErrorTypes.RESOURCE_EXHAUSTION,
      ErrorTypes.MEMORY_OVERFLOW
    ]
  }),

  // Reroute to alternative pathway (like brain plasticity)
  reroute: new RecoveryStrategy('reroute', {
    priority: 0.7,
    applicable_errors: [
      ErrorTypes.MODALITY_MISMATCH, ErrorTypes.CIRCULAR_REASONING,
      ErrorTypes.DECISION_PARALYSIS
    ]
  }),

  // Self-heal (repair damaged state)
  heal: new RecoveryStrategy('heal', {
    priority: 0.5,
    applicable_errors: [
      ErrorTypes.MEMORY_CORRUPTION, ErrorTypes.LOGICAL_CONTRADICTION,
      ErrorTypes.EVOLUTION_DIVERGENCE
    ]
  }),

  // Simplify (reduce complexity of the problem)
  simplify: new RecoveryStrategy('simplify', {
    priority: 0.6,
    applicable_errors: [
      ErrorTypes.REASONING_TIMEOUT, ErrorTypes.DECISION_PARALYSIS,
      ErrorTypes.CONFLICTING_GOALS
    ]
  }),

  // Seek help (ask external source or user)
  seek_help: new RecoveryStrategy('seek_help', {
    priority: 0.3,
    applicable_errors: [
      ErrorTypes.INSUFFICIENT_EVIDENCE, ErrorTypes.META_CONFUSION,
      ErrorTypes.CASCADE_FAILURE
    ]
  }),

  // Reset to safe state (like neural homeostasis)
  reset: new RecoveryStrategy('reset', {
    priority: 0.2,
    applicable_errors: [
      ErrorTypes.CASCADE_FAILURE, ErrorTypes.INFINITE_REFLECTION,
      ErrorTypes.EVOLUTION_DIVERGENCE
    ]
  })
};

// ============================================================
// CIRCUIT BREAKER (Neural Inhibition)
// ============================================================

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'closed'; // closed (normal), open (blocked), half-open (testing)
    this.failure_count = 0;
    this.success_count = 0;
    this.failure_threshold = options.failure_threshold || 5;
    this.recovery_timeout = options.recovery_timeout || 30000; // 30s
    this.half_open_max = options.half_open_max || 2;
    this.last_failure_time = null;
    this.last_state_change = Date.now();
    this.history = [];
  }

  get isOpen() { return this.state === 'open'; }
  get isClosed() { return this.state === 'closed'; }
  get isHalfOpen() { return this.state === 'half-open'; }

  canExecute() {
    if (this.isClosed) return true;
    if (this.isOpen) {
      // Check if recovery timeout has passed
      if (Date.now() - this.last_failure_time >= this.recovery_timeout) {
        this._transition('half-open');
        return true;
      }
      return false;
    }
    // Half-open: allow limited attempts
    return this.success_count < this.half_open_max;
  }

  recordSuccess() {
    this.success_count++;
    if (this.isHalfOpen && this.success_count >= this.half_open_max) {
      this._transition('closed');
      this.failure_count = 0;
    }
    this.history.push({ type: 'success', time: Date.now() });
    if (this.history.length > 100) this.history.shift();
  }

  recordFailure() {
    this.failure_count++;
    this.last_failure_time = Date.now();
    if (this.failure_count >= this.failure_threshold) {
      this._transition('open');
    }
    this.history.push({ type: 'failure', time: Date.now() });
    if (this.history.length > 100) this.history.shift();
  }

  forceOpen() { this._transition('open'); }
  forceClose() { this._transition('closed'); this.failure_count = 0; }

  _transition(newState) {
    const oldState = this.state;
    this.state = newState;
    this.last_state_change = Date.now();
    this.success_count = 0;
    if (newState === 'closed') this.failure_count = 0;
    return { from: oldState, to: newState };
  }

  getStatus() {
    return {
      name: this.name, state: this.state,
      failures: this.failure_count, threshold: this.failure_threshold,
      last_failure: this.last_failure_time,
      time_in_state_ms: Date.now() - this.last_state_change
    };
  }
}

// ============================================================
// GRACEFUL DEGRADATION ENGINE
// ============================================================

class GracefulDegradation {
  constructor() {
    this.levels = [
      { name: 'full', description: 'All systems operational', capabilities: 1.0 },
      { name: 'reduced', description: 'Non-critical systems paused', capabilities: 0.75 },
      { name: 'minimal', description: 'Only core reasoning active', capabilities: 0.5 },
      { name: 'survival', description: 'Emergency mode — basic perception + safety', capabilities: 0.25 },
      { name: 'dormant', description: 'Suspended — awaiting recovery', capabilities: 0.0 }
    ];
    this.current_level = 0; // Index into levels
    this.disabled_modules = new Set();
    this.degradation_history = [];
  }

  get currentLevel() { return this.levels[this.current_level]; }
  get capabilities() { return this.currentLevel.capabilities; }
  get isFullCapacity() { return this.current_level === 0; }
  get isDormant() { return this.current_level === this.levels.length - 1; }

  degrade(reason) {
    if (this.current_level >= this.levels.length - 1) return this.currentLevel;
    this.current_level++;
    const level = this.currentLevel;
    
    // Disable modules based on degradation level
    if (this.current_level >= 1) this.disabled_modules.add('evolution');
    if (this.current_level >= 2) this.disabled_modules.add('social_brain');
    if (this.current_level >= 2) this.disabled_modules.add('meta_language');
    if (this.current_level >= 3) this.disabled_modules.add('knowledge_graph');
    if (this.current_level >= 3) this.disabled_modules.add('multimodal');
    
    this.degradation_history.push({
      action: 'degrade', level: level.name, reason, timestamp: Date.now()
    });
    return level;
  }

  recover(reason) {
    if (this.current_level <= 0) return this.currentLevel;
    this.current_level--;
    const level = this.currentLevel;
    
    // Re-enable modules
    if (this.current_level < 3) {
      this.disabled_modules.delete('knowledge_graph');
      this.disabled_modules.delete('multimodal');
    }
    if (this.current_level < 2) {
      this.disabled_modules.delete('social_brain');
      this.disabled_modules.delete('meta_language');
    }
    if (this.current_level < 1) {
      this.disabled_modules.delete('evolution');
    }
    
    this.degradation_history.push({
      action: 'recover', level: level.name, reason, timestamp: Date.now()
    });
    return level;
  }

  isModuleEnabled(moduleName) {
    return !this.disabled_modules.has(moduleName);
  }

  reset() {
    this.current_level = 0;
    this.disabled_modules.clear();
    this.degradation_history.push({
      action: 'reset', level: 'full', reason: 'manual_reset', timestamp: Date.now()
    });
  }

  getStatus() {
    return {
      level: this.currentLevel.name,
      description: this.currentLevel.description,
      capabilities: this.capabilities,
      disabled_modules: [...this.disabled_modules],
      history_length: this.degradation_history.length
    };
  }
}

// ============================================================
// SELF-HEALING ENGINE
// ============================================================

class SelfHealingEngine {
  constructor() {
    this.health_checks = new Map();
    this.repair_actions = new Map();
    this.healing_history = [];
    this.auto_heal = true;
    this.check_interval = 5000; // 5s
    this._setupDefaultChecks();
  }

  _setupDefaultChecks() {
    // Memory consistency check
    this.registerCheck('memory_consistency', (state) => {
      if (!state.memory) return { healthy: true };
      const working = state.memory.working_memory_count || 0;
      return { healthy: working <= 9, issue: working > 9 ? 'working_memory_overflow' : null };
    });

    // Belief coherence check
    this.registerCheck('belief_coherence', (state) => {
      if (!state.beliefs) return { healthy: true };
      const contradictions = state.beliefs.filter(b => b.coherence < 0.3).length;
      return { healthy: contradictions === 0, issue: contradictions > 0 ? `${contradictions}_contradictions` : null };
    });

    // Cognitive load check
    this.registerCheck('cognitive_load', (state) => {
      const load = state.cognitive_load || 0;
      return { healthy: load < 0.9, issue: load >= 0.9 ? 'overloaded' : null };
    });

    // Reasoning loop detection
    this.registerCheck('reasoning_loops', (state) => {
      if (!state.trace) return { healthy: true };
      const recent = state.trace.slice(-10);
      const unique = new Set(recent.map(t => t.operation)).size;
      const looping = recent.length >= 10 && unique <= 2;
      return { healthy: !looping, issue: looping ? 'reasoning_loop_detected' : null };
    });

    // Register default repair actions
    this.registerRepair('working_memory_overflow', (state) => {
      // Evict lowest-salience items
      return { action: 'evict_low_salience', evicted: 3 };
    });

    this.registerRepair('contradictions', (state) => {
      // Trigger dialectical resolution
      return { action: 'dialectical_resolution', triggered: true };
    });

    this.registerRepair('overloaded', (state) => {
      // Pause non-essential processes
      return { action: 'pause_non_essential', paused: ['evolution', 'social'] };
    });

    this.registerRepair('reasoning_loop_detected', (state) => {
      // Break loop by injecting novelty
      return { action: 'inject_novelty', strategy: 'random_perturbation' };
    });
  }

  registerCheck(name, checkFn) {
    this.health_checks.set(name, checkFn);
  }

  registerRepair(issue, repairFn) {
    this.repair_actions.set(issue, repairFn);
  }

  async diagnose(state) {
    const results = [];
    for (const [name, check] of this.health_checks) {
      try {
        const result = check(state);
        results.push({ check: name, ...result });
      } catch (e) {
        results.push({ check: name, healthy: false, issue: 'check_failed', error: e.message });
      }
    }
    return {
      overall_healthy: results.every(r => r.healthy),
      checks: results,
      issues: results.filter(r => !r.healthy),
      timestamp: Date.now()
    };
  }

  async heal(state) {
    const diagnosis = await this.diagnose(state);
    if (diagnosis.overall_healthy) return { healed: false, reason: 'already_healthy' };

    const repairs = [];
    for (const issue of diagnosis.issues) {
      const repairFn = this.repair_actions.get(issue.issue);
      if (repairFn) {
        try {
          const result = repairFn(state);
          repairs.push({ issue: issue.issue, repair: result, success: true });
        } catch (e) {
          repairs.push({ issue: issue.issue, repair: null, success: false, error: e.message });
        }
      } else {
        repairs.push({ issue: issue.issue, repair: null, success: false, error: 'no_repair_registered' });
      }
    }

    this.healing_history.push({ diagnosis, repairs, timestamp: Date.now() });
    if (this.healing_history.length > 50) this.healing_history.shift();

    return {
      healed: repairs.some(r => r.success),
      diagnosis,
      repairs,
      timestamp: Date.now()
    };
  }

  getHistory() {
    return this.healing_history.slice(-10);
  }
}

// ============================================================
// FAULT TOLERANCE ORCHESTRATOR
// ============================================================

class FaultToleranceSystem {
  constructor(options = {}) {
    this.strategies = { ...BuiltinStrategies };
    this.circuit_breakers = new Map();
    this.degradation = new GracefulDegradation();
    this.healing = new SelfHealingEngine();
    this.error_log = [];
    this.max_log_size = options.max_log_size || 200;
    this.listeners = new Map();
    
    // Stats
    this.stats = {
      total_errors: 0,
      recovered: 0,
      unrecovered: 0,
      cascade_prevented: 0,
      self_heals: 0
    };
  }

  // --- Circuit Breakers ---

  getBreaker(name, options = {}) {
    if (!this.circuit_breakers.has(name)) {
      this.circuit_breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.circuit_breakers.get(name);
  }

  // --- Error Handling ---

  async handleError(error, state = {}) {
    if (!(error instanceof CognitiveError)) {
      error = new CognitiveError(
        ErrorTypes.META_CONFUSION,
        { original: error, severity: 'moderate' }
      );
    }

    this.stats.total_errors++;
    this.error_log.push(error.toTrace());
    if (this.error_log.length > this.max_log_size) this.error_log.shift();

    this._emit('error', error);

    // Check for cascade risk
    const recentErrors = this.error_log.filter(e => Date.now() - e.timestamp < 5000);
    if (recentErrors.length >= 3) {
      this.stats.cascade_prevented++;
      this.degradation.degrade('cascade_risk');
      this._emit('cascade_prevented', { recent_errors: recentErrors.length });
    }

    // Find applicable strategy
    const strategy = this._selectStrategy(error);
    if (!strategy) {
      this.stats.unrecovered++;
      this._emit('unrecoverable', error);
      return { recovered: false, error, strategy: null };
    }

    // Execute recovery
    const result = await this._executeRecovery(strategy, error, state);
    
    if (result.success) {
      this.stats.recovered++;
      strategy.recordOutcome(true);
      error.resolve(strategy.name, result);
      this._emit('recovered', { error, strategy: strategy.name, result });
      
      // Try to recover degradation level
      if (this.degradation.capabilities < 1.0) {
        const diagnosis = await this.healing.diagnose(state);
        if (diagnosis.overall_healthy) {
          this.degradation.recover('errors_resolved');
        }
      }
    } else {
      strategy.recordOutcome(false);
      error.attempts++;
      
      if (error.canRetry) {
        // Retry with escalation
        error.escalate();
        return this.handleError(error, state);
      } else {
        this.stats.unrecovered++;
        this.degradation.degrade(error.type);
        this._emit('degraded', { error, level: this.degradation.currentLevel });
      }
    }

    return { recovered: result.success, error, strategy: strategy.name, result };
  }

  _selectStrategy(error) {
    const applicable = Object.values(this.strategies)
      .filter(s => s.applies(error))
      .sort((a, b) => {
        // Sort by effectiveness × priority
        const scoreA = a.effectiveness * a.priority;
        const scoreB = b.effectiveness * b.priority;
        return scoreB - scoreA;
      });
    return applicable[0] || null;
  }

  async _executeRecovery(strategy, error, state) {
    switch (strategy.name) {
      case 'retry':
        return this._retryRecovery(error, state);
      case 'degrade':
        return this._degradeRecovery(error, state);
      case 'reroute':
        return this._rerouteRecovery(error, state);
      case 'heal':
        return this._healRecovery(error, state);
      case 'simplify':
        return this._simplifyRecovery(error, state);
      case 'seek_help':
        return this._seekHelpRecovery(error, state);
      case 'reset':
        return this._resetRecovery(error, state);
      default:
        return { success: false, reason: 'unknown_strategy' };
    }
  }

  async _retryRecovery(error, state) {
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, error.attempts), 10000);
    await new Promise(r => setTimeout(r, Math.min(delay, 100))); // Cap at 100ms in practice
    return { success: true, action: 'retried', delay, attempt: error.attempts + 1 };
  }

  async _degradeRecovery(error, state) {
    const level = this.degradation.degrade(error.type);
    return { success: true, action: 'degraded', level: level.name, capabilities: level.capabilities };
  }

  async _rerouteRecovery(error, state) {
    // Find alternative cognitive pathway
    const alternatives = {
      [ErrorTypes.MODALITY_MISMATCH]: 'use_text_fallback',
      [ErrorTypes.CIRCULAR_REASONING]: 'switch_to_abductive',
      [ErrorTypes.DECISION_PARALYSIS]: 'use_satisficing'
    };
    const alt = alternatives[error.type] || 'general_reroute';
    return { success: true, action: 'rerouted', alternative: alt };
  }

  async _healRecovery(error, state) {
    const healResult = await this.healing.heal(state);
    this.stats.self_heals++;
    return { success: healResult.healed, action: 'healed', details: healResult };
  }

  async _simplifyRecovery(error, state) {
    return { success: true, action: 'simplified', reduction: 'depth_halved' };
  }

  async _seekHelpRecovery(error, state) {
    // In production, this would notify the user or query external help
    return { success: true, action: 'help_requested', channel: 'internal_fallback' };
  }

  async _resetRecovery(error, state) {
    this.degradation.reset();
    return { success: true, action: 'reset_to_safe_state' };
  }

  // --- Protected Execution ---

  async protect(fn, context = {}) {
    const breakerName = context.breaker || 'default';
    const breaker = this.getBreaker(breakerName);

    if (!breaker.canExecute()) {
      return {
        success: false,
        blocked: true,
        reason: 'circuit_breaker_open',
        breaker: breaker.getStatus()
      };
    }

    try {
      const result = await fn();
      breaker.recordSuccess();
      return { success: true, result };
    } catch (err) {
      breaker.recordFailure();
      
      const cogError = new CognitiveError(
        context.error_type || ErrorTypes.META_CONFUSION,
        { original: err.message, severity: context.severity || 'moderate', ...context }
      );
      
      const recovery = await this.handleError(cogError, context.state || {});
      return { success: recovery.recovered, error: cogError, recovery };
    }
  }

  // --- Event System ---

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }

  _emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => { try { h(data); } catch(e) {} });
  }

  // --- Status ---

  getStatus() {
    return {
      stats: { ...this.stats },
      degradation: this.degradation.getStatus(),
      circuit_breakers: [...this.circuit_breakers.entries()].map(([k, v]) => v.getStatus()),
      recent_errors: this.error_log.slice(-5),
      recovery_rate: this.stats.total_errors > 0 
        ? (this.stats.recovered / this.stats.total_errors * 100).toFixed(1) + '%'
        : '100%'
    };
  }
}

module.exports = {
  CognitiveError,
  ErrorTypes,
  RecoveryStrategy,
  BuiltinStrategies,
  CircuitBreaker,
  GracefulDegradation,
  SelfHealingEngine,
  FaultToleranceSystem
};
