/**
 * Dual Process Engine - Inspired by Kahneman's System 1 & System 2
 * 
 * System 1 (Fast/Intuitive): Pattern matching, heuristics, cached responses
 *   Brain analogy: Amygdala + Basal Ganglia + cached cortical patterns
 * 
 * System 2 (Slow/Deliberate): Deep reasoning, logical inference, planning
 *   Brain analogy: Prefrontal cortex + working memory intensive
 * 
 * The engine dynamically routes between systems based on:
 * - Uncertainty level
 * - Novelty of the situation
 * - Available cognitive resources (time/energy budget)
 * - Conflict detection (anterior cingulate cortex analog)
 */

class System1 {
  constructor(memorySystem) {
    this.memory = memorySystem;
    this.heuristics = new Map(); // name -> function
    this.patternCache = new Map(); // pattern -> response
    this.maxLatency = 500; // ms - must be fast
    this.stats = { calls: 0, hits: 0, misses: 0 };
  }

  /**
   * Register a heuristic rule (like a learned reflex)
   */
  registerHeuristic(name, fn) {
    this.heuristics.set(name, fn);
  }

  /**
   * Intuit: Fast pattern-matching judgment
   * Returns { judgment, confidence, latency }
   */
  async intuit(query, options = {}) {
    const start = Date.now();
    this.stats.calls += 1;

    // 1. Check pattern cache first (fastest path)
    const cacheKey = this._hashQuery(query);
    if (this.patternCache.has(cacheKey)) {
      this.stats.hits += 1;
      const cached = this.patternCache.get(cacheKey);
      return {
        judgment: cached.response,
        confidence: cached.confidence * 0.95, // slight decay for cached
        latency: Date.now() - start,
        source: "cache",
        system: 1
      };
    }

    // 2. Try heuristic rules
    const heuristicName = options.using || null;
    if (heuristicName && this.heuristics.has(heuristicName)) {
      const fn = this.heuristics.get(heuristicName);
      try {
        const result = await Promise.race([
          fn(query),
          this._timeout(this.maxLatency)
        ]);
        if (result) {
          this._cachePattern(cacheKey, result);
          return {
            judgment: result.value,
            confidence: result.confidence || 0.6,
            latency: Date.now() - start,
            source: `heuristic:${heuristicName}`,
            system: 1
          };
        }
      } catch (e) {
        // Heuristic failed or timed out
      }
    }

    // 3. Try procedural memory (learned skills)
    const memories = this.memory.recall(query, { type: "procedural", limit: 1 });
    if (memories.length > 0) {
      this.stats.hits += 1;
      return {
        judgment: memories[0].content,
        confidence: memories[0].strength * memories[0].relevance,
        latency: Date.now() - start,
        source: "procedural_memory",
        system: 1
      };
    }

    // 4. No fast answer available
    this.stats.misses += 1;
    return {
      judgment: null,
      confidence: 0,
      latency: Date.now() - start,
      source: "none",
      system: 1
    };
  }

  _hashQuery(query) {
    const str = typeof query === "string" ? query : JSON.stringify(query);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `h_${hash}`;
  }

  _cachePattern(key, result) {
    this.patternCache.set(key, {
      response: result.value || result,
      confidence: result.confidence || 0.6,
      cachedAt: Date.now()
    });
    // Bound cache size
    if (this.patternCache.size > 1000) {
      const firstKey = this.patternCache.keys().next().value;
      this.patternCache.delete(firstKey);
    }
  }

  _timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("System1 timeout")), ms)
    );
  }
}

class System2 {
  constructor(memorySystem, options = {}) {
    this.memory = memorySystem;
    this.maxDepth = options.maxDepth || 10;
    this.maxBreadth = options.maxBreadth || 5;
    this.timeout = options.timeout || 30000; // 30s default
    this.reasoningStrategies = new Map();
    this.stats = { calls: 0, completed: 0, timeouts: 0 };

    // Register built-in reasoning strategies
    this._registerBuiltinStrategies();
  }

  /**
   * Reason: Deep deliberate reasoning
   * Returns { conclusion, confidence, chain, latency }
   */
  async reason(query, options = {}) {
    const start = Date.now();
    this.stats.calls += 1;

    const strategy = options.strategy || "deductive";
    const depth = Math.min(options.depth || 5, this.maxDepth);
    const breadth = Math.min(options.breadth || 3, this.maxBreadth);
    const timeout = options.timeout_ms || this.timeout;

    const strategyFn = this.reasoningStrategies.get(strategy);
    if (!strategyFn) {
      return {
        conclusion: null,
        confidence: 0,
        chain: [],
        error: `Unknown strategy: ${strategy}`,
        latency: Date.now() - start,
        system: 2
      };
    }

    try {
      const result = await Promise.race([
        strategyFn(query, { depth, breadth }),
        this._timeout(timeout)
      ]);

      this.stats.completed += 1;
      return {
        conclusion: result.conclusion,
        confidence: result.confidence,
        chain: result.chain || [],
        latency: Date.now() - start,
        source: `strategy:${strategy}`,
        system: 2
      };
    } catch (e) {
      this.stats.timeouts += 1;
      return {
        conclusion: null,
        confidence: 0,
        chain: [],
        error: e.message,
        latency: Date.now() - start,
        system: 2
      };
    }
  }

  /**
   * Register a custom reasoning strategy
   */
  registerStrategy(name, fn) {
    this.reasoningStrategies.set(name, fn);
  }

  _registerBuiltinStrategies() {
    // Deductive: From general rules to specific conclusions
    this.reasoningStrategies.set("deductive", async (query, opts) => {
      const chain = [];
      let current = query;
      let confidence = 1.0;

      for (let step = 0; step < opts.depth; step++) {
        const premises = this.memory.recall(current, { type: "semantic", limit: opts.breadth });
        if (premises.length === 0) break;

        const bestPremise = premises[0];
        chain.push({
          step: step + 1,
          premise: bestPremise.content,
          relevance: bestPremise.relevance,
          strength: bestPremise.strength
        });

        confidence *= bestPremise.relevance * bestPremise.strength;
        current = bestPremise.content;
      }

      return {
        conclusion: chain.length > 0 ? chain[chain.length - 1].premise : null,
        confidence: Math.max(0, confidence),
        chain
      };
    });

    // Inductive: From specific observations to general rules
    this.reasoningStrategies.set("inductive", async (query, opts) => {
      const observations = this.memory.recall(query, { type: "episodic", limit: opts.breadth * 2 });
      const chain = observations.map((obs, i) => ({
        step: i + 1,
        observation: obs.content,
        relevance: obs.relevance
      }));

      // Synthesize a general rule from observations
      const avgRelevance = observations.reduce((sum, o) => sum + o.relevance, 0) / Math.max(observations.length, 1);

      return {
        conclusion: observations.length > 0
          ? { generalization: `Pattern from ${observations.length} observations`, observations: observations.map(o => o.content) }
          : null,
        confidence: avgRelevance * Math.min(1, observations.length / opts.breadth),
        chain
      };
    });

    // Abductive: Inference to the best explanation
    this.reasoningStrategies.set("abductive", async (query, opts) => {
      const hypotheses = [];
      const evidence = this.memory.recall(query, { limit: opts.breadth * 2 });

      for (let i = 0; i < Math.min(opts.breadth, 3); i++) {
        const hypothesis = {
          id: i + 1,
          explanation: evidence[i] ? evidence[i].content : null,
          supportingEvidence: evidence.slice(0, i + 2).map(e => e.content),
          plausibility: evidence[i] ? evidence[i].relevance * evidence[i].strength : 0
        };
        hypotheses.push(hypothesis);
      }

      hypotheses.sort((a, b) => b.plausibility - a.plausibility);

      return {
        conclusion: hypotheses[0] || null,
        confidence: hypotheses[0] ? hypotheses[0].plausibility : 0,
        chain: hypotheses.map((h, i) => ({ step: i + 1, hypothesis: h }))
      };
    });

    // Analogical: Reasoning by similarity
    this.reasoningStrategies.set("analogical", async (query, opts) => {
      const similar = this.memory.recall(query, { limit: opts.breadth });
      const chain = similar.map((s, i) => ({
        step: i + 1,
        analog: s.content,
        similarity: s.relevance
      }));

      const bestAnalog = similar[0];
      return {
        conclusion: bestAnalog ? { byAnalogy: bestAnalog.content, similarity: bestAnalog.relevance } : null,
        confidence: bestAnalog ? bestAnalog.relevance * 0.8 : 0, // analogy is inherently less certain
        chain
      };
    });

    // Hybrid: Combine multiple strategies
    this.reasoningStrategies.set("hybrid", async (query, opts) => {
      const results = await Promise.all([
        this.reasoningStrategies.get("deductive")(query, { depth: Math.ceil(opts.depth / 2), breadth: opts.breadth }),
        this.reasoningStrategies.get("abductive")(query, { depth: opts.depth, breadth: opts.breadth })
      ]);

      const best = results.sort((a, b) => b.confidence - a.confidence)[0];
      return {
        conclusion: best.conclusion,
        confidence: best.confidence,
        chain: [
          { step: 1, method: "deductive", confidence: results[0].confidence },
          { step: 2, method: "abductive", confidence: results[1].confidence },
          { step: 3, selected: best === results[0] ? "deductive" : "abductive" }
        ]
      };
    });
  }

  _timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("System2 timeout")), ms)
    );
  }
}

/**
 * Conflict Monitor - Anterior Cingulate Cortex analog
 * Detects when System 1 and System 2 disagree, or when uncertainty is high
 */
class ConflictMonitor {
  constructor(options = {}) {
    this.uncertaintyThreshold = options.threshold || 0.3;
    this.conflictLog = [];
  }

  /**
   * Evaluate whether to escalate from System 1 to System 2
   */
  shouldEscalate(system1Result) {
    if (!system1Result.judgment) return true;
    if (system1Result.confidence < this.uncertaintyThreshold) return true;
    return false;
  }

  /**
   * Detect conflict between two judgments
   */
  detectConflict(result1, result2) {
    if (!result1.judgment || !result2.conclusion) return null;

    const str1 = JSON.stringify(result1.judgment);
    const str2 = JSON.stringify(result2.conclusion);

    const conflict = str1 !== str2;
    const entry = {
      timestamp: Date.now(),
      system1: { judgment: result1.judgment, confidence: result1.confidence },
      system2: { conclusion: result2.conclusion, confidence: result2.confidence },
      conflictDetected: conflict,
      resolution: conflict
        ? (result2.confidence > result1.confidence ? "system2_wins" : "system1_wins")
        : "agreement"
    };

    this.conflictLog.push(entry);
    return entry;
  }
}

/**
 * DualProcessEngine - Orchestrates System 1 and System 2
 */
class DualProcessEngine {
  constructor(memorySystem, options = {}) {
    this.system1 = new System1(memorySystem);
    this.system2 = new System2(memorySystem, options);
    this.conflictMonitor = new ConflictMonitor(options);
    this.executionLog = [];
  }

  /**
   * Think: The main entry point for cognitive processing
   * Automatically routes between System 1 and System 2
   */
  async think(query, options = {}) {
    const start = Date.now();

    // Step 1: Always try System 1 first (fast path)
    const intuition = await this.system1.intuit(query, options);

    // Step 2: Check if we need System 2
    const needsDeepThinking = this.conflictMonitor.shouldEscalate(intuition);

    let reasoning = null;
    let finalResult;

    if (needsDeepThinking || options.forceSystem2) {
      // Step 3: Engage System 2
      reasoning = await this.system2.reason(query, options);

      // Step 4: Conflict detection
      if (intuition.judgment && reasoning.conclusion) {
        const conflict = this.conflictMonitor.detectConflict(intuition, reasoning);
        finalResult = {
          answer: conflict.resolution === "system2_wins" ? reasoning.conclusion : intuition.judgment,
          confidence: Math.max(intuition.confidence, reasoning.confidence),
          system: conflict.resolution === "system2_wins" ? 2 : 1,
          conflict: conflict.conflictDetected,
          resolution: conflict.resolution
        };
      } else {
        finalResult = {
          answer: reasoning.conclusion || intuition.judgment,
          confidence: reasoning.confidence || intuition.confidence,
          system: reasoning.conclusion ? 2 : 1,
          conflict: false,
          resolution: "single_system"
        };
      }
    } else {
      // System 1 was confident enough
      finalResult = {
        answer: intuition.judgment,
        confidence: intuition.confidence,
        system: 1,
        conflict: false,
        resolution: "system1_sufficient"
      };
    }

    finalResult.latency = Date.now() - start;
    finalResult.details = { intuition, reasoning };

    this.executionLog.push({
      query,
      timestamp: start,
      ...finalResult
    });

    return finalResult;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      system1: this.system1.stats,
      system2: this.system2.stats,
      conflicts: this.conflictMonitor.conflictLog.length,
      totalThoughts: this.executionLog.length
    };
  }
}

module.exports = { DualProcessEngine, System1, System2, ConflictMonitor };
