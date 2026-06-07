/**
 * Multi-Modal Perception System
 * 
 * CORE COMPETITIVE ADVANTAGE #5: The language can SEE, HEAR, and FEEL.
 * 
 * Traditional languages process text/numbers. Noeon perceives the world
 * through multiple channels simultaneously, just like the human brain:
 * 
 * - Visual cortex: Image understanding, pattern recognition
 * - Auditory cortex: Speech, music, sound events
 * - Somatosensory: Structured data as "touch" (pressure, temperature = metrics)
 * - Proprioception: Internal state awareness (system metrics)
 * - Temporal: Time-series patterns, rhythm detection
 * 
 * All modalities feed into the Global Workspace where they compete for
 * attention and get integrated into a unified percept.
 * 
 * Brain analogy: The thalamus routes sensory input to appropriate cortical
 * areas, which process in parallel and report back to consciousness.
 */

class Percept {
  constructor(config) {
    this.id = `percept_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.modality = config.modality; // visual | auditory | textual | numerical | temporal | proprioceptive
    this.raw = config.raw; // Raw input data
    this.processed = null; // Processed representation
    this.features = config.features || {}; // Extracted features
    this.salience = config.salience || 0.5;
    this.confidence = config.confidence || 0.7;
    this.timestamp = Date.now();
    this.source = config.source || "external";
    this.bound = false; // Whether it's been bound into a unified percept
  }
}

class PerceptualChannel {
  constructor(name, modality, config = {}) {
    this.name = name;
    this.modality = modality;
    this.active = true;
    this.sensitivity = config.sensitivity || 0.5; // How much input triggers perception
    this.filter = config.filter || null; // Pre-attention filter
    this.buffer = []; // Recent percepts
    this.bufferSize = config.bufferSize || 50;
    this.processors = []; // Processing pipeline
    this.stats = { received: 0, processed: 0, filtered: 0 };
  }

  receive(input) {
    this.stats.received++;

    // Pre-attention filter
    if (this.filter && !this.filter(input)) {
      this.stats.filtered++;
      return null;
    }

    // Create percept
    const percept = new Percept({
      modality: this.modality,
      raw: input,
      salience: this._estimateSalience(input),
      source: this.name
    });

    // Run processing pipeline
    for (const processor of this.processors) {
      percept.features = { ...percept.features, ...processor(percept.raw) };
    }
    percept.processed = percept.features;

    // Buffer
    this.buffer.push(percept);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    this.stats.processed++;
    return percept;
  }

  addProcessor(fn) {
    this.processors.push(fn);
  }

  _estimateSalience(input) {
    // Novelty-based salience estimation
    if (this.buffer.length === 0) return 0.8; // First input is always salient

    const recent = this.buffer.slice(-5);
    const inputStr = JSON.stringify(input);
    const similarity = recent.reduce((sum, p) => {
      return sum + (JSON.stringify(p.raw) === inputStr ? 1 : 0);
    }, 0) / recent.length;

    // Less similar to recent = more salient (novelty)
    return Math.max(this.sensitivity, 1 - similarity);
  }
}

class MultiModalPerception {
  constructor(config = {}) {
    this.channels = new Map();
    this.unifiedPercepts = []; // Bound multi-modal percepts
    this.attentionWeights = new Map(); // modality -> weight
    this.crossModalBindings = []; // Cross-modal associations
    this.gestaltRules = []; // Rules for perceptual grouping

    // Default channels
    this._initDefaultChannels();

    // Attention
    this.attentionFocus = null; // Current focus modality
    this.attentionBandwidth = config.bandwidth || 7; // Miller's magic number

    // Stats
    this.stats = {
      totalPercepts: 0,
      boundPercepts: 0,
      crossModalBindings: 0,
      attentionShifts: 0
    };
  }

  /**
   * SENSE: Receive input on a specific channel
   */
  sense(channelName, input) {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.active) return null;

    const percept = channel.receive(input);
    if (!percept) return null;

    this.stats.totalPercepts++;

    // Try cross-modal binding
    this._attemptBinding(percept);

    return percept;
  }

  /**
   * LOOK: Visual perception (images, patterns, spatial)
   */
  look(input, config = {}) {
    const features = this._processVisual(input, config);
    return this.sense("visual", { input, features, config });
  }

  /**
   * LISTEN: Auditory perception (speech, sounds, music)
   */
  listen(input, config = {}) {
    const features = this._processAuditory(input, config);
    return this.sense("auditory", { input, features, config });
  }

  /**
   * READ: Textual perception (language understanding)
   */
  read(input, config = {}) {
    const features = this._processTextual(input, config);
    return this.sense("textual", { input, features, config });
  }

  /**
   * MEASURE: Numerical/metric perception (data streams)
   */
  measure(input, config = {}) {
    const features = this._processNumerical(input, config);
    return this.sense("numerical", { input, features, config });
  }

  /**
   * FEEL_TIME: Temporal perception (rhythms, sequences)
   */
  feelTime(input, config = {}) {
    const features = this._processTemporal(input, config);
    return this.sense("temporal", { input, features, config });
  }

  /**
   * INTROSPECT: Proprioceptive perception (internal state)
   */
  introspect(systemState) {
    const features = this._processProprioceptive(systemState);
    return this.sense("proprioceptive", { input: systemState, features });
  }

  /**
   * PERCEIVE_ALL: Parallel multi-modal perception
   * Receive from all active channels simultaneously
   */
  perceiveAll(inputs) {
    const percepts = [];

    for (const [channelName, input] of Object.entries(inputs)) {
      const percept = this.sense(channelName, input);
      if (percept) percepts.push(percept);
    }

    // Attempt unified binding
    if (percepts.length >= 2) {
      const unified = this._bindPercepts(percepts);
      if (unified) {
        this.unifiedPercepts.push(unified);
        this.stats.boundPercepts++;
      }
      return unified || percepts;
    }

    return percepts;
  }

  /**
   * ATTEND: Shift attention to a specific modality
   */
  attend(modality, config = {}) {
    const prevFocus = this.attentionFocus;
    this.attentionFocus = modality;

    // Boost sensitivity of attended channel
    const channel = this.channels.get(modality);
    if (channel) {
      channel.sensitivity = Math.min(1.0, channel.sensitivity + 0.2);
    }

    // Reduce sensitivity of unattended channels
    for (const [name, ch] of this.channels) {
      if (name !== modality) {
        ch.sensitivity = Math.max(0.1, ch.sensitivity - 0.05);
      }
    }

    if (prevFocus !== modality) {
      this.stats.attentionShifts++;
    }

    return { previous: prevFocus, current: modality };
  }

  /**
   * REGISTER_CHANNEL: Add a new perceptual channel
   */
  registerChannel(name, modality, config = {}) {
    const channel = new PerceptualChannel(name, modality, config);
    this.channels.set(name, channel);
    this.attentionWeights.set(name, config.weight || 0.5);
    return channel;
  }

  /**
   * ADD_GESTALT: Add a perceptual grouping rule
   * (e.g., "things that move together belong together")
   */
  addGestalt(name, rule) {
    this.gestaltRules.push({ name, rule, uses: 0 });
  }

  /**
   * GET_UNIFIED: Get the most recent unified percept
   */
  getUnified(limit = 1) {
    return this.unifiedPercepts.slice(-limit);
  }

  /**
   * Get state of the perceptual system
   */
  getState() {
    return {
      channels: Array.from(this.channels.entries()).map(([name, ch]) => ({
        name,
        modality: ch.modality,
        active: ch.active,
        sensitivity: ch.sensitivity,
        buffered: ch.buffer.length,
        stats: ch.stats
      })),
      attentionFocus: this.attentionFocus,
      unifiedPercepts: this.unifiedPercepts.length,
      stats: this.stats
    };
  }

  // ==================== Processing Pipelines ====================

  _processVisual(input, config) {
    const features = {
      type: "visual",
      hasColor: false,
      hasMotion: false,
      complexity: 0,
      patterns: [],
      objects: []
    };

    if (typeof input === "string") {
      // URL or path — mark for async processing
      features.source = input;
      features.requiresAsync = true;
    } else if (typeof input === "object") {
      // Structured visual data
      if (input.width && input.height) {
        features.dimensions = { width: input.width, height: input.height };
        features.complexity = (input.width * input.height) / 1000000;
      }
      if (input.colors) features.hasColor = true;
      if (input.objects) features.objects = input.objects;
      if (input.patterns) features.patterns = input.patterns;
    }

    // Spatial relationship detection
    if (features.objects.length >= 2) {
      features.spatialRelations = this._detectSpatialRelations(features.objects);
    }

    return features;
  }

  _processAuditory(input, config) {
    const features = {
      type: "auditory",
      hasSpeech: false,
      hasMusic: false,
      volume: 0,
      tempo: null,
      keywords: []
    };

    if (typeof input === "string") {
      // Could be text (speech content) or URL
      if (input.startsWith("http") || input.endsWith(".mp3") || input.endsWith(".wav")) {
        features.source = input;
        features.requiresAsync = true;
      } else {
        // Treat as speech content
        features.hasSpeech = true;
        features.transcript = input;
        features.keywords = this._extractKeywords(input);
        features.sentiment = this._quickSentiment(input);
      }
    } else if (typeof input === "object") {
      if (input.transcript) features.hasSpeech = true;
      if (input.bpm) { features.hasMusic = true; features.tempo = input.bpm; }
      if (input.volume) features.volume = input.volume;
      Object.assign(features, input);
    }

    return features;
  }

  _processTextual(input, config) {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    const features = {
      type: "textual",
      length: text.length,
      wordCount: text.split(/\s+/).length,
      keywords: this._extractKeywords(text),
      sentiment: this._quickSentiment(text),
      complexity: this._textComplexity(text),
      entities: this._extractEntities(text),
      intent: this._detectIntent(text),
      language: this._detectLanguage(text)
    };

    return features;
  }

  _processNumerical(input, config) {
    const features = {
      type: "numerical",
      values: [],
      stats: {},
      anomalies: [],
      trend: null
    };

    if (typeof input === "number") {
      features.values = [input];
      features.stats = { mean: input, min: input, max: input, count: 1 };
    } else if (Array.isArray(input)) {
      features.values = input.filter(v => typeof v === "number");
      if (features.values.length > 0) {
        const sorted = [...features.values].sort((a, b) => a - b);
        const sum = features.values.reduce((a, b) => a + b, 0);
        const mean = sum / features.values.length;
        const variance = features.values.reduce((s, v) => s + (v - mean) ** 2, 0) / features.values.length;

        features.stats = {
          mean,
          median: sorted[Math.floor(sorted.length / 2)],
          min: sorted[0],
          max: sorted[sorted.length - 1],
          variance,
          stddev: Math.sqrt(variance),
          count: features.values.length
        };

        // Detect trend
        if (features.values.length >= 3) {
          const firstHalf = features.values.slice(0, Math.floor(features.values.length / 2));
          const secondHalf = features.values.slice(Math.floor(features.values.length / 2));
          const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          features.trend = secondMean > firstMean * 1.05 ? "rising" :
                          secondMean < firstMean * 0.95 ? "falling" : "stable";
        }

        // Detect anomalies (> 2 stddev from mean)
        const threshold = features.stats.stddev * 2;
        features.anomalies = features.values
          .map((v, i) => ({ value: v, index: i, deviation: Math.abs(v - mean) }))
          .filter(a => a.deviation > threshold);
      }
    } else if (typeof input === "object") {
      // Key-value metrics
      features.metrics = input;
      features.values = Object.values(input).filter(v => typeof v === "number");
    }

    return features;
  }

  _processTemporal(input, config) {
    const features = {
      type: "temporal",
      timestamps: [],
      intervals: [],
      rhythm: null,
      periodicity: null
    };

    if (Array.isArray(input)) {
      features.timestamps = input.filter(v => typeof v === "number").sort((a, b) => a - b);

      if (features.timestamps.length >= 2) {
        // Calculate intervals
        for (let i = 1; i < features.timestamps.length; i++) {
          features.intervals.push(features.timestamps[i] - features.timestamps[i - 1]);
        }

        // Detect rhythm (regular intervals)
        if (features.intervals.length >= 3) {
          const mean = features.intervals.reduce((a, b) => a + b, 0) / features.intervals.length;
          const variance = features.intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / features.intervals.length;
          const cv = Math.sqrt(variance) / mean; // Coefficient of variation

          if (cv < 0.2) {
            features.rhythm = "regular";
            features.periodicity = mean;
          } else if (cv < 0.5) {
            features.rhythm = "semi-regular";
            features.periodicity = mean;
          } else {
            features.rhythm = "irregular";
          }
        }
      }
    }

    return features;
  }

  _processProprioceptive(systemState) {
    const features = {
      type: "proprioceptive",
      health: "normal",
      load: 0,
      alerts: []
    };

    if (typeof systemState === "object") {
      // CPU/Memory as "body awareness"
      if (systemState.cpuLoad !== undefined) {
        features.load = systemState.cpuLoad;
        if (systemState.cpuLoad > 0.9) {
          features.health = "stressed";
          features.alerts.push("high_cognitive_load");
        }
      }
      if (systemState.memoryUsage !== undefined) {
        if (systemState.memoryUsage > 0.85) {
          features.alerts.push("memory_pressure");
        }
      }
      if (systemState.errorRate !== undefined) {
        if (systemState.errorRate > 0.1) {
          features.health = "impaired";
          features.alerts.push("high_error_rate");
        }
      }
      Object.assign(features, systemState);
    }

    return features;
  }

  // ==================== Binding & Integration ====================

  _attemptBinding(newPercept) {
    // Try to bind with recent percepts from other modalities
    const recentWindow = 2000; // 2 second binding window
    const now = Date.now();

    for (const [name, channel] of this.channels) {
      if (channel.modality === newPercept.modality) continue;

      const recent = channel.buffer.filter(p =>
        !p.bound && (now - p.timestamp) < recentWindow
      );

      for (const candidate of recent) {
        if (this._shouldBind(newPercept, candidate)) {
          this._createBinding(newPercept, candidate);
        }
      }
    }
  }

  _shouldBind(a, b) {
    // Temporal proximity
    const timeDiff = Math.abs(a.timestamp - b.timestamp);
    if (timeDiff > 2000) return false;

    // Semantic similarity (if both have keywords)
    if (a.features?.keywords && b.features?.keywords) {
      const overlap = a.features.keywords.filter(k =>
        b.features.keywords.includes(k)
      );
      if (overlap.length > 0) return true;
    }

    // Gestalt rules
    for (const gestalt of this.gestaltRules) {
      if (gestalt.rule(a, b)) {
        gestalt.uses++;
        return true;
      }
    }

    return false;
  }

  _createBinding(a, b) {
    a.bound = true;
    b.bound = true;

    const binding = {
      id: `bind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      percepts: [a, b],
      modalities: [a.modality, b.modality],
      timestamp: Date.now(),
      confidence: (a.confidence + b.confidence) / 2,
      salience: Math.max(a.salience, b.salience)
    };

    this.crossModalBindings.push(binding);
    this.stats.crossModalBindings++;

    return binding;
  }

  _bindPercepts(percepts) {
    return {
      id: `unified_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      percepts,
      modalities: percepts.map(p => p.modality),
      features: percepts.reduce((acc, p) => ({ ...acc, [p.modality]: p.features }), {}),
      timestamp: Date.now(),
      salience: Math.max(...percepts.map(p => p.salience)),
      confidence: percepts.reduce((sum, p) => sum + p.confidence, 0) / percepts.length
    };
  }

  // ==================== NLP Utilities ====================

  _extractKeywords(text) {
    const stopwords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "shall", "can", "need", "dare", "ought", "used",
      "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
      "through", "during", "before", "after", "above", "below", "between", "and",
      "but", "or", "nor", "not", "so", "yet", "both", "either", "neither", "each",
      "every", "all", "any", "few", "more", "most", "other", "some", "such", "no",
      "only", "own", "same", "than", "too", "very", "just", "because", "this", "that"]);

    return text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w))
      .reduce((acc, word) => {
        if (!acc.includes(word)) acc.push(word);
        return acc;
      }, [])
      .slice(0, 10);
  }

  _quickSentiment(text) {
    const positive = ["good", "great", "excellent", "amazing", "wonderful", "fantastic",
      "love", "happy", "joy", "success", "win", "beautiful", "perfect", "best"];
    const negative = ["bad", "terrible", "awful", "horrible", "hate", "sad", "fail",
      "error", "wrong", "worst", "ugly", "broken", "crash", "danger", "risk"];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    for (const w of words) {
      if (positive.includes(w)) score += 0.1;
      if (negative.includes(w)) score -= 0.1;
    }
    return Math.max(-1, Math.min(1, score));
  }

  _textComplexity(text) {
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const words = text.split(/\s+/);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : words.length;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1);

    // Simplified Flesch-Kincaid-like score
    return Math.min(1.0, (avgSentenceLength / 30 + avgWordLength / 10) / 2);
  }

  _extractEntities(text) {
    const entities = [];
    // Simple pattern-based entity extraction
    const patterns = [
      { type: "number", regex: /\b\d+\.?\d*\b/g },
      { type: "url", regex: /https?:\/\/[^\s]+/g },
      { type: "email", regex: /[\w.-]+@[\w.-]+\.\w+/g },
      { type: "date", regex: /\d{4}-\d{2}-\d{2}/g },
      { type: "capitalized", regex: /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g }
    ];

    for (const { type, regex } of patterns) {
      const matches = text.match(regex) || [];
      for (const match of matches.slice(0, 5)) {
        entities.push({ type, value: match });
      }
    }
    return entities;
  }

  _detectIntent(text) {
    const lower = text.toLowerCase();
    if (lower.match(/\?$|^(what|who|where|when|why|how|is|are|can|do|does)/)) return "question";
    if (lower.match(/^(please|could you|would you|can you|do|make|create|build)/)) return "request";
    if (lower.match(/^(i think|i believe|in my opinion|perhaps|maybe)/)) return "opinion";
    if (lower.match(/^(alert|warning|error|danger|urgent)/)) return "alert";
    return "statement";
  }

  _detectLanguage(text) {
    // Very simplified language detection
    if (/[\u4e00-\u9fff]/.test(text)) return "zh";
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
    if (/[\uac00-\ud7af]/.test(text)) return "ko";
    if (/[а-яА-Я]/.test(text)) return "ru";
    return "en";
  }

  _detectSpatialRelations(objects) {
    const relations = [];
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        if (objects[i].x !== undefined && objects[j].x !== undefined) {
          const dx = objects[j].x - objects[i].x;
          const dy = (objects[j].y || 0) - (objects[i].y || 0);
          const relation = dx > 0 ? "right_of" : "left_of";
          relations.push({ a: objects[i].id || i, b: objects[j].id || j, relation });
        }
      }
    }
    return relations;
  }

  // ==================== Channel Management ====================

  _initDefaultChannels() {
    this.registerChannel("visual", "visual", { sensitivity: 0.6 });
    this.registerChannel("auditory", "auditory", { sensitivity: 0.5 });
    this.registerChannel("textual", "textual", { sensitivity: 0.7 });
    this.registerChannel("numerical", "numerical", { sensitivity: 0.4 });
    this.registerChannel("temporal", "temporal", { sensitivity: 0.3 });
    this.registerChannel("proprioceptive", "proprioceptive", { sensitivity: 0.6 });
  }
}

module.exports = { MultiModalPerception, PerceptualChannel, Percept };
