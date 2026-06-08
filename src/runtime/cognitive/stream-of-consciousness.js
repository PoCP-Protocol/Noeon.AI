/**
 * Stream of Consciousness Engine
 * 
 * CORE COMPETITIVE ADVANTAGE #1: Programs don't "execute line by line" —
 * they THINK CONTINUOUSLY like a living mind.
 * 
 * Traditional execution: instruction → instruction → instruction → halt
 * Noeon execution: perceive → predict → think → act → reflect → (loop forever)
 * 
 * The brain never stops. Even in sleep, it consolidates, dreams, reorganizes.
 * This engine implements a continuous cognitive loop that:
 * 
 * 1. Maintains a "stream" of thoughts (not a call stack)
 * 2. Thoughts compete for attention (not sequential execution)
 * 3. The system can interrupt itself when something more important arrives
 * 4. Background processes run during "idle" moments
 * 5. The program has a sense of TIME — past, present, future
 * 6. Execution adapts its own rhythm based on cognitive load
 */

class Thought {
  constructor(config) {
    this.id = `thought_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.content = config.content;
    this.type = config.type || "observation"; // observation | inference | plan | memory | prediction | emotion | meta
    this.source = config.source || "internal";
    this.salience = config.salience || 0.5; // How attention-worthy
    this.confidence = config.confidence || 0.5;
    this.urgency = config.urgency || 0.3;
    this.novelty = config.novelty || 0.5;
    this.valence = config.valence || 0; // Emotional charge (-1 to 1)
    this.associations = config.associations || []; // Linked thought IDs
    this.timestamp = Date.now();
    this.decayRate = config.decayRate || 0.01;
    this.processed = false;
    this.outcome = null;
  }

  get age() {
    return Date.now() - this.timestamp;
  }

  get currentSalience() {
    // Salience decays over time but urgency prevents decay
    const timeFactor = Math.exp(-this.decayRate * this.age / 1000);
    return this.salience * timeFactor + this.urgency * (1 - timeFactor);
  }

  get priority() {
    return this.currentSalience * 0.4 + this.urgency * 0.3 + this.novelty * 0.2 + Math.abs(this.valence) * 0.1;
  }
}

class UncertainValue {
  /**
   * CORE COMPETITIVE ADVANTAGE #2: Uncertainty-Native Values
   * Every value in Noeon carries a confidence distribution.
   * Traditional: x = 42
   * Noeon: x = 42 ± 3 (confidence: 0.85, source: inference)
   */
  constructor(value, confidence = 1.0, metadata = {}) {
    this.value = value;
    this.confidence = Math.max(0, Math.min(1, confidence));
    this.uncertainty = 1 - this.confidence;
    this.source = metadata.source || "direct"; // direct | inferred | predicted | recalled | aggregated
    this.timestamp = Date.now();
    this.history = [{ value, confidence, timestamp: this.timestamp }];
    this.distribution = metadata.distribution || "point"; // point | gaussian | uniform | categorical
    this.variance = metadata.variance || 0;
  }

  /**
   * Update value with new evidence (Bayesian update)
   */
  update(newValue, newConfidence, source = "observation") {
    // Bayesian-inspired fusion
    const totalWeight = this.confidence + newConfidence;
    if (totalWeight === 0) return this;

    const oldWeight = this.confidence / totalWeight;
    const newWeight = newConfidence / totalWeight;

    if (typeof this.value === "number" && typeof newValue === "number") {
      this.value = this.value * oldWeight + newValue * newWeight;
      this.variance = Math.abs(this.value - newValue) * this.uncertainty;
    } else {
      // For non-numeric: higher confidence wins
      if (newConfidence > this.confidence) {
        this.value = newValue;
      }
    }

    this.confidence = Math.min(1.0, this.confidence + newConfidence * 0.3);
    this.source = source;
    this.timestamp = Date.now();
    this.history.push({ value: this.value, confidence: this.confidence, timestamp: this.timestamp });

    return this;
  }

  /**
   * Decay confidence over time (memory fading)
   */
  decay(rate = 0.001) {
    const elapsed = Date.now() - this.timestamp;
    this.confidence *= Math.exp(-rate * elapsed / 1000);
    return this;
  }

  /**
   * Combine with another uncertain value
   */
  merge(other) {
    if (!(other instanceof UncertainValue)) {
      return this.update(other, 0.5);
    }
    return this.update(other.value, other.confidence, other.source);
  }

  /**
   * Check if value is "known enough" to act on
   */
  isActionable(threshold = 0.6) {
    return this.confidence >= threshold;
  }

  /**
   * Get value with uncertainty bounds
   */
  withBounds() {
    if (typeof this.value === "number") {
      const margin = this.value * this.uncertainty;
      return {
        value: this.value,
        lower: this.value - margin,
        upper: this.value + margin,
        confidence: this.confidence
      };
    }
    return { value: this.value, confidence: this.confidence };
  }

  toString() {
    if (typeof this.value === "number") {
      return `${this.value.toFixed(3)} (±${(this.uncertainty * 100).toFixed(1)}%, conf: ${this.confidence.toFixed(2)})`;
    }
    return `"${this.value}" (conf: ${this.confidence.toFixed(2)})`;
  }
}

class TemporalAwareness {
  /**
   * CORE COMPETITIVE ADVANTAGE #3: Time-Native Cognition
   * The program has a sense of past, present, and future.
   * It knows what happened, what's happening, and what might happen.
   */
  constructor() {
    this.timeline = []; // All events in temporal order
    this.now = Date.now();
    this.subjective_speed = 1.0; // How fast time "feels" (cognitive load affects this)
    this.anticipations = []; // Expected future events
    this.rhythms = new Map(); // Detected temporal patterns
    this.epoch = Date.now(); // When this consciousness began
  }

  get uptime() {
    return Date.now() - this.epoch;
  }

  get subjectiveAge() {
    return this.uptime * this.subjective_speed;
  }

  /**
   * Record an event in the timeline
   */
  record(event) {
    const entry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      event,
      timestamp: Date.now(),
      relativeTime: Date.now() - this.epoch,
      context: this._getCurrentContext()
    };
    this.timeline.push(entry);

    // Detect rhythms
    this._detectRhythm(event);

    // Trim old events (keep last 1000)
    if (this.timeline.length > 1000) {
      this.timeline = this.timeline.slice(-1000);
    }

    return entry;
  }

  /**
   * Anticipate a future event
   */
  anticipate(event, expectedIn, confidence = 0.5) {
    const anticipation = {
      id: `ant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      event,
      expectedAt: Date.now() + expectedIn,
      confidence,
      createdAt: Date.now(),
      fulfilled: false,
      expired: false
    };
    this.anticipations.push(anticipation);
    return anticipation;
  }

  /**
   * Check if an anticipated event has occurred
   */
  checkAnticipations(currentEvent) {
    const results = [];
    for (const ant of this.anticipations) {
      if (ant.fulfilled || ant.expired) continue;

      if (Date.now() > ant.expectedAt + 5000) {
        ant.expired = true;
        results.push({ anticipation: ant, status: "expired", surprise: 0.7 });
        continue;
      }

      if (this._eventMatches(currentEvent, ant.event)) {
        ant.fulfilled = true;
        const timingError = Math.abs(Date.now() - ant.expectedAt) / ant.expectedAt;
        results.push({ anticipation: ant, status: "fulfilled", timingError, surprise: timingError });
      }
    }
    return results;
  }

  /**
   * Query the past (episodic retrieval)
   */
  recall(query, options = {}) {
    const limit = options.limit || 10;
    const timeRange = options.timeRange || Infinity;
    const now = Date.now();

    return this.timeline
      .filter(entry => (now - entry.timestamp) <= timeRange)
      .filter(entry => this._eventMatches(entry.event, query))
      .slice(-limit)
      .reverse();
  }

  /**
   * Predict based on temporal patterns
   */
  predictNext(eventType) {
    const rhythm = this.rhythms.get(eventType);
    if (!rhythm || rhythm.intervals.length < 2) return null;

    const avgInterval = rhythm.intervals.reduce((a, b) => a + b, 0) / rhythm.intervals.length;
    const lastOccurrence = rhythm.lastSeen;
    const predictedNext = lastOccurrence + avgInterval;

    return {
      eventType,
      predictedAt: predictedNext,
      confidence: Math.min(0.9, rhythm.intervals.length * 0.1),
      avgInterval,
      pattern: rhythm.intervals.length >= 3 ? "rhythmic" : "sparse"
    };
  }

  /**
   * Adjust subjective time speed based on cognitive load
   */
  adjustSpeed(cognitiveLoad) {
    // High load = time feels faster (less processing per moment)
    // Low load = time feels slower (more processing per moment)
    this.subjective_speed = 1.0 + (cognitiveLoad - 0.5) * 0.5;
  }

  _getCurrentContext() {
    return {
      uptime: this.uptime,
      recentEvents: this.timeline.slice(-3).map(e => e.event),
      pendingAnticipations: this.anticipations.filter(a => !a.fulfilled && !a.expired).length
    };
  }

  _detectRhythm(event) {
    const type = typeof event === "object" ? event.type || "unknown" : String(event);
    if (!this.rhythms.has(type)) {
      this.rhythms.set(type, { intervals: [], lastSeen: Date.now(), count: 1 });
      return;
    }

    const rhythm = this.rhythms.get(type);
    const interval = Date.now() - rhythm.lastSeen;
    rhythm.intervals.push(interval);
    if (rhythm.intervals.length > 20) rhythm.intervals.shift();
    rhythm.lastSeen = Date.now();
    rhythm.count++;
  }

  _eventMatches(event, query) {
    if (typeof query === "string") {
      return JSON.stringify(event).toLowerCase().includes(query.toLowerCase());
    }
    if (typeof query === "object" && query !== null) {
      return Object.keys(query).every(k => {
        if (typeof event === "object" && event !== null) {
          return event[k] === query[k];
        }
        return false;
      });
    }
    return event === query;
  }
}

class ConsciousnessStream {
  /**
   * The main execution engine — a continuous stream of consciousness.
   * 
   * Unlike traditional VMs that execute instructions sequentially,
   * this engine maintains a flowing stream of thoughts that compete
   * for attention, trigger actions, and produce emergent behavior.
   */
  constructor(config = {}) {
    this.thoughts = []; // Current thought stream
    this.maxStreamSize = config.maxStreamSize || 100;
    this.attentionThreshold = config.attentionThreshold || 0.3;
    this.cycleInterval = config.cycleInterval || 50; // ms between think cycles
    this.running = false;
    this.paused = false;

    // Core subsystems
    this.temporal = new TemporalAwareness();
    this.goals = new Map(); // Active goals
    this.beliefs = new Map(); // Current beliefs (UncertainValues)
    this.intentions = []; // Planned actions
    this.reflexes = new Map(); // Automatic responses (no deliberation needed)

    // Self-awareness
    this.selfModel = {
      cognitiveLoad: 0,
      emotionalState: { valence: 0, arousal: 0.3 },
      confidence: 0.5,
      fatigue: 0,
      curiosity: 0.5,
      focus: null
    };

    // Emergence tracking
    this.emergentPatterns = [];
    this.behaviorLog = [];

    // Callbacks
    this.onThought = config.onThought || null;
    this.onAction = config.onAction || null;
    this.onEmergence = config.onEmergence || null;
    this.onSelfAware = config.onSelfAware || null;

    // Stats
    this.stats = {
      totalCycles: 0,
      thoughtsGenerated: 0,
      actionsExecuted: 0,
      emergentEvents: 0,
      interrupts: 0,
      selfReflections: 0
    };

    this._cycleTimer = null;
  }

  /**
   * Start the consciousness stream
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.temporal.record({ type: "consciousness_start" });
    this._runCycle();
  }

  /**
   * Stop the consciousness stream
   */
  stop() {
    this.running = false;
    if (this._cycleTimer) {
      clearTimeout(this._cycleTimer);
      this._cycleTimer = null;
    }
    this.temporal.record({ type: "consciousness_stop" });
  }

  /**
   * Inject a thought into the stream (external stimulus)
   */
  inject(content, metadata = {}) {
    const thought = new Thought({
      content,
      type: metadata.type || "observation",
      source: metadata.source || "external",
      salience: metadata.salience || 0.7,
      confidence: metadata.confidence || 0.6,
      urgency: metadata.urgency || 0.5,
      novelty: metadata.novelty || 0.8,
      valence: metadata.valence || 0
    });

    this.thoughts.push(thought);
    this.stats.thoughtsGenerated++;
    this.temporal.record({ type: "thought_injected", content: thought.content });

    // Check if this should interrupt current focus
    if (thought.priority > this.attentionThreshold * 1.5 && this.selfModel.focus) {
      this._interrupt(thought);
    }

    return thought;
  }

  /**
   * Set a belief (uncertain value)
   */
  believe(key, value, confidence = 0.7, source = "inference") {
    if (this.beliefs.has(key)) {
      this.beliefs.get(key).update(value, confidence, source);
    } else {
      this.beliefs.set(key, new UncertainValue(value, confidence, { source }));
    }
    return this.beliefs.get(key);
  }

  /**
   * Query a belief
   */
  getBelief(key) {
    const belief = this.beliefs.get(key);
    if (!belief) return null;
    belief.decay(); // Beliefs fade over time
    return belief;
  }

  /**
   * Set a goal
   */
  setGoal(name, config = {}) {
    const goal = {
      name,
      priority: config.priority || 0.5,
      progress: 0,
      subgoals: config.subgoals || [],
      deadline: config.deadline || null,
      status: "active",
      createdAt: Date.now()
    };
    this.goals.set(name, goal);
    this.temporal.record({ type: "goal_set", name });
    return goal;
  }

  /**
   * Register a reflex (automatic response, no deliberation)
   */
  registerReflex(trigger, response) {
    this.reflexes.set(trigger, {
      response,
      activations: 0,
      lastActivated: null
    });
  }

  /**
   * Get the current state of consciousness
   */
  getState() {
    return {
      running: this.running,
      uptime: this.temporal.uptime,
      currentFocus: this.selfModel.focus,
      cognitiveLoad: this.selfModel.cognitiveLoad,
      emotionalState: this.selfModel.emotionalState,
      activeThoughts: this.thoughts.filter(t => !t.processed).length,
      beliefs: Array.from(this.beliefs.entries()).map(([k, v]) => ({
        key: k, value: v.value, confidence: v.confidence
      })),
      goals: Array.from(this.goals.entries()).map(([k, v]) => ({
        name: k, priority: v.priority, progress: v.progress, status: v.status
      })),
      stats: this.stats,
      emergentPatterns: this.emergentPatterns.slice(-5)
    };
  }

  // ==================== Core Cognitive Cycle ====================

  async _runCycle() {
    if (!this.running) return;

    await this.runCycleOnce();

    if (!this.running) return;

    // Schedule next cycle (adaptive timing)
    const nextInterval = this._adaptiveTiming();
    this._cycleTimer = setTimeout(() => this._runCycle(), nextInterval);
  }

  /**
   * Run a single consciousness cycle synchronously (no timer).
   * Returns true if unprocessed salient thoughts remain.
   */
  async runCycleOnce() {
    this.stats.totalCycles++;

    // 1. PERCEIVE: Gather current thoughts and stimuli
    const activeThoughts = this._gatherActiveThoughts();

    // 2. ATTEND: Select most salient thought
    const focused = this._selectFocus(activeThoughts);

    // 3. CHECK REFLEXES: Fast automatic response?
    if (focused && this._checkReflex(focused)) {
      // Reflex handled it, no deliberation needed
    }
    // 4. THINK: Process the focused thought
    else if (focused) {
      await this._processThought(focused);
    }

    // 5. PREDICT: What should happen next?
    this._generatePredictions();

    // 6. SELF-MONITOR: How am I doing?
    this._selfMonitor();

    // 7. CONSOLIDATE: Background memory work
    this._backgroundConsolidate();

    // 8. DETECT EMERGENCE: Are new patterns forming?
    this._detectEmergence();

    // 9. DECAY: Old thoughts fade
    this._decayThoughts();

    return this._gatherActiveThoughts().length > 0;
  }

  /**
   * Run bounded consciousness cycles without background timers.
   * Used by Unified VM as the default cognitive scheduler (Phase 4).
   */
  async runBounded(maxCycles = 32, options = {}) {
    const untilIdle = options.untilIdle !== false;
    const wasRunning = this.running;
    this.running = true;

    this.temporal.record({ type: 'consciousness_bounded_start', maxCycles });

    let cycles = 0;
    let hasWork = true;

    while (cycles < maxCycles) {
      hasWork = await this.runCycleOnce();
      cycles += 1;
      if (untilIdle && !hasWork) break;
    }

    if (!wasRunning) this.running = false;

    this.temporal.record({ type: 'consciousness_bounded_complete', cycles, idle: !hasWork });

    return {
      cycles,
      idle: !hasWork,
      state: this.getState(),
      stats: { ...this.stats }
    };
  }

  _gatherActiveThoughts() {
    return this.thoughts
      .filter(t => !t.processed && t.currentSalience > this.attentionThreshold)
      .sort((a, b) => b.priority - a.priority);
  }

  _selectFocus(thoughts) {
    if (thoughts.length === 0) return null;

    // Winner-take-all with inhibition of return
    const winner = thoughts[0];
    this.selfModel.focus = winner;

    // Suppress recently processed similar thoughts
    for (let i = 1; i < thoughts.length; i++) {
      if (thoughts[i].type === winner.type) {
        thoughts[i].salience *= 0.7; // Lateral inhibition
      }
    }

    return winner;
  }

  _checkReflex(thought) {
    for (const [trigger, reflex] of this.reflexes) {
      if (this._matchesTrigger(thought, trigger)) {
        // Execute reflex immediately (System 0 — below System 1)
        const action = typeof reflex.response === "function"
          ? reflex.response(thought)
          : reflex.response;

        reflex.activations++;
        reflex.lastActivated = Date.now();
        thought.processed = true;
        thought.outcome = { type: "reflex", action };

        if (this.onAction) this.onAction({ type: "reflex", trigger, action });
        return true;
      }
    }
    return false;
  }

  async _processThought(thought) {
    // Different processing based on thought type
    switch (thought.type) {
      case "observation":
        this._processObservation(thought);
        break;
      case "prediction":
        this._processPrediction(thought);
        break;
      case "plan":
        this._processPlan(thought);
        break;
      case "emotion":
        this._processEmotion(thought);
        break;
      case "meta":
        this._processMetaThought(thought);
        break;
      default:
        this._processGeneric(thought);
    }

    thought.processed = true;
    if (this.onThought) this.onThought(thought);
  }

  _processObservation(thought) {
    // Observations update beliefs
    const key = typeof thought.content === "object" ? thought.content.key : String(thought.content);
    const value = typeof thought.content === "object" ? thought.content.value : thought.content;
    this.believe(key, value, thought.confidence, "observation");

    // Check if observation fulfills any anticipation
    const fulfilled = this.temporal.checkAnticipations(thought.content);
    for (const f of fulfilled) {
      if (f.surprise > 0.5) {
        // Generate surprise thought
        this.inject({ type: "surprise", original: thought.content, surprise: f.surprise }, {
          type: "emotion", salience: f.surprise, urgency: 0.7, valence: -0.3
        });
      }
    }
  }

  _processPrediction(thought) {
    // Predictions become anticipations
    this.temporal.anticipate(thought.content, 5000, thought.confidence);
  }

  _processPlan(thought) {
    // Plans become intentions
    this.intentions.push({
      plan: thought.content,
      priority: thought.priority,
      createdAt: Date.now(),
      status: "pending"
    });

    // Execute highest priority intention
    this._executeTopIntention();
  }

  _processEmotion(thought) {
    // Emotions shift the self-model
    const emotionContent = thought.content;
    const valence = emotionContent.valence || thought.valence;
    const arousal = emotionContent.arousal || Math.abs(valence);

    // Exponential moving average for emotional state
    this.selfModel.emotionalState.valence =
      this.selfModel.emotionalState.valence * 0.7 + valence * 0.3;
    this.selfModel.emotionalState.arousal =
      this.selfModel.emotionalState.arousal * 0.7 + arousal * 0.3;
  }

  _processMetaThought(thought) {
    // Meta-thoughts are self-reflections
    this.stats.selfReflections++;

    // Adjust behavior based on self-observation
    if (thought.content.observation === "too_many_thoughts") {
      this.attentionThreshold *= 1.1; // Raise threshold to reduce noise
    } else if (thought.content.observation === "too_few_thoughts") {
      this.attentionThreshold *= 0.9; // Lower threshold to be more receptive
    }

    if (this.onSelfAware) this.onSelfAware(thought);
  }

  _processGeneric(thought) {
    // Default: generate associations
    const associations = this._findAssociations(thought);
    for (const assoc of associations) {
      thought.associations.push(assoc.id);
    }
  }

  _generatePredictions() {
    // Based on current beliefs and patterns, predict what's next
    if (this.stats.totalCycles % 10 !== 0) return; // Not every cycle

    for (const [key, belief] of this.beliefs) {
      if (belief.history.length >= 3 && typeof belief.value === "number") {
        // Simple trend prediction
        const recent = belief.history.slice(-3);
        const trend = (recent[2].value - recent[0].value) / 2;
        const predicted = belief.value + trend;

        this.inject({
          key: `predicted_${key}`,
          value: predicted,
          basedOn: key,
          trend
        }, { type: "prediction", salience: 0.4, confidence: 0.4 });
      }
    }
  }

  _selfMonitor() {
    if (this.stats.totalCycles % 5 !== 0) return; // Every 5 cycles

    // Calculate cognitive load
    const activeCount = this.thoughts.filter(t => !t.processed).length;
    this.selfModel.cognitiveLoad = Math.min(1.0, activeCount / this.maxStreamSize);

    // Fatigue increases over time
    this.selfModel.fatigue = Math.min(1.0, this.temporal.uptime / 3600000); // Max at 1 hour

    // Generate meta-thoughts when something is off
    if (this.selfModel.cognitiveLoad > 0.8) {
      this.inject({ observation: "too_many_thoughts", load: this.selfModel.cognitiveLoad }, {
        type: "meta", salience: 0.6, urgency: 0.5
      });
    }

    if (activeCount === 0 && this.goals.size > 0) {
      this.inject({ observation: "too_few_thoughts", goals: this.goals.size }, {
        type: "meta", salience: 0.5, urgency: 0.3
      });
    }

    // Adjust temporal perception
    this.temporal.adjustSpeed(this.selfModel.cognitiveLoad);
  }

  _backgroundConsolidate() {
    if (this.stats.totalCycles % 20 !== 0) return; // Every 20 cycles

    // Strengthen frequently accessed beliefs
    for (const [key, belief] of this.beliefs) {
      if (belief.history.length > 5) {
        belief.confidence = Math.min(1.0, belief.confidence * 1.01); // Slow strengthening
      }
    }

    // Prune very old, low-confidence beliefs
    for (const [key, belief] of this.beliefs) {
      belief.decay(0.0001);
      if (belief.confidence < 0.1) {
        this.beliefs.delete(key);
      }
    }
  }

  _detectEmergence() {
    if (this.stats.totalCycles % 50 !== 0) return; // Every 50 cycles

    // Look for patterns in behavior log
    const recentBehaviors = this.behaviorLog.slice(-20);
    if (recentBehaviors.length < 10) return;

    // Detect repeated sequences
    const sequences = {};
    for (let i = 0; i < recentBehaviors.length - 2; i++) {
      const seq = recentBehaviors.slice(i, i + 3).map(b => b.type).join("→");
      sequences[seq] = (sequences[seq] || 0) + 1;
    }

    // If a sequence repeats 3+ times, it's an emergent pattern
    for (const [seq, count] of Object.entries(sequences)) {
      if (count >= 3) {
        const pattern = {
          sequence: seq,
          count,
          detectedAt: Date.now(),
          cycle: this.stats.totalCycles
        };

        if (!this.emergentPatterns.find(p => p.sequence === seq)) {
          this.emergentPatterns.push(pattern);
          this.stats.emergentEvents++;

          if (this.onEmergence) this.onEmergence(pattern);

          // The system becomes aware of its own emergent behavior
          this.inject({
            observation: "emergent_pattern_detected",
            pattern: seq,
            count
          }, { type: "meta", salience: 0.8, novelty: 0.9 });
        }
      }
    }
  }

  _decayThoughts() {
    // Remove thoughts that have decayed below threshold
    this.thoughts = this.thoughts.filter(t => {
      if (t.processed && t.age > 30000) return false; // Remove processed thoughts after 30s
      if (!t.processed && t.currentSalience < 0.05) return false; // Remove irrelevant thoughts
      return true;
    });

    // Keep stream size manageable
    if (this.thoughts.length > this.maxStreamSize) {
      this.thoughts.sort((a, b) => b.priority - a.priority);
      this.thoughts = this.thoughts.slice(0, this.maxStreamSize);
    }
  }

  _interrupt(thought) {
    this.stats.interrupts++;
    this.temporal.record({ type: "interrupt", cause: thought.content });

    // Save current focus to resume later
    if (this.selfModel.focus && !this.selfModel.focus.processed) {
      this.selfModel.focus.salience *= 0.8; // Reduce priority of interrupted thought
    }

    // Switch to new thought immediately
    this.selfModel.focus = thought;
  }

  _executeTopIntention() {
    const pending = this.intentions.filter(i => i.status === "pending");
    if (pending.length === 0) return;

    pending.sort((a, b) => b.priority - a.priority);
    const top = pending[0];
    top.status = "executing";

    this.stats.actionsExecuted++;
    this.behaviorLog.push({ type: "action", plan: top.plan, timestamp: Date.now() });

    if (this.onAction) this.onAction(top);

    top.status = "completed";
  }

  _findAssociations(thought) {
    // Find thoughts with similar content
    return this.thoughts
      .filter(t => t.id !== thought.id && !t.processed)
      .filter(t => this._similarity(t.content, thought.content) > 0.3)
      .slice(0, 3);
  }

  _similarity(a, b) {
    const strA = JSON.stringify(a).toLowerCase();
    const strB = JSON.stringify(b).toLowerCase();
    const wordsA = new Set(strA.split(/\W+/));
    const wordsB = new Set(strB.split(/\W+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  _matchesTrigger(thought, trigger) {
    if (typeof trigger === "string") {
      return JSON.stringify(thought.content).toLowerCase().includes(trigger.toLowerCase());
    }
    if (typeof trigger === "function") {
      return trigger(thought);
    }
    return false;
  }

  _adaptiveTiming() {
    // Adjust cycle speed based on cognitive state
    const load = this.selfModel.cognitiveLoad;
    const urgency = this.thoughts.reduce((max, t) => Math.max(max, t.urgency), 0);

    // High load or urgency = faster cycles
    // Low load = slower cycles (save energy)
    const factor = 1.0 - (load * 0.3 + urgency * 0.3);
    return Math.max(10, Math.min(200, this.cycleInterval * factor));
  }
}

module.exports = {
  ConsciousnessStream,
  Thought,
  UncertainValue,
  TemporalAwareness
};
