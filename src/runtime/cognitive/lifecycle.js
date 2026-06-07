'use strict';

/**
 * Noeon Cognitive Lifecycle & Event System
 * 
 * A brain has a lifecycle: birth → development → maturity → aging.
 * A cognitive program has: init → boot → active → reflect → sleep → wake → shutdown.
 * 
 * This module provides:
 * - Cognitive lifecycle management (states and transitions)
 * - Event bus (typed cognitive events with priority)
 * - Hook system (before/after lifecycle transitions)
 * - Health monitoring (heartbeat, liveness, readiness)
 * - Graceful shutdown with state preservation
 * 
 * Neural Correlate: Circadian rhythm + arousal system (reticular activating system)
 */

// ============================================================
// COGNITIVE EVENT BUS
// ============================================================

class CognitiveEvent {
  constructor(type, payload = {}, options = {}) {
    this.id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.type = type;
    this.payload = payload;
    this.timestamp = Date.now();
    this.priority = options.priority || 'normal'; // critical, high, normal, low
    this.source = options.source || 'system';
    this.propagation_stopped = false;
    this.handled = false;
  }

  stopPropagation() { this.propagation_stopped = true; }
  markHandled() { this.handled = true; }
}

class EventBus {
  constructor(options = {}) {
    this.handlers = new Map();
    this.wildcardHandlers = [];
    this.history = [];
    this.max_history = options.max_history || 200;
    this.stats = { emitted: 0, handled: 0, dropped: 0 };
    this.paused = false;
    this.queue = []; // Queue events when paused
  }

  on(eventType, handler, options = {}) {
    if (!this.handlers.has(eventType)) this.handlers.set(eventType, []);
    const entry = { handler, priority: options.priority || 0, once: options.once || false, id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 4)}` };
    this.handlers.get(eventType).push(entry);
    // Sort by priority (higher first)
    this.handlers.get(eventType).sort((a, b) => b.priority - a.priority);
    return entry.id;
  }

  once(eventType, handler, options = {}) {
    return this.on(eventType, handler, { ...options, once: true });
  }

  onAny(handler) {
    this.wildcardHandlers.push(handler);
  }

  off(eventType, handlerId) {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;
    const idx = handlers.findIndex(h => h.id === handlerId);
    if (idx >= 0) handlers.splice(idx, 1);
  }

  emit(eventType, payload = {}, options = {}) {
    const event = new CognitiveEvent(eventType, payload, options);
    this.stats.emitted++;

    if (this.paused) {
      this.queue.push(event);
      return event;
    }

    this._dispatch(event);
    return event;
  }

  _dispatch(event) {
    // Type-specific handlers
    const handlers = this.handlers.get(event.type) || [];
    const toRemove = [];

    for (const entry of handlers) {
      if (event.propagation_stopped) break;
      try {
        entry.handler(event);
        event.markHandled();
        this.stats.handled++;
      } catch (e) { /* handler error — don't crash the bus */ }
      if (entry.once) toRemove.push(entry.id);
    }

    // Remove once handlers
    if (toRemove.length > 0) {
      const remaining = handlers.filter(h => !toRemove.includes(h.id));
      this.handlers.set(event.type, remaining);
    }

    // Wildcard handlers
    for (const handler of this.wildcardHandlers) {
      if (event.propagation_stopped) break;
      try { handler(event); } catch (e) {}
    }

    // History
    this.history.push({ type: event.type, timestamp: event.timestamp, handled: event.handled });
    if (this.history.length > this.max_history) this.history.shift();
  }

  pause() { this.paused = true; }
  
  resume() {
    this.paused = false;
    // Flush queue
    const queued = [...this.queue];
    this.queue = [];
    queued.forEach(e => this._dispatch(e));
  }

  getStats() {
    return {
      ...this.stats,
      registered_types: this.handlers.size,
      total_handlers: [...this.handlers.values()].reduce((sum, h) => sum + h.length, 0),
      wildcard_handlers: this.wildcardHandlers.length,
      queued: this.queue.length,
      paused: this.paused
    };
  }
}

// ============================================================
// LIFECYCLE STATES
// ============================================================

const LifecycleStates = {
  UNBORN: 'unborn',         // Not yet initialized
  INITIALIZING: 'initializing', // Setting up
  BOOTING: 'booting',       // Loading memories, knowledge
  ACTIVE: 'active',         // Fully operational
  THINKING: 'thinking',     // Deep processing
  REFLECTING: 'reflecting', // Self-evaluation
  RESTING: 'resting',       // Low-power mode (consolidation)
  DREAMING: 'dreaming',     // Background processing (memory consolidation)
  DEGRADED: 'degraded',     // Reduced capability
  RECOVERING: 'recovering', // Coming back from degraded
  SHUTTING_DOWN: 'shutting_down', // Graceful shutdown
  TERMINATED: 'terminated'  // Fully stopped
};

const ValidTransitions = {
  [LifecycleStates.UNBORN]: [LifecycleStates.INITIALIZING],
  [LifecycleStates.INITIALIZING]: [LifecycleStates.BOOTING, LifecycleStates.TERMINATED],
  [LifecycleStates.BOOTING]: [LifecycleStates.ACTIVE, LifecycleStates.TERMINATED],
  [LifecycleStates.ACTIVE]: [LifecycleStates.THINKING, LifecycleStates.REFLECTING, LifecycleStates.RESTING, LifecycleStates.DEGRADED, LifecycleStates.SHUTTING_DOWN],
  [LifecycleStates.THINKING]: [LifecycleStates.ACTIVE, LifecycleStates.REFLECTING, LifecycleStates.DEGRADED],
  [LifecycleStates.REFLECTING]: [LifecycleStates.ACTIVE, LifecycleStates.RESTING, LifecycleStates.DEGRADED],
  [LifecycleStates.RESTING]: [LifecycleStates.DREAMING, LifecycleStates.ACTIVE, LifecycleStates.SHUTTING_DOWN],
  [LifecycleStates.DREAMING]: [LifecycleStates.RESTING, LifecycleStates.ACTIVE],
  [LifecycleStates.DEGRADED]: [LifecycleStates.RECOVERING, LifecycleStates.SHUTTING_DOWN],
  [LifecycleStates.RECOVERING]: [LifecycleStates.ACTIVE, LifecycleStates.DEGRADED],
  [LifecycleStates.SHUTTING_DOWN]: [LifecycleStates.TERMINATED],
  [LifecycleStates.TERMINATED]: []
};

// ============================================================
// LIFECYCLE MANAGER
// ============================================================

class LifecycleManager {
  constructor(options = {}) {
    this.state = LifecycleStates.UNBORN;
    this.events = new EventBus(options);
    this.hooks = { before: new Map(), after: new Map() };
    this.history = [];
    this.birth_time = null;
    this.last_transition = null;
    this.heartbeat_interval = options.heartbeat_interval || 5000;
    this._heartbeatTimer = null;
    this._healthChecks = [];
  }

  get age() {
    if (!this.birth_time) return 0;
    return Date.now() - this.birth_time;
  }

  get isAlive() {
    return ![LifecycleStates.UNBORN, LifecycleStates.TERMINATED].includes(this.state);
  }

  get isActive() {
    return [LifecycleStates.ACTIVE, LifecycleStates.THINKING, LifecycleStates.REFLECTING].includes(this.state);
  }

  // --- Transition ---

  async transition(targetState, context = {}) {
    const valid = ValidTransitions[this.state] || [];
    if (!valid.includes(targetState)) {
      return {
        success: false,
        error: `Invalid transition: ${this.state} → ${targetState}`,
        valid_targets: valid
      };
    }

    const fromState = this.state;

    // Before hooks
    const beforeResult = await this._runHooks('before', targetState, { from: fromState, context });
    if (beforeResult.blocked) {
      return { success: false, error: 'Blocked by before hook', hook: beforeResult.blocker };
    }

    // Transition
    this.state = targetState;
    this.last_transition = { from: fromState, to: targetState, at: Date.now(), context };
    this.history.push(this.last_transition);

    if (targetState === LifecycleStates.INITIALIZING && !this.birth_time) {
      this.birth_time = Date.now();
    }

    // Emit event
    this.events.emit(`lifecycle:${targetState}`, { from: fromState, to: targetState, context });
    this.events.emit('lifecycle:transition', { from: fromState, to: targetState, context });

    // After hooks
    await this._runHooks('after', targetState, { from: fromState, context });

    // Start/stop heartbeat
    if (targetState === LifecycleStates.ACTIVE) this._startHeartbeat();
    if (targetState === LifecycleStates.TERMINATED) this._stopHeartbeat();

    return { success: true, from: fromState, to: targetState };
  }

  // --- Convenience Methods ---

  async init(config = {}) { return this.transition(LifecycleStates.INITIALIZING, config); }
  async boot(memories = {}) { return this.transition(LifecycleStates.BOOTING, memories); }
  async activate() { return this.transition(LifecycleStates.ACTIVE); }
  async think(topic = '') { return this.transition(LifecycleStates.THINKING, { topic }); }
  async reflect() { return this.transition(LifecycleStates.REFLECTING); }
  async rest() { return this.transition(LifecycleStates.RESTING); }
  async dream() { return this.transition(LifecycleStates.DREAMING); }
  async degrade(reason = '') { return this.transition(LifecycleStates.DEGRADED, { reason }); }
  async recover() { return this.transition(LifecycleStates.RECOVERING); }
  
  async shutdown(reason = 'normal') {
    const result = await this.transition(LifecycleStates.SHUTTING_DOWN, { reason });
    if (result.success) {
      // Give hooks time to save state
      await new Promise(r => setTimeout(r, 100));
      await this.transition(LifecycleStates.TERMINATED);
    }
    return result;
  }

  // --- Hooks ---

  before(state, hookFn) {
    if (!this.hooks.before.has(state)) this.hooks.before.set(state, []);
    this.hooks.before.get(state).push(hookFn);
  }

  after(state, hookFn) {
    if (!this.hooks.after.has(state)) this.hooks.after.set(state, []);
    this.hooks.after.get(state).push(hookFn);
  }

  async _runHooks(phase, state, context) {
    const hooks = this.hooks[phase].get(state) || [];
    for (const hook of hooks) {
      try {
        const result = await hook(context);
        if (result === false) return { blocked: true, blocker: hook.name || 'anonymous' };
      } catch (e) { /* hook error doesn't block */ }
    }
    return { blocked: false };
  }

  // --- Health ---

  registerHealthCheck(name, checkFn) {
    this._healthChecks.push({ name, check: checkFn });
  }

  async checkHealth() {
    const results = [];
    for (const { name, check } of this._healthChecks) {
      try {
        const result = await check();
        results.push({ name, healthy: result.healthy !== false, ...result });
      } catch (e) {
        results.push({ name, healthy: false, error: e.message });
      }
    }
    return {
      overall: results.every(r => r.healthy),
      state: this.state,
      age_ms: this.age,
      checks: results,
      timestamp: Date.now()
    };
  }

  _startHeartbeat() {
    if (this._heartbeatTimer) return;
    this._heartbeatTimer = setInterval(() => {
      this.events.emit('heartbeat', { state: this.state, age: this.age, timestamp: Date.now() });
    }, this.heartbeat_interval);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // --- Status ---

  getStatus() {
    return {
      state: this.state,
      is_alive: this.isAlive,
      is_active: this.isActive,
      age_ms: this.age,
      birth_time: this.birth_time,
      last_transition: this.last_transition,
      transitions_count: this.history.length,
      events: this.events.getStats(),
      health_checks: this._healthChecks.length
    };
  }

  getHistory() {
    return this.history.slice(-20);
  }
}

// ============================================================
// COGNITIVE EVENT TYPES (Standard Events)
// ============================================================

const CognitiveEvents = {
  // Lifecycle
  LIFECYCLE_TRANSITION: 'lifecycle:transition',
  HEARTBEAT: 'heartbeat',
  
  // Perception
  PERCEPTION_RECEIVED: 'perception:received',
  PERCEPTION_PROCESSED: 'perception:processed',
  SURPRISE_DETECTED: 'perception:surprise',
  
  // Reasoning
  REASONING_STARTED: 'reasoning:started',
  REASONING_COMPLETED: 'reasoning:completed',
  REASONING_TIMEOUT: 'reasoning:timeout',
  CONFLICT_DETECTED: 'reasoning:conflict',
  
  // Decision
  DECISION_MADE: 'decision:made',
  DECISION_DEFERRED: 'decision:deferred',
  
  // Memory
  MEMORY_STORED: 'memory:stored',
  MEMORY_RECALLED: 'memory:recalled',
  MEMORY_CONSOLIDATED: 'memory:consolidated',
  MEMORY_FORGOTTEN: 'memory:forgotten',
  
  // Belief
  BELIEF_FORMED: 'belief:formed',
  BELIEF_REVISED: 'belief:revised',
  BELIEF_CONTRADICTED: 'belief:contradicted',
  
  // Meta
  REFLECTION_COMPLETE: 'meta:reflection',
  STRATEGY_CHANGED: 'meta:strategy_change',
  
  // Error & Recovery
  ERROR_OCCURRED: 'error:occurred',
  RECOVERY_STARTED: 'error:recovery_started',
  RECOVERY_COMPLETED: 'error:recovery_completed',
  DEGRADATION_TRIGGERED: 'error:degradation',
  
  // Evolution
  EVOLUTION_TRIGGERED: 'evolution:triggered',
  RULE_MUTATED: 'evolution:mutation',
  FITNESS_IMPROVED: 'evolution:improvement',
  
  // Resource
  LOAD_WARNING: 'resource:load_warning',
  LOAD_CRITICAL: 'resource:load_critical',
  GC_TRIGGERED: 'resource:gc',
  
  // Social
  AGENT_JOINED: 'social:agent_joined',
  CONSENSUS_REACHED: 'social:consensus',
  DEBATE_CONCLUDED: 'social:debate_concluded'
};

module.exports = {
  CognitiveEvent,
  EventBus,
  LifecycleStates,
  ValidTransitions,
  LifecycleManager,
  CognitiveEvents
};
