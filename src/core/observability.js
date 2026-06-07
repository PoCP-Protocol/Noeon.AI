'use strict';

/**
 * Noeon Cognitive Observability System
 * 
 * You can't debug a brain by looking at variable values.
 * You need to see WHAT it's thinking, WHY, and HOW CONFIDENT it is.
 * 
 * This module provides:
 * - Structured cognitive logs (not just text — semantic events)
 * - Thought traces (full causal chain of reasoning)
 * - Confidence tracking (how sure the system is at each step)
 * - Attention heatmap (what's being focused on)
 * - Decision audit trail (why each choice was made)
 * - Performance metrics (cognitive load, latency, throughput)
 * 
 * Neural Correlate: Metacognitive awareness — the brain observing itself
 */

// ============================================================
// LOG LEVELS (Cognitive Severity)
// ============================================================

const LogLevel = {
  TRACE: 0,    // Every micro-operation (neuron firing)
  DEBUG: 1,    // Detailed internal state
  INFO: 2,     // Normal cognitive events
  WARN: 3,     // Anomalies (confusion, low confidence)
  ERROR: 4,    // Failures (reasoning failure, timeout)
  FATAL: 5     // System-level failures
};

const LogLevelNames = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

// ============================================================
// STRUCTURED COGNITIVE LOGGER
// ============================================================

class CognitiveLogger {
  constructor(options = {}) {
    this.level = options.level !== undefined ? options.level : LogLevel.INFO;
    this.outputs = [];  // Log sinks
    this.buffer = [];
    this.max_buffer = options.max_buffer || 500;
    this.context = options.context || {};
    this.filters = [];
    this.formatters = [];
    
    // Default console output
    if (options.console !== false) {
      this.addOutput(new ConsoleOutput(options));
    }
  }

  addOutput(output) {
    this.outputs.push(output);
    return this;
  }

  addFilter(filterFn) {
    this.filters.push(filterFn);
    return this;
  }

  setLevel(level) {
    if (typeof level === 'string') {
      this.level = LogLevel[level.toUpperCase()] || LogLevel.INFO;
    } else {
      this.level = level;
    }
  }

  // --- Log Methods ---

  trace(event, data = {}) { this._log(LogLevel.TRACE, event, data); }
  debug(event, data = {}) { this._log(LogLevel.DEBUG, event, data); }
  info(event, data = {}) { this._log(LogLevel.INFO, event, data); }
  warn(event, data = {}) { this._log(LogLevel.WARN, event, data); }
  error(event, data = {}) { this._log(LogLevel.ERROR, event, data); }
  fatal(event, data = {}) { this._log(LogLevel.FATAL, event, data); }

  // --- Cognitive-specific log methods ---

  thought(content, confidence = 1.0) {
    this._log(LogLevel.DEBUG, 'cognitive.thought', { content, confidence });
  }

  decision(choice, alternatives = [], reason = '') {
    this._log(LogLevel.INFO, 'cognitive.decision', { choice, alternatives, reason });
  }

  belief(proposition, confidence, source = 'inference') {
    this._log(LogLevel.DEBUG, 'cognitive.belief', { proposition, confidence, source });
  }

  prediction(target, expected, confidence) {
    this._log(LogLevel.DEBUG, 'cognitive.prediction', { target, expected, confidence });
  }

  surprise(expected, actual, magnitude) {
    this._log(LogLevel.INFO, 'cognitive.surprise', { expected, actual, magnitude });
  }

  confusion(topic, severity = 'moderate') {
    this._log(LogLevel.WARN, 'cognitive.confusion', { topic, severity });
  }

  insight(content, trigger = '') {
    this._log(LogLevel.INFO, 'cognitive.insight', { content, trigger });
  }

  // --- Internal ---

  _log(level, event, data) {
    if (level < this.level) return;

    const entry = {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      level: LogLevelNames[level],
      level_num: level,
      event,
      data,
      context: { ...this.context }
    };

    // Apply filters
    for (const filter of this.filters) {
      if (!filter(entry)) return;
    }

    // Buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.max_buffer) this.buffer.shift();

    // Output
    for (const output of this.outputs) {
      try { output.write(entry); } catch (e) {}
    }
  }

  getBuffer(count = 50) {
    return this.buffer.slice(-count);
  }

  clear() { this.buffer = []; }
}

// ============================================================
// LOG OUTPUTS
// ============================================================

class ConsoleOutput {
  constructor(options = {}) {
    this.colored = options.colored !== false;
    this.compact = options.compact || false;
  }

  write(entry) {
    if (this.compact) {
      const prefix = this._levelPrefix(entry.level_num);
      console.log(`${prefix} [${entry.event}] ${JSON.stringify(entry.data)}`);
    } else {
      const prefix = this._levelPrefix(entry.level_num);
      const time = entry.iso.slice(11, 23);
      console.log(`${time} ${prefix} ${entry.event}`, entry.data);
    }
  }

  _levelPrefix(level) {
    if (!this.colored) return `[${LogLevelNames[level]}]`;
    const colors = { 0: '\x1b[90m', 1: '\x1b[36m', 2: '\x1b[32m', 3: '\x1b[33m', 4: '\x1b[31m', 5: '\x1b[35m' };
    return `${colors[level] || ''}[${LogLevelNames[level]}]\x1b[0m`;
  }
}

class FileOutput {
  constructor(filePath) {
    this.filePath = filePath;
    this.fs = require('fs');
    this._ensureFile();
  }

  _ensureFile() {
    const dir = require('path').dirname(this.filePath);
    if (!this.fs.existsSync(dir)) this.fs.mkdirSync(dir, { recursive: true });
  }

  write(entry) {
    const line = JSON.stringify(entry) + '\n';
    this.fs.appendFileSync(this.filePath, line);
  }
}

class MemoryOutput {
  constructor(maxEntries = 1000) {
    this.entries = [];
    this.maxEntries = maxEntries;
  }

  write(entry) {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.shift();
  }

  query(filter = {}) {
    let results = [...this.entries];
    if (filter.level) results = results.filter(e => e.level_num >= LogLevel[filter.level.toUpperCase()]);
    if (filter.event) results = results.filter(e => e.event.includes(filter.event));
    if (filter.since) results = results.filter(e => e.timestamp >= filter.since);
    if (filter.limit) results = results.slice(-filter.limit);
    return results;
  }
}

// ============================================================
// THOUGHT TRACER (Causal chain of reasoning)
// ============================================================

class ThoughtTracer {
  constructor(options = {}) {
    this.traces = [];
    this.current_trace = null;
    this.max_traces = options.max_traces || 50;
    this.max_steps_per_trace = options.max_steps || 200;
  }

  startTrace(name, context = {}) {
    this.current_trace = {
      id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      context,
      steps: [],
      start_time: Date.now(),
      end_time: null,
      outcome: null
    };
    return this.current_trace.id;
  }

  step(operation, input, output, metadata = {}) {
    if (!this.current_trace) return;
    if (this.current_trace.steps.length >= this.max_steps_per_trace) return;

    this.current_trace.steps.push({
      seq: this.current_trace.steps.length,
      operation,
      input: this._summarize(input),
      output: this._summarize(output),
      confidence: metadata.confidence || null,
      duration_ms: metadata.duration_ms || null,
      timestamp: Date.now()
    });
  }

  endTrace(outcome = 'completed') {
    if (!this.current_trace) return null;
    this.current_trace.end_time = Date.now();
    this.current_trace.outcome = outcome;
    this.current_trace.duration_ms = this.current_trace.end_time - this.current_trace.start_time;
    
    this.traces.push(this.current_trace);
    if (this.traces.length > this.max_traces) this.traces.shift();
    
    const completed = this.current_trace;
    this.current_trace = null;
    return completed;
  }

  getTrace(traceId) {
    return this.traces.find(t => t.id === traceId);
  }

  getLatest(count = 5) {
    return this.traces.slice(-count);
  }

  // Generate a human-readable explanation of the trace
  explain(traceId) {
    const trace = this.getTrace(traceId) || this.traces[this.traces.length - 1];
    if (!trace) return 'No trace available.';

    const lines = [`## Thought Trace: ${trace.name}`, `Duration: ${trace.duration_ms}ms | Steps: ${trace.steps.length} | Outcome: ${trace.outcome}`, ''];
    
    for (const step of trace.steps) {
      const conf = step.confidence ? ` (confidence: ${(step.confidence * 100).toFixed(0)}%)` : '';
      lines.push(`${step.seq + 1}. [${step.operation}]${conf}`);
      if (step.input) lines.push(`   Input: ${step.input}`);
      if (step.output) lines.push(`   Output: ${step.output}`);
    }

    return lines.join('\n');
  }

  _summarize(data) {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data.length > 100 ? data.slice(0, 100) + '...' : data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    try {
      const json = JSON.stringify(data);
      return json.length > 150 ? json.slice(0, 150) + '...' : json;
    } catch (e) { return '[complex object]'; }
  }
}

// ============================================================
// METRICS COLLECTOR
// ============================================================

class MetricsCollector {
  constructor(options = {}) {
    this.metrics = new Map();
    this.interval = options.interval || 10000;
    this.history = [];
    this.max_history = options.max_history || 100;
  }

  // Counter (monotonically increasing)
  increment(name, amount = 1) {
    const current = this.metrics.get(name) || { type: 'counter', value: 0 };
    current.value += amount;
    current.last_updated = Date.now();
    this.metrics.set(name, current);
  }

  // Gauge (can go up or down)
  gauge(name, value) {
    this.metrics.set(name, { type: 'gauge', value, last_updated: Date.now() });
  }

  // Histogram (track distribution)
  observe(name, value) {
    let metric = this.metrics.get(name);
    if (!metric || metric.type !== 'histogram') {
      metric = { type: 'histogram', values: [], count: 0, sum: 0, min: Infinity, max: -Infinity };
      this.metrics.set(name, metric);
    }
    metric.values.push(value);
    if (metric.values.length > 100) metric.values.shift();
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.avg = metric.sum / metric.count;
    metric.last_updated = Date.now();
  }

  get(name) {
    const metric = this.metrics.get(name);
    return metric ? metric.value || metric.avg : undefined;
  }

  snapshot() {
    const snap = {};
    for (const [name, metric] of this.metrics) {
      if (metric.type === 'histogram') {
        snap[name] = { avg: metric.avg, min: metric.min, max: metric.max, count: metric.count };
      } else {
        snap[name] = metric.value;
      }
    }
    snap._timestamp = Date.now();
    this.history.push(snap);
    if (this.history.length > this.max_history) this.history.shift();
    return snap;
  }

  getAll() {
    const result = {};
    for (const [name, metric] of this.metrics) {
      result[name] = { ...metric };
    }
    return result;
  }
}

// ============================================================
// OBSERVABILITY SYSTEM (Orchestrator)
// ============================================================

class ObservabilitySystem {
  constructor(options = {}) {
    this.logger = new CognitiveLogger({
      level: LogLevel[options.log_level?.toUpperCase()] || LogLevel.INFO,
      console: options.console !== false,
      colored: options.colored !== false,
      compact: options.compact || false
    });
    this.tracer = new ThoughtTracer(options);
    this.metrics = new MetricsCollector(options);
    this.memoryLog = new MemoryOutput(options.max_log_entries || 1000);
    
    // Add memory output to logger for querying
    this.logger.addOutput(this.memoryLog);
    
    // Optional file output
    if (options.log_file) {
      this.logger.addOutput(new FileOutput(options.log_file));
    }
  }

  // --- Convenience: Kernel integration ---

  traceExecution(programName) {
    return this.tracer.startTrace(programName);
  }

  recordStep(operation, input, output, metadata) {
    this.tracer.step(operation, input, output, metadata);
    this.metrics.increment(`ops.${operation}`);
  }

  endExecution(outcome) {
    const trace = this.tracer.endTrace(outcome);
    if (trace) {
      this.metrics.observe('execution.duration_ms', trace.duration_ms);
      this.metrics.increment('executions.total');
      if (outcome === 'success') this.metrics.increment('executions.success');
      else this.metrics.increment('executions.failure');
    }
    return trace;
  }

  // --- Query ---

  queryLogs(filter = {}) {
    return this.memoryLog.query(filter);
  }

  explainLastThought() {
    return this.tracer.explain();
  }

  getDashboard() {
    return {
      metrics: this.metrics.snapshot(),
      recent_logs: this.logger.getBuffer(10),
      recent_traces: this.tracer.getLatest(3).map(t => ({
        name: t.name, duration_ms: t.duration_ms,
        steps: t.steps.length, outcome: t.outcome
      })),
      health: {
        log_buffer: this.logger.buffer.length,
        traces_stored: this.tracer.traces.length,
        metrics_tracked: this.metrics.metrics.size
      }
    };
  }
}

module.exports = {
  LogLevel,
  LogLevelNames,
  CognitiveLogger,
  ConsoleOutput,
  FileOutput,
  MemoryOutput,
  ThoughtTracer,
  MetricsCollector,
  ObservabilitySystem
};
