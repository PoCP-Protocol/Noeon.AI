/**
 * Social Brain - Multi-Agent Cognitive Collaboration
 * 
 * Brain analogy: Mirror neurons + Theory of Mind + Social cognition
 * 
 * In human brains, social intelligence emerges from the ability to:
 * - Model other minds (Theory of Mind)
 * - Collaborate and compete
 * - Share knowledge through communication
 * - Reach consensus through debate
 * - Specialize and delegate
 * 
 * This module enables multiple CognitiveEngines to form a "society of minds"
 * that can solve problems no single agent can handle alone.
 */

const { CognitiveEngine } = require("./cognitive-engine");

/**
 * AgentRole defines the specialization of a cognitive agent
 */
class AgentRole {
  constructor(config) {
    this.name = config.name;
    this.specialty = config.specialty || "general";
    this.personality = config.personality || "balanced";
    this.weight = config.weight || 1.0;
    this.trustScore = 1.0;
    this.contributions = 0;
    this.successRate = 1.0;
  }
}

/**
 * Message represents inter-agent communication
 */
class AgentMessage {
  constructor(from, to, type, content, metadata = {}) {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.from = from;
    this.to = to; // null = broadcast
    this.type = type; // "query" | "response" | "proposal" | "vote" | "consensus" | "challenge"
    this.content = content;
    this.metadata = metadata;
    this.timestamp = Date.now();
    this.acknowledged = false;
  }
}

/**
 * SocialBrain - Orchestrates multiple cognitive agents
 */
class SocialBrain {
  constructor(config = {}) {
    this.name = config.name || "social_brain";
    this.agents = new Map(); // name -> { engine, role }
    this.messageQueue = [];
    this.messageHistory = [];
    this.consensusThreshold = config.consensusThreshold || 0.6;
    this.maxDebateRounds = config.maxDebateRounds || 5;
    this.protocol = config.protocol || "democratic"; // democratic | hierarchical | meritocratic
    this.sharedMemory = new Map(); // Shared knowledge base
    this.stats = {
      messagesExchanged: 0,
      consensusReached: 0,
      debatesHeld: 0,
      tasksCompleted: 0
    };
  }

  /**
   * Spawn: Create a new cognitive agent with a specific role
   */
  spawn(name, roleConfig = {}, engineConfig = {}) {
    const role = new AgentRole({ name, ...roleConfig });
    const engine = new CognitiveEngine(engineConfig);

    this.agents.set(name, { engine, role });
    return { name, role, engine };
  }

  /**
   * Dismiss: Remove an agent from the society
   */
  dismiss(name) {
    return this.agents.delete(name);
  }

  /**
   * Broadcast: Send a message to all agents
   */
  broadcast(from, type, content, metadata = {}) {
    const message = new AgentMessage(from, null, type, content, metadata);
    this.messageQueue.push(message);
    this.messageHistory.push(message);
    this.stats.messagesExchanged++;
    return message;
  }

  /**
   * Send: Direct message to a specific agent
   */
  send(from, to, type, content, metadata = {}) {
    const message = new AgentMessage(from, to, type, content, metadata);
    this.messageQueue.push(message);
    this.messageHistory.push(message);
    this.stats.messagesExchanged++;
    return message;
  }

  /**
   * CollaborativeThink: All agents think about the same problem
   * Returns aggregated results weighted by role and trust
   */
  async collaborativeThink(query, options = {}) {
    const results = [];

    for (const [name, { engine, role }] of this.agents) {
      try {
        const thought = await engine.think(query, {
          ...options,
          agentRole: role.specialty
        });
        results.push({
          agent: name,
          role: role.specialty,
          weight: role.weight * role.trustScore,
          thought
        });
        role.contributions++;
      } catch (e) {
        results.push({
          agent: name,
          role: role.specialty,
          weight: 0,
          error: e.message
        });
      }
    }

    // Aggregate results
    const aggregated = this._aggregateThoughts(results);
    return {
      query,
      individualResults: results,
      aggregated,
      protocol: this.protocol
    };
  }

  /**
   * Debate: Structured multi-agent debate on a topic
   */
  async debate(topic, options = {}) {
    const rounds = options.rounds || this.maxDebateRounds;
    const protocol = options.protocol || "socratic";
    const debateLog = [];

    this.stats.debatesHeld++;

    const agentList = Array.from(this.agents.entries());
    if (agentList.length < 2) {
      return { error: "Need at least 2 agents for debate", topic };
    }

    for (let round = 0; round < rounds; round++) {
      const roundEntries = [];

      for (const [name, { engine, role }] of agentList) {
        // Each agent considers previous arguments
        const context = {
          topic,
          round: round + 1,
          previousArguments: debateLog,
          role: role.specialty,
          protocol
        };

        const cogAST = {
          drives: [{ description: `argue ${role.specialty} perspective on: ${topic}`, priority: "high", energy: 1.0 }],
          predictions: [{ statement: `My ${role.specialty} perspective will add value`, confidence: 0.7, model: "default" }],
          intuitions: [{ query: topic, using: "pattern_match", threshold: 0.5, max_latency_ms: 500 }],
          reasonings: [{
            strategy: protocol === "socratic" ? "abductive" : "deductive",
            depth: 3,
            breadth: 2,
            context: "workspace",
            timeout_ms: 5000
          }],
          decisions: [{ action: "present_argument", threshold: 0.4, mode: "satisfice", fallback: "abstain", valence_weight: 0.2 }]
        };

        const result = await engine.execute(cogAST);

        const entry = {
          agent: name,
          role: role.specialty,
          round: round + 1,
          thoughts: result.thoughts,
          decision: result.decisions[0],
          timestamp: Date.now()
        };

        roundEntries.push(entry);
        this.broadcast(name, "argument", entry);
      }

      debateLog.push(...roundEntries);

      // Check for early consensus
      if (round > 0) {
        const consensus = this._checkConsensus(roundEntries);
        if (consensus.reached) {
          return {
            topic,
            protocol,
            rounds: debateLog,
            consensus: consensus.position,
            confidence: consensus.confidence,
            roundsUsed: round + 1,
            earlyStop: true
          };
        }
      }
    }

    // Final vote
    const verdict = await this._finalVote(topic, debateLog);

    return {
      topic,
      protocol,
      rounds: debateLog,
      verdict,
      roundsUsed: rounds,
      earlyStop: false
    };
  }

  /**
   * Delegate: Assign a task to the most suitable agent
   */
  async delegate(task, requirements = {}) {
    const bestAgent = this._selectAgent(requirements);
    if (!bestAgent) {
      return { error: "No suitable agent found", task, requirements };
    }

    const [name, { engine, role }] = bestAgent;

    const cogAST = {
      drives: [{ description: task, priority: requirements.priority || "medium", energy: 1.0 }],
      workspace: { name: `task_${Date.now()}`, capacity: 7, decay: "time_based", ttl: 60 },
      reasonings: [{
        strategy: requirements.strategy || "hybrid",
        depth: requirements.depth || 4,
        breadth: requirements.breadth || 3,
        context: "workspace",
        timeout_ms: requirements.timeout_ms || 10000
      }],
      decisions: [{ action: "complete_task", threshold: 0.5, mode: "satisfice", fallback: "escalate", valence_weight: 0.1 }],
      reflections: [{ subject: task, depth: "shallow", trigger: "completion", output: "insight" }]
    };

    const result = await engine.execute(cogAST);

    // Update trust score based on outcome
    const success = result.decisions[0]?.approved || false;
    role.trustScore = role.trustScore * 0.9 + (success ? 0.1 : 0);
    role.successRate = (role.successRate * role.contributions + (success ? 1 : 0)) / (role.contributions + 1);

    return {
      delegatedTo: name,
      role: role.specialty,
      task,
      result,
      success
    };
  }

  /**
   * ShareKnowledge: One agent shares learned knowledge with others
   */
  shareKnowledge(fromAgent, knowledge, tags = []) {
    const entry = {
      from: fromAgent,
      knowledge,
      tags,
      sharedAt: Date.now(),
      adoptedBy: []
    };

    const key = `knowledge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.sharedMemory.set(key, entry);

    // Broadcast to all agents
    this.broadcast(fromAgent, "knowledge_share", { key, knowledge, tags });

    return { key, entry };
  }

  /**
   * Vote: Democratic decision making
   */
  async vote(proposal, options = {}) {
    const votes = [];
    const quorum = options.quorum || 0.5;

    for (const [name, { engine, role }] of this.agents) {
      const thought = await engine.think(proposal);
      const vote = {
        agent: name,
        role: role.specialty,
        weight: this.protocol === "meritocratic" ? role.trustScore * role.weight : role.weight,
        approve: thought.confidence > 0.5,
        confidence: thought.confidence
      };
      votes.push(vote);
    }

    const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
    const approveWeight = votes.filter(v => v.approve).reduce((sum, v) => sum + v.weight, 0);
    const approvalRatio = totalWeight > 0 ? approveWeight / totalWeight : 0;

    const result = {
      proposal,
      votes,
      approvalRatio,
      passed: approvalRatio >= quorum,
      quorum,
      protocol: this.protocol
    };

    if (result.passed) this.stats.consensusReached++;
    return result;
  }

  /**
   * GetSocialState: Overview of the social brain
   */
  getSocialState() {
    const agents = [];
    for (const [name, { role }] of this.agents) {
      agents.push({
        name,
        specialty: role.specialty,
        weight: role.weight,
        trustScore: role.trustScore,
        contributions: role.contributions,
        successRate: role.successRate
      });
    }

    return {
      name: this.name,
      agentCount: this.agents.size,
      agents,
      protocol: this.protocol,
      sharedKnowledge: this.sharedMemory.size,
      stats: this.stats,
      recentMessages: this.messageHistory.slice(-10)
    };
  }

  // ==================== Private Methods ====================

  _aggregateThoughts(results) {
    const validResults = results.filter(r => !r.error && r.thought);
    if (validResults.length === 0) {
      return { answer: null, confidence: 0, method: "no_valid_results" };
    }

    // Weighted average confidence
    const totalWeight = validResults.reduce((sum, r) => sum + r.weight, 0);
    const weightedConfidence = validResults.reduce(
      (sum, r) => sum + r.thought.confidence * r.weight, 0
    ) / totalWeight;

    // Find majority answer (simplified)
    const answers = validResults.map(r => ({
      answer: r.thought.answer,
      weight: r.weight
    }));

    // Pick highest-weighted answer
    answers.sort((a, b) => b.weight - a.weight);

    return {
      answer: answers[0].answer,
      confidence: weightedConfidence,
      method: this.protocol,
      contributors: validResults.length,
      totalWeight
    };
  }

  _checkConsensus(roundEntries) {
    const approvedCount = roundEntries.filter(e => e.decision && e.decision.approved).length;
    const ratio = approvedCount / roundEntries.length;

    return {
      reached: ratio >= this.consensusThreshold,
      position: ratio >= this.consensusThreshold ? "approve" : "undecided",
      confidence: ratio,
      votes: roundEntries.length
    };
  }

  async _finalVote(topic, debateLog) {
    const votes = [];
    for (const [name, { engine, role }] of this.agents) {
      const thought = await engine.think(`Final verdict on: ${topic}`);
      votes.push({
        agent: name,
        approve: thought.confidence > 0.5,
        confidence: thought.confidence,
        weight: role.weight * role.trustScore
      });
    }

    const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
    const approveWeight = votes.filter(v => v.approve).reduce((sum, v) => sum + v.weight, 0);

    return {
      decision: approveWeight / totalWeight > this.consensusThreshold ? "approve" : "reject",
      confidence: approveWeight / totalWeight,
      votes
    };
  }

  _selectAgent(requirements) {
    let bestMatch = null;
    let bestScore = -1;

    for (const entry of this.agents.entries()) {
      const [name, { role }] = entry;
      let score = role.trustScore * role.weight;

      // Bonus for matching specialty
      if (requirements.specialty && role.specialty === requirements.specialty) {
        score *= 2;
      }

      // Bonus for high success rate
      score *= role.successRate;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }
}

module.exports = { SocialBrain, AgentRole, AgentMessage };
