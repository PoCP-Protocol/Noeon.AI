/**
 * Knowledge Graph & Causal Reasoning Engine
 * 
 * CORE COMPETITIVE ADVANTAGE #7: Structured World Model with Causal Inference
 * 
 * Traditional programs store data in flat structures.
 * Noeon maintains a KNOWLEDGE GRAPH — a structured model of the world
 * with entities, relationships, and CAUSAL links.
 * 
 * This enables:
 * 1. "What causes X?" — Trace causal chains
 * 2. "What if X changes?" — Propagate effects through the graph
 * 3. "How are A and B related?" — Find connection paths
 * 4. "What's similar to X?" — Analogical reasoning
 * 5. "What's missing?" — Identify knowledge gaps
 * 6. "What contradicts X?" — Detect inconsistencies
 * 
 * Brain analogy: The temporal cortex + hippocampus maintain a relational
 * model of the world. When you think "dog", related concepts (bark, pet,
 * loyal, fur) activate through spreading activation.
 */

class Entity {
  constructor(id, type, properties = {}) {
    this.id = id;
    this.type = type;
    this.properties = properties;
    this.confidence = properties._confidence || 0.8;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
    this.activation = 0; // Current activation level (spreading activation)
  }

  access() {
    this.lastAccessed = Date.now();
    this.accessCount++;
    this.activation = Math.min(1.0, this.activation + 0.2);
  }

  decay(rate = 0.01) {
    this.activation = Math.max(0, this.activation - rate);
  }
}

class Relation {
  constructor(source, target, type, properties = {}) {
    this.id = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.source = source; // Entity ID
    this.target = target; // Entity ID
    this.type = type; // causes | correlates | is_a | has | part_of | similar_to | opposes | enables | prevents
    this.properties = properties;
    this.weight = properties.weight || 0.5; // Strength of relation
    this.confidence = properties.confidence || 0.7;
    this.evidence = properties.evidence || []; // Supporting evidence
    this.createdAt = Date.now();
    this.bidirectional = properties.bidirectional || false;
  }
}

class CausalChain {
  constructor(steps) {
    this.steps = steps; // Array of { from, to, relation, confidence }
    this.totalConfidence = steps.reduce((p, s) => p * s.confidence, 1.0);
    this.length = steps.length;
    this.createdAt = Date.now();
  }

  get strength() {
    return this.totalConfidence * (1 / Math.log2(this.length + 1));
  }
}

class KnowledgeGraph {
  constructor(config = {}) {
    this.entities = new Map(); // id -> Entity
    this.relations = []; // Array of Relation
    this.relationIndex = new Map(); // entityId -> [relations]
    this.typeIndex = new Map(); // type -> [entityIds]

    // Causal model
    this.causalLinks = []; // Subset of relations where type === "causes"
    this.interventions = []; // do(X) operations log

    // Inference cache
    this.inferenceCache = new Map();
    this.cacheTimeout = config.cacheTimeout || 30000;

    // Stats
    this.stats = {
      entities: 0,
      relations: 0,
      causalLinks: 0,
      queriesAnswered: 0,
      inferencesRun: 0,
      contradictionsFound: 0
    };
  }

  // ==================== Graph Construction ====================

  /**
   * KNOW: Add an entity to the knowledge graph
   */
  know(id, type, properties = {}) {
    const entity = new Entity(id, type, properties);
    this.entities.set(id, entity);

    // Update type index
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, []);
    }
    this.typeIndex.get(type).push(id);

    this.stats.entities = this.entities.size;
    return entity;
  }

  /**
   * RELATE: Create a relationship between entities
   */
  relate(sourceId, targetId, relationType, properties = {}) {
    // Auto-create entities if they don't exist
    if (!this.entities.has(sourceId)) {
      this.know(sourceId, "unknown");
    }
    if (!this.entities.has(targetId)) {
      this.know(targetId, "unknown");
    }

    const relation = new Relation(sourceId, targetId, relationType, properties);
    this.relations.push(relation);

    // Update index
    if (!this.relationIndex.has(sourceId)) {
      this.relationIndex.set(sourceId, []);
    }
    this.relationIndex.get(sourceId).push(relation);

    if (relation.bidirectional || relationType === "correlates" || relationType === "similar_to") {
      if (!this.relationIndex.has(targetId)) {
        this.relationIndex.set(targetId, []);
      }
      this.relationIndex.get(targetId).push(relation);
    }

    // Track causal links
    if (relationType === "causes" || relationType === "enables" || relationType === "prevents") {
      this.causalLinks.push(relation);
      this.stats.causalLinks = this.causalLinks.length;
    }

    this.stats.relations = this.relations.length;
    this._invalidateCache();
    return relation;
  }

  /**
   * CAUSE: Shorthand for creating a causal relation
   */
  cause(sourceId, targetId, confidence = 0.7, evidence = []) {
    return this.relate(sourceId, targetId, "causes", {
      confidence,
      evidence,
      weight: confidence
    });
  }

  // ==================== Causal Reasoning ====================

  /**
   * WHY: Find causal chains explaining why something is true
   */
  why(entityId, maxDepth = 5) {
    this.stats.inferencesRun++;
    const chains = [];
    this._findCausalChains(entityId, [], chains, maxDepth, "backward");
    return chains.sort((a, b) => b.strength - a.strength);
  }

  /**
   * WHAT_CAUSES: Find direct and indirect causes
   */
  whatCauses(entityId) {
    this.stats.queriesAnswered++;
    const direct = this.causalLinks.filter(r => r.target === entityId);
    const indirect = [];

    for (const link of direct) {
      const upstream = this.causalLinks.filter(r => r.target === link.source);
      for (const up of upstream) {
        indirect.push({
          cause: up.source,
          via: link.source,
          confidence: up.confidence * link.confidence
        });
      }
    }

    return {
      direct: direct.map(r => ({ cause: r.source, confidence: r.confidence })),
      indirect: indirect.sort((a, b) => b.confidence - a.confidence)
    };
  }

  /**
   * WHAT_EFFECTS: What does X cause? (forward causal trace)
   */
  whatEffects(entityId, maxDepth = 3) {
    this.stats.queriesAnswered++;
    const effects = [];
    this._findCausalChains(entityId, [], effects, maxDepth, "forward");
    return effects.sort((a, b) => b.strength - a.strength);
  }

  /**
   * INTERVENE: do(X) — What happens if we force X to be true?
   * (Pearl's do-calculus simplified)
   */
  intervene(entityId, value, properties = {}) {
    this.stats.inferencesRun++;

    // Record intervention
    const intervention = {
      entity: entityId,
      value,
      timestamp: Date.now(),
      effects: []
    };

    // Find all downstream effects
    const affected = this._propagateIntervention(entityId, value, new Set());

    intervention.effects = affected;
    this.interventions.push(intervention);

    return {
      intervention: { entity: entityId, value },
      directEffects: affected.filter(a => a.depth === 1),
      indirectEffects: affected.filter(a => a.depth > 1),
      totalAffected: affected.length
    };
  }

  /**
   * COUNTERFACTUAL: What would have happened if X were different?
   */
  counterfactual(entityId, alternateValue) {
    this.stats.inferencesRun++;

    const currentEntity = this.entities.get(entityId);
    if (!currentEntity) return { error: "Entity not found" };

    // Get current effects
    const currentEffects = this.whatEffects(entityId, 3);

    // Simulate alternate world
    const alternateEffects = this._propagateIntervention(entityId, alternateValue, new Set());

    return {
      entity: entityId,
      actual: currentEntity.properties,
      counterfactual: alternateValue,
      wouldChange: alternateEffects.map(e => ({
        entity: e.entity,
        currentState: this.entities.get(e.entity)?.properties || {},
        predictedChange: e.effect,
        confidence: e.confidence
      })),
      totalDifferences: alternateEffects.length
    };
  }

  // ==================== Graph Queries ====================

  /**
   * CONNECT: Find how two entities are related (shortest path)
   */
  connect(fromId, toId, maxDepth = 6) {
    this.stats.queriesAnswered++;

    // BFS for shortest path
    const queue = [{ id: fromId, path: [] }];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const { id, path } = queue.shift();
      if (path.length >= maxDepth) continue;

      const relations = this.relationIndex.get(id) || [];
      for (const rel of relations) {
        const nextId = rel.source === id ? rel.target : rel.source;
        if (nextId === toId) {
          return {
            found: true,
            path: [...path, { from: id, to: nextId, relation: rel.type, confidence: rel.confidence }],
            length: path.length + 1
          };
        }
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({
            id: nextId,
            path: [...path, { from: id, to: nextId, relation: rel.type, confidence: rel.confidence }]
          });
        }
      }
    }

    return { found: false, path: [], length: -1 };
  }

  /**
   * SIMILAR: Find entities similar to the given one
   */
  similar(entityId, limit = 5) {
    this.stats.queriesAnswered++;
    const entity = this.entities.get(entityId);
    if (!entity) return [];

    const scores = [];
    for (const [id, other] of this.entities) {
      if (id === entityId) continue;

      let similarity = 0;

      // Same type bonus
      if (other.type === entity.type) similarity += 0.3;

      // Shared relations
      const myRels = (this.relationIndex.get(entityId) || []).map(r => r.target);
      const theirRels = (this.relationIndex.get(id) || []).map(r => r.target);
      const shared = myRels.filter(r => theirRels.includes(r));
      similarity += shared.length * 0.1;

      // Explicit similarity relations
      const simRel = this.relations.find(r =>
        r.type === "similar_to" &&
        ((r.source === entityId && r.target === id) ||
         (r.source === id && r.target === entityId))
      );
      if (simRel) similarity += simRel.weight;

      // Property overlap
      const myProps = Object.keys(entity.properties);
      const theirProps = Object.keys(other.properties);
      const propOverlap = myProps.filter(p => theirProps.includes(p)).length;
      similarity += propOverlap * 0.05;

      if (similarity > 0) {
        scores.push({ id, type: other.type, similarity: Math.min(1.0, similarity) });
      }
    }

    return scores.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * ANALOGIZE: Find analogies (A is to B as C is to ?)
   */
  analogize(aId, bId, cId) {
    this.stats.inferencesRun++;

    // Find the relationship between A and B
    const abRelations = this.relations.filter(r =>
      (r.source === aId && r.target === bId) ||
      (r.source === bId && r.target === aId)
    );

    if (abRelations.length === 0) {
      return { found: false, error: "No relation found between A and B" };
    }

    // Find entities that have the same relation to C
    const relType = abRelations[0].type;
    const candidates = this.relations
      .filter(r => r.type === relType && (r.source === cId || r.target === cId))
      .map(r => r.source === cId ? r.target : r.source)
      .filter(id => id !== aId && id !== bId && id !== cId);

    if (candidates.length === 0) {
      // Try to infer
      const cEntity = this.entities.get(cId);
      const bEntity = this.entities.get(bId);
      if (cEntity && bEntity) {
        // Find entities of same type as B that relate to C
        const bType = bEntity.type;
        const sameType = this.typeIndex.get(bType) || [];
        const related = sameType.filter(id => {
          const rels = this.relationIndex.get(id) || [];
          return rels.some(r => r.source === cId || r.target === cId);
        });
        if (related.length > 0) {
          return { found: true, answer: related[0], confidence: 0.4, method: "type_inference" };
        }
      }
      return { found: false, error: "No analogical match found" };
    }

    return {
      found: true,
      answer: candidates[0],
      confidence: abRelations[0].confidence * 0.8,
      relation: relType,
      method: "direct_analogy"
    };
  }

  /**
   * GAPS: Identify knowledge gaps
   */
  gaps() {
    this.stats.queriesAnswered++;
    const gaps = [];

    // Entities with no outgoing relations
    for (const [id, entity] of this.entities) {
      const rels = this.relationIndex.get(id) || [];
      if (rels.length === 0) {
        gaps.push({ type: "isolated_entity", entity: id, entityType: entity.type });
      }
    }

    // Types with very few instances
    for (const [type, ids] of this.typeIndex) {
      if (ids.length === 1) {
        gaps.push({ type: "singleton_type", entityType: type, entity: ids[0] });
      }
    }

    // Causal chains with low confidence
    for (const link of this.causalLinks) {
      if (link.confidence < 0.4) {
        gaps.push({
          type: "weak_causal_link",
          from: link.source,
          to: link.target,
          confidence: link.confidence
        });
      }
    }

    return gaps;
  }

  /**
   * CONTRADICTIONS: Find inconsistencies in the graph
   */
  contradictions() {
    this.stats.queriesAnswered++;
    const contradictions = [];

    // Find opposing relations
    for (const rel of this.relations) {
      if (rel.type === "causes") {
        // Check if there's also a "prevents" relation
        const opposing = this.relations.find(r =>
          r.type === "prevents" && r.source === rel.source && r.target === rel.target
        );
        if (opposing) {
          contradictions.push({
            type: "causal_contradiction",
            entity1: rel.source,
            entity2: rel.target,
            claim1: { type: "causes", confidence: rel.confidence },
            claim2: { type: "prevents", confidence: opposing.confidence }
          });
          this.stats.contradictionsFound++;
        }
      }
    }

    // Find entities with contradictory properties
    for (const [id, entity] of this.entities) {
      for (const [key, value] of Object.entries(entity.properties)) {
        if (key.startsWith("not_")) {
          const positiveKey = key.slice(4);
          if (entity.properties[positiveKey] !== undefined) {
            contradictions.push({
              type: "property_contradiction",
              entity: id,
              property: positiveKey,
              positive: entity.properties[positiveKey],
              negative: value
            });
            this.stats.contradictionsFound++;
          }
        }
      }
    }

    return contradictions;
  }

  // ==================== Spreading Activation ====================

  /**
   * ACTIVATE: Spread activation from a concept through the graph
   */
  activate(entityId, strength = 1.0, decay = 0.5, maxDepth = 3) {
    const entity = this.entities.get(entityId);
    if (!entity) return [];

    entity.activation = Math.min(1.0, entity.activation + strength);
    entity.access();

    const activated = [{ id: entityId, activation: entity.activation, depth: 0 }];
    const queue = [{ id: entityId, strength, depth: 0 }];
    const visited = new Set([entityId]);

    while (queue.length > 0) {
      const { id, strength: currentStrength, depth } = queue.shift();
      if (depth >= maxDepth || currentStrength < 0.1) continue;

      const relations = this.relationIndex.get(id) || [];
      for (const rel of relations) {
        const nextId = rel.source === id ? rel.target : rel.source;
        if (visited.has(nextId)) continue;
        visited.add(nextId);

        const nextEntity = this.entities.get(nextId);
        if (!nextEntity) continue;

        const spreadStrength = currentStrength * decay * rel.weight;
        nextEntity.activation = Math.min(1.0, nextEntity.activation + spreadStrength);

        activated.push({ id: nextId, activation: nextEntity.activation, depth: depth + 1 });
        queue.push({ id: nextId, strength: spreadStrength, depth: depth + 1 });
      }
    }

    return activated.sort((a, b) => b.activation - a.activation);
  }

  /**
   * DECAY_ALL: Reduce activation of all entities
   */
  decayAll(rate = 0.05) {
    for (const [id, entity] of this.entities) {
      entity.decay(rate);
    }
  }

  /**
   * MOST_ACTIVE: Get the most activated concepts
   */
  mostActive(limit = 10) {
    return Array.from(this.entities.values())
      .filter(e => e.activation > 0)
      .sort((a, b) => b.activation - a.activation)
      .slice(0, limit)
      .map(e => ({ id: e.id, type: e.type, activation: e.activation }));
  }

  // ==================== State & Export ====================

  /**
   * Get graph statistics
   */
  getState() {
    return {
      entities: this.entities.size,
      relations: this.relations.length,
      causalLinks: this.causalLinks.length,
      types: Array.from(this.typeIndex.keys()),
      relationTypes: [...new Set(this.relations.map(r => r.type))],
      mostConnected: this._mostConnected(5),
      stats: this.stats
    };
  }

  /**
   * Export graph as JSON
   */
  export() {
    return {
      entities: Array.from(this.entities.values()).map(e => ({
        id: e.id, type: e.type, properties: e.properties, confidence: e.confidence
      })),
      relations: this.relations.map(r => ({
        source: r.source, target: r.target, type: r.type,
        weight: r.weight, confidence: r.confidence
      }))
    };
  }

  // ==================== Private Methods ====================

  _findCausalChains(entityId, currentPath, results, maxDepth, direction) {
    if (currentPath.length >= maxDepth) return;

    const links = direction === "backward"
      ? this.causalLinks.filter(r => r.target === entityId)
      : this.causalLinks.filter(r => r.source === entityId);

    for (const link of links) {
      const nextId = direction === "backward" ? link.source : link.target;

      // Avoid cycles
      if (currentPath.some(s => s.from === nextId || s.to === nextId)) continue;

      const step = {
        from: direction === "backward" ? nextId : entityId,
        to: direction === "backward" ? entityId : nextId,
        relation: link.type,
        confidence: link.confidence
      };

      const newPath = [...currentPath, step];
      results.push(new CausalChain(newPath));

      // Continue deeper
      this._findCausalChains(nextId, newPath, results, maxDepth, direction);
    }
  }

  _propagateIntervention(entityId, value, visited) {
    if (visited.has(entityId)) return [];
    visited.add(entityId);

    const effects = [];
    const downstream = this.causalLinks.filter(r => r.source === entityId);

    for (const link of downstream) {
      const effect = {
        entity: link.target,
        causedBy: entityId,
        relation: link.type,
        confidence: link.confidence,
        depth: visited.size,
        effect: link.type === "prevents" ? "inhibited" : "activated"
      };
      effects.push(effect);

      // Propagate further
      const further = this._propagateIntervention(link.target, value, visited);
      effects.push(...further);
    }

    return effects;
  }

  _mostConnected(limit) {
    const counts = new Map();
    for (const rel of this.relations) {
      counts.set(rel.source, (counts.get(rel.source) || 0) + 1);
      counts.set(rel.target, (counts.get(rel.target) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ id, connections: count, type: this.entities.get(id)?.type }));
  }

  _invalidateCache() {
    this.inferenceCache.clear();
  }
}

module.exports = { KnowledgeGraph, Entity, Relation, CausalChain };
