'use strict';

/**
 * Noeon Cognitive Resource Manager
 * 
 * The brain doesn't have infinite energy. It manages cognitive resources:
 * - Attention is limited (7±2 items)
 * - Deep reasoning is expensive (glucose consumption)
 * - The brain uses lazy evaluation (only process what's attended)
 * - Fatigue signals when resources are depleted
 * 
 * This module provides:
 * - Cognitive load management (prevent overload)
 * - Lazy evaluation (defer computation until needed)
 * - Resource pooling (reuse expensive objects)
 * - Priority scheduling (important thoughts first)
 * - Throttling & rate limiting (prevent runaway processes)
 * - Memory pressure management (GC-like cleanup)
 * 
 * Neural Correlate: Prefrontal resource allocation + metabolic regulation
 */

// ============================================================
// COGNITIVE LOAD MONITOR
// ============================================================

class CognitiveLoadMonitor {
  constructor(options = {}) {
    this.max_load = options.max_load || 1.0;
    this.warning_threshold = options.warning_threshold || 0.7;
    this.critical_threshold = options.critical_threshold || 0.9;
    
    // Resource dimensions
    this.dimensions = {
      attention: { current: 0, max: options.max_attention || 7, weight: 0.3 },
      reasoning: { current: 0, max: options.max_reasoning || 3, weight: 0.25 },
      memory: { current: 0, max: options.max_memory || 100, weight: 0.2 },
      io: { current: 0, max: options.max_io || 10, weight: 0.15 },
      evolution: { current: 0, max: options.max_evolution || 2, weight: 0.1 }
    };

    this.history = [];
    this.max_history = 100;
    this.fatigue = 0; // Accumulates over time, reduces with rest
    this.last_rest = Date.now();
  }

  get totalLoad() {
    let load = 0;
    for (const [, dim] of Object.entries(this.dimensions)) {
      load += (dim.current / dim.max) * dim.weight;
    }
    return Math.min(1.0, load + this.fatigue * 0.2);
  }

  get status() {
    const load = this.totalLoad;
    if (load >= this.critical_threshold) return 'critical';
    if (load >= this.warning_threshold) return 'warning';
    return 'normal';
  }

  get isOverloaded() { return this.totalLoad >= this.critical_threshold; }

  acquire(dimension, amount = 1) {
    const dim = this.dimensions[dimension];
    if (!dim) return { acquired: false, reason: 'unknown_dimension' };
    
    if (dim.current + amount > dim.max) {
      return { acquired: false, reason: 'capacity_exceeded', current: dim.current, max: dim.max };
    }

    dim.current += amount;
    this._recordLoad();
    return { acquired: true, current: dim.current, remaining: dim.max - dim.current };
  }

  release(dimension, amount = 1) {
    const dim = this.dimensions[dimension];
    if (!dim) return;
    dim.current = Math.max(0, dim.current - amount);
    this._recordLoad();
  }

  // Fatigue accumulates with sustained high load
  tick() {
    if (this.totalLoad > 0.5) {
      this.fatigue = Math.min(0.5, this.fatigue + 0.01);
    }
    // Natural recovery
    const timeSinceRest = Date.now() - this.last_rest;
    if (timeSinceRest > 30000 && this.totalLoad < 0.3) {
      this.fatigue = Math.max(0, this.fatigue - 0.005);
    }
  }

  rest() {
    this.fatigue = Math.max(0, this.fatigue - 0.2);
    this.last_rest = Date.now();
  }

  canAfford(dimension, amount = 1) {
    const dim = this.dimensions[dimension];
    if (!dim) return false;
    return dim.current + amount <= dim.max;
  }

  _recordLoad() {
    this.history.push({ load: this.totalLoad, timestamp: Date.now() });
    if (this.history.length > this.max_history) this.history.shift();
  }

  getReport() {
    return {
      total_load: this.totalLoad,
      status: this.status,
      fatigue: this.fatigue,
      dimensions: Object.fromEntries(
        Object.entries(this.dimensions).map(([k, v]) => [k, { ...v, utilization: (v.current / v.max * 100).toFixed(0) + '%' }])
      ),
      recommendation: this._getRecommendation()
    };
  }

  _getRecommendation() {
    if (this.isOverloaded) return 'CRITICAL: Reduce load immediately. Defer non-essential tasks.';
    if (this.status === 'warning') return 'WARNING: Approaching capacity. Consider simplifying or deferring.';
    if (this.fatigue > 0.3) return 'FATIGUE: Consider resting. Accuracy may be degraded.';
    return 'NORMAL: Resources available for complex operations.';
  }
}

// ============================================================
// LAZY EVALUATION (Defer until needed)
// ============================================================

class LazyValue {
  constructor(computeFn, options = {}) {
    this._compute = computeFn;
    this._value = undefined;
    this._computed = false;
    this._computing = false;
    this._error = null;
    this.priority = options.priority || 0.5;
    this.ttl = options.ttl || null; // Time-to-live in ms
    this._computed_at = null;
    this.access_count = 0;
  }

  get isComputed() { return this._computed; }
  get isExpired() {
    if (!this.ttl || !this._computed_at) return false;
    return Date.now() - this._computed_at > this.ttl;
  }

  async get() {
    if (this._computed && !this.isExpired) {
      this.access_count++;
      return this._value;
    }

    if (this._computing) {
      // Wait for ongoing computation
      await new Promise(r => setTimeout(r, 10));
      return this.get();
    }

    this._computing = true;
    try {
      this._value = await this._compute();
      this._computed = true;
      this._computed_at = Date.now();
      this._error = null;
      this.access_count++;
    } catch (e) {
      this._error = e;
      this._value = undefined;
    } finally {
      this._computing = false;
    }
    return this._value;
  }

  invalidate() {
    this._computed = false;
    this._value = undefined;
    this._computed_at = null;
  }

  peek() {
    // Return value without triggering computation
    return this._computed ? this._value : undefined;
  }
}

class LazyPool {
  constructor() {
    this.values = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  register(key, computeFn, options = {}) {
    this.values.set(key, new LazyValue(computeFn, options));
  }

  async get(key) {
    const lazy = this.values.get(key);
    if (!lazy) { this.stats.misses++; return undefined; }
    this.stats.hits++;
    return lazy.get();
  }

  invalidate(key) {
    const lazy = this.values.get(key);
    if (lazy) lazy.invalidate();
  }

  invalidateAll() {
    for (const lazy of this.values.values()) lazy.invalidate();
  }

  getStats() {
    const computed = [...this.values.values()].filter(v => v.isComputed).length;
    return {
      total: this.values.size, computed, pending: this.values.size - computed,
      ...this.stats, hit_rate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%' : 'N/A'
    };
  }
}

// ============================================================
// PRIORITY SCHEDULER (Important thoughts first)
// ============================================================

class CognitiveScheduler {
  constructor(options = {}) {
    this.queues = {
      critical: [],  // Immediate: safety, errors
      high: [],      // Important: active reasoning, decisions
      normal: [],    // Standard: perception, memory
      low: [],       // Background: consolidation, evolution
      idle: []       // Only when nothing else: cleanup, optimization
    };
    this.running = new Map();
    this.max_concurrent = options.max_concurrent || 5;
    this.processed = 0;
    this.dropped = 0;
  }

  schedule(task, priority = 'normal') {
    const entry = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      task,
      priority,
      scheduled_at: Date.now(),
      deadline: task.deadline || null
    };

    const queue = this.queues[priority];
    if (!queue) { this.queues.normal.push(entry); return entry.id; }
    
    // Check queue capacity
    if (queue.length >= 50) {
      this.dropped++;
      queue.shift(); // Drop oldest
    }
    
    queue.push(entry);
    return entry.id;
  }

  async next() {
    if (this.running.size >= this.max_concurrent) return null;

    // Priority order
    for (const priority of ['critical', 'high', 'normal', 'low', 'idle']) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        const entry = queue.shift();
        this.running.set(entry.id, entry);
        return entry;
      }
    }
    return null;
  }

  complete(taskId) {
    this.running.delete(taskId);
    this.processed++;
  }

  async run() {
    const entry = await this.next();
    if (!entry) return null;

    try {
      const result = typeof entry.task === 'function' 
        ? await entry.task() 
        : entry.task.execute ? await entry.task.execute() : entry.task;
      this.complete(entry.id);
      return { id: entry.id, success: true, result };
    } catch (e) {
      this.complete(entry.id);
      return { id: entry.id, success: false, error: e.message };
    }
  }

  getStatus() {
    return {
      queued: Object.fromEntries(Object.entries(this.queues).map(([k, v]) => [k, v.length])),
      running: this.running.size,
      max_concurrent: this.max_concurrent,
      processed: this.processed,
      dropped: this.dropped
    };
  }

  clear(priority = null) {
    if (priority) {
      this.queues[priority] = [];
    } else {
      Object.keys(this.queues).forEach(k => { this.queues[k] = []; });
    }
  }
}

// ============================================================
// THROTTLE & RATE LIMITER
// ============================================================

class CognitiveThrottle {
  constructor(options = {}) {
    this.limits = new Map();
    this.windows = new Map();
    
    // Default limits
    this.setLimit('reasoning', options.reasoning_per_sec || 10);
    this.setLimit('perception', options.perception_per_sec || 50);
    this.setLimit('memory_write', options.memory_write_per_sec || 20);
    this.setLimit('llm_call', options.llm_per_sec || 2);
    this.setLimit('evolution', options.evolution_per_sec || 1);
  }

  setLimit(operation, maxPerSecond) {
    this.limits.set(operation, maxPerSecond);
    if (!this.windows.has(operation)) {
      this.windows.set(operation, []);
    }
  }

  canProceed(operation) {
    const limit = this.limits.get(operation);
    if (!limit) return true;

    const window = this.windows.get(operation);
    const now = Date.now();
    
    // Clean old entries (older than 1 second)
    while (window.length > 0 && now - window[0] > 1000) {
      window.shift();
    }

    return window.length < limit;
  }

  record(operation) {
    if (!this.windows.has(operation)) this.windows.set(operation, []);
    this.windows.get(operation).push(Date.now());
  }

  async throttle(operation, fn) {
    if (!this.canProceed(operation)) {
      // Wait until slot available
      const limit = this.limits.get(operation) || 10;
      const waitMs = Math.ceil(1000 / limit);
      await new Promise(r => setTimeout(r, waitMs));
    }
    this.record(operation);
    return fn();
  }

  getStatus() {
    const status = {};
    for (const [op, limit] of this.limits) {
      const window = this.windows.get(op) || [];
      const now = Date.now();
      const recent = window.filter(t => now - t <= 1000).length;
      status[op] = { limit, current: recent, utilization: (recent / limit * 100).toFixed(0) + '%' };
    }
    return status;
  }
}

// ============================================================
// MEMORY PRESSURE MANAGER (GC-like cleanup)
// ============================================================

class MemoryPressureManager {
  constructor(options = {}) {
    this.max_working_memory = options.max_working_memory || 9; // 7±2
    this.max_beliefs = options.max_beliefs || 500;
    this.max_traces = options.max_traces || 1000;
    this.gc_threshold = options.gc_threshold || 0.8; // Trigger GC at 80%
    this.gc_count = 0;
    this.evicted_total = 0;
  }

  assess(state) {
    const pressure = {
      working_memory: (state.working_memory_count || 0) / this.max_working_memory,
      beliefs: (state.beliefs_count || 0) / this.max_beliefs,
      traces: (state.traces_count || 0) / this.max_traces
    };
    
    pressure.overall = Object.values(pressure).reduce((a, b) => a + b, 0) / 3;
    pressure.needs_gc = pressure.overall > this.gc_threshold;
    pressure.recommendation = this._recommend(pressure);
    return pressure;
  }

  gc(state) {
    this.gc_count++;
    const actions = [];

    // Evict low-salience working memory items
    if (state.working_memory && state.working_memory.length > this.max_working_memory) {
      const sorted = [...state.working_memory].sort((a, b) => (a.salience || 0) - (b.salience || 0));
      const evict_count = state.working_memory.length - this.max_working_memory + 2; // Leave room
      const evicted = sorted.slice(0, evict_count);
      actions.push({ type: 'evict_working_memory', count: evict_count, evicted_keys: evicted.map(e => e.key || e.id) });
      this.evicted_total += evict_count;
    }

    // Decay old beliefs
    if (state.beliefs && state.beliefs.length > this.max_beliefs * 0.9) {
      const threshold = 0.2;
      const weak = state.beliefs.filter(b => (b.confidence || 0) < threshold);
      actions.push({ type: 'decay_beliefs', candidates: weak.length, threshold });
      this.evicted_total += weak.length;
    }

    // Trim traces
    if (state.traces && state.traces.length > this.max_traces) {
      const trim = state.traces.length - Math.floor(this.max_traces * 0.7);
      actions.push({ type: 'trim_traces', trimmed: trim });
    }

    return { gc_cycle: this.gc_count, actions, timestamp: Date.now() };
  }

  _recommend(pressure) {
    if (pressure.overall > 0.9) return 'CRITICAL: Immediate GC required';
    if (pressure.overall > 0.7) return 'HIGH: Schedule GC soon';
    if (pressure.overall > 0.5) return 'MODERATE: Monitor closely';
    return 'LOW: No action needed';
  }

  getStats() {
    return {
      gc_count: this.gc_count,
      evicted_total: this.evicted_total,
      limits: {
        working_memory: this.max_working_memory,
        beliefs: this.max_beliefs,
        traces: this.max_traces
      }
    };
  }
}

// ============================================================
// RESOURCE MANAGER (Orchestrator)
// ============================================================

class ResourceManager {
  constructor(options = {}) {
    this.load = new CognitiveLoadMonitor(options);
    this.lazy = new LazyPool();
    this.scheduler = new CognitiveScheduler(options);
    this.throttle = new CognitiveThrottle(options);
    this.memory_pressure = new MemoryPressureManager(options);
    this.started_at = Date.now();
  }

  // Convenience: check if operation is allowed
  canPerform(operation, dimension = null) {
    // Check throttle
    if (!this.throttle.canProceed(operation)) return { allowed: false, reason: 'throttled' };
    // Check load
    if (dimension && !this.load.canAfford(dimension)) return { allowed: false, reason: 'overloaded' };
    return { allowed: true };
  }

  // Convenience: perform with resource management
  async perform(operation, fn, options = {}) {
    const dimension = options.dimension || 'reasoning';
    const priority = options.priority || 'normal';

    // Check if allowed
    const check = this.canPerform(operation, dimension);
    if (!check.allowed) {
      if (options.queue_if_blocked) {
        this.scheduler.schedule(fn, priority);
        return { queued: true, reason: check.reason };
      }
      return { success: false, blocked: true, reason: check.reason };
    }

    // Acquire resources
    const acquired = this.load.acquire(dimension);
    if (!acquired.acquired) {
      return { success: false, blocked: true, reason: acquired.reason };
    }

    try {
      // Throttle and execute
      const result = await this.throttle.throttle(operation, fn);
      return { success: true, result };
    } finally {
      this.load.release(dimension);
      this.load.tick();
    }
  }

  getFullStatus() {
    return {
      uptime_ms: Date.now() - this.started_at,
      load: this.load.getReport(),
      scheduler: this.scheduler.getStatus(),
      throttle: this.throttle.getStatus(),
      memory: this.memory_pressure.getStats(),
      lazy: this.lazy.getStats()
    };
  }
}

module.exports = {
  CognitiveLoadMonitor,
  LazyValue,
  LazyPool,
  CognitiveScheduler,
  CognitiveThrottle,
  MemoryPressureManager,
  ResourceManager
};
