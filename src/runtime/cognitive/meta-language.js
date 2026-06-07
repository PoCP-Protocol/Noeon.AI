/**
 * Meta-Language Engine — Self-Modifying Syntax
 * 
 * CORE COMPETITIVE ADVANTAGE #4: The language can invent new syntax at runtime.
 * 
 * Traditional languages have fixed grammars defined by their creators.
 * Noeon can:
 * 1. Detect recurring patterns in how it's being used
 * 2. Abstract those patterns into new language constructs
 * 3. Register new keywords that become part of the language
 * 4. Compose existing primitives into higher-level operations
 * 5. Deprecate constructs that prove ineffective
 * 
 * This is true linguistic evolution — the language grows with its users.
 * 
 * Brain analogy: Language acquisition in children — the brain doesn't just
 * learn words, it discovers grammar rules and can generate infinite novel sentences.
 */

class SyntaxRule {
  constructor(config) {
    this.id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.keyword = config.keyword; // The new keyword
    this.pattern = config.pattern; // How to parse it
    this.expansion = config.expansion; // What it expands to (existing primitives)
    this.description = config.description || "";
    this.author = config.author || "system"; // "system" | "user" | "evolved"
    this.generation = config.generation || 0;
    this.fitness = 0.5;
    this.uses = 0;
    this.createdAt = Date.now();
    this.deprecated = false;
    this.aliases = config.aliases || [];
  }

  use() {
    this.uses++;
    this.fitness = Math.min(1.0, this.fitness + 0.02);
  }

  deprecate(reason) {
    this.deprecated = true;
    this.deprecationReason = reason;
  }
}

class MacroDefinition {
  /**
   * Macros are user-defined compositions of existing primitives.
   * They are the simplest form of language extension.
   */
  constructor(name, steps, params = []) {
    this.name = name;
    this.steps = steps; // Array of { keyword, template }
    this.params = params; // Parameter names
    this.uses = 0;
    this.createdAt = Date.now();
  }

  expand(args = {}) {
    return this.steps.map(step => {
      let value = step.template;
      for (const [param, val] of Object.entries(args)) {
        value = value.replace(`{{${param}}}`, val);
      }
      return { keyword: step.keyword, value };
    });
  }
}

class MetaLanguageEngine {
  constructor(config = {}) {
    this.customRules = new Map(); // keyword -> SyntaxRule
    this.macros = new Map(); // name -> MacroDefinition
    this.usagePatterns = []; // Track how the language is being used
    this.abstractionCandidates = []; // Patterns that might become new constructs
    this.vocabulary = new Set(); // All known keywords (built-in + custom)
    this.grammarVersion = 1;
    this.maxCustomRules = config.maxCustomRules || 100;

    // Built-in vocabulary
    this._initBuiltinVocabulary();

    // Pattern detection
    this.sequenceBuffer = [];
    this.sequencePatterns = new Map(); // sequence -> count

    this.stats = {
      rulesCreated: 0,
      rulesDeprecated: 0,
      macrosCreated: 0,
      patternsDetected: 0,
      abstractionsFormed: 0,
      grammarEvolutions: 0
    };
  }

  /**
   * DEFINE: Create a new language construct from existing primitives
   */
  define(keyword, config) {
    if (this.vocabulary.has(keyword.toUpperCase())) {
      return { success: false, error: `Keyword '${keyword}' already exists` };
    }

    const rule = new SyntaxRule({
      keyword: keyword.toUpperCase(),
      pattern: config.pattern || "key_value",
      expansion: config.expansion || [],
      description: config.description || `User-defined construct: ${keyword}`,
      author: config.author || "user",
      generation: this.grammarVersion,
      aliases: config.aliases || []
    });

    this.customRules.set(rule.keyword, rule);
    this.vocabulary.add(rule.keyword);

    // Register aliases
    for (const alias of rule.aliases) {
      this.vocabulary.add(alias.toUpperCase());
    }

    this.stats.rulesCreated++;
    return { success: true, rule };
  }

  /**
   * MACRO: Define a multi-step composition
   */
  macro(name, steps, params = []) {
    const macro = new MacroDefinition(name.toUpperCase(), steps, params);
    this.macros.set(macro.name, macro);
    this.vocabulary.add(macro.name);
    this.stats.macrosCreated++;
    return macro;
  }

  /**
   * EXPAND: Expand a custom keyword or macro into base primitives
   */
  expand(keyword, value) {
    const upper = keyword.toUpperCase();

    // Check macros first
    const macro = this.macros.get(upper);
    if (macro) {
      macro.uses++;
      const args = this._parseArgs(value, macro.params);
      return { type: "macro", steps: macro.expand(args) };
    }

    // Check custom rules
    const rule = this.customRules.get(upper);
    if (rule) {
      rule.use();
      return { type: "rule", expansion: rule.expansion, parsed: this._parseWithPattern(value, rule.pattern) };
    }

    // Check aliases
    for (const [ruleKeyword, ruleObj] of this.customRules) {
      if (ruleObj.aliases.map(a => a.toUpperCase()).includes(upper)) {
        ruleObj.use();
        return { type: "rule", expansion: ruleObj.expansion, parsed: this._parseWithPattern(value, ruleObj.pattern) };
      }
    }

    return null; // Not a custom construct
  }

  /**
   * OBSERVE: Track language usage patterns for potential abstraction
   */
  observe(keyword, value, context = {}) {
    const observation = {
      keyword: keyword.toUpperCase(),
      value,
      context,
      timestamp: Date.now()
    };

    this.usagePatterns.push(observation);
    if (this.usagePatterns.length > 500) {
      this.usagePatterns = this.usagePatterns.slice(-500);
    }

    // Track sequences
    this.sequenceBuffer.push(keyword.toUpperCase());
    if (this.sequenceBuffer.length > 5) {
      this.sequenceBuffer.shift();
    }

    if (this.sequenceBuffer.length >= 3) {
      const seq = this.sequenceBuffer.slice(-3).join(" → ");
      this.sequencePatterns.set(seq, (this.sequencePatterns.get(seq) || 0) + 1);
    }

    // Check if we should abstract
    this._checkForAbstraction();
  }

  /**
   * ABSTRACT: Automatically create new constructs from detected patterns
   */
  abstract() {
    const candidates = [];

    // Find frequently repeated sequences
    for (const [seq, count] of this.sequencePatterns) {
      if (count >= 5) {
        candidates.push({ type: "sequence", pattern: seq, count });
      }
    }

    // Find frequently co-occurring keyword pairs
    const cooccurrences = this._findCooccurrences();
    for (const [pair, count] of cooccurrences) {
      if (count >= 4) {
        candidates.push({ type: "cooccurrence", pattern: pair, count });
      }
    }

    if (candidates.length === 0) return { abstracted: 0, candidates: [] };

    // Create new constructs from top candidates
    const created = [];
    for (const candidate of candidates.slice(0, 3)) {
      const name = this._generateName(candidate);
      if (!this.vocabulary.has(name)) {
        const steps = candidate.pattern.split(" → ").map(kw => ({
          keyword: kw.trim(),
          template: "{{input}}"
        }));

        const rule = this.define(name, {
          pattern: "quoted_or_kv",
          expansion: steps,
          description: `Auto-abstracted from pattern: ${candidate.pattern} (seen ${candidate.count} times)`,
          author: "evolved"
        });

        if (rule.success) {
          created.push({ name, source: candidate });
          this.stats.abstractionsFormed++;
        }
      }
    }

    return { abstracted: created.length, candidates: created };
  }

  /**
   * EVOLVE_GRAMMAR: Run one evolution cycle on the language itself
   */
  evolveGrammar() {
    this.grammarVersion++;
    this.stats.grammarEvolutions++;

    const results = {
      version: this.grammarVersion,
      deprecated: [],
      strengthened: [],
      newAbstractions: []
    };

    // Deprecate unused custom rules
    for (const [keyword, rule] of this.customRules) {
      if (rule.uses === 0 && rule.createdAt < Date.now() - 60000) {
        rule.deprecate("unused");
        results.deprecated.push(keyword);
        this.stats.rulesDeprecated++;
      }
    }

    // Remove deprecated rules
    for (const keyword of results.deprecated) {
      this.customRules.delete(keyword);
      this.vocabulary.delete(keyword);
    }

    // Strengthen frequently used rules
    for (const [keyword, rule] of this.customRules) {
      if (rule.uses > 10) {
        rule.fitness = Math.min(1.0, rule.fitness + 0.1);
        results.strengthened.push({ keyword, fitness: rule.fitness });
      }
    }

    // Try to abstract new patterns
    const abstraction = this.abstract();
    results.newAbstractions = abstraction.candidates;

    return results;
  }

  /**
   * COMPOSE: Create a higher-order construct by composing existing ones
   */
  compose(name, components, config = {}) {
    const steps = components.map(comp => {
      if (typeof comp === "string") {
        return { keyword: comp, template: "{{input}}" };
      }
      return comp;
    });

    return this.macro(name, steps, config.params || ["input"]);
  }

  /**
   * INTROSPECT: Get the current state of the meta-language
   */
  introspect() {
    return {
      grammarVersion: this.grammarVersion,
      vocabularySize: this.vocabulary.size,
      customRules: Array.from(this.customRules.values()).map(r => ({
        keyword: r.keyword,
        uses: r.uses,
        fitness: r.fitness,
        author: r.author,
        deprecated: r.deprecated
      })),
      macros: Array.from(this.macros.values()).map(m => ({
        name: m.name,
        steps: m.steps.length,
        params: m.params,
        uses: m.uses
      })),
      topPatterns: Array.from(this.sequencePatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([seq, count]) => ({ sequence: seq, count })),
      stats: this.stats
    };
  }

  /**
   * SUGGEST: Suggest new constructs the user might want to define
   */
  suggest() {
    const suggestions = [];

    // Suggest based on frequent sequences
    for (const [seq, count] of this.sequencePatterns) {
      if (count >= 3 && count < 5) {
        const name = this._generateName({ pattern: seq });
        if (!this.vocabulary.has(name)) {
          suggestions.push({
            type: "sequence_abstraction",
            suggestedName: name,
            pattern: seq,
            frequency: count,
            reason: `You use "${seq}" frequently — consider making it a single construct`
          });
        }
      }
    }

    // Suggest based on similar rules that could be merged
    const rules = Array.from(this.customRules.values());
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        if (this._rulesSimilar(rules[i], rules[j])) {
          suggestions.push({
            type: "merge",
            rules: [rules[i].keyword, rules[j].keyword],
            reason: "These two constructs are similar — consider merging them"
          });
        }
      }
    }

    return suggestions;
  }

  // ==================== Private Methods ====================

  _initBuiltinVocabulary() {
    const builtins = [
      // Core
      "VERSION", "NETWORK", "TASK", "BUDGET", "DEADLINE", "VERIFY",
      // Cognitive
      "DRIVE_CMD", "ATTEND", "WORKSPACE", "PREDICT", "PERCEIVE",
      "INTUIT", "REASON", "REFLECT", "CONSOLIDATE", "DECIDE",
      "EMOTION", "MONITOR", "FOCUS", "ADAPT",
      // Flow
      "WHEN_SALIENT", "RUMINATE", "PERCEIVE_ALL", "COMPETE",
      "HABITUATE", "ON_SURPRISE", "DREAM", "PRIME", "INHIBIT",
      // Social
      "SPAWN", "DELEGATE", "DEBATE_MULTI", "VOTE", "SHARE", "DISMISS",
      // Evolution
      "EVOLVE", "MUTATE", "SYNTHESIZE", "FREEZE",
      // LLM
      "ASK", "THINK_WITH", "EMBED",
      // Meta-language (self-referential!)
      "DEFINE", "MACRO", "COMPOSE", "ABSTRACT", "SUGGEST"
    ];

    for (const kw of builtins) {
      this.vocabulary.add(kw);
    }
  }

  _parseArgs(value, params) {
    const args = {};
    const parts = value.match(/(?:[^\s"]+="[^"]*"|[^\s"]+)/g) || [];

    for (const part of parts) {
      const m = part.match(/^([a-z_]\w*)=(.+)$/i);
      if (m) {
        args[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }

    // If no named args, assign positionally
    if (Object.keys(args).length === 0 && params.length > 0) {
      const quotedMatch = value.match(/^"([^"]*)"(.*)$/);
      if (quotedMatch) {
        args[params[0]] = quotedMatch[1];
      } else {
        args[params[0]] = value;
      }
    }

    return args;
  }

  _parseWithPattern(value, pattern) {
    switch (pattern) {
      case "quoted":
        const qm = value.match(/^"([^"]*)"$/);
        return qm ? { value: qm[1] } : { value };
      case "key_value":
        return this._parseArgs(value, []);
      case "quoted_or_kv":
        const qm2 = value.match(/^"([^"]*)"(.*)$/);
        if (qm2) {
          return { quoted: qm2[1], ...this._parseArgs(qm2[2].trim(), []) };
        }
        return this._parseArgs(value, []);
      default:
        return { raw: value };
    }
  }

  _checkForAbstraction() {
    // Every 50 observations, check if we should auto-abstract
    if (this.usagePatterns.length % 50 === 0) {
      this.stats.patternsDetected++;
    }
  }

  _findCooccurrences() {
    const pairs = new Map();
    for (let i = 0; i < this.usagePatterns.length - 1; i++) {
      const pair = `${this.usagePatterns[i].keyword} + ${this.usagePatterns[i + 1].keyword}`;
      pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }
    return pairs;
  }

  _generateName(candidate) {
    const parts = candidate.pattern.split(/[→+\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      // Combine first letters
      const acronym = parts.map(p => p.charAt(0)).join("");
      return `AUTO_${acronym}`;
    }
    return `AUTO_${Date.now() % 10000}`;
  }

  _rulesSimilar(rule1, rule2) {
    if (rule1.expansion.length !== rule2.expansion.length) return false;
    let matches = 0;
    for (let i = 0; i < rule1.expansion.length; i++) {
      if (rule1.expansion[i]?.keyword === rule2.expansion[i]?.keyword) matches++;
    }
    return matches / rule1.expansion.length > 0.7;
  }
}

module.exports = { MetaLanguageEngine, SyntaxRule, MacroDefinition };
