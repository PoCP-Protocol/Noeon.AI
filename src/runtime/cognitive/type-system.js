'use strict';

/**
 * Noeon Type System — The world's first cognitive type system
 * 
 * Traditional languages have: number, string, boolean, object, array
 * Noeon has: Belief, Uncertain, Temporal, Emotion, Intention, Percept, Memory
 * 
 * Every type in Noeon carries metadata about:
 * - Confidence (how sure are we?)
 * - Provenance (where did this come from?)
 * - Temporality (when was this true?)
 * - Salience (how important is this?)
 * 
 * This is NOT a wrapper around JavaScript types.
 * This IS a new type theory for cognitive computing.
 */

// ============================================================
// BASE: CognitiveValue — All values in Noeon extend this
// ============================================================

class CognitiveValue {
  constructor(value, meta = {}) {
    this.value = value;
    this.confidence = meta.confidence ?? 1.0;
    this.provenance = meta.provenance ?? 'direct';
    this.timestamp = meta.timestamp ?? Date.now();
    this.salience = meta.salience ?? 0.5;
    this.decay_rate = meta.decay_rate ?? 0.0;
    this._type = 'CognitiveValue';
  }

  /** Get current effective confidence (decays over time) */
  get effectiveConfidence() {
    if (this.decay_rate === 0) return this.confidence;
    const elapsed = (Date.now() - this.timestamp) / 1000;
    return this.confidence * Math.exp(-this.decay_rate * elapsed);
  }

  /** Is this value still reliable? */
  get isReliable() {
    return this.effectiveConfidence >= 0.5;
  }

  /** Is this value stale? */
  get isStale() {
    return this.effectiveConfidence < 0.3;
  }

  /** Strengthen this value (evidence confirms it) */
  strengthen(amount = 0.1) {
    this.confidence = Math.min(1.0, this.confidence + amount);
    this.timestamp = Date.now();
    return this;
  }

  /** Weaken this value (evidence contradicts it) */
  weaken(amount = 0.1) {
    this.confidence = Math.max(0.0, this.confidence - amount);
    return this;
  }

  /** Combine with another value (Bayesian-like update) */
  combine(other) {
    if (!(other instanceof CognitiveValue)) {
      other = new CognitiveValue(other);
    }
    const combined_confidence = 1 - (1 - this.confidence) * (1 - other.confidence);
    return new CognitiveValue(
      this.value, // Keep original value
      {
        confidence: combined_confidence,
        provenance: `combined(${this.provenance}, ${other.provenance})`,
        timestamp: Date.now(),
        salience: Math.max(this.salience, other.salience)
      }
    );
  }

  toString() {
    return `${this.value} [conf=${this.confidence.toFixed(2)}, sal=${this.salience.toFixed(2)}]`;
  }

  toJSON() {
    return {
      type: this._type,
      value: this.value,
      confidence: this.confidence,
      provenance: this.provenance,
      timestamp: this.timestamp,
      salience: this.salience,
      effective_confidence: this.effectiveConfidence
    };
  }
}

// ============================================================
// BELIEF — A proposition the system holds to be true (with uncertainty)
// ============================================================

class Belief extends CognitiveValue {
  constructor(proposition, meta = {}) {
    super(proposition, meta);
    this._type = 'Belief';
    this.evidence = meta.evidence ?? [];
    this.contradictions = meta.contradictions ?? [];
    this.revision_count = 0;
  }

  /** Add supporting evidence */
  support(evidence_item) {
    this.evidence.push({
      content: evidence_item,
      timestamp: Date.now()
    });
    this.strengthen(0.05 * Math.min(this.evidence.length, 5));
    return this;
  }

  /** Add contradicting evidence */
  contradict(evidence_item) {
    this.contradictions.push({
      content: evidence_item,
      timestamp: Date.now()
    });
    this.weaken(0.1);
    return this;
  }

  /** Revise the belief based on new information */
  revise(new_proposition, reason) {
    const old = this.value;
    this.value = new_proposition;
    this.revision_count++;
    this.provenance = `revised(${reason})`;
    this.timestamp = Date.now();
    // Confidence drops slightly on revision
    this.confidence *= 0.9;
    return { old, new: new_proposition, reason };
  }

  /** Coherence score: how well-supported vs contradicted */
  get coherence() {
    const support_weight = this.evidence.length;
    const contra_weight = this.contradictions.length * 1.5; // Contradictions weigh more
    if (support_weight + contra_weight === 0) return 0.5;
    return support_weight / (support_weight + contra_weight);
  }

  get isCoherent() {
    return this.coherence >= 0.6;
  }
}

// ============================================================
// UNCERTAIN — A value with explicit probability distribution
// ============================================================

class Uncertain extends CognitiveValue {
  constructor(mean, meta = {}) {
    super(mean, meta);
    this._type = 'Uncertain';
    this.mean = mean;
    this.variance = meta.variance ?? 0.1;
    this.distribution = meta.distribution ?? 'gaussian';
    this.samples = meta.samples ?? [];
    this.bounds = meta.bounds ?? { low: mean - 2 * Math.sqrt(meta.variance ?? 0.1), high: mean + 2 * Math.sqrt(meta.variance ?? 0.1) };
  }

  /** Standard deviation */
  get std() {
    return Math.sqrt(this.variance);
  }

  /** Coefficient of variation (relative uncertainty) */
  get relativeUncertainty() {
    if (this.mean === 0) return Infinity;
    return this.std / Math.abs(this.mean);
  }

  /** Is this value precise enough for decision-making? */
  isPreciseEnough(threshold = 0.2) {
    return this.relativeUncertainty <= threshold;
  }

  /** Update with new observation (Bayesian update for Gaussian) */
  observe(observed_value, observation_variance = 0.1) {
    const prior_precision = 1 / this.variance;
    const obs_precision = 1 / observation_variance;
    const posterior_precision = prior_precision + obs_precision;
    const posterior_mean = (prior_precision * this.mean + obs_precision * observed_value) / posterior_precision;
    const posterior_variance = 1 / posterior_precision;

    this.mean = posterior_mean;
    this.value = posterior_mean;
    this.variance = posterior_variance;
    this.bounds = {
      low: posterior_mean - 2 * Math.sqrt(posterior_variance),
      high: posterior_mean + 2 * Math.sqrt(posterior_variance)
    };
    this.samples.push(observed_value);
    this.confidence = Math.min(1.0, 1 - Math.sqrt(posterior_variance));
    return this;
  }

  /** Sample from the distribution */
  sample() {
    // Box-Muller transform for Gaussian
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return this.mean + z * this.std;
  }

  /** Probability that value is above threshold */
  probAbove(threshold) {
    // Using error function approximation
    const z = (threshold - this.mean) / this.std;
    return 0.5 * (1 - this._erf(z / Math.sqrt(2)));
  }

  /** Probability that value is below threshold */
  probBelow(threshold) {
    return 1 - this.probAbove(threshold);
  }

  _erf(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  /** Arithmetic with uncertainty propagation */
  add(other) {
    if (other instanceof Uncertain) {
      return new Uncertain(this.mean + other.mean, {
        variance: this.variance + other.variance,
        confidence: Math.min(this.confidence, other.confidence)
      });
    }
    return new Uncertain(this.mean + other, { variance: this.variance, confidence: this.confidence });
  }

  multiply(other) {
    if (other instanceof Uncertain) {
      const new_mean = this.mean * other.mean;
      const new_variance = this.mean ** 2 * other.variance + other.mean ** 2 * this.variance + this.variance * other.variance;
      return new Uncertain(new_mean, {
        variance: new_variance,
        confidence: Math.min(this.confidence, other.confidence)
      });
    }
    return new Uncertain(this.mean * other, { variance: this.variance * other ** 2, confidence: this.confidence });
  }

  toString() {
    return `${this.mean.toFixed(3)} ± ${this.std.toFixed(3)} [conf=${this.confidence.toFixed(2)}]`;
  }
}

// ============================================================
// TEMPORAL — A value that changes over time (time-series aware)
// ============================================================

class Temporal extends CognitiveValue {
  constructor(current_value, meta = {}) {
    super(current_value, meta);
    this._type = 'Temporal';
    this.history = meta.history ?? [{ value: current_value, timestamp: Date.now() }];
    this.max_history = meta.max_history ?? 100;
    this.trend = null;
    this.velocity = 0;
    this.acceleration = 0;
    this._updateDynamics();
  }

  /** Update with new value */
  update(new_value, timestamp = Date.now()) {
    this.history.push({ value: new_value, timestamp });
    if (this.history.length > this.max_history) {
      this.history.shift();
    }
    this.value = new_value;
    this.timestamp = timestamp;
    this._updateDynamics();
    return this;
  }

  /** Calculate trend, velocity, acceleration */
  _updateDynamics() {
    if (this.history.length < 2) {
      this.trend = 'stable';
      this.velocity = 0;
      this.acceleration = 0;
      return;
    }

    const recent = this.history.slice(-5);
    const velocities = [];
    for (let i = 1; i < recent.length; i++) {
      const dt = (recent[i].timestamp - recent[i - 1].timestamp) / 1000 || 1;
      velocities.push((recent[i].value - recent[i - 1].value) / dt);
    }

    this.velocity = velocities.length > 0 ? velocities[velocities.length - 1] : 0;

    if (velocities.length >= 2) {
      this.acceleration = velocities[velocities.length - 1] - velocities[velocities.length - 2];
    }

    if (this.velocity > 0.01) this.trend = 'increasing';
    else if (this.velocity < -0.01) this.trend = 'decreasing';
    else this.trend = 'stable';
  }

  /** Predict future value using linear extrapolation */
  predict(seconds_ahead) {
    const predicted = this.value + this.velocity * seconds_ahead + 0.5 * this.acceleration * seconds_ahead ** 2;
    const uncertainty = Math.abs(this.velocity) * seconds_ahead * 0.3; // Uncertainty grows with time
    return new Uncertain(predicted, {
      variance: uncertainty ** 2,
      confidence: Math.max(0.1, this.confidence - 0.1 * seconds_ahead)
    });
  }

  /** Get value at a past time (interpolation) */
  at(timestamp) {
    if (this.history.length === 0) return null;
    // Find closest entries
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].timestamp <= timestamp) {
        return this.history[i].value;
      }
    }
    return this.history[0].value;
  }

  /** Duration since last change */
  get timeSinceChange() {
    if (this.history.length < 2) return Infinity;
    const last = this.history[this.history.length - 1];
    const prev = this.history[this.history.length - 2];
    if (last.value === prev.value) return (Date.now() - last.timestamp) / 1000;
    return 0;
  }

  /** Is the value changing rapidly? */
  get isVolatile() {
    return Math.abs(this.velocity) > 0.5;
  }

  /** Moving average */
  movingAverage(window = 5) {
    const recent = this.history.slice(-window);
    if (recent.length === 0) return this.value;
    return recent.reduce((sum, h) => sum + h.value, 0) / recent.length;
  }
}

// ============================================================
// EMOTION — Affective state that biases cognition
// ============================================================

class Emotion extends CognitiveValue {
  constructor(label, meta = {}) {
    super(label, meta);
    this._type = 'Emotion';
    this.valence = meta.valence ?? 0; // -1 (negative) to +1 (positive)
    this.arousal = meta.arousal ?? 0.5; // 0 (calm) to 1 (excited)
    this.dominance = meta.dominance ?? 0.5; // 0 (submissive) to 1 (dominant)
    this.trigger = meta.trigger ?? null;
    this.intensity = meta.intensity ?? Math.abs(this.valence) * this.arousal;
    this.duration_ms = meta.duration_ms ?? 5000;
    this.onset = Date.now();
  }

  /** Is this emotion still active? */
  get isActive() {
    return (Date.now() - this.onset) < this.duration_ms;
  }

  /** Current intensity (decays over time) */
  get currentIntensity() {
    const elapsed = Date.now() - this.onset;
    const decay = Math.exp(-elapsed / this.duration_ms);
    return this.intensity * decay;
  }

  /** Decision bias: how much does this emotion push toward action? */
  get actionBias() {
    // High arousal + high dominance = push to act
    // Low arousal + low dominance = push to wait
    return this.arousal * this.dominance * (this.valence > 0 ? 1 : -0.5);
  }

  /** Risk tolerance modifier */
  get riskModifier() {
    // Positive emotions increase risk tolerance
    // Negative + high arousal (fear) decreases it
    if (this.valence > 0) return 1 + this.valence * 0.3;
    return 1 + this.valence * this.arousal * 0.5; // Fear reduces risk tolerance
  }

  /** Blend two emotions */
  blend(other) {
    return new Emotion(
      `${this.value}+${other.value}`,
      {
        valence: (this.valence * this.currentIntensity + other.valence * other.currentIntensity) /
          (this.currentIntensity + other.currentIntensity || 1),
        arousal: Math.max(this.arousal, other.arousal),
        dominance: (this.dominance + other.dominance) / 2,
        trigger: `blend(${this.trigger}, ${other.trigger})`
      }
    );
  }

  /** Map to discrete emotion label */
  get discreteLabel() {
    if (this.valence > 0.3 && this.arousal > 0.6) return 'excited';
    if (this.valence > 0.3 && this.arousal <= 0.6) return 'content';
    if (this.valence < -0.3 && this.arousal > 0.6) return 'anxious';
    if (this.valence < -0.3 && this.arousal <= 0.6) return 'sad';
    if (Math.abs(this.valence) <= 0.3 && this.arousal > 0.6) return 'alert';
    return 'neutral';
  }
}

// ============================================================
// INTENTION — A goal-directed cognitive state
// ============================================================

class Intention extends CognitiveValue {
  constructor(goal, meta = {}) {
    super(goal, meta);
    this._type = 'Intention';
    this.priority = meta.priority ?? 0.5;
    this.urgency = meta.urgency ?? 0.5;
    this.feasibility = meta.feasibility ?? 0.5;
    this.status = 'pending'; // pending, active, achieved, abandoned
    this.plan = meta.plan ?? [];
    this.progress = 0;
    this.blockers = [];
    this.dependencies = meta.dependencies ?? [];
  }

  /** Effective priority (urgency * feasibility * base priority) */
  get effectivePriority() {
    return this.priority * this.urgency * this.feasibility;
  }

  /** Activate this intention */
  activate() {
    this.status = 'active';
    this.timestamp = Date.now();
    return this;
  }

  /** Mark progress */
  advance(step_description, amount = 0.1) {
    this.progress = Math.min(1.0, this.progress + amount);
    this.plan.push({ step: step_description, timestamp: Date.now() });
    if (this.progress >= 1.0) this.status = 'achieved';
    return this;
  }

  /** Block this intention */
  block(reason) {
    this.blockers.push({ reason, timestamp: Date.now() });
    this.feasibility *= 0.8;
    return this;
  }

  /** Abandon this intention */
  abandon(reason) {
    this.status = 'abandoned';
    this.provenance = `abandoned(${reason})`;
    return this;
  }

  /** Is this intention achievable? */
  get isAchievable() {
    return this.feasibility > 0.2 && this.blockers.length < 3;
  }

  /** Should this intention be prioritized? */
  get shouldPrioritize() {
    return this.urgency > 0.7 && this.feasibility > 0.4 && this.status === 'active';
  }
}

// ============================================================
// PERCEPT — A sensory input with modality and processing state
// ============================================================

class Percept extends CognitiveValue {
  constructor(content, meta = {}) {
    super(content, meta);
    this._type = 'Percept';
    this.modality = meta.modality ?? 'unknown'; // visual, auditory, textual, numerical, temporal, proprioceptive
    this.raw = meta.raw ?? content;
    this.processed = meta.processed ?? false;
    this.features = meta.features ?? {};
    this.attention_weight = meta.attention_weight ?? 0.5;
    this.novelty = meta.novelty ?? 0.5;
    this.binding_id = meta.binding_id ?? null; // For cross-modal binding
  }

  /** Process this percept (extract features) */
  process(feature_extractor) {
    if (typeof feature_extractor === 'function') {
      this.features = feature_extractor(this.raw);
    }
    this.processed = true;
    return this;
  }

  /** Bind with another percept (cross-modal integration) */
  bind(other_percept) {
    const binding_id = `bind_${Date.now()}`;
    this.binding_id = binding_id;
    other_percept.binding_id = binding_id;
    return new Percept(
      { primary: this.value, secondary: other_percept.value },
      {
        modality: `${this.modality}+${other_percept.modality}`,
        confidence: Math.min(this.confidence, other_percept.confidence),
        novelty: Math.max(this.novelty, other_percept.novelty),
        attention_weight: Math.max(this.attention_weight, other_percept.attention_weight),
        binding_id
      }
    );
  }

  /** Should this percept capture attention? */
  get capturesAttention() {
    return this.novelty > 0.7 || this.attention_weight > 0.8 || this.salience > 0.8;
  }
}

// ============================================================
// MEMORY_TRACE — A memory with encoding strength and associations
// ============================================================

class MemoryTrace extends CognitiveValue {
  constructor(content, meta = {}) {
    super(content, meta);
    this._type = 'MemoryTrace';
    this.encoding_strength = meta.encoding_strength ?? 0.5;
    this.retrieval_count = 0;
    this.last_retrieved = null;
    this.associations = meta.associations ?? [];
    this.context = meta.context ?? {};
    this.memory_type = meta.memory_type ?? 'episodic'; // episodic, semantic, procedural
    this.emotional_tag = meta.emotional_tag ?? null;
  }

  /** Retrieve this memory (strengthens it) */
  retrieve() {
    this.retrieval_count++;
    this.last_retrieved = Date.now();
    // Retrieval strengthens memory (testing effect)
    this.encoding_strength = Math.min(1.0, this.encoding_strength + 0.05);
    this.confidence = Math.min(1.0, this.confidence + 0.02);
    return this;
  }

  /** Current accessibility (how easy to recall) */
  get accessibility() {
    const time_factor = this.last_retrieved
      ? Math.exp(-(Date.now() - this.last_retrieved) / (86400000 * 7)) // 7-day half-life
      : Math.exp(-(Date.now() - this.timestamp) / (86400000 * 1)); // 1-day half-life if never retrieved
    const strength_factor = this.encoding_strength;
    const retrieval_factor = Math.min(1.0, this.retrieval_count * 0.1);
    return (time_factor * 0.4 + strength_factor * 0.4 + retrieval_factor * 0.2);
  }

  /** Is this memory likely to be recalled? */
  get isAccessible() {
    return this.accessibility > 0.3;
  }

  /** Add association */
  associate(other_memory_id, strength = 0.5) {
    this.associations.push({ target: other_memory_id, strength, timestamp: Date.now() });
    return this;
  }

  /** Reconsolidate (modify during retrieval — memory is reconstructive) */
  reconsolidate(modification) {
    if (typeof modification === 'function') {
      this.value = modification(this.value);
    } else {
      this.value = { ...this.value, ...modification };
    }
    this.provenance = 'reconsolidated';
    this.encoding_strength *= 0.95; // Slight weakening during reconsolidation
    return this;
  }
}

// ============================================================
// COGNITIVE_COLLECTION — A typed collection with cognitive operations
// ============================================================

class CognitiveCollection {
  constructor(items = [], meta = {}) {
    this.items = items.map(item =>
      item instanceof CognitiveValue ? item : new CognitiveValue(item)
    );
    this.name = meta.name ?? 'collection';
    this._type = 'CognitiveCollection';
  }

  /** Filter by confidence */
  reliable(threshold = 0.5) {
    return new CognitiveCollection(
      this.items.filter(item => item.effectiveConfidence >= threshold),
      { name: `${this.name}.reliable(${threshold})` }
    );
  }

  /** Sort by salience (most important first) */
  bySalience() {
    const sorted = [...this.items].sort((a, b) => b.salience - a.salience);
    return new CognitiveCollection(sorted, { name: `${this.name}.bySalience()` });
  }

  /** Sort by confidence */
  byConfidence() {
    const sorted = [...this.items].sort((a, b) => b.confidence - a.confidence);
    return new CognitiveCollection(sorted, { name: `${this.name}.byConfidence()` });
  }

  /** Get consensus value (weighted by confidence) */
  consensus() {
    if (this.items.length === 0) return null;
    const total_weight = this.items.reduce((sum, item) => sum + item.confidence, 0);
    if (total_weight === 0) return this.items[0];
    // For numeric values
    if (typeof this.items[0].value === 'number') {
      const weighted_sum = this.items.reduce((sum, item) => sum + item.value * item.confidence, 0);
      return new CognitiveValue(weighted_sum / total_weight, {
        confidence: total_weight / this.items.length,
        provenance: 'consensus'
      });
    }
    // For non-numeric, return highest confidence
    return this.items.reduce((best, item) => item.confidence > best.confidence ? item : best);
  }

  /** Map with cognitive awareness */
  transform(fn) {
    return new CognitiveCollection(
      this.items.map(item => {
        const result = fn(item);
        return result instanceof CognitiveValue ? result : new CognitiveValue(result, {
          confidence: item.confidence,
          provenance: `transformed(${item.provenance})`
        });
      }),
      { name: `${this.name}.transform()` }
    );
  }

  /** Attend to top-N most salient items */
  attend(n = 7) { // Miller's magic number
    return new CognitiveCollection(
      this.bySalience().items.slice(0, n),
      { name: `${this.name}.attend(${n})` }
    );
  }

  get length() { return this.items.length; }

  /** Average confidence of the collection */
  get avgConfidence() {
    if (this.items.length === 0) return 0;
    return this.items.reduce((sum, item) => sum + item.confidence, 0) / this.items.length;
  }
}

// ============================================================
// TYPE CHECKER — Validates cognitive type constraints
// ============================================================

class TypeChecker {
  constructor() {
    this.rules = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    // REASON requires Belief or Uncertain inputs
    this.rules.set('REASON', {
      accepts: ['Belief', 'Uncertain', 'CognitiveValue', 'Percept'],
      produces: 'Belief',
      constraints: { min_confidence: 0.3 }
    });

    // DECIDE requires Belief with sufficient confidence
    this.rules.set('DECIDE', {
      accepts: ['Belief', 'Uncertain'],
      produces: 'Intention',
      constraints: { min_confidence: 0.5 }
    });

    // PERCEIVE produces Percept
    this.rules.set('PERCEIVE', {
      accepts: ['*'],
      produces: 'Percept',
      constraints: {}
    });

    // PREDICT produces Uncertain
    this.rules.set('PREDICT', {
      accepts: ['Belief', 'Temporal', 'Uncertain'],
      produces: 'Uncertain',
      constraints: {}
    });

    // REFLECT requires any cognitive value, produces Belief about self
    this.rules.set('REFLECT', {
      accepts: ['*'],
      produces: 'Belief',
      constraints: { meta: true }
    });

    // CONSOLIDATE requires MemoryTrace
    this.rules.set('CONSOLIDATE', {
      accepts: ['CognitiveValue', 'Belief', 'Percept', 'MemoryTrace'],
      produces: 'MemoryTrace',
      constraints: {}
    });

    // INTUIT produces Belief with lower confidence
    this.rules.set('INTUIT', {
      accepts: ['Percept', 'CognitiveValue'],
      produces: 'Belief',
      constraints: { max_confidence: 0.8 }
    });

    // FEEL produces Emotion
    this.rules.set('FEEL', {
      accepts: ['*'],
      produces: 'Emotion',
      constraints: {}
    });
  }

  /** Check if a value is valid input for an operation */
  checkInput(operation, value) {
    const rule = this.rules.get(operation);
    if (!rule) return { valid: true, warnings: [`No type rule for ${operation}`] };

    if (rule.accepts.includes('*')) return { valid: true, warnings: [] };

    const type_name = value._type || 'unknown';
    if (!rule.accepts.includes(type_name)) {
      return {
        valid: false,
        error: `${operation} expects ${rule.accepts.join('|')}, got ${type_name}`,
        warnings: []
      };
    }

    // Check constraints
    const warnings = [];
    if (rule.constraints.min_confidence && value.confidence < rule.constraints.min_confidence) {
      warnings.push(`${operation}: input confidence ${value.confidence.toFixed(2)} below recommended ${rule.constraints.min_confidence}`);
    }

    return { valid: true, warnings };
  }

  /** Get the output type for an operation */
  getOutputType(operation) {
    const rule = this.rules.get(operation);
    return rule ? rule.produces : 'CognitiveValue';
  }

  /** Register a custom type rule */
  registerRule(operation, rule) {
    this.rules.set(operation, rule);
  }

  /** Validate a full cognitive pipeline */
  validatePipeline(steps) {
    const errors = [];
    const warnings = [];
    let current_type = 'CognitiveValue';

    for (const step of steps) {
      const rule = this.rules.get(step.operation);
      if (!rule) {
        warnings.push(`No type rule for ${step.operation}`);
        continue;
      }

      if (!rule.accepts.includes('*') && !rule.accepts.includes(current_type)) {
        errors.push(`Step ${step.operation}: expects ${rule.accepts.join('|')}, but previous step produces ${current_type}`);
      }

      current_type = rule.produces;
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

// ============================================================
// TYPE CONSTRUCTORS — Convenient factory functions
// ============================================================

function belief(proposition, confidence = 0.7, provenance = 'stated') {
  return new Belief(proposition, { confidence, provenance });
}

function uncertain(mean, variance = 0.1, confidence = 0.8) {
  return new Uncertain(mean, { variance, confidence });
}

function temporal(initial_value) {
  return new Temporal(initial_value);
}

function emotion(label, valence, arousal, dominance = 0.5) {
  return new Emotion(label, { valence, arousal, dominance });
}

function intention(goal, priority = 0.5, urgency = 0.5) {
  return new Intention(goal, { priority, urgency });
}

function percept(content, modality = 'textual', novelty = 0.5) {
  return new Percept(content, { modality, novelty });
}

function memory(content, type = 'episodic', strength = 0.5) {
  return new MemoryTrace(content, { memory_type: type, encoding_strength: strength });
}

function collection(items, name = 'unnamed') {
  return new CognitiveCollection(items, { name });
}

module.exports = {
  // Core types
  CognitiveValue,
  Belief,
  Uncertain,
  Temporal,
  Emotion,
  Intention,
  Percept,
  MemoryTrace,
  CognitiveCollection,
  TypeChecker,
  // Factory functions
  belief,
  uncertain,
  temporal,
  emotion,
  intention,
  percept,
  memory,
  collection
};
