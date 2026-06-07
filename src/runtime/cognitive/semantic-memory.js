/**
 * Semantic Memory with Vector Embeddings
 * 
 * Brain analogy: Temporal cortex + Hippocampal indexing
 * 
 * This module extends the basic MemorySystem with vector-based
 * semantic search. Memories are stored with embeddings, enabling:
 * - Associative recall (find related memories by meaning)
 * - Spreading activation (one memory activates related ones)
 * - Semantic clustering (organize knowledge into concepts)
 * - Forgetting curves with semantic importance weighting
 */

class VectorIndex {
  constructor(dimensions = 64) {
    this.dimensions = dimensions;
    this.entries = []; // { id, vector, metadata }
  }

  /**
   * Add a vector to the index
   */
  add(id, vector, metadata = {}) {
    this.entries.push({ id, vector, metadata, addedAt: Date.now() });
  }

  /**
   * Remove a vector from the index
   */
  remove(id) {
    this.entries = this.entries.filter(e => e.id !== id);
  }

  /**
   * Search: Find the k nearest neighbors by cosine similarity
   */
  search(queryVector, k = 5, filter = null) {
    let candidates = this.entries;
    if (filter) {
      candidates = candidates.filter(filter);
    }

    const scored = candidates.map(entry => ({
      ...entry,
      similarity: this._cosineSimilarity(queryVector, entry.vector)
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, k);
  }

  /**
   * Cluster: Group vectors by similarity (simple k-means-like)
   */
  cluster(k = 3, maxIterations = 10) {
    if (this.entries.length < k) return [this.entries];

    // Initialize centroids randomly
    let centroids = this.entries
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, k)
      .map(e => [...e.vector]);

    let assignments = new Array(this.entries.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      // Assign each entry to nearest centroid
      for (let i = 0; i < this.entries.length; i++) {
        let bestCluster = 0;
        let bestSim = -Infinity;
        for (let c = 0; c < centroids.length; c++) {
          const sim = this._cosineSimilarity(this.entries[i].vector, centroids[c]);
          if (sim > bestSim) {
            bestSim = sim;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      // Update centroids
      for (let c = 0; c < k; c++) {
        const members = this.entries.filter((_, i) => assignments[i] === c);
        if (members.length === 0) continue;
        centroids[c] = this._meanVector(members.map(m => m.vector));
      }
    }

    // Build clusters
    const clusters = Array.from({ length: k }, () => []);
    for (let i = 0; i < this.entries.length; i++) {
      clusters[assignments[i]].push(this.entries[i]);
    }
    return clusters.filter(c => c.length > 0);
  }

  /**
   * Get all entries within a similarity threshold
   */
  neighborhood(queryVector, threshold = 0.7) {
    return this.entries.filter(entry =>
      this._cosineSimilarity(queryVector, entry.vector) >= threshold
    );
  }

  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  _meanVector(vectors) {
    const dim = vectors[0].length;
    const mean = new Array(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        mean[i] += v[i];
      }
    }
    for (let i = 0; i < dim; i++) {
      mean[i] /= vectors.length;
    }
    return mean;
  }

  get size() {
    return this.entries.length;
  }
}

class SemanticMemory {
  constructor(llmBridge, config = {}) {
    this.llmBridge = llmBridge;
    this.index = new VectorIndex(config.dimensions || 64);
    this.memories = new Map(); // id -> { content, embedding, metadata, strength, ... }
    this.activationSpread = config.activationSpread || 0.3;
    this.decayRate = config.decayRate || 0.005;
    this.maxMemories = config.maxMemories || 10000;
    this.stats = {
      stored: 0,
      recalled: 0,
      consolidated: 0,
      forgotten: 0
    };
  }

  /**
   * Store: Encode content into semantic memory with embedding
   */
  async store(content, metadata = {}) {
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);

    // Get embedding
    const embedding = await this.llmBridge.embed(contentStr);

    const id = `smem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const memory = {
      id,
      content,
      contentStr,
      embedding: embedding.vector,
      dimensions: embedding.dimensions,
      model: embedding.model,
      strength: metadata.strength || 0.5,
      importance: metadata.importance || 0.5,
      tags: metadata.tags || [],
      associations: new Set(),
      createdAt: Date.now(),
      lastAccessedAt: null,
      accessCount: 0,
      consolidationCount: 0
    };

    // Check capacity
    if (this.memories.size >= this.maxMemories) {
      this._evictWeakest();
    }

    this.memories.set(id, memory);
    this.index.add(id, embedding.vector, { tags: metadata.tags, importance: metadata.importance });

    // Auto-associate with similar existing memories
    await this._autoAssociate(memory);

    this.stats.stored++;
    return memory;
  }

  /**
   * Recall: Semantic search - find memories by meaning
   */
  async recall(query, options = {}) {
    const k = options.limit || 5;
    const minSimilarity = options.minSimilarity || 0.1;

    // Embed the query
    const queryStr = typeof query === "string" ? query : JSON.stringify(query);
    const queryEmbedding = await this.llmBridge.embed(queryStr);

    // Search vector index
    const results = this.index.search(queryEmbedding.vector, k * 2); // Get more, then filter

    const recalled = [];
    for (const result of results) {
      if (result.similarity < minSimilarity) continue;

      const memory = this.memories.get(result.id);
      if (!memory) continue;

      // Apply decay
      const effectiveStrength = this._effectiveStrength(memory);
      if (effectiveStrength < 0.05) continue;

      // Strengthen on recall (testing effect)
      memory.lastAccessedAt = Date.now();
      memory.accessCount++;
      memory.strength = Math.min(1.0, memory.strength + 0.03);

      recalled.push({
        id: memory.id,
        content: memory.content,
        similarity: result.similarity,
        strength: effectiveStrength,
        relevance: result.similarity * effectiveStrength,
        tags: memory.tags,
        accessCount: memory.accessCount
      });
    }

    // Sort by combined relevance
    recalled.sort((a, b) => b.relevance - a.relevance);

    // Spreading activation: also activate associated memories
    if (options.spread !== false && recalled.length > 0) {
      const associated = this._spreadActivation(recalled[0].id);
      for (const assoc of associated) {
        if (!recalled.find(r => r.id === assoc.id)) {
          recalled.push({ ...assoc, source: "spreading_activation" });
        }
      }
    }

    this.stats.recalled++;
    return recalled.slice(0, k);
  }

  /**
   * Associate: Create explicit association between two memories
   */
  associate(id1, id2) {
    const m1 = this.memories.get(id1);
    const m2 = this.memories.get(id2);
    if (m1 && m2) {
      m1.associations.add(id2);
      m2.associations.add(id1);
    }
  }

  /**
   * Consolidate: Strengthen and reorganize memories
   * Mimics hippocampal replay during rest/sleep
   */
  consolidate(options = {}) {
    const threshold = options.threshold || 0.3;
    const boost = options.boost || 0.1;

    let consolidated = 0;
    for (const [id, memory] of this.memories) {
      if (memory.accessCount > 0 && memory.strength < 1.0) {
        // Frequently accessed memories get consolidated
        const accessFactor = Math.min(1, memory.accessCount / 10);
        memory.strength = Math.min(1.0, memory.strength + boost * accessFactor);
        memory.consolidationCount++;
        consolidated++;
      }

      // Forget very weak memories
      const effective = this._effectiveStrength(memory);
      if (effective < 0.01) {
        this.forget(id);
      }
    }

    this.stats.consolidated += consolidated;
    return { consolidated, totalMemories: this.memories.size };
  }

  /**
   * Forget: Remove a memory
   */
  forget(id) {
    const memory = this.memories.get(id);
    if (!memory) return false;

    // Remove associations
    for (const assocId of memory.associations) {
      const assoc = this.memories.get(assocId);
      if (assoc) assoc.associations.delete(id);
    }

    this.memories.delete(id);
    this.index.remove(id);
    this.stats.forgotten++;
    return true;
  }

  /**
   * Cluster: Organize memories into semantic clusters (concepts)
   */
  getConcepts(k = 5) {
    const clusters = this.index.cluster(k);
    return clusters.map((cluster, i) => ({
      conceptId: i,
      size: cluster.length,
      members: cluster.map(entry => {
        const mem = this.memories.get(entry.id);
        return mem ? { id: mem.id, content: mem.content, tags: mem.tags } : null;
      }).filter(Boolean),
      centroidNeighbors: cluster.slice(0, 3).map(e => e.id)
    }));
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalMemories: this.memories.size,
      indexSize: this.index.size,
      avgStrength: this._avgStrength()
    };
  }

  // ==================== Private Methods ====================

  _effectiveStrength(memory) {
    const hoursSinceAccess = memory.lastAccessedAt
      ? (Date.now() - memory.lastAccessedAt) / 3600000
      : (Date.now() - memory.createdAt) / 3600000;

    // Ebbinghaus curve modified by importance
    const decay = Math.exp(-this.decayRate * hoursSinceAccess / (memory.importance + 0.1));
    return memory.strength * decay;
  }

  async _autoAssociate(newMemory) {
    // Find similar memories and create associations
    const similar = this.index.search(newMemory.embedding, 3);
    for (const match of similar) {
      if (match.id === newMemory.id) continue;
      if (match.similarity > this.activationSpread) {
        this.associate(newMemory.id, match.id);
      }
    }
  }

  _spreadActivation(sourceId) {
    const memory = this.memories.get(sourceId);
    if (!memory) return [];

    const activated = [];
    for (const assocId of memory.associations) {
      const assoc = this.memories.get(assocId);
      if (assoc) {
        const effective = this._effectiveStrength(assoc);
        activated.push({
          id: assoc.id,
          content: assoc.content,
          strength: effective,
          relevance: effective * this.activationSpread,
          tags: assoc.tags
        });
      }
    }
    return activated.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
  }

  _evictWeakest() {
    let weakestId = null;
    let weakestStrength = Infinity;

    for (const [id, memory] of this.memories) {
      const effective = this._effectiveStrength(memory);
      if (effective < weakestStrength) {
        weakestStrength = effective;
        weakestId = id;
      }
    }

    if (weakestId) {
      this.forget(weakestId);
    }
  }

  _avgStrength() {
    if (this.memories.size === 0) return 0;
    let total = 0;
    for (const [, memory] of this.memories) {
      total += this._effectiveStrength(memory);
    }
    return total / this.memories.size;
  }
}

module.exports = { SemanticMemory, VectorIndex };
