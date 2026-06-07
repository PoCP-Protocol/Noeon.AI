/**
 * Noeon AI Extended Cognitive Parser
 * 
 * Parses advanced cognitive primitives introduced in v0.4:
 * 
 * Flow Control:
 * - WHEN_SALIENT: Attention-weighted conditional
 * - RUMINATE: Iterative thinking loop
 * - PERCEIVE_ALL: Parallel multi-channel perception
 * - COMPETE: Winner-take-all competition
 * - HABITUATE: Habit formation (fast-path caching)
 * - ON_SURPRISE: Prediction error handler
 * - DREAM: Offline background processing
 * - PRIME: Semantic priming
 * - INHIBIT: Pathway suppression
 * 
 * Multi-Agent:
 * - SPAWN: Create a cognitive agent
 * - DELEGATE: Assign task to best agent
 * - DEBATE: Multi-agent structured debate
 * - VOTE: Democratic decision
 * - SHARE: Share knowledge between agents
 * - DISMISS: Remove an agent
 * 
 * Evolution:
 * - EVOLVE: Trigger evolutionary cycle
 * - MUTATE: Create variation of a rule
 * - SYNTHESIZE: Generate new rule from patterns
 * - FREEZE: Protect a rule from mutation
 * 
 * LLM Integration:
 * - ASK: Direct LLM query
 * - THINK_WITH: Use specific model for reasoning
 * - EMBED: Get vector embedding
 */

function parseKV(input, lineNo) {
  const parts = input.match(/(?:[^\s"]+="[^"]*"|[^\s"]+)/g) || [];
  const out = {};
  for (const part of parts) {
    const m = part.match(/^([a-z_][a-z0-9_]*)=(.+)$/i);
    if (!m) continue;
    const key = m[1];
    const raw = m[2];
    out[key] = /^"[^"]*"$/.test(raw)
      ? raw.slice(1, -1)
      : /^\d+(\.\d+)?$/.test(raw)
        ? Number(raw)
        : /^(true|false)$/i.test(raw)
          ? raw.toLowerCase() === "true"
          : raw;
  }
  return out;
}

function parseQuoted(value) {
  const m = value.match(/^"([^"]*)"(.*)$/);
  if (m) return { quoted: m[1], rest: m[2].trim() };
  return { quoted: null, rest: value.trim() };
}

// ==================== Flow Control Parsers ====================

function parseWhenSalient(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    check: quoted || kv.check || "default",
    threshold: kv.threshold !== undefined ? Number(kv.threshold) : 0.5,
    relevance: kv.relevance !== undefined ? Number(kv.relevance) : 0.5,
    urgency: kv.urgency !== undefined ? Number(kv.urgency) : 0.5,
    emotionalWeight: kv.emotional_weight !== undefined ? Number(kv.emotional_weight) : 0,
    then: kv.then || "continue",
    exclusive: kv.exclusive !== undefined ? kv.exclusive : false
  };
}

function parseRuminate(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    topic: quoted || kv.topic || "unknown",
    maxIterations: kv.max_iterations !== undefined ? Number(kv.max_iterations) : 10,
    confidenceTarget: kv.confidence_target !== undefined ? Number(kv.confidence_target) : 0.85,
    decay: kv.decay !== undefined ? Number(kv.decay) : 0.05,
    breakOnCircular: kv.break_on_circular !== undefined ? kv.break_on_circular : true
  };
}

function parsePerceiveAll(value, lineNo) {
  const kv = parseKV(value, lineNo);
  return {
    channels: kv.channels ? kv.channels.split(",").map(c => c.trim()) : [],
    timeout: kv.timeout !== undefined ? Number(kv.timeout) : 5000,
    merge: kv.merge || "weighted",
    modalities: kv.modalities ? kv.modalities.split(",").map(m => m.trim()) : ["text"]
  };
}

function parseCompete(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    description: quoted || kv.description || "competition",
    candidates: kv.candidates ? kv.candidates.split(",").map(c => c.trim()) : [],
    strategy: kv.strategy || "strongest",
    timeout: kv.timeout !== undefined ? Number(kv.timeout) : 3000
  };
}

function parseHabituate(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    pattern: quoted || kv.pattern || "default",
    response: kv.response || "cached",
    ttl: kv.ttl !== undefined ? Number(kv.ttl) : 3600000,
    maxUses: kv.max_uses !== undefined ? Number(kv.max_uses) : 1000
  };
}

function parseOnSurprise(value, lineNo) {
  const kv = parseKV(value, lineNo);
  return {
    threshold: kv.threshold !== undefined ? Number(kv.threshold) : 0.7,
    action: kv.action || "alert",
    priority: kv.priority || "high",
    once: kv.once !== undefined ? kv.once : false
  };
}

function parseDream(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    task: quoted || kv.task || "consolidate",
    priority: kv.priority || "low",
    delay: kv.delay !== undefined ? Number(kv.delay) : 0
  };
}

function parsePrime(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    concept: quoted || kv.concept || "default",
    associations: kv.associations ? kv.associations.split(",").map(a => a.trim()) : [],
    strength: kv.strength !== undefined ? Number(kv.strength) : 0.7,
    ttl: kv.ttl !== undefined ? Number(kv.ttl) : 30000
  };
}

function parseInhibit(value, lineNo) {
  const kv = parseKV(value, lineNo);
  return {
    pathway: kv.pathway || kv.target || "default",
    duration: kv.duration !== undefined ? Number(kv.duration) : 5000,
    reason: kv.reason || "suppression"
  };
}

// ==================== Multi-Agent Parsers ====================

function parseSpawn(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    name: quoted || kv.name || `agent_${Date.now()}`,
    specialty: kv.specialty || "general",
    personality: kv.personality || "balanced",
    weight: kv.weight !== undefined ? Number(kv.weight) : 1.0
  };
}

function parseDelegate(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    task: quoted || kv.task || "unknown",
    to: kv.to || null, // null = auto-select best agent
    specialty: kv.specialty || null,
    priority: kv.priority || "medium",
    strategy: kv.strategy || "hybrid",
    timeout_ms: kv.timeout_ms !== undefined ? Number(kv.timeout_ms) : 10000
  };
}

function parseDebate(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    topic: quoted || kv.topic || "unknown",
    rounds: kv.rounds !== undefined ? Number(kv.rounds) : 3,
    protocol: kv.protocol || "socratic",
    consensus_threshold: kv.consensus_threshold !== undefined ? Number(kv.consensus_threshold) : 0.6
  };
}

function parseVote(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    proposal: quoted || kv.proposal || "unknown",
    quorum: kv.quorum !== undefined ? Number(kv.quorum) : 0.5,
    protocol: kv.protocol || "democratic"
  };
}

function parseShare(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    knowledge: quoted || kv.knowledge || "unknown",
    from: kv.from || "self",
    tags: kv.tags ? kv.tags.split(",").map(t => t.trim()) : []
  };
}

function parseDismiss(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    agent: quoted || kv.agent || "unknown",
    reason: kv.reason || "task_complete"
  };
}

// ==================== Evolution Parsers ====================

function parseEvolve(value, lineNo) {
  const kv = parseKV(value, lineNo);
  return {
    target: kv.target || "all",
    generations: kv.generations !== undefined ? Number(kv.generations) : 1,
    mutation_rate: kv.mutation_rate !== undefined ? Number(kv.mutation_rate) : 0.1,
    selection_pressure: kv.selection_pressure !== undefined ? Number(kv.selection_pressure) : 0.7
  };
}

function parseMutate(value, lineNo) {
  const kv = parseKV(value, lineNo);
  return {
    rule: kv.rule || kv.target || "unknown",
    type: kv.type || "random",
    intensity: kv.intensity !== undefined ? Number(kv.intensity) : 0.5
  };
}

function parseSynthesize(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    name: quoted || kv.name || "new_rule",
    type: kv.type || "rule",
    from: kv.from ? kv.from.split(",").map(f => f.trim()) : ["patterns", "elites"]
  };
}

function parseFreeze(value, lineNo) {
  const kv = parseKV(value, lineNo);
  return {
    rule: kv.rule || kv.target || "unknown",
    reason: kv.reason || "optimal"
  };
}

// ==================== LLM Integration Parsers ====================

function parseAsk(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    query: quoted || kv.query || "unknown",
    model: kv.model || "default",
    temperature: kv.temperature !== undefined ? Number(kv.temperature) : 0.7,
    max_tokens: kv.max_tokens !== undefined ? Number(kv.max_tokens) : 2048,
    context: kv.context || "workspace"
  };
}

function parseThinkWith(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    query: quoted || kv.query || "unknown",
    model: kv.model || "gpt-5-nano",
    strategy: kv.strategy || "analytical",
    depth: kv.depth !== undefined ? Number(kv.depth) : 3
  };
}

function parseEmbed(value, lineNo) {
  const { quoted, rest } = parseQuoted(value);
  const kv = parseKV(rest, lineNo);
  return {
    text: quoted || kv.text || "unknown",
    store_as: kv.store_as || null,
    tags: kv.tags ? kv.tags.split(",").map(t => t.trim()) : []
  };
}

module.exports = {
  // Flow Control
  parseWhenSalient,
  parseRuminate,
  parsePerceiveAll,
  parseCompete,
  parseHabituate,
  parseOnSurprise,
  parseDream,
  parsePrime,
  parseInhibit,
  // Multi-Agent
  parseSpawn,
  parseDelegate,
  parseDebate,
  parseVote,
  parseShare,
  parseDismiss,
  // Evolution
  parseEvolve,
  parseMutate,
  parseSynthesize,
  parseFreeze,
  // LLM
  parseAsk,
  parseThinkWith,
  parseEmbed
};
