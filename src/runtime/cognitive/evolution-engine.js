/**
 * Evolution Engine - Language Self-Evolution & Meta-Programming
 * 
 * Brain analogy: Neuroplasticity + Epigenetics + Cortical Reorganization
 * 
 * The human brain continuously rewires itself:
 * - Synapses strengthen with use (Long-Term Potentiation)
 * - Unused pathways weaken (synaptic pruning)
 * - New connections form in response to novel challenges
 * - Cortical maps reorganize based on experience
 * 
 * This module enables Noeon programs to:
 * - Self-modify their own rules at runtime
 * - Evolve new cognitive strategies through genetic algorithms
 * - Prune ineffective patterns and strengthen successful ones
 * - Generate new language constructs from learned patterns
 * - Maintain a "genome" of behavioral rules that can mutate
 */

class Gene {
  constructor(config) {
    this.id = config.id || `gene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.name = config.name;
    this.type = config.type; // "rule" | "strategy" | "threshold" | "pattern" | "behavior"
    this.code = config.code; // The actual rule/function/value
    this.fitness = config.fitness || 0.5;
    this.generation = config.generation || 0;
    this.mutations = 0;
    this.activations = 0;
    this.successRate = 0.5;
    this.parentIds = config.parentIds || [];
    this.createdAt = Date.now();
    this.lastActivated = null;
    this.frozen = false; // Frozen genes cannot be mutated
  }

  activate() {
    this.activations++;
    this.lastActivated = Date.now();
  }

  updateFitness(outcome) {
    // Exponential moving average
    const alpha = 0.1;
    this.fitness = this.fitness * (1 - alpha) + outcome * alpha;
    this.successRate = (this.successRate * (this.activations - 1) + outcome) / this.activations;
  }
}

class Genome {
  constructor(config = {}) {
    this.genes = new Map();
    this.generation = 0;
    this.species = config.species || "noeon_cognitive";
    this.mutationRate = config.mutationRate || 0.1;
    this.crossoverRate = config.crossoverRate || 0.3;
    this.pruneThreshold = config.pruneThreshold || 0.2;
    this.eliteRatio = config.eliteRatio || 0.2;
    this.history = []; // Evolution history
  }

  addGene(gene) {
    this.genes.set(gene.id, gene);
    return gene;
  }

  getGene(id) {
    return this.genes.get(id);
  }

  getGenesByType(type) {
    return Array.from(this.genes.values()).filter(g => g.type === type);
  }

  getActiveGenes() {
    return Array.from(this.genes.values())
      .filter(g => g.fitness > this.pruneThreshold)
      .sort((a, b) => b.fitness - a.fitness);
  }

  getEliteGenes() {
    const all = Array.from(this.genes.values()).sort((a, b) => b.fitness - a.fitness);
    return all.slice(0, Math.max(1, Math.floor(all.length * this.eliteRatio)));
  }

  get size() {
    return this.genes.size;
  }
}

class EvolutionEngine {
  constructor(config = {}) {
    this.genome = new Genome(config.genome);
    this.populationSize = config.populationSize || 50;
    this.maxGenerations = config.maxGenerations || 100;
    this.selectionPressure = config.selectionPressure || 0.7;

    // Self-modification registry
    this.modificationLog = [];
    this.ruleRegistry = new Map(); // name -> { rule, version, fitness }
    this.strategyPool = new Map(); // name -> { strategy, fitness }

    // Pattern library (learned patterns that can become new constructs)
    this.patternLibrary = [];

    // Evolution callbacks
    this.onMutation = config.onMutation || null;
    this.onEvolution = config.onEvolution || null;

    this.stats = {
      generations: 0,
      mutations: 0,
      crossovers: 0,
      pruned: 0,
      newRules: 0,
      selfModifications: 0
    };
  }

  /**
   * RegisterRule: Add a mutable rule to the evolution system
   */
  registerRule(name, rule, metadata = {}) {
    const gene = new Gene({
      name,
      type: "rule",
      code: rule,
      fitness: metadata.initialFitness || 0.5,
      generation: this.genome.generation
    });

    this.genome.addGene(gene);
    this.ruleRegistry.set(name, {
      rule,
      gene,
      version: 1,
      history: [{ rule, fitness: gene.fitness, timestamp: Date.now() }]
    });

    return gene;
  }

  /**
   * RegisterStrategy: Add a cognitive strategy that can evolve
   */
  registerStrategy(name, strategy, metadata = {}) {
    const gene = new Gene({
      name,
      type: "strategy",
      code: strategy,
      fitness: metadata.initialFitness || 0.5,
      generation: this.genome.generation
    });

    this.genome.addGene(gene);
    this.strategyPool.set(name, { strategy, gene });

    return gene;
  }

  /**
   * Evaluate: Test a gene's fitness based on outcome
   */
  evaluate(geneId, outcome) {
    const gene = this.genome.getGene(geneId);
    if (!gene) return null;

    gene.activate();
    gene.updateFitness(outcome);

    return {
      id: gene.id,
      name: gene.name,
      newFitness: gene.fitness,
      activations: gene.activations,
      successRate: gene.successRate
    };
  }

  /**
   * Mutate: Create a variation of an existing gene
   */
  mutate(geneId, mutationType = "random") {
    const gene = this.genome.getGene(geneId);
    if (!gene || gene.frozen) return null;

    const mutant = this._applyMutation(gene, mutationType);
    this.genome.addGene(mutant);
    gene.mutations++;
    this.stats.mutations++;

    this.modificationLog.push({
      type: "mutation",
      parentId: gene.id,
      childId: mutant.id,
      mutationType,
      timestamp: Date.now()
    });

    if (this.onMutation) {
      this.onMutation(gene, mutant, mutationType);
    }

    return mutant;
  }

  /**
   * Crossover: Combine two genes to create offspring
   */
  crossover(geneId1, geneId2) {
    const gene1 = this.genome.getGene(geneId1);
    const gene2 = this.genome.getGene(geneId2);
    if (!gene1 || !gene2) return null;

    const offspring = this._applyCrossover(gene1, gene2);
    this.genome.addGene(offspring);
    this.stats.crossovers++;

    this.modificationLog.push({
      type: "crossover",
      parentIds: [gene1.id, gene2.id],
      childId: offspring.id,
      timestamp: Date.now()
    });

    return offspring;
  }

  /**
   * Evolve: Run one generation of evolution
   * - Select fittest genes
   * - Mutate some
   * - Crossover some
   * - Prune the weakest
   */
  evolve() {
    this.genome.generation++;
    this.stats.generations++;

    const results = {
      generation: this.genome.generation,
      mutations: [],
      crossovers: [],
      pruned: [],
      elites: []
    };

    // 1. Select elites (preserved unchanged)
    const elites = this.genome.getEliteGenes();
    results.elites = elites.map(g => ({ id: g.id, name: g.name, fitness: g.fitness }));

    // 2. Mutate non-elite genes probabilistically
    const allGenes = Array.from(this.genome.genes.values());
    for (const gene of allGenes) {
      if (gene.frozen) continue;
      if (elites.includes(gene)) continue;

      if (Math.random() < this.genome.mutationRate) {
        const mutant = this.mutate(gene.id);
        if (mutant) results.mutations.push({ parent: gene.id, child: mutant.id });
      }
    }

    // 3. Crossover between high-fitness genes
    if (elites.length >= 2) {
      for (let i = 0; i < Math.floor(elites.length / 2); i++) {
        if (Math.random() < this.genome.crossoverRate) {
          const parent1 = elites[Math.floor(Math.random() * elites.length)];
          const parent2 = elites[Math.floor(Math.random() * elites.length)];
          if (parent1.id !== parent2.id) {
            const offspring = this.crossover(parent1.id, parent2.id);
            if (offspring) results.crossovers.push({ parents: [parent1.id, parent2.id], child: offspring.id });
          }
        }
      }
    }

    // 4. Prune weakest genes
    for (const gene of allGenes) {
      if (gene.frozen) continue;
      if (gene.fitness < this.genome.pruneThreshold && gene.activations > 5) {
        this.genome.genes.delete(gene.id);
        results.pruned.push({ id: gene.id, name: gene.name, fitness: gene.fitness });
        this.stats.pruned++;
      }
    }

    if (this.onEvolution) {
      this.onEvolution(results);
    }

    this.genome.history.push({
      generation: this.genome.generation,
      geneCount: this.genome.size,
      avgFitness: this._avgFitness(),
      timestamp: Date.now()
    });

    return results;
  }

  /**
   * SelfModify: The most powerful operation — modify own rules at runtime
   * This is true neuroplasticity: the system rewires itself.
   */
  selfModify(ruleName, newRule, reason = "") {
    const entry = this.ruleRegistry.get(ruleName);
    if (!entry) return { success: false, error: "Rule not found" };

    const oldRule = entry.rule;
    const oldFitness = entry.gene.fitness;

    // Update the rule
    entry.rule = newRule;
    entry.gene.code = newRule;
    entry.version++;
    entry.history.push({
      rule: newRule,
      fitness: entry.gene.fitness,
      reason,
      timestamp: Date.now()
    });

    this.stats.selfModifications++;

    this.modificationLog.push({
      type: "self_modification",
      ruleName,
      oldRule: typeof oldRule === "function" ? oldRule.toString().slice(0, 100) : JSON.stringify(oldRule).slice(0, 100),
      newRule: typeof newRule === "function" ? newRule.toString().slice(0, 100) : JSON.stringify(newRule).slice(0, 100),
      reason,
      version: entry.version,
      timestamp: Date.now()
    });

    return {
      success: true,
      ruleName,
      version: entry.version,
      oldFitness,
      reason
    };
  }

  /**
   * LearnPattern: Detect and store recurring patterns
   * These patterns can later become new language constructs
   */
  learnPattern(pattern, context = {}) {
    // Check if similar pattern already exists
    const existing = this.patternLibrary.find(p =>
      p.signature === pattern.signature
    );

    if (existing) {
      existing.occurrences++;
      existing.lastSeen = Date.now();
      existing.contexts.push(context);

      // If pattern is frequent enough, promote to a gene
      if (existing.occurrences >= 5 && !existing.promoted) {
        const gene = new Gene({
          name: `learned_pattern_${existing.signature}`,
          type: "pattern",
          code: existing.template,
          fitness: 0.6,
          generation: this.genome.generation
        });
        this.genome.addGene(gene);
        existing.promoted = true;
        existing.geneId = gene.id;
        this.stats.newRules++;
      }

      return existing;
    }

    const newPattern = {
      id: `pat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      signature: pattern.signature,
      template: pattern.template,
      occurrences: 1,
      contexts: [context],
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      promoted: false,
      geneId: null
    };

    this.patternLibrary.push(newPattern);
    return newPattern;
  }

  /**
   * Synthesize: Generate a new rule from patterns and experience
   * This is the "creativity" of the evolution engine
   */
  synthesize(requirements = {}) {
    const patterns = this.patternLibrary.filter(p => p.occurrences >= 3);
    const elites = this.genome.getEliteGenes();

    if (patterns.length === 0 && elites.length === 0) {
      return { success: false, reason: "Insufficient patterns or elite genes" };
    }

    // Combine elements from top patterns and elite genes
    const sources = [];
    for (const pattern of patterns.slice(0, 3)) {
      sources.push({ type: "pattern", content: pattern.template });
    }
    for (const gene of elites.slice(0, 3)) {
      sources.push({ type: "gene", content: gene.code });
    }

    const synthesized = {
      id: `synth_${Date.now()}`,
      sources: sources.map(s => s.type),
      generation: this.genome.generation,
      requirements,
      timestamp: Date.now()
    };

    // Create a new gene from synthesis
    const gene = new Gene({
      name: `synthesized_${requirements.name || "rule"}`,
      type: requirements.type || "rule",
      code: { sources, requirements, synthesizedAt: Date.now() },
      fitness: 0.5,
      generation: this.genome.generation,
      parentIds: elites.slice(0, 2).map(g => g.id)
    });

    this.genome.addGene(gene);
    synthesized.geneId = gene.id;

    return { success: true, synthesized, gene };
  }

  /**
   * GetEvolutionState: Full state of the evolution engine
   */
  getEvolutionState() {
    return {
      genome: {
        species: this.genome.species,
        generation: this.genome.generation,
        geneCount: this.genome.size,
        avgFitness: this._avgFitness(),
        eliteCount: this.genome.getEliteGenes().length
      },
      rules: Array.from(this.ruleRegistry.entries()).map(([name, entry]) => ({
        name,
        version: entry.version,
        fitness: entry.gene.fitness,
        activations: entry.gene.activations
      })),
      patterns: {
        total: this.patternLibrary.length,
        promoted: this.patternLibrary.filter(p => p.promoted).length,
        topPatterns: this.patternLibrary
          .sort((a, b) => b.occurrences - a.occurrences)
          .slice(0, 5)
          .map(p => ({ signature: p.signature, occurrences: p.occurrences, promoted: p.promoted }))
      },
      stats: this.stats,
      recentModifications: this.modificationLog.slice(-10)
    };
  }

  // ==================== Private Methods ====================

  _applyMutation(gene, type) {
    let mutatedCode;

    switch (type) {
      case "parameter_shift":
        mutatedCode = this._mutateParameters(gene.code);
        break;
      case "structural":
        mutatedCode = this._mutateStructure(gene.code);
        break;
      case "inversion":
        mutatedCode = this._mutateInversion(gene.code);
        break;
      default:
        // Random mutation
        mutatedCode = this._mutateRandom(gene.code);
    }

    return new Gene({
      name: `${gene.name}_mut${gene.mutations + 1}`,
      type: gene.type,
      code: mutatedCode,
      fitness: gene.fitness * 0.9, // Slight fitness penalty for untested mutation
      generation: this.genome.generation,
      parentIds: [gene.id]
    });
  }

  _mutateParameters(code) {
    if (typeof code === "object" && code !== null) {
      const mutated = { ...code };
      const keys = Object.keys(mutated);
      if (keys.length > 0) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        const val = mutated[key];
        if (typeof val === "number") {
          mutated[key] = val * (0.8 + Math.random() * 0.4); // ±20%
        } else if (typeof val === "boolean") {
          mutated[key] = !val;
        }
      }
      return mutated;
    }
    return code;
  }

  _mutateStructure(code) {
    if (typeof code === "object" && code !== null && !Array.isArray(code)) {
      const mutated = { ...code };
      // Add a new random field
      mutated[`evolved_${Date.now() % 1000}`] = Math.random();
      return mutated;
    }
    if (Array.isArray(code)) {
      const mutated = [...code];
      // Duplicate a random element
      if (mutated.length > 0) {
        const idx = Math.floor(Math.random() * mutated.length);
        mutated.push(mutated[idx]);
      }
      return mutated;
    }
    return code;
  }

  _mutateInversion(code) {
    if (Array.isArray(code)) {
      return [...code].reverse();
    }
    if (typeof code === "object" && code !== null) {
      const mutated = { ...code };
      const keys = Object.keys(mutated);
      if (keys.length >= 2) {
        // Swap two values
        const [k1, k2] = keys.sort(() => Math.random() - 0.5).slice(0, 2);
        [mutated[k1], mutated[k2]] = [mutated[k2], mutated[k1]];
      }
      return mutated;
    }
    return code;
  }

  _mutateRandom(code) {
    const mutations = ["parameter_shift", "structural", "inversion"];
    const chosen = mutations[Math.floor(Math.random() * mutations.length)];
    switch (chosen) {
      case "parameter_shift": return this._mutateParameters(code);
      case "structural": return this._mutateStructure(code);
      case "inversion": return this._mutateInversion(code);
      default: return code;
    }
  }

  _applyCrossover(gene1, gene2) {
    let offspringCode;

    if (typeof gene1.code === "object" && typeof gene2.code === "object" &&
        !Array.isArray(gene1.code) && !Array.isArray(gene2.code)) {
      // Object crossover: take half from each parent
      offspringCode = {};
      const keys1 = Object.keys(gene1.code || {});
      const keys2 = Object.keys(gene2.code || {});
      const allKeys = [...new Set([...keys1, ...keys2])];

      for (const key of allKeys) {
        if (Math.random() < 0.5 && key in (gene1.code || {})) {
          offspringCode[key] = gene1.code[key];
        } else if (key in (gene2.code || {})) {
          offspringCode[key] = gene2.code[key];
        }
      }
    } else {
      // Default: pick one parent's code with slight modification
      offspringCode = Math.random() < 0.5 ? gene1.code : gene2.code;
    }

    return new Gene({
      name: `${gene1.name}x${gene2.name}`,
      type: gene1.type,
      code: offspringCode,
      fitness: (gene1.fitness + gene2.fitness) / 2,
      generation: this.genome.generation,
      parentIds: [gene1.id, gene2.id]
    });
  }

  _avgFitness() {
    const genes = Array.from(this.genome.genes.values());
    if (genes.length === 0) return 0;
    return genes.reduce((sum, g) => sum + g.fitness, 0) / genes.length;
  }
}

module.exports = { EvolutionEngine, Genome, Gene };
