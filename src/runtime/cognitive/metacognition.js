/**
 * Metacognition Module - "Thinking about thinking"
 * 
 * Brain analogy: Anterior Cingulate Cortex (ACC) + Prefrontal Cortex (PFC)
 * 
 * Functions:
 * - Monitor: Track confidence, uncertainty, and performance
 * - Reflect: Analyze past decisions and outcomes
 * - Adapt: Modify internal rules based on reflection
 * - Regulate: Control cognitive resource allocation
 */

class MetacognitiveMonitor {
  constructor(workspace, memorySystem, dualProcess, predictiveEngine) {
    this.workspace = workspace;
    this.memory = memorySystem;
    this.dualProcess = dualProcess;
    this.predictiveEngine = predictiveEngine;

    this.metrics = {
      uncertainty: 0,
      confidence: 1.0,
      cognitiveLoad: 0,
      performanceScore: 1.0,
      errorRate: 0
    };

    this.rules = new Map(); // rule_name -> { weight, condition, action }
    this.reflectionLog = [];
    this.adaptationLog = [];
    this.alerts = [];
  }

  /**
   * Monitor: Continuously track cognitive state metrics
   */
  monitor(metric, value) {
    if (metric in this.metrics) {
      this.metrics[metric] = value;
    }

    // Check thresholds and trigger alerts
    this._checkThresholds(metric, value);

    return this.metrics;
  }

  /**
   * Assess: Get a comprehensive assessment of current cognitive state
   */
  assess() {
    const workspaceState = this.workspace ? this.workspace.snapshot() : null;
    const memoryStats = this.memory ? this.memory.stats() : null;
    const dualProcessStats = this.dualProcess ? this.dualProcess.getStats() : null;
    const predictiveState = this.predictiveEngine ? this.predictiveEngine.getModelState() : null;

    const assessment = {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      workspace: workspaceState ? {
        utilization: workspaceState.used / workspaceState.capacity,
        topItems: workspaceState.items.slice(0, 3).map(i => i.key)
      } : null,
      memory: memoryStats,
      reasoning: dualProcessStats,
      prediction: predictiveState ? {
        modelAccuracy: predictiveState.accuracy,
        activePredictions: predictiveState.activePredictions
      } : null,
      overallHealth: this._computeOverallHealth()
    };

    return assessment;
  }

  /**
   * Reflect: Deep introspection on a subject
   * Generates insights by analyzing patterns in past behavior
   */
  reflect(subject, depth = "deep") {
    const reflection = {
      id: `ref_${Date.now()}`,
      subject,
      depth,
      timestamp: Date.now(),
      insights: [],
      recommendations: []
    };

    // Gather relevant memories
    const memories = this.memory ? this.memory.recall(subject, { limit: 10 }) : [];

    // Analyze patterns
    if (memories.length > 0) {
      // Look for repeated patterns
      const patterns = this._findPatterns(memories);
      reflection.insights.push(...patterns.map(p => ({
        type: "pattern",
        description: p.description,
        frequency: p.count,
        significance: p.significance
      })));
    }

    // Analyze prediction accuracy for this subject
    if (this.predictiveEngine) {
      const modelState = this.predictiveEngine.getModelState();
      const relevantHistory = modelState.recentHistory.filter(h =>
        h.statement.toLowerCase().includes(subject.toLowerCase())
      );

      if (relevantHistory.length > 0) {
        const avgError = relevantHistory.reduce((sum, h) => sum + (h.error || 0), 0) / relevantHistory.length;
        reflection.insights.push({
          type: "prediction_accuracy",
          description: `Average prediction error for '${subject}': ${avgError.toFixed(3)}`,
          value: avgError
        });

        if (avgError > 0.5) {
          reflection.recommendations.push({
            type: "model_update",
            description: `Internal model for '${subject}' is inaccurate. Consider updating beliefs.`,
            priority: "high"
          });
        }
      }
    }

    // Analyze reasoning patterns
    if (this.dualProcess) {
      const stats = this.dualProcess.getStats();
      if (stats.system1.misses > stats.system1.hits) {
        reflection.recommendations.push({
          type: "learning",
          description: "System 1 (intuition) has low hit rate. More pattern learning needed.",
          priority: "medium"
        });
      }
    }

    // Deep reflection: recursive self-analysis
    if (depth === "recursive") {
      const metaReflection = this._reflectOnReflection(reflection);
      reflection.insights.push({
        type: "meta_insight",
        description: metaReflection
      });
    }

    this.reflectionLog.push(reflection);

    // Store reflection as episodic memory
    if (this.memory) {
      this.memory.store(reflection, "episodic", {
        tags: ["reflection", subject],
        strength: 0.7
      });
    }

    return reflection;
  }

  /**
   * Adapt: Modify internal rules based on feedback
   * Implements neuroplasticity at the rule level
   */
  adapt(ruleName, delta, signal = "reward") {
    let rule = this.rules.get(ruleName);

    if (!rule) {
      rule = { weight: 0.5, activations: 0, lastAdapted: null };
      this.rules.set(ruleName, rule);
    }

    const oldWeight = rule.weight;

    if (signal === "reward") {
      rule.weight = Math.min(1.0, rule.weight + Math.abs(delta));
    } else if (signal === "punish") {
      rule.weight = Math.max(0.0, rule.weight - Math.abs(delta));
    } else {
      rule.weight = Math.max(0.0, Math.min(1.0, rule.weight + delta));
    }

    rule.activations += 1;
    rule.lastAdapted = Date.now();

    const adaptation = {
      timestamp: Date.now(),
      rule: ruleName,
      signal,
      delta,
      oldWeight,
      newWeight: rule.weight
    };

    this.adaptationLog.push(adaptation);

    // If rule weight drops to 0, consider removing it
    if (rule.weight === 0) {
      adaptation.recommendation = "Rule weight is 0. Consider removing.";
    }

    return adaptation;
  }

  /**
   * GetRuleWeight: Check current weight of a rule
   */
  getRuleWeight(ruleName) {
    const rule = this.rules.get(ruleName);
    return rule ? rule.weight : null;
  }

  /**
   * Regulate: Control cognitive resource allocation
   */
  regulate() {
    const assessment = this.assess();
    const actions = [];

    // If cognitive load is too high, simplify
    if (this.metrics.cognitiveLoad > 0.8) {
      actions.push({
        type: "reduce_load",
        description: "Cognitive load critical. Switching to System 1 mode.",
        action: "prefer_system1"
      });
    }

    // If uncertainty is high, engage deeper processing
    if (this.metrics.uncertainty > 0.6) {
      actions.push({
        type: "increase_depth",
        description: "High uncertainty detected. Engaging System 2.",
        action: "prefer_system2"
      });
    }

    // If performance is dropping, trigger reflection
    if (this.metrics.performanceScore < 0.5) {
      actions.push({
        type: "trigger_reflection",
        description: "Performance degraded. Initiating self-reflection.",
        action: "reflect"
      });
    }

    // If workspace is full, consolidate to long-term memory
    if (assessment.workspace && assessment.workspace.utilization > 0.9) {
      actions.push({
        type: "consolidate",
        description: "Workspace near capacity. Consolidating to long-term memory.",
        action: "consolidate_workspace"
      });
    }

    return { assessment, actions };
  }

  _checkThresholds(metric, value) {
    const thresholds = {
      uncertainty: { warn: 0.5, critical: 0.8 },
      confidence: { warn: 0.3, critical: 0.1 },
      cognitiveLoad: { warn: 0.7, critical: 0.9 },
      performanceScore: { warn: 0.4, critical: 0.2 },
      errorRate: { warn: 0.3, critical: 0.6 }
    };

    const t = thresholds[metric];
    if (!t) return;

    const isHighBad = ["uncertainty", "cognitiveLoad", "errorRate"].includes(metric);
    const level = isHighBad
      ? (value >= t.critical ? "critical" : value >= t.warn ? "warning" : null)
      : (value <= t.critical ? "critical" : value <= t.warn ? "warning" : null);

    if (level) {
      this.alerts.push({
        timestamp: Date.now(),
        metric,
        value,
        level,
        message: `${metric} is at ${level} level: ${value}`
      });
    }
  }

  _findPatterns(memories) {
    const contentStrings = memories.map(m =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    );

    // Simple frequency analysis of tokens
    const tokenFreq = {};
    for (const str of contentStrings) {
      const tokens = str.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      for (const token of tokens) {
        tokenFreq[token] = (tokenFreq[token] || 0) + 1;
      }
    }

    const patterns = Object.entries(tokenFreq)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([token, count]) => ({
        description: `Recurring theme: "${token}"`,
        count,
        significance: count / memories.length
      }));

    return patterns;
  }

  _reflectOnReflection(reflection) {
    const insightCount = reflection.insights.length;
    const recCount = reflection.recommendations.length;

    if (insightCount === 0 && recCount === 0) {
      return "Reflection yielded no insights. May need more experience/data before meaningful patterns emerge.";
    }
    if (insightCount > 3) {
      return "Rich reflection with multiple insights. Consider prioritizing the most actionable ones.";
    }
    return `Reflection produced ${insightCount} insights and ${recCount} recommendations. Adequate depth achieved.`;
  }

  _computeOverallHealth() {
    const weights = {
      confidence: 0.3,
      performanceScore: 0.3,
      uncertainty: -0.2,
      errorRate: -0.2
    };

    let score = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      score += (this.metrics[metric] || 0) * weight;
    }

    return Math.max(0, Math.min(1, score + 0.5)); // normalize to 0-1
  }
}

module.exports = { MetacognitiveMonitor };
