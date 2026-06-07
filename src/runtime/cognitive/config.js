'use strict';

/**
 * Noeon Cognitive Configuration System
 * 
 * Like how the brain adapts to different environments (altitude, temperature, stimuli),
 * Noeon adapts to different deployment contexts:
 * - Development (verbose, no limits, fast iteration)
 * - Production (optimized, rate-limited, fault-tolerant)
 * - Research (full tracing, unlimited evolution, experimental features)
 * - Embedded (minimal resources, survival mode)
 * 
 * Features:
 * - Layered configuration (defaults → file → env → runtime)
 * - Environment profiles (dev, prod, research, embedded)
 * - Dynamic reconfiguration (hot-reload without restart)
 * - Feature flags (enable/disable cognitive modules)
 * - Validation with cognitive type checking
 * 
 * Neural Correlate: Neuromodulation — dopamine/serotonin levels adjust brain behavior
 */

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_CONFIG = {
  // Identity
  identity: {
    name: 'Noeon',
    version: '0.7.0',
    instance_id: null // Auto-generated
  },

  // Environment
  environment: 'development', // development | production | research | embedded

  // Cognitive Parameters
  cognition: {
    // Working memory capacity (Miller's 7±2)
    working_memory_capacity: 7,
    // Maximum reasoning depth
    max_reasoning_depth: 10,
    // Default confidence threshold for decisions
    confidence_threshold: 0.6,
    // System 1 vs System 2 switching threshold
    dual_process_threshold: 0.7,
    // Maximum prediction horizon (steps ahead)
    prediction_horizon: 5,
    // Memory decay rate (0 = never forget, 1 = instant forget)
    memory_decay_rate: 0.01,
    // Attention span (ms before attention shifts)
    attention_span: 30000,
    // Creativity/exploration factor (0 = conservative, 1 = wild)
    exploration_factor: 0.3
  },

  // Resource Limits
  resources: {
    max_concurrent_tasks: 5,
    max_beliefs: 500,
    max_memories: 10000,
    max_knowledge_nodes: 5000,
    reasoning_timeout_ms: 30000,
    llm_calls_per_minute: 60,
    evolution_budget: 100, // Max mutations per cycle
    memory_pressure_threshold: 0.8
  },

  // LLM Configuration
  llm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 2048,
    timeout_ms: 30000,
    retry_count: 3,
    fallback_model: null,
    api_base: null, // Use env var
    api_key: null   // Use env var
  },

  // Persistence
  persistence: {
    enabled: true,
    path: '.noeon',
    auto_save_interval_ms: 60000,
    max_snapshots: 20,
    journal_max_entries: 1000,
    compress: false
  },

  // Fault Tolerance
  fault_tolerance: {
    enabled: true,
    max_retries: 3,
    circuit_breaker_threshold: 5,
    circuit_breaker_timeout_ms: 30000,
    auto_heal: true,
    degradation_enabled: true
  },

  // Observability
  observability: {
    log_level: 'info', // trace | debug | info | warn | error | fatal
    structured_logs: true,
    trace_enabled: true,
    trace_max_entries: 1000,
    metrics_enabled: true,
    metrics_interval_ms: 10000,
    export_format: 'json' // json | opentelemetry | prometheus
  },

  // Feature Flags
  features: {
    evolution_enabled: true,
    social_brain_enabled: true,
    multimodal_enabled: true,
    knowledge_graph_enabled: true,
    meta_language_enabled: true,
    consciousness_stream_enabled: true,
    self_healing_enabled: true,
    predictive_processing_enabled: true
  },

  // Plugins
  plugins: {
    auto_discover: true,
    paths: ['./plugins', './node_modules/@noeon'],
    allowed: [],  // Empty = all allowed
    blocked: []
  }
};

// ============================================================
// ENVIRONMENT PROFILES
// ============================================================

const PROFILES = {
  development: {
    observability: { log_level: 'debug', trace_enabled: true },
    resources: { reasoning_timeout_ms: 60000, llm_calls_per_minute: 120 },
    fault_tolerance: { max_retries: 1 },
    cognition: { exploration_factor: 0.5 }
  },

  production: {
    observability: { log_level: 'warn', trace_enabled: false, metrics_enabled: true },
    resources: { max_concurrent_tasks: 10, reasoning_timeout_ms: 15000 },
    fault_tolerance: { max_retries: 3, auto_heal: true },
    persistence: { auto_save_interval_ms: 30000, compress: true },
    cognition: { exploration_factor: 0.1 }
  },

  research: {
    observability: { log_level: 'trace', trace_enabled: true, trace_max_entries: 10000 },
    resources: { reasoning_timeout_ms: 120000, evolution_budget: 1000, llm_calls_per_minute: 200 },
    features: { evolution_enabled: true, meta_language_enabled: true },
    cognition: { exploration_factor: 0.8, max_reasoning_depth: 20 }
  },

  embedded: {
    observability: { log_level: 'error', trace_enabled: false, metrics_enabled: false },
    resources: { max_concurrent_tasks: 2, max_beliefs: 100, max_memories: 500, max_knowledge_nodes: 200 },
    features: { evolution_enabled: false, social_brain_enabled: false, multimodal_enabled: false, meta_language_enabled: false },
    persistence: { enabled: false },
    cognition: { working_memory_capacity: 4, max_reasoning_depth: 3, exploration_factor: 0.0 }
  }
};

// ============================================================
// CONFIGURATION MANAGER
// ============================================================

class ConfigManager {
  constructor(initialConfig = {}) {
    this._config = this._deepMerge({}, DEFAULT_CONFIG);
    this._listeners = new Map();
    this._frozen_keys = new Set();
    this._history = [];
    
    // Apply environment profile
    const env = initialConfig.environment || process.env.NOEON_ENV || 'development';
    if (PROFILES[env]) {
      this._config = this._deepMerge(this._config, PROFILES[env]);
    }
    this._config.environment = env;

    // Apply initial overrides
    if (Object.keys(initialConfig).length > 0) {
      this._config = this._deepMerge(this._config, initialConfig);
    }

    // Apply environment variables
    this._applyEnvVars();

    // Generate instance ID
    if (!this._config.identity.instance_id) {
      this._config.identity.instance_id = `noeon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  // --- Access ---

  get(path) {
    return this._getPath(this._config, path);
  }

  getAll() {
    return JSON.parse(JSON.stringify(this._config));
  }

  // --- Mutation ---

  set(path, value) {
    if (this._frozen_keys.has(path)) {
      return { success: false, error: `Key '${path}' is frozen` };
    }

    const oldValue = this.get(path);
    this._setPath(this._config, path, value);
    
    this._history.push({ path, oldValue, newValue: value, timestamp: Date.now() });
    if (this._history.length > 100) this._history.shift();

    // Notify listeners
    this._notifyListeners(path, value, oldValue);
    return { success: true, path, value };
  }

  merge(partial) {
    const changes = [];
    this._walkObject(partial, (path, value) => {
      if (!this._frozen_keys.has(path)) {
        const old = this.get(path);
        this._setPath(this._config, path, value);
        changes.push({ path, old, new: value });
        this._notifyListeners(path, value, old);
      }
    });
    return { changes_applied: changes.length, changes };
  }

  freeze(path) {
    this._frozen_keys.add(path);
  }

  // --- Listeners ---

  onChange(path, handler) {
    if (!this._listeners.has(path)) this._listeners.set(path, []);
    this._listeners.get(path).push(handler);
  }

  _notifyListeners(path, newValue, oldValue) {
    // Exact match
    const handlers = this._listeners.get(path) || [];
    handlers.forEach(h => { try { h(newValue, oldValue, path); } catch(e) {} });
    
    // Parent path listeners
    const parts = path.split('.');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('.');
      const parentHandlers = this._listeners.get(parent + '.*') || [];
      parentHandlers.forEach(h => { try { h(newValue, oldValue, path); } catch(e) {} });
    }
  }

  // --- Validation ---

  validate() {
    const errors = [];
    
    // Check required fields
    if (!this._config.identity.name) errors.push('identity.name is required');
    if (this._config.cognition.working_memory_capacity < 1) errors.push('working_memory_capacity must be >= 1');
    if (this._config.cognition.confidence_threshold < 0 || this._config.cognition.confidence_threshold > 1) {
      errors.push('confidence_threshold must be between 0 and 1');
    }
    if (this._config.resources.max_concurrent_tasks < 1) errors.push('max_concurrent_tasks must be >= 1');
    
    // Check log level
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    if (!validLevels.includes(this._config.observability.log_level)) {
      errors.push(`Invalid log_level: ${this._config.observability.log_level}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // --- Environment Variables ---

  _applyEnvVars() {
    const envMap = {
      'NOEON_ENV': 'environment',
      'NOEON_LOG_LEVEL': 'observability.log_level',
      'NOEON_LLM_MODEL': 'llm.model',
      'NOEON_LLM_TEMPERATURE': 'llm.temperature',
      'NOEON_PERSISTENCE_PATH': 'persistence.path',
      'NOEON_MAX_TASKS': 'resources.max_concurrent_tasks',
      'OPENAI_API_KEY': 'llm.api_key',
      'OPENAI_API_BASE': 'llm.api_base'
    };

    for (const [envKey, configPath] of Object.entries(envMap)) {
      const value = process.env[envKey];
      if (value !== undefined) {
        // Parse numbers
        const parsed = isNaN(value) ? value : Number(value);
        this._setPath(this._config, configPath, parsed);
      }
    }
  }

  // --- Utility ---

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  _getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
  }

  _setPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  _walkObject(obj, callback, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this._walkObject(value, callback, path);
      } else {
        callback(path, value);
      }
    }
  }

  // --- Export ---

  toJSON() { return this.getAll(); }
  
  toString() {
    return `NoeonConfig[${this._config.environment}] instance=${this._config.identity.instance_id}`;
  }

  getStatus() {
    return {
      environment: this._config.environment,
      instance_id: this._config.identity.instance_id,
      frozen_keys: this._frozen_keys.size,
      listeners: this._listeners.size,
      changes: this._history.length,
      valid: this.validate().valid
    };
  }
}

module.exports = {
  DEFAULT_CONFIG,
  PROFILES,
  ConfigManager
};
