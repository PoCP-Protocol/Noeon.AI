/**
 * Cognitive Debugger — Mind Inspector
 * 
 * CORE COMPETITIVE ADVANTAGE #6: Debug THOUGHTS, not just variables.
 * 
 * Traditional debuggers show: variable values, call stacks, breakpoints.
 * Noeon's cognitive debugger shows:
 * 
 * 1. What the brain is THINKING (thought stream)
 * 2. What it BELIEVES (with confidence levels)
 * 3. What it PREDICTS will happen next
 * 4. What it FEELS (emotional state affecting decisions)
 * 5. WHY it made a decision (causal trace)
 * 6. What it DOESN'T KNOW (uncertainty map)
 * 7. What SURPRISED it (prediction errors)
 * 8. How its ATTENTION is allocated
 * 
 * Brain analogy: This is like an fMRI for artificial minds —
 * you can see which "brain regions" are active and why.
 */

class ThoughtTrace {
  constructor(thought, context) {
    this.thought = thought;
    this.context = context;
    this.timestamp = Date.now();
    this.causalChain = []; // What led to this thought
    this.effects = []; // What this thought caused
    this.alternatives = []; // Other thoughts that were suppressed
  }
}

class DecisionTrace {
  constructor(decision) {
    this.decision = decision;
    this.timestamp = Date.now();
    this.inputs = []; // What information was considered
    this.weights = {}; // How each factor was weighted
    this.alternatives = []; // Other options considered
    this.confidence = 0;
    this.emotionalInfluence = 0;
    this.reasoning = ""; // Natural language explanation
  }
}

class CognitiveDebugger {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.verbosity = config.verbosity || "normal"; // minimal | normal | verbose | trace
    this.maxHistory = config.maxHistory || 500;

    // Trace buffers
    this.thoughtHistory = [];
    this.decisionHistory = [];
    this.beliefSnapshots = [];
    this.attentionLog = [];
    this.surpriseLog = [];
    this.emotionLog = [];
    this.emergenceLog = [];

    // Breakpoints
    this.breakpoints = new Map(); // condition -> callback
    this.watchpoints = new Map(); // belief_key -> callback

    // Real-time stream
    this.listeners = new Map(); // event_type -> [callbacks]

    // Cognitive metrics (like performance counters for the mind)
    this.metrics = {
      thoughtsPerSecond: 0,
      decisionsPerMinute: 0,
      averageConfidence: 0,
      uncertaintyIndex: 0,
      emotionalVolatility: 0,
      attentionStability: 0,
      surpriseFrequency: 0,
      cognitiveEfficiency: 0
    };

    this._metricsWindow = [];
    this._lastMetricsUpdate = Date.now();
  }

  // ==================== Tracing ====================

  /**
   * Trace a thought entering the stream
   */
  traceThought(thought, context = {}) {
    if (!this.enabled) return;

    const trace = new ThoughtTrace(thought, context);

    // Find causal chain
    trace.causalChain = this._findCauses(thought);

    this.thoughtHistory.push(trace);
    this._trimHistory("thoughtHistory");

    this._emit("thought", trace);
    this._checkBreakpoints("thought", trace);
    this._updateMetrics("thought");
  }

  /**
   * Trace a decision being made
   */
  traceDecision(decision, inputs = [], alternatives = []) {
    if (!this.enabled) return;

    const trace = new DecisionTrace(decision);
    trace.inputs = inputs;
    trace.alternatives = alternatives;
    trace.confidence = decision.confidence || 0;
    trace.emotionalInfluence = decision.emotionalInfluence || 0;
    trace.reasoning = this._generateExplanation(decision, inputs);

    this.decisionHistory.push(trace);
    this._trimHistory("decisionHistory");

    this._emit("decision", trace);
    this._checkBreakpoints("decision", trace);
    this._updateMetrics("decision");

    return trace;
  }

  /**
   * Snapshot the current belief state
   */
  snapshotBeliefs(beliefs) {
    if (!this.enabled) return;

    const snapshot = {
      timestamp: Date.now(),
      beliefs: Array.from(beliefs.entries()).map(([key, val]) => ({
        key,
        value: val.value,
        confidence: val.confidence,
        source: val.source,
        age: Date.now() - val.timestamp
      })),
      totalBeliefs: beliefs.size,
      averageConfidence: 0,
      uncertainBeliefs: [],
      conflictingBeliefs: []
    };

    // Calculate averages
    if (snapshot.beliefs.length > 0) {
      snapshot.averageConfidence = snapshot.beliefs.reduce((s, b) => s + b.confidence, 0) / snapshot.beliefs.length;
      snapshot.uncertainBeliefs = snapshot.beliefs.filter(b => b.confidence < 0.4);
      snapshot.conflictingBeliefs = this._findConflicts(snapshot.beliefs);
    }

    this.beliefSnapshots.push(snapshot);
    this._trimHistory("beliefSnapshots");

    // Check watchpoints
    for (const [key, callback] of this.watchpoints) {
      const belief = snapshot.beliefs.find(b => b.key === key);
      if (belief) callback(belief);
    }

    this._emit("beliefs", snapshot);
  }

  /**
   * Log attention shift
   */
  traceAttention(from, to, reason = "") {
    if (!this.enabled) return;

    const entry = {
      timestamp: Date.now(),
      from,
      to,
      reason,
      duration: 0 // Will be calculated on next shift
    };

    // Calculate duration of previous attention
    if (this.attentionLog.length > 0) {
      const prev = this.attentionLog[this.attentionLog.length - 1];
      prev.duration = Date.now() - prev.timestamp;
    }

    this.attentionLog.push(entry);
    this._trimHistory("attentionLog");
    this._emit("attention", entry);
  }

  /**
   * Log a surprise (prediction error)
   */
  traceSurprise(predicted, actual, magnitude) {
    if (!this.enabled) return;

    const entry = {
      timestamp: Date.now(),
      predicted,
      actual,
      magnitude,
      recovered: false
    };

    this.surpriseLog.push(entry);
    this._trimHistory("surpriseLog");
    this._emit("surprise", entry);
    this._checkBreakpoints("surprise", entry);
    this._updateMetrics("surprise");
  }

  /**
   * Log emotional state change
   */
  traceEmotion(state, trigger = "") {
    if (!this.enabled) return;

    const entry = {
      timestamp: Date.now(),
      valence: state.valence,
      arousal: state.arousal,
      trigger,
      label: this._labelEmotion(state)
    };

    this.emotionLog.push(entry);
    this._trimHistory("emotionLog");
    this._emit("emotion", entry);
  }

  /**
   * Log emergent behavior detection
   */
  traceEmergence(pattern) {
    if (!this.enabled) return;

    const entry = {
      timestamp: Date.now(),
      pattern,
      significance: "unknown"
    };

    this.emergenceLog.push(entry);
    this._emit("emergence", entry);
  }

  // ==================== Breakpoints & Watchpoints ====================

  /**
   * Set a cognitive breakpoint
   * Triggers when a condition is met in the thought stream
   */
  setBreakpoint(name, condition, callback) {
    this.breakpoints.set(name, { condition, callback, hits: 0 });
  }

  /**
   * Watch a specific belief for changes
   */
  watch(beliefKey, callback) {
    this.watchpoints.set(beliefKey, callback);
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(name) {
    this.breakpoints.delete(name);
  }

  /**
   * Remove a watchpoint
   */
  unwatch(beliefKey) {
    this.watchpoints.delete(beliefKey);
  }

  // ==================== Queries & Inspection ====================

  /**
   * WHY: Explain why a decision was made
   */
  why(decisionIndex = -1) {
    const idx = decisionIndex < 0
      ? this.decisionHistory.length + decisionIndex
      : decisionIndex;

    const trace = this.decisionHistory[idx];
    if (!trace) return { error: "No decision found at that index" };

    return {
      decision: trace.decision,
      reasoning: trace.reasoning,
      inputs: trace.inputs,
      confidence: trace.confidence,
      emotionalInfluence: trace.emotionalInfluence,
      alternatives: trace.alternatives,
      timestamp: trace.timestamp
    };
  }

  /**
   * WHAT_IF: Counterfactual reasoning — what would have happened differently?
   */
  whatIf(decisionIndex, alteredInputs) {
    const idx = decisionIndex < 0
      ? this.decisionHistory.length + decisionIndex
      : decisionIndex;

    const trace = this.decisionHistory[idx];
    if (!trace) return { error: "No decision found" };

    // Simulate with altered inputs
    const originalInputs = trace.inputs;
    const differences = [];

    for (const [key, newValue] of Object.entries(alteredInputs)) {
      const original = originalInputs.find(i => i.key === key);
      if (original) {
        differences.push({
          factor: key,
          original: original.value,
          altered: newValue,
          impact: Math.abs(newValue - (original.value || 0)) * (original.weight || 0.5)
        });
      }
    }

    const totalImpact = differences.reduce((s, d) => s + d.impact, 0);
    const wouldChange = totalImpact > 0.3;

    return {
      originalDecision: trace.decision,
      wouldChange,
      totalImpact,
      differences,
      explanation: wouldChange
        ? `The decision would likely change because ${differences.map(d => d.factor).join(", ")} shifted significantly.`
        : `The decision would likely remain the same — the altered factors don't have enough influence.`
    };
  }

  /**
   * UNCERTAINTY_MAP: Show what the system doesn't know
   */
  uncertaintyMap() {
    const latest = this.beliefSnapshots[this.beliefSnapshots.length - 1];
    if (!latest) return { error: "No belief snapshot available" };

    return {
      totalBeliefs: latest.totalBeliefs,
      averageConfidence: latest.averageConfidence,
      uncertainBeliefs: latest.uncertainBeliefs.sort((a, b) => a.confidence - b.confidence),
      conflictingBeliefs: latest.conflictingBeliefs,
      blindSpots: this._identifyBlindSpots(),
      overconfident: latest.beliefs.filter(b => b.confidence > 0.95 && b.source === "inference")
    };
  }

  /**
   * ATTENTION_PROFILE: How is attention being allocated?
   */
  attentionProfile(windowMs = 60000) {
    const now = Date.now();
    const recent = this.attentionLog.filter(a => (now - a.timestamp) < windowMs);

    const distribution = {};
    for (const entry of recent) {
      const target = entry.to || "idle";
      distribution[target] = (distribution[target] || 0) + (entry.duration || 1000);
    }

    const total = Object.values(distribution).reduce((s, v) => s + v, 0) || 1;
    const profile = Object.entries(distribution).map(([target, time]) => ({
      target,
      time,
      percentage: (time / total * 100).toFixed(1) + "%"
    })).sort((a, b) => b.time - a.time);

    return {
      window: windowMs,
      shifts: recent.length,
      distribution: profile,
      stability: recent.length > 0 ? 1 - (recent.length / (windowMs / 1000)) : 1.0,
      mostFocused: profile[0]?.target || "none"
    };
  }

  /**
   * THOUGHT_STREAM: Get recent thought stream (like a log)
   */
  thoughtStream(limit = 20, filter = null) {
    let thoughts = this.thoughtHistory.slice(-limit);

    if (filter) {
      if (filter.type) thoughts = thoughts.filter(t => t.thought.type === filter.type);
      if (filter.minSalience) thoughts = thoughts.filter(t => t.thought.salience >= filter.minSalience);
      if (filter.source) thoughts = thoughts.filter(t => t.thought.source === filter.source);
    }

    return thoughts.map(t => ({
      id: t.thought.id,
      content: t.thought.content,
      type: t.thought.type,
      salience: t.thought.salience,
      confidence: t.thought.confidence,
      timestamp: t.timestamp,
      causes: t.causalChain.length,
      effects: t.effects.length
    }));
  }

  /**
   * COGNITIVE_METRICS: Real-time performance metrics
   */
  getMetrics() {
    this._calculateMetrics();
    return { ...this.metrics };
  }

  /**
   * FULL_STATE: Complete cognitive state dump
   */
  fullState() {
    return {
      metrics: this.getMetrics(),
      recentThoughts: this.thoughtStream(10),
      recentDecisions: this.decisionHistory.slice(-5).map(d => ({
        decision: d.decision,
        confidence: d.confidence,
        reasoning: d.reasoning
      })),
      beliefs: this.beliefSnapshots[this.beliefSnapshots.length - 1] || null,
      attention: this.attentionProfile(30000),
      emotions: this.emotionLog.slice(-5),
      surprises: this.surpriseLog.slice(-5),
      emergentPatterns: this.emergenceLog.slice(-3),
      breakpoints: Array.from(this.breakpoints.keys()),
      watchpoints: Array.from(this.watchpoints.keys())
    };
  }

  // ==================== Event System ====================

  /**
   * Subscribe to cognitive events
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Unsubscribe from cognitive events
   */
  off(eventType, callback) {
    const list = this.listeners.get(eventType);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  // ==================== Private Methods ====================

  _emit(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    for (const cb of callbacks) {
      try { cb(data); } catch (e) { /* debugger shouldn't crash the system */ }
    }

    const allCallbacks = this.listeners.get("*") || [];
    for (const cb of allCallbacks) {
      try { cb(eventType, data); } catch (e) { }
    }
  }

  _checkBreakpoints(eventType, data) {
    for (const [name, bp] of this.breakpoints) {
      try {
        if (bp.condition(eventType, data)) {
          bp.hits++;
          bp.callback(name, data);
        }
      } catch (e) { }
    }
  }

  _findCauses(thought) {
    // Look back in history for thoughts that likely caused this one
    const recent = this.thoughtHistory.slice(-20);
    return recent
      .filter(t => {
        // Temporal proximity
        if (thought.timestamp - t.timestamp > 5000) return false;
        // Content similarity
        const similarity = this._contentSimilarity(t.thought.content, thought.content);
        return similarity > 0.2;
      })
      .map(t => t.thought.id)
      .slice(0, 3);
  }

  _contentSimilarity(a, b) {
    const strA = JSON.stringify(a).toLowerCase();
    const strB = JSON.stringify(b).toLowerCase();
    const wordsA = new Set(strA.split(/\W+/).filter(w => w.length > 2));
    const wordsB = new Set(strB.split(/\W+/).filter(w => w.length > 2));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  _findConflicts(beliefs) {
    const conflicts = [];
    for (let i = 0; i < beliefs.length; i++) {
      for (let j = i + 1; j < beliefs.length; j++) {
        // Check for contradictory beliefs
        if (beliefs[i].key.includes("not_") && beliefs[j].key === beliefs[i].key.replace("not_", "")) {
          conflicts.push({ a: beliefs[i], b: beliefs[j] });
        }
        if (beliefs[j].key.includes("not_") && beliefs[i].key === beliefs[j].key.replace("not_", "")) {
          conflicts.push({ a: beliefs[i], b: beliefs[j] });
        }
      }
    }
    return conflicts;
  }

  _identifyBlindSpots() {
    // Areas where we have no beliefs but have made decisions
    const decisionTopics = new Set();
    for (const d of this.decisionHistory.slice(-20)) {
      if (d.inputs) {
        for (const input of d.inputs) {
          if (input.key) decisionTopics.add(input.key);
        }
      }
    }

    const latest = this.beliefSnapshots[this.beliefSnapshots.length - 1];
    const knownTopics = new Set(latest ? latest.beliefs.map(b => b.key) : []);

    return [...decisionTopics].filter(t => !knownTopics.has(t));
  }

  _generateExplanation(decision, inputs) {
    const parts = [];

    if (inputs.length > 0) {
      const topInputs = inputs.slice(0, 3);
      parts.push(`Based on ${topInputs.map(i => i.key || i.name || "input").join(", ")}`);
    }

    if (decision.confidence > 0.8) {
      parts.push("with high confidence");
    } else if (decision.confidence < 0.4) {
      parts.push("with low confidence (uncertain)");
    }

    if (decision.emotionalInfluence > 0.3) {
      parts.push("influenced by emotional state");
    }

    return parts.join(", ") || "No clear explanation available";
  }

  _labelEmotion(state) {
    const v = state.valence;
    const a = state.arousal;

    if (v > 0.5 && a > 0.5) return "excited";
    if (v > 0.5 && a <= 0.5) return "content";
    if (v > 0 && a > 0.5) return "alert";
    if (v > 0 && a <= 0.5) return "calm";
    if (v <= 0 && v > -0.5 && a > 0.5) return "anxious";
    if (v <= 0 && v > -0.5 && a <= 0.5) return "bored";
    if (v <= -0.5 && a > 0.5) return "distressed";
    if (v <= -0.5 && a <= 0.5) return "depressed";
    return "neutral";
  }

  _updateMetrics(eventType) {
    this._metricsWindow.push({ type: eventType, timestamp: Date.now() });
    // Keep last 60 seconds
    const cutoff = Date.now() - 60000;
    this._metricsWindow = this._metricsWindow.filter(e => e.timestamp > cutoff);
  }

  _calculateMetrics() {
    const now = Date.now();
    const window = 60000; // 1 minute

    const recentThoughts = this._metricsWindow.filter(e => e.type === "thought");
    const recentDecisions = this._metricsWindow.filter(e => e.type === "decision");
    const recentSurprises = this._metricsWindow.filter(e => e.type === "surprise");

    this.metrics.thoughtsPerSecond = recentThoughts.length / 60;
    this.metrics.decisionsPerMinute = recentDecisions.length;
    this.metrics.surpriseFrequency = recentSurprises.length / 60;

    // Average confidence from recent decisions
    const recentDecs = this.decisionHistory.slice(-10);
    if (recentDecs.length > 0) {
      this.metrics.averageConfidence = recentDecs.reduce((s, d) => s + d.confidence, 0) / recentDecs.length;
    }

    // Uncertainty index
    const latestBeliefs = this.beliefSnapshots[this.beliefSnapshots.length - 1];
    if (latestBeliefs) {
      this.metrics.uncertaintyIndex = 1 - latestBeliefs.averageConfidence;
    }

    // Emotional volatility
    if (this.emotionLog.length >= 2) {
      const recent = this.emotionLog.slice(-10);
      let volatility = 0;
      for (let i = 1; i < recent.length; i++) {
        volatility += Math.abs(recent[i].valence - recent[i - 1].valence);
      }
      this.metrics.emotionalVolatility = volatility / (recent.length - 1);
    }

    // Attention stability
    const recentAttention = this.attentionLog.slice(-10);
    if (recentAttention.length > 0) {
      const avgDuration = recentAttention.reduce((s, a) => s + (a.duration || 1000), 0) / recentAttention.length;
      this.metrics.attentionStability = Math.min(1.0, avgDuration / 10000); // Normalize to 10s
    }

    // Cognitive efficiency (decisions per thought)
    if (recentThoughts.length > 0) {
      this.metrics.cognitiveEfficiency = recentDecisions.length / recentThoughts.length;
    }
  }

  _trimHistory(field) {
    if (this[field].length > this.maxHistory) {
      this[field] = this[field].slice(-this.maxHistory);
    }
  }
}

module.exports = { CognitiveDebugger, ThoughtTrace, DecisionTrace };
