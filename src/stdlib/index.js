'use strict';

/**
 * Noeon Standard Library (stdlib)
 * 
 * Built-in cognitive algorithms and utility functions that any Noeon program
 * can use. These are the "batteries included" of cognitive programming.
 * 
 * Categories:
 * 1. Reasoning algorithms (deductive, inductive, abductive, analogical)
 * 2. Decision algorithms (multi-criteria, satisficing, minimax)
 * 3. Learning algorithms (reinforcement, hebbian, bayesian update)
 * 4. Attention algorithms (saliency, novelty detection, change detection)
 * 5. Memory algorithms (spaced repetition, spreading activation, forgetting curve)
 * 6. Pattern recognition (sequence, anomaly, similarity)
 * 7. Utility functions (math, probability, statistics)
 */

// ============================================================
// 1. REASONING ALGORITHMS
// ============================================================

const Reasoning = {
  /**
   * Deductive reasoning: If premises are true, conclusion must be true
   * @param {Array} premises - Array of {statement, confidence}
   * @param {string} rule - The logical rule to apply
   * @returns {Object} Conclusion with confidence
   */
  deductive(premises, rule) {
    // Confidence of deduction = minimum confidence of premises
    const min_confidence = Math.min(...premises.map(p => p.confidence ?? 1.0));
    const conclusion = {
      type: 'deductive',
      premises: premises.map(p => p.statement || p),
      rule,
      confidence: min_confidence * 0.95, // Slight loss for inference step
      valid: min_confidence > 0.5
    };
    return conclusion;
  },

  /**
   * Inductive reasoning: Generalize from specific observations
   * @param {Array} observations - Array of observed instances
   * @param {number} threshold - Minimum observations for generalization
   * @returns {Object} Generalization with confidence
   */
  inductive(observations, threshold = 5) {
    const n = observations.length;
    // Confidence grows with observations but never reaches 1.0
    const confidence = 1 - Math.exp(-n / threshold);
    
    // Find common pattern
    const patterns = {};
    observations.forEach(obs => {
      const key = typeof obs === 'object' ? JSON.stringify(obs) : String(obs);
      patterns[key] = (patterns[key] || 0) + 1;
    });
    
    const most_common = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0];
    
    return {
      type: 'inductive',
      observation_count: n,
      pattern: most_common ? most_common[0] : null,
      frequency: most_common ? most_common[1] / n : 0,
      confidence,
      sufficient: n >= threshold
    };
  },

  /**
   * Abductive reasoning: Inference to the best explanation
   * @param {Object} observation - What we observed
   * @param {Array} hypotheses - Possible explanations [{explanation, prior, likelihood}]
   * @returns {Object} Best explanation with posterior probability
   */
  abductive(observation, hypotheses) {
    // Bayesian-like scoring
    const scored = hypotheses.map(h => {
      const posterior = (h.prior ?? 0.5) * (h.likelihood ?? 0.5);
      return { ...h, posterior };
    });
    
    // Normalize
    const total = scored.reduce((sum, h) => sum + h.posterior, 0);
    scored.forEach(h => h.posterior = total > 0 ? h.posterior / total : 1 / scored.length);
    
    // Sort by posterior
    scored.sort((a, b) => b.posterior - a.posterior);
    
    return {
      type: 'abductive',
      observation,
      best_explanation: scored[0],
      alternatives: scored.slice(1),
      confidence: scored[0].posterior,
      discrimination: scored.length > 1 ? scored[0].posterior - scored[1].posterior : 1.0
    };
  },

  /**
   * Analogical reasoning: Transfer knowledge from source to target
   * @param {Object} source - Known domain {features, conclusion}
   * @param {Object} target - New domain {features}
   * @param {number} similarity_threshold - Minimum similarity for transfer
   * @returns {Object} Analogical inference
   */
  analogical(source, target, similarity_threshold = 0.5) {
    // Calculate structural similarity
    const source_features = Object.keys(source.features || source);
    const target_features = Object.keys(target.features || target);
    const common = source_features.filter(f => target_features.includes(f));
    const similarity = common.length / Math.max(source_features.length, target_features.length);
    
    return {
      type: 'analogical',
      source_domain: source,
      target_domain: target,
      similarity,
      transferable: similarity >= similarity_threshold,
      inferred_conclusion: similarity >= similarity_threshold ? source.conclusion : null,
      confidence: similarity * 0.8, // Analogy is never as strong as deduction
      common_features: common
    };
  },

  /**
   * Dialectical reasoning: Thesis → Antithesis → Synthesis
   * @param {Object} thesis - Initial position
   * @param {Object} antithesis - Opposing position
   * @returns {Object} Synthesized position
   */
  dialectical(thesis, antithesis) {
    const thesis_strength = thesis.confidence ?? 0.5;
    const anti_strength = antithesis.confidence ?? 0.5;
    const total = thesis_strength + anti_strength;
    
    return {
      type: 'dialectical',
      thesis: { ...thesis, weight: thesis_strength / total },
      antithesis: { ...antithesis, weight: anti_strength / total },
      synthesis: {
        statement: `Integration of "${thesis.statement || thesis}" and "${antithesis.statement || antithesis}"`,
        confidence: (thesis_strength + anti_strength) / 2 * 0.9,
        incorporates_both: true
      }
    };
  }
};

// ============================================================
// 2. DECISION ALGORITHMS
// ============================================================

const Decision = {
  /**
   * Multi-criteria decision making (weighted sum)
   * @param {Array} options - [{name, criteria: {criterion: score}}]
   * @param {Object} weights - {criterion: weight}
   * @returns {Object} Ranked options
   */
  multiCriteria(options, weights) {
    const scored = options.map(opt => {
      let total = 0;
      let weight_sum = 0;
      for (const [criterion, weight] of Object.entries(weights)) {
        const score = (opt.criteria && opt.criteria[criterion]) ?? 0;
        total += score * weight;
        weight_sum += weight;
      }
      return { ...opt, score: weight_sum > 0 ? total / weight_sum : 0 };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return {
      type: 'multi_criteria',
      winner: scored[0],
      ranking: scored,
      margin: scored.length > 1 ? scored[0].score - scored[1].score : 1.0,
      confidence: scored[0].score
    };
  },

  /**
   * Satisficing: Pick first option that meets all minimum thresholds
   * @param {Array} options - Available options
   * @param {Object} thresholds - Minimum acceptable values per criterion
   * @returns {Object} First satisfactory option or null
   */
  satisfice(options, thresholds) {
    for (const opt of options) {
      let satisfies = true;
      for (const [criterion, min_value] of Object.entries(thresholds)) {
        if ((opt.criteria && opt.criteria[criterion]) < min_value) {
          satisfies = false;
          break;
        }
      }
      if (satisfies) {
        return { type: 'satisficing', chosen: opt, reason: 'meets_all_thresholds', confidence: 0.7 };
      }
    }
    return { type: 'satisficing', chosen: null, reason: 'no_option_satisfies', confidence: 0 };
  },

  /**
   * Expected value decision (probability * payoff)
   * @param {Array} options - [{name, probability, payoff}]
   * @returns {Object} Option with highest expected value
   */
  expectedValue(options) {
    const scored = options.map(opt => ({
      ...opt,
      expected_value: (opt.probability ?? 0.5) * (opt.payoff ?? 0)
    }));
    scored.sort((a, b) => b.expected_value - a.expected_value);
    return {
      type: 'expected_value',
      winner: scored[0],
      ranking: scored,
      confidence: scored[0].probability ?? 0.5
    };
  },

  /**
   * Minimax: Choose option that minimizes worst-case loss
   * @param {Array} options - [{name, outcomes: [worst, best]}]
   * @returns {Object} Safest option
   */
  minimax(options) {
    const scored = options.map(opt => ({
      ...opt,
      worst_case: Math.min(...(opt.outcomes || [0]))
    }));
    scored.sort((a, b) => b.worst_case - a.worst_case); // Maximize the minimum
    return {
      type: 'minimax',
      winner: scored[0],
      ranking: scored,
      confidence: 0.6 // Minimax is conservative
    };
  }
};

// ============================================================
// 3. LEARNING ALGORITHMS
// ============================================================

const Learning = {
  /**
   * Reinforcement learning update (Q-learning style)
   * @param {number} current_value - Current Q-value
   * @param {number} reward - Received reward
   * @param {number} learning_rate - Alpha (0-1)
   * @param {number} discount - Gamma (0-1)
   * @param {number} next_max - Max Q-value of next state
   * @returns {number} Updated Q-value
   */
  reinforcementUpdate(current_value, reward, learning_rate = 0.1, discount = 0.9, next_max = 0) {
    return current_value + learning_rate * (reward + discount * next_max - current_value);
  },

  /**
   * Hebbian learning: "Neurons that fire together wire together"
   * @param {number} weight - Current connection weight
   * @param {number} pre_activation - Pre-synaptic activity
   * @param {number} post_activation - Post-synaptic activity
   * @param {number} rate - Learning rate
   * @returns {number} Updated weight
   */
  hebbianUpdate(weight, pre_activation, post_activation, rate = 0.01) {
    return weight + rate * pre_activation * post_activation;
  },

  /**
   * Bayesian belief update
   * @param {number} prior - Prior probability P(H)
   * @param {number} likelihood - P(E|H) - probability of evidence given hypothesis
   * @param {number} evidence_prob - P(E) - total probability of evidence
   * @returns {number} Posterior probability P(H|E)
   */
  bayesianUpdate(prior, likelihood, evidence_prob) {
    if (evidence_prob === 0) return prior;
    return (likelihood * prior) / evidence_prob;
  },

  /**
   * Exponential moving average (for online learning)
   * @param {number} current_estimate - Current running estimate
   * @param {number} new_observation - New data point
   * @param {number} alpha - Smoothing factor (0-1, higher = more weight on new)
   * @returns {number} Updated estimate
   */
  exponentialMovingAverage(current_estimate, new_observation, alpha = 0.1) {
    return alpha * new_observation + (1 - alpha) * current_estimate;
  },

  /**
   * Spaced repetition scheduler (SM-2 algorithm simplified)
   * @param {number} ease_factor - Current ease (>= 1.3)
   * @param {number} interval - Current interval in days
   * @param {number} quality - Response quality (0-5)
   * @returns {Object} Next review schedule
   */
  spacedRepetition(ease_factor, interval, quality) {
    let new_ease = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    new_ease = Math.max(1.3, new_ease);
    
    let new_interval;
    if (quality < 3) {
      new_interval = 1; // Reset
    } else if (interval === 0) {
      new_interval = 1;
    } else if (interval === 1) {
      new_interval = 6;
    } else {
      new_interval = Math.round(interval * new_ease);
    }
    
    return {
      ease_factor: new_ease,
      interval: new_interval,
      next_review_days: new_interval
    };
  }
};

// ============================================================
// 4. ATTENTION ALGORITHMS
// ============================================================

const Attention = {
  /**
   * Saliency map: Compute attention weights for a set of items
   * @param {Array} items - [{content, novelty, relevance, urgency}]
   * @param {Object} weights - {novelty: w1, relevance: w2, urgency: w3}
   * @returns {Array} Items sorted by saliency with attention weights
   */
  saliencyMap(items, weights = { novelty: 0.3, relevance: 0.4, urgency: 0.3 }) {
    const scored = items.map(item => {
      const saliency =
        (item.novelty ?? 0.5) * weights.novelty +
        (item.relevance ?? 0.5) * weights.relevance +
        (item.urgency ?? 0.5) * weights.urgency;
      return { ...item, saliency };
    });
    scored.sort((a, b) => b.saliency - a.saliency);
    
    // Normalize to attention weights (softmax-like)
    const total = scored.reduce((sum, item) => sum + Math.exp(item.saliency * 3), 0);
    scored.forEach(item => {
      item.attention_weight = Math.exp(item.saliency * 3) / total;
    });
    
    return scored;
  },

  /**
   * Novelty detection: How different is this from what we've seen?
   * @param {*} item - New item
   * @param {Array} history - Previously seen items
   * @param {Function} distance_fn - Distance function (optional)
   * @returns {number} Novelty score 0-1
   */
  noveltyScore(item, history, distance_fn = null) {
    if (history.length === 0) return 1.0; // Everything is novel at first
    
    if (!distance_fn) {
      // Default: string/number comparison
      distance_fn = (a, b) => {
        if (typeof a === 'number' && typeof b === 'number') {
          return Math.abs(a - b) / (Math.max(Math.abs(a), Math.abs(b)) || 1);
        }
        return a === b ? 0 : 1;
      };
    }
    
    const distances = history.map(h => distance_fn(item, h));
    const min_distance = Math.min(...distances);
    const avg_distance = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    return Math.min(1.0, (min_distance + avg_distance) / 2);
  },

  /**
   * Change detection: Has something significantly changed?
   * @param {Array} series - Time series of values
   * @param {number} sensitivity - How sensitive to changes (0-1)
   * @returns {Object} Change detection result
   */
  changeDetection(series, sensitivity = 0.5) {
    if (series.length < 3) return { changed: false, magnitude: 0 };
    
    const recent = series.slice(-3);
    const baseline = series.slice(0, -3);
    
    if (baseline.length === 0) return { changed: false, magnitude: 0 };
    
    const baseline_mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const baseline_std = Math.sqrt(
      baseline.reduce((sum, v) => sum + (v - baseline_mean) ** 2, 0) / baseline.length
    ) || 1;
    
    const recent_mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const z_score = Math.abs(recent_mean - baseline_mean) / baseline_std;
    const threshold = 2 * (1 - sensitivity); // Higher sensitivity = lower threshold
    
    return {
      changed: z_score > threshold,
      magnitude: z_score,
      direction: recent_mean > baseline_mean ? 'increase' : 'decrease',
      baseline_mean,
      recent_mean
    };
  },

  /**
   * Inhibition of return: Reduce attention to recently attended items
   * @param {Array} items - Current attention candidates
   * @param {Array} recently_attended - Items attended in recent cycles
   * @param {number} inhibition_strength - How much to suppress (0-1)
   * @returns {Array} Items with adjusted attention weights
   */
  inhibitionOfReturn(items, recently_attended, inhibition_strength = 0.5) {
    const recent_set = new Set(recently_attended.map(r => JSON.stringify(r)));
    return items.map(item => {
      const was_recent = recent_set.has(JSON.stringify(item.content || item));
      const modifier = was_recent ? (1 - inhibition_strength) : 1.0;
      return { ...item, attention_weight: (item.attention_weight ?? 0.5) * modifier };
    });
  }
};

// ============================================================
// 5. PATTERN RECOGNITION
// ============================================================

const Pattern = {
  /**
   * Sequence pattern detection
   * @param {Array} sequence - Input sequence
   * @returns {Object} Detected patterns
   */
  detectSequence(sequence) {
    const patterns = [];
    
    // Check for arithmetic progression
    if (sequence.length >= 3 && sequence.every(v => typeof v === 'number')) {
      const diffs = [];
      for (let i = 1; i < sequence.length; i++) {
        diffs.push(sequence[i] - sequence[i - 1]);
      }
      const avg_diff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const diff_variance = diffs.reduce((sum, d) => sum + (d - avg_diff) ** 2, 0) / diffs.length;
      
      if (diff_variance < 0.01 * avg_diff ** 2) {
        patterns.push({ type: 'arithmetic', step: avg_diff, confidence: 0.9 });
      }
      
      // Check for geometric progression
      if (sequence.every(v => v > 0)) {
        const ratios = [];
        for (let i = 1; i < sequence.length; i++) {
          ratios.push(sequence[i] / sequence[i - 1]);
        }
        const avg_ratio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const ratio_variance = ratios.reduce((sum, r) => sum + (r - avg_ratio) ** 2, 0) / ratios.length;
        
        if (ratio_variance < 0.01 * avg_ratio ** 2) {
          patterns.push({ type: 'geometric', ratio: avg_ratio, confidence: 0.85 });
        }
      }
    }
    
    // Check for repetition
    for (let period = 1; period <= Math.floor(sequence.length / 2); period++) {
      let matches = 0;
      let total = 0;
      for (let i = period; i < sequence.length; i++) {
        total++;
        if (sequence[i] === sequence[i - period]) matches++;
      }
      if (total > 0 && matches / total > 0.8) {
        patterns.push({ type: 'periodic', period, confidence: matches / total });
      }
    }
    
    return {
      sequence_length: sequence.length,
      patterns,
      has_pattern: patterns.length > 0,
      best_pattern: patterns.sort((a, b) => b.confidence - a.confidence)[0] || null
    };
  },

  /**
   * Anomaly detection (z-score based)
   * @param {number} value - Value to check
   * @param {Array} reference - Reference distribution
   * @param {number} threshold - Z-score threshold for anomaly
   * @returns {Object} Anomaly assessment
   */
  detectAnomaly(value, reference, threshold = 2.0) {
    if (reference.length === 0) return { is_anomaly: false, z_score: 0 };
    
    const mean = reference.reduce((a, b) => a + b, 0) / reference.length;
    const std = Math.sqrt(
      reference.reduce((sum, v) => sum + (v - mean) ** 2, 0) / reference.length
    ) || 1;
    
    const z_score = Math.abs(value - mean) / std;
    
    return {
      is_anomaly: z_score > threshold,
      z_score,
      direction: value > mean ? 'above' : 'below',
      severity: z_score > 3 ? 'extreme' : z_score > 2 ? 'moderate' : 'mild',
      percentile: 0.5 * (1 + erf((value - mean) / (std * Math.sqrt(2))))
    };
  },

  /**
   * Similarity scoring between two items
   * @param {*} a - First item
   * @param {*} b - Second item
   * @returns {number} Similarity score 0-1
   */
  similarity(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      const max_val = Math.max(Math.abs(a), Math.abs(b)) || 1;
      return 1 - Math.abs(a - b) / max_val;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      // Jaccard similarity on character n-grams
      const ngrams = (s, n = 2) => {
        const grams = new Set();
        for (let i = 0; i <= s.length - n; i++) grams.add(s.slice(i, i + n));
        return grams;
      };
      const ga = ngrams(a);
      const gb = ngrams(b);
      const intersection = new Set([...ga].filter(x => gb.has(x)));
      const union = new Set([...ga, ...gb]);
      return union.size > 0 ? intersection.size / union.size : 0;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      // Cosine similarity for numeric arrays
      if (a.length !== b.length) return 0;
      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] ** 2;
        magB += b[i] ** 2;
      }
      const denom = Math.sqrt(magA) * Math.sqrt(magB);
      return denom > 0 ? dot / denom : 0;
    }
    return a === b ? 1 : 0;
  }
};

// ============================================================
// 6. PROBABILITY & STATISTICS
// ============================================================

const Probability = {
  /** Softmax: Convert scores to probabilities */
  softmax(scores, temperature = 1.0) {
    const max_score = Math.max(...scores);
    const exp_scores = scores.map(s => Math.exp((s - max_score) / temperature));
    const sum = exp_scores.reduce((a, b) => a + b, 0);
    return exp_scores.map(e => e / sum);
  },

  /** Entropy: Measure of uncertainty in a distribution */
  entropy(probabilities) {
    return -probabilities.reduce((sum, p) => {
      if (p <= 0) return sum;
      return sum + p * Math.log2(p);
    }, 0);
  },

  /** KL Divergence between two distributions */
  klDivergence(p, q) {
    let kl = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        kl += p[i] * Math.log(p[i] / q[i]);
      }
    }
    return kl;
  },

  /** Confidence interval for a proportion */
  confidenceInterval(successes, total, z = 1.96) {
    const p = successes / total;
    const margin = z * Math.sqrt(p * (1 - p) / total);
    return { lower: Math.max(0, p - margin), upper: Math.min(1, p + margin), point: p };
  },

  /** Weighted random choice */
  weightedChoice(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
};

// Helper
function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  Reasoning,
  Decision,
  Learning,
  Attention,
  Pattern,
  Probability
};
