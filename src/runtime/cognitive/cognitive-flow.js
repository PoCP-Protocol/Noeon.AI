/**
 * Cognitive Flow Control - Brain-inspired control structures
 * 
 * Traditional programming has: if/else, for/while, try/catch
 * Noeon has cognitive equivalents that mirror how the brain actually works:
 * 
 * Brain Process              | Noeon Construct       | Traditional Equivalent
 * --------------------------|-----------------------|----------------------
 * Conditional attention     | WHEN_SALIENT          | if/else
 * Rumination/obsession      | RUMINATE              | while loop
 * Parallel perception       | PERCEIVE_ALL          | Promise.all
 * Competitive inhibition    | COMPETE               | race condition
 * Habit formation           | HABITUATE             | memoization
 * Surprise response         | ON_SURPRISE           | exception handling
 * Dream/offline processing  | DREAM                 | background job
 * Attention switching       | SWITCH_FOCUS          | context switch
 * Inhibition                | INHIBIT               | break/return
 * Priming                   | PRIME                 | pre-loading
 */

class CognitiveFlow {
  constructor(engine, config = {}) {
    this.engine = engine;
    this.activeFlows = new Map();
    this.habits = new Map(); // Cached fast-path responses
    this.primes = new Map(); // Pre-activated concepts
    this.inhibitions = new Set(); // Currently inhibited pathways
    this.dreamQueue = []; // Offline processing queue
    this.surpriseHandlers = []; // Handlers for unexpected events
    this.stats = {
      flowsExecuted: 0,
      habitsUsed: 0,
      surprisesHandled: 0,
      dreamsProcessed: 0,
      inhibitionsApplied: 0
    };
  }

  /**
   * WHEN_SALIENT: Conditional execution based on salience (attention-weighted if)
   * Unlike traditional if/else, this considers relevance, urgency, and emotional weight
   */
  async whenSalient(conditions, options = {}) {
    const results = [];

    for (const condition of conditions) {
      const salience = this._computeSalience(condition);

      if (salience >= (condition.threshold || 0.5)) {
        const result = await this._executeBlock(condition.then, {
          salience,
          condition: condition.check
        });
        results.push({
          condition: condition.check,
          salience,
          executed: true,
          result
        });

        // If exclusive mode, stop at first salient match
        if (options.exclusive) break;
      } else {
        results.push({
          condition: condition.check,
          salience,
          executed: false,
          reason: "below_threshold"
        });
      }
    }

    // If nothing was salient enough and there's a default
    if (results.every(r => !r.executed) && options.default) {
      const defaultResult = await this._executeBlock(options.default, { salience: 0, condition: "default" });
      results.push({ condition: "default", salience: 0, executed: true, result: defaultResult });
    }

    this.stats.flowsExecuted++;
    return { type: "when_salient", results };
  }

  /**
   * RUMINATE: Iterative thinking loop (brain's rumination/obsessive loop)
   * Continues until confidence threshold is met or max iterations reached
   * Unlike while loops, it accumulates insights across iterations
   */
  async ruminate(topic, options = {}) {
    const maxIterations = options.maxIterations || 10;
    const confidenceTarget = options.confidenceTarget || 0.85;
    const decayPerIteration = options.decay || 0.05;

    let currentConfidence = 0;
    let iteration = 0;
    const insights = [];
    let lastThought = null;

    while (iteration < maxIterations && currentConfidence < confidenceTarget) {
      iteration++;

      // Each iteration builds on previous thoughts
      const context = {
        topic,
        iteration,
        previousInsights: insights,
        lastThought,
        targetConfidence: confidenceTarget
      };

      const thought = await this.engine.think(topic, context);

      // Accumulate confidence (diminishing returns)
      const confidenceGain = (thought.confidence || 0.3) * Math.pow(1 - decayPerIteration, iteration);
      currentConfidence = Math.min(1.0, currentConfidence + confidenceGain * 0.3);

      insights.push({
        iteration,
        thought: thought.answer || thought.conclusion,
        confidence: thought.confidence,
        cumulativeConfidence: currentConfidence
      });

      lastThought = thought;

      // Check for circular thinking (rumination trap)
      if (iteration > 3 && this._isCircular(insights)) {
        break;
      }
    }

    this.stats.flowsExecuted++;
    return {
      type: "ruminate",
      topic,
      iterations: iteration,
      finalConfidence: currentConfidence,
      reachedTarget: currentConfidence >= confidenceTarget,
      insights,
      circular: this._isCircular(insights)
    };
  }

  /**
   * PERCEIVE_ALL: Parallel perception (brain processes multiple senses simultaneously)
   * All channels are processed concurrently, results merged in workspace
   */
  async perceiveAll(channels, options = {}) {
    const timeout = options.timeout || 5000;
    const mergeStrategy = options.merge || "weighted"; // weighted | first | all

    const promises = channels.map(async (channel) => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          this._processChannel(channel),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout))
        ]);
        return {
          channel: channel.name,
          modality: channel.modality,
          success: true,
          result,
          latency: Date.now() - start
        };
      } catch (error) {
        return {
          channel: channel.name,
          modality: channel.modality,
          success: false,
          error: error.message,
          latency: Date.now() - start
        };
      }
    });

    const results = await Promise.all(promises);
    const merged = this._mergePerceptions(results, mergeStrategy);

    this.stats.flowsExecuted++;
    return {
      type: "perceive_all",
      channels: results,
      merged,
      successRate: results.filter(r => r.success).length / results.length
    };
  }

  /**
   * COMPETE: Competitive inhibition (multiple ideas compete, winner takes all)
   * Like neural competition in the brain where only the strongest signal survives
   */
  async compete(candidates, options = {}) {
    const timeout = options.timeout || 3000;
    const strategy = options.strategy || "fastest"; // fastest | strongest | consensus

    if (strategy === "fastest") {
      // First to complete wins
      const result = await Promise.race(
        candidates.map(async (candidate) => {
          const thought = await this.engine.think(candidate.query || candidate.description);
          return { candidate: candidate.name, thought, timestamp: Date.now() };
        })
      );
      this.stats.flowsExecuted++;
      return { type: "compete", strategy, winner: result };
    }

    if (strategy === "strongest") {
      // All compete, highest confidence wins
      const results = await Promise.all(
        candidates.map(async (candidate) => {
          const thought = await this.engine.think(candidate.query || candidate.description);
          return { candidate: candidate.name, thought, confidence: thought.confidence || 0 };
        })
      );
      results.sort((a, b) => b.confidence - a.confidence);
      this.stats.flowsExecuted++;
      return { type: "compete", strategy, winner: results[0], losers: results.slice(1) };
    }

    // consensus: all must agree
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        const thought = await this.engine.think(candidate.query || candidate.description);
        return { candidate: candidate.name, thought };
      })
    );
    const allAgree = results.every(r => (r.thought.confidence || 0) > 0.5);
    this.stats.flowsExecuted++;
    return { type: "compete", strategy, consensus: allAgree, results };
  }

  /**
   * HABITUATE: Cache frequently-used thought patterns (habit formation)
   * Once a pattern is habituated, it bypasses deep thinking (System 1 fast path)
   */
  habituate(pattern, response, options = {}) {
    const ttl = options.ttl || 3600000; // 1 hour default
    const maxUses = options.maxUses || Infinity;

    this.habits.set(pattern, {
      response,
      createdAt: Date.now(),
      ttl,
      maxUses,
      uses: 0,
      lastUsed: null
    });

    return { pattern, habituated: true, ttl };
  }

  /**
   * Check if a habituated response exists (fast path)
   */
  getHabit(pattern) {
    const habit = this.habits.get(pattern);
    if (!habit) return null;

    // Check expiry
    if (Date.now() - habit.createdAt > habit.ttl) {
      this.habits.delete(pattern);
      return null;
    }

    // Check max uses
    if (habit.uses >= habit.maxUses) {
      this.habits.delete(pattern);
      return null;
    }

    habit.uses++;
    habit.lastUsed = Date.now();
    this.stats.habitsUsed++;
    return habit.response;
  }

  /**
   * ON_SURPRISE: Register handler for unexpected events
   * Brain's orienting response — when prediction error is high
   */
  onSurprise(handler, options = {}) {
    this.surpriseHandlers.push({
      handler,
      threshold: options.threshold || 0.7, // Prediction error threshold
      priority: options.priority || "normal",
      once: options.once || false,
      id: `surprise_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    });
  }

  /**
   * Trigger surprise handlers when prediction error exceeds threshold
   */
  async triggerSurprise(predictionError, context = {}) {
    const triggered = [];

    for (let i = this.surpriseHandlers.length - 1; i >= 0; i--) {
      const entry = this.surpriseHandlers[i];
      if (predictionError >= entry.threshold) {
        const result = await entry.handler(predictionError, context);
        triggered.push({ id: entry.id, result });

        if (entry.once) {
          this.surpriseHandlers.splice(i, 1);
        }
      }
    }

    this.stats.surprisesHandled += triggered.length;
    return { predictionError, triggered };
  }

  /**
   * DREAM: Queue offline processing (background consolidation)
   * Like the brain's dream state — reorganize and consolidate without real-time pressure
   */
  dream(task, options = {}) {
    const dreamTask = {
      id: `dream_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      task,
      priority: options.priority || "low",
      scheduledFor: options.delay ? Date.now() + options.delay : Date.now(),
      status: "queued",
      result: null,
      createdAt: Date.now()
    };

    this.dreamQueue.push(dreamTask);
    this.dreamQueue.sort((a, b) => a.scheduledFor - b.scheduledFor);

    return dreamTask;
  }

  /**
   * Process pending dreams (called during idle time)
   */
  async processDreams(maxCount = 5) {
    const now = Date.now();
    const ready = this.dreamQueue.filter(d => d.status === "queued" && d.scheduledFor <= now);
    const toProcess = ready.slice(0, maxCount);

    const results = [];
    for (const dream of toProcess) {
      dream.status = "processing";
      try {
        const result = await this._executeBlock(dream.task, { mode: "dream" });
        dream.result = result;
        dream.status = "completed";
        results.push({ id: dream.id, result });
      } catch (e) {
        dream.status = "failed";
        dream.result = { error: e.message };
        results.push({ id: dream.id, error: e.message });
      }
    }

    // Clean completed dreams older than 1 hour
    this.dreamQueue = this.dreamQueue.filter(d =>
      d.status !== "completed" || (Date.now() - d.createdAt < 3600000)
    );

    this.stats.dreamsProcessed += results.length;
    return { processed: results.length, results, remaining: this.dreamQueue.filter(d => d.status === "queued").length };
  }

  /**
   * PRIME: Pre-activate concepts to speed up future processing
   * Like semantic priming in the brain — "doctor" primes "nurse"
   */
  prime(concept, associations = [], options = {}) {
    const ttl = options.ttl || 30000; // 30 seconds default
    const strength = options.strength || 0.7;

    this.primes.set(concept, {
      associations,
      strength,
      createdAt: Date.now(),
      ttl,
      activations: 0
    });

    // Also prime associations with reduced strength
    for (const assoc of associations) {
      if (!this.primes.has(assoc)) {
        this.primes.set(assoc, {
          associations: [concept],
          strength: strength * 0.5,
          createdAt: Date.now(),
          ttl,
          activations: 0
        });
      }
    }

    return { concept, associations, strength, ttl };
  }

  /**
   * Check if a concept is primed (returns boost factor)
   */
  getPriming(concept) {
    const prime = this.primes.get(concept);
    if (!prime) return 0;

    if (Date.now() - prime.createdAt > prime.ttl) {
      this.primes.delete(concept);
      return 0;
    }

    prime.activations++;
    return prime.strength * Math.exp(-prime.activations * 0.1); // Decays with use
  }

  /**
   * INHIBIT: Suppress a cognitive pathway
   */
  inhibit(pathway, duration = 5000) {
    this.inhibitions.add(pathway);
    this.stats.inhibitionsApplied++;

    setTimeout(() => {
      this.inhibitions.delete(pathway);
    }, duration);

    return { pathway, inhibited: true, duration };
  }

  /**
   * Check if a pathway is inhibited
   */
  isInhibited(pathway) {
    return this.inhibitions.has(pathway);
  }

  /**
   * SWITCH_FOCUS: Rapid attention switching between tasks
   */
  async switchFocus(tasks, options = {}) {
    const timeSlice = options.timeSlice || 100; // ms per task
    const maxCycles = options.maxCycles || 5;
    const results = new Map();

    for (let cycle = 0; cycle < maxCycles; cycle++) {
      for (const task of tasks) {
        if (results.get(task.name)?.complete) continue;

        const thought = await this.engine.think(task.query, {
          timeLimit: timeSlice,
          cycle,
          previousResult: results.get(task.name)?.lastResult
        });

        const entry = results.get(task.name) || { name: task.name, iterations: 0, lastResult: null, complete: false };
        entry.iterations++;
        entry.lastResult = thought;
        entry.complete = (thought.confidence || 0) > (task.threshold || 0.7);
        results.set(task.name, entry);
      }

      // Check if all tasks complete
      if (Array.from(results.values()).every(r => r.complete)) break;
    }

    this.stats.flowsExecuted++;
    return {
      type: "switch_focus",
      tasks: Array.from(results.values()),
      allComplete: Array.from(results.values()).every(r => r.complete)
    };
  }

  /**
   * Get flow state
   */
  getState() {
    return {
      activeFlows: this.activeFlows.size,
      habits: this.habits.size,
      primes: this.primes.size,
      inhibitions: this.inhibitions.size,
      dreamQueue: this.dreamQueue.length,
      surpriseHandlers: this.surpriseHandlers.length,
      stats: this.stats
    };
  }

  // ==================== Private Methods ====================

  _computeSalience(condition) {
    let salience = 0.5;

    // Relevance boost
    if (condition.relevance) salience += condition.relevance * 0.2;

    // Urgency boost
    if (condition.urgency) salience += condition.urgency * 0.2;

    // Emotional weight
    if (condition.emotionalWeight) salience += condition.emotionalWeight * 0.1;

    // Priming boost
    if (condition.check) {
      const priming = this.getPriming(condition.check);
      salience += priming * 0.1;
    }

    // Novelty boost (new things are more salient)
    if (condition.novelty) salience += condition.novelty * 0.15;

    return Math.min(1.0, Math.max(0, salience));
  }

  async _executeBlock(block, context) {
    if (typeof block === "function") {
      return await block(context);
    }
    if (typeof block === "string") {
      return await this.engine.think(block, context);
    }
    return block;
  }

  async _processChannel(channel) {
    // Simulate perception from different modalities
    return await this.engine.think(channel.query || channel.name, {
      modality: channel.modality,
      source: channel.source
    });
  }

  _mergePerceptions(results, strategy) {
    const successful = results.filter(r => r.success);
    if (successful.length === 0) return { merged: null, strategy };

    if (strategy === "first") {
      return { merged: successful[0].result, strategy };
    }

    if (strategy === "weighted") {
      // Weight by inverse latency (faster = more weight)
      const totalInvLatency = successful.reduce((sum, r) => sum + 1 / (r.latency + 1), 0);
      const weighted = successful.map(r => ({
        ...r,
        weight: (1 / (r.latency + 1)) / totalInvLatency
      }));
      return { merged: weighted, strategy, dominantChannel: weighted[0]?.channel };
    }

    // "all" strategy
    return { merged: successful.map(r => r.result), strategy };
  }

  _isCircular(insights) {
    if (insights.length < 4) return false;

    // Check if confidence is stagnating
    const recent = insights.slice(-4);
    const confidences = recent.map(i => i.cumulativeConfidence);
    const range = Math.max(...confidences) - Math.min(...confidences);
    return range < 0.02; // Less than 2% change over 4 iterations = circular
  }
}

module.exports = { CognitiveFlow };
