/**
 * Memory System - Inspired by human hippocampal memory consolidation
 * 
 * Implements three types of long-term memory:
 * - Episodic: Specific events/experiences (hippocampus)
 * - Semantic: General knowledge/facts (temporal cortex)
 * - Procedural: Skills and habits (basal ganglia)
 * 
 * Plus working memory integration with the Global Workspace.
 */

class MemoryTrace {
  constructor(content, type, metadata = {}) {
    this.id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.content = content;
    this.type = type; // episodic | semantic | procedural
    this.strength = metadata.strength || 0.5;
    this.createdAt = Date.now();
    this.lastRetrievedAt = null;
    this.retrievalCount = 0;
    this.associations = new Set(); // linked memory IDs
    this.tags = metadata.tags || [];
    this.context = metadata.context || null;
    this.decayRate = metadata.decayRate || 0.01;
  }

  /**
   * Retrieve strengthens the memory (testing effect)
   */
  retrieve() {
    this.lastRetrievedAt = Date.now();
    this.retrievalCount += 1;
    // Retrieval strengthens memory (spacing effect)
    this.strength = Math.min(1.0, this.strength + 0.05);
    return this.content;
  }

  /**
   * Calculate current effective strength considering decay
   */
  effectiveStrength() {
    const timeSinceCreation = (Date.now() - this.createdAt) / 1000 / 3600; // hours
    const timeSinceRetrieval = this.lastRetrievedAt
      ? (Date.now() - this.lastRetrievedAt) / 1000 / 3600
      : timeSinceCreation;

    // Ebbinghaus forgetting curve: R = e^(-t/S)
    const decay = Math.exp(-this.decayRate * timeSinceRetrieval);
    return this.strength * decay;
  }

  /**
   * Associate with another memory (spreading activation)
   */
  associate(memoryId) {
    this.associations.add(memoryId);
  }
}

class MemorySystem {
  constructor() {
    this.episodic = new Map();   // event memories
    this.semantic = new Map();   // fact/knowledge memories
    this.procedural = new Map(); // skill/habit memories
    this.consolidationQueue = [];
    this.retrievalLog = [];
  }

  /**
   * Store: Encode a new memory
   */
  store(content, type, metadata = {}) {
    const trace = new MemoryTrace(content, type, metadata);
    const store = this._getStore(type);
    store.set(trace.id, trace);
    return trace;
  }

  /**
   * Consolidate: Transfer from working memory to long-term
   * Mimics hippocampal replay during sleep/rest
   */
  consolidate(workspaceSnapshot, targetType = "episodic", strength = 0.8) {
    const content = {
      items: workspaceSnapshot.items,
      consolidatedAt: Date.now(),
      workspaceName: workspaceSnapshot.name
    };

    const trace = this.store(content, targetType, { strength });

    // Create associations between items
    const itemIds = [];
    for (const item of workspaceSnapshot.items) {
      const itemTrace = this.store(item, targetType, { strength: strength * 0.8 });
      itemIds.push(itemTrace.id);
    }

    // Cross-associate
    for (const id of itemIds) {
      trace.associate(id);
      const t = this._getStore(targetType).get(id);
      if (t) t.associate(trace.id);
    }

    return trace;
  }

  /**
   * Recall: Retrieve memories by similarity/association
   * Uses spreading activation model
   */
  recall(query, options = {}) {
    const type = options.type || null; // null = search all
    const limit = options.limit || 5;
    const minStrength = options.minStrength || 0.1;

    const candidates = [];
    const stores = type ? [this._getStore(type)] : [this.episodic, this.semantic, this.procedural];

    for (const store of stores) {
      for (const [id, trace] of store) {
        const effective = trace.effectiveStrength();
        if (effective < minStrength) continue;

        const relevance = this._computeRelevance(query, trace);
        if (relevance > 0) {
          candidates.push({ trace, relevance, strength: effective });
        }
      }
    }

    // Sort by relevance * strength (activation level)
    candidates.sort((a, b) => (b.relevance * b.strength) - (a.relevance * a.strength));

    const results = candidates.slice(0, limit).map(c => {
      c.trace.retrieve(); // strengthen on retrieval
      return {
        id: c.trace.id,
        content: c.trace.content,
        type: c.trace.type,
        relevance: c.relevance,
        strength: c.strength
      };
    });

    this.retrievalLog.push({
      query,
      timestamp: Date.now(),
      resultsCount: results.length
    });

    return results;
  }

  /**
   * Forget: Actively suppress or let decay
   */
  forget(memoryId) {
    for (const store of [this.episodic, this.semantic, this.procedural]) {
      if (store.has(memoryId)) {
        store.delete(memoryId);
        return true;
      }
    }
    return false;
  }

  /**
   * Strengthen: Reinforce a specific memory (reward signal)
   */
  strengthen(memoryId, delta = 0.1) {
    for (const store of [this.episodic, this.semantic, this.procedural]) {
      const trace = store.get(memoryId);
      if (trace) {
        trace.strength = Math.min(1.0, trace.strength + delta);
        return trace;
      }
    }
    return null;
  }

  /**
   * Weaken: Reduce strength (punishment signal / neuroplasticity)
   */
  weaken(memoryId, delta = 0.1) {
    for (const store of [this.episodic, this.semantic, this.procedural]) {
      const trace = store.get(memoryId);
      if (trace) {
        trace.strength = Math.max(0, trace.strength - delta);
        if (trace.strength === 0) {
          store.delete(memoryId);
        }
        return trace;
      }
    }
    return null;
  }

  /**
   * Stats: Get memory system statistics (for metacognition)
   */
  stats() {
    return {
      episodic: this.episodic.size,
      semantic: this.semantic.size,
      procedural: this.procedural.size,
      total: this.episodic.size + this.semantic.size + this.procedural.size,
      recentRetrievals: this.retrievalLog.slice(-10)
    };
  }

  _getStore(type) {
    switch (type) {
      case "episodic": return this.episodic;
      case "semantic": return this.semantic;
      case "procedural": return this.procedural;
      default: return this.episodic;
    }
  }

  _computeRelevance(query, trace) {
    // Simple keyword matching (to be replaced with embedding similarity)
    const queryStr = typeof query === "string" ? query : JSON.stringify(query);
    const contentStr = typeof trace.content === "string" ? trace.content : JSON.stringify(trace.content);

    const queryTokens = queryStr.toLowerCase().split(/\s+/);
    const contentTokens = contentStr.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const qt of queryTokens) {
      if (contentTokens.some(ct => ct.includes(qt) || qt.includes(ct))) {
        matches += 1;
      }
    }

    // Also check tags
    if (trace.tags && trace.tags.length > 0) {
      for (const tag of trace.tags) {
        if (queryStr.toLowerCase().includes(tag.toLowerCase())) {
          matches += 2;
        }
      }
    }

    return matches / Math.max(queryTokens.length, 1);
  }
}

module.exports = { MemorySystem, MemoryTrace };
