/**
 * LLM Bridge - Connects Noeon's Cognitive Engine to real AI models
 * 
 * This module bridges the gap between Noeon's cognitive architecture
 * and actual Large Language Models. It allows System 2 (deep reasoning)
 * to leverage real AI inference, making the language truly intelligent.
 * 
 * Brain analogy: The "language center" (Broca's + Wernicke's areas)
 * that enables symbolic reasoning through natural language.
 * 
 * Supports: OpenAI-compatible APIs (GPT, Claude, Gemini, etc.)
 */

const https = require("https");
const http = require("http");

class LLMBridge {
  constructor(config = {}) {
    this.apiBase = config.apiBase || process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.defaultModel = config.model || "gpt-5-nano";
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 2048;
    this.timeout = config.timeout || 30000;

    // Cognitive context for prompts
    this.systemPrompt = config.systemPrompt || this._defaultSystemPrompt();

    // Request history for learning
    this.history = [];
    this.stats = {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      totalTokens: 0,
      avgLatency: 0
    };
  }

  /**
   * Reason: Deep reasoning through LLM
   * Used by System 2 when it needs real AI inference
   */
  async reason(query, context = {}) {
    const messages = this._buildReasoningPrompt(query, context);
    const result = await this._call(messages, {
      temperature: 0.3, // Lower temp for reasoning
      model: context.model || this.defaultModel
    });

    return {
      conclusion: result.content,
      confidence: this._estimateConfidence(result),
      reasoning_tokens: result.usage?.completion_tokens || 0,
      model: result.model,
      latency: result.latency
    };
  }

  /**
   * Intuit: Fast pattern recognition through LLM (System 1 augmentation)
   * Uses lower max_tokens and higher temperature for quick responses
   */
  async intuit(query, context = {}) {
    const messages = this._buildIntuitionPrompt(query, context);
    const result = await this._call(messages, {
      temperature: 0.8,
      maxTokens: 256, // Keep it fast
      model: context.model || this.defaultModel
    });

    return {
      judgment: result.content,
      confidence: this._estimateConfidence(result),
      latency: result.latency
    };
  }

  /**
   * Reflect: Metacognitive analysis through LLM
   * Asks the AI to analyze its own reasoning process
   */
  async reflect(subject, memories = [], context = {}) {
    const messages = this._buildReflectionPrompt(subject, memories, context);
    const result = await this._call(messages, {
      temperature: 0.5,
      model: context.model || this.defaultModel
    });

    let insights = [];
    try {
      const parsed = JSON.parse(result.content);
      insights = parsed.insights || [parsed];
    } catch {
      insights = [{ type: "narrative", content: result.content }];
    }

    return {
      insights,
      recommendations: this._extractRecommendations(result.content),
      latency: result.latency
    };
  }

  /**
   * Predict: Generate predictions about future states
   */
  async predict(statement, evidence = [], context = {}) {
    const messages = this._buildPredictionPrompt(statement, evidence, context);
    const result = await this._call(messages, {
      temperature: 0.4,
      model: context.model || this.defaultModel
    });

    let prediction;
    try {
      prediction = JSON.parse(result.content);
    } catch {
      prediction = {
        assessment: result.content,
        confidence: 0.5,
        reasoning: "Unstructured response"
      };
    }

    return {
      ...prediction,
      model: result.model,
      latency: result.latency
    };
  }

  /**
   * Debate: Multi-perspective reasoning (internal debate)
   */
  async debate(topic, perspectives = 2, rounds = 2, context = {}) {
    const debateLog = [];

    for (let round = 0; round < rounds; round++) {
      const roundResults = [];
      for (let p = 0; p < perspectives; p++) {
        const messages = this._buildDebatePrompt(topic, p, debateLog, context);
        const result = await this._call(messages, {
          temperature: 0.7 + (p * 0.1), // Vary temperature for diversity
          model: context.model || this.defaultModel
        });
        roundResults.push({
          perspective: p + 1,
          argument: result.content,
          round: round + 1
        });
      }
      debateLog.push(...roundResults);
    }

    // Synthesize final judgment
    const synthesisMessages = this._buildSynthesisPrompt(topic, debateLog);
    const synthesis = await this._call(synthesisMessages, {
      temperature: 0.3,
      model: context.model || this.defaultModel
    });

    return {
      topic,
      rounds: debateLog,
      synthesis: synthesis.content,
      confidence: this._estimateConfidence(synthesis)
    };
  }

  /**
   * Embed: Get text embeddings for semantic memory
   * Falls back to simple hash if embedding API not available
   */
  async embed(text) {
    try {
      const url = new URL(`${this.apiBase}/embeddings`);
      const body = JSON.stringify({
        model: "text-embedding-3-small",
        input: text
      });

      const result = await this._httpRequest(url, body);
      const parsed = JSON.parse(result.body);

      if (parsed.data && parsed.data[0] && parsed.data[0].embedding) {
        return {
          vector: parsed.data[0].embedding,
          dimensions: parsed.data[0].embedding.length,
          model: "text-embedding-3-small"
        };
      }
    } catch {
      // Fallback: simple hash-based pseudo-embedding
    }

    return {
      vector: this._pseudoEmbed(text),
      dimensions: 64,
      model: "pseudo-hash"
    };
  }

  // ==================== Private Methods ====================

  async _call(messages, options = {}) {
    const start = Date.now();
    this.stats.totalCalls++;

    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxTokens || this.maxTokens;

    const body = JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    });

    try {
      const url = new URL(`${this.apiBase}/chat/completions`);
      const result = await this._httpRequest(url, body);
      const parsed = JSON.parse(result.body);

      if (parsed.error) {
        throw new Error(parsed.error.message || "API error");
      }

      const latency = Date.now() - start;
      this.stats.successCalls++;
      this.stats.totalTokens += (parsed.usage?.total_tokens || 0);
      this.stats.avgLatency = (this.stats.avgLatency * (this.stats.successCalls - 1) + latency) / this.stats.successCalls;

      const response = {
        content: parsed.choices[0]?.message?.content || "",
        model: parsed.model || model,
        usage: parsed.usage,
        latency,
        finishReason: parsed.choices[0]?.finish_reason
      };

      this.history.push({
        timestamp: Date.now(),
        messages: messages.slice(-2), // Keep last user + assistant
        response: response.content.slice(0, 200),
        latency,
        model
      });

      // Bound history
      if (this.history.length > 100) {
        this.history = this.history.slice(-50);
      }

      return response;
    } catch (error) {
      this.stats.failedCalls++;
      return {
        content: `[LLM Error: ${error.message}]`,
        model,
        usage: null,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  _httpRequest(url, body) {
    return new Promise((resolve, reject) => {
      const protocol = url.protocol === "https:" ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Length": Buffer.byteLength(body)
        },
        timeout: this.timeout
      };

      const req = protocol.request(options, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => resolve({ body: data, status: res.statusCode }));
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.write(body);
      req.end();
    });
  }

  _buildReasoningPrompt(query, context) {
    const messages = [
      { role: "system", content: this.systemPrompt },
    ];

    if (context.workspace) {
      messages.push({
        role: "system",
        content: `Current workspace state:\n${JSON.stringify(context.workspace, null, 2)}`
      });
    }

    if (context.memories && context.memories.length > 0) {
      messages.push({
        role: "system",
        content: `Relevant memories:\n${context.memories.map(m => `- ${JSON.stringify(m.content)}`).join("\n")}`
      });
    }

    const strategy = context.strategy || "analytical";
    messages.push({
      role: "user",
      content: `Using ${strategy} reasoning, analyze the following:\n\n${typeof query === "string" ? query : JSON.stringify(query)}\n\nProvide your conclusion with confidence level (0-1) and reasoning chain.`
    });

    return messages;
  }

  _buildIntuitionPrompt(query, context) {
    return [
      {
        role: "system",
        content: "You are a fast-thinking intuition module. Give brief, immediate gut-feeling responses. Be concise — one or two sentences max. Trust your pattern recognition."
      },
      {
        role: "user",
        content: `Quick intuition: ${typeof query === "string" ? query : JSON.stringify(query)}`
      }
    ];
  }

  _buildReflectionPrompt(subject, memories, context) {
    const memoryContext = memories.length > 0
      ? `\nPast experiences:\n${memories.map(m => `- ${JSON.stringify(m.content)} (strength: ${m.strength})`).join("\n")}`
      : "";

    return [
      {
        role: "system",
        content: `You are a metacognitive reflection module. Analyze patterns, identify biases, and generate actionable insights. Respond in JSON format: {"insights": [...], "patterns": [...], "recommendations": [...]}`
      },
      {
        role: "user",
        content: `Reflect on: "${subject}"${memoryContext}\n\nWhat patterns do you see? What should be improved?`
      }
    ];
  }

  _buildPredictionPrompt(statement, evidence, context) {
    const evidenceStr = evidence.length > 0
      ? `\nSupporting evidence:\n${evidence.map(e => `- ${e}`).join("\n")}`
      : "";

    return [
      {
        role: "system",
        content: `You are a predictive processing module. Evaluate predictions and estimate their likelihood. Respond in JSON: {"confidence": 0.0-1.0, "assessment": "...", "reasoning": "...", "alternative_outcomes": [...]}`
      },
      {
        role: "user",
        content: `Evaluate this prediction: "${statement}"${evidenceStr}\n\nHow likely is this to be true?`
      }
    ];
  }

  _buildDebatePrompt(topic, perspectiveIndex, previousRounds, context) {
    const perspective = perspectiveIndex === 0 ? "advocate" : "critic";
    const previousContext = previousRounds.length > 0
      ? `\nPrevious arguments:\n${previousRounds.map(r => `[P${r.perspective} R${r.round}]: ${r.argument}`).join("\n")}`
      : "";

    return [
      {
        role: "system",
        content: `You are the ${perspective} in an internal debate. ${perspective === "advocate" ? "Argue FOR the position with evidence." : "Challenge the position, find weaknesses and counterarguments."} Be rigorous and specific.`
      },
      {
        role: "user",
        content: `Topic: "${topic}"${previousContext}\n\nPresent your ${perspective} argument.`
      }
    ];
  }

  _buildSynthesisPrompt(topic, debateLog) {
    const debateStr = debateLog.map(r =>
      `[Perspective ${r.perspective}, Round ${r.round}]: ${r.argument}`
    ).join("\n\n");

    return [
      {
        role: "system",
        content: "You are a synthesis module. After hearing all perspectives in a debate, form a balanced conclusion. Weigh evidence from all sides."
      },
      {
        role: "user",
        content: `Topic: "${topic}"\n\nDebate transcript:\n${debateStr}\n\nSynthesize a final balanced conclusion.`
      }
    ];
  }

  _estimateConfidence(result) {
    if (result.error) return 0;
    // Heuristic: longer, more detailed responses tend to be more confident
    const length = (result.content || "").length;
    const hasStructure = result.content.includes("{") || result.content.includes("because") || result.content.includes("therefore");
    let confidence = 0.5;
    if (length > 200) confidence += 0.1;
    if (length > 500) confidence += 0.1;
    if (hasStructure) confidence += 0.1;
    if (result.finishReason === "stop") confidence += 0.1;
    return Math.min(0.95, confidence);
  }

  _extractRecommendations(text) {
    const recommendations = [];
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.match(/recommend|suggest|should|improve|consider/i)) {
        recommendations.push(line.trim());
      }
    }
    return recommendations.slice(0, 5);
  }

  _pseudoEmbed(text) {
    // Simple deterministic pseudo-embedding for fallback
    const vector = new Array(64).fill(0);
    const tokens = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      for (let j = 0; j < token.length; j++) {
        const idx = (token.charCodeAt(j) * (i + 1) * (j + 1)) % 64;
        vector[idx] += 1 / (1 + Math.abs(i - tokens.length / 2));
      }
    }
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / magnitude);
  }

  _defaultSystemPrompt() {
    return `You are the reasoning core of a Noeon AI cognitive engine — a brain-inspired artificial intelligence system. You process information through:
1. Predictive processing: You predict outcomes and update beliefs based on errors
2. Dual-system thinking: You can provide quick intuitions or deep analytical reasoning
3. Metacognition: You monitor your own confidence and uncertainty
4. Memory integration: You consider past experiences when reasoning

Always be precise, evidence-based, and transparent about your confidence level.
When uncertain, say so explicitly. When reasoning, show your chain of thought.`;
  }

  /**
   * Get bridge statistics
   */
  getStats() {
    return { ...this.stats };
  }
}

module.exports = { LLMBridge };
