/**
 * Predictive Processing Engine - Inspired by Friston's Free Energy Principle
 * 
 * The brain is fundamentally a prediction machine. It continuously:
 * 1. Generates predictions about incoming sensory data
 * 2. Compares predictions with actual perception
 * 3. Computes prediction error (surprise / free energy)
 * 4. Updates internal model to minimize future errors
 * 
 * This creates a continuous perception-action loop rather than
 * the traditional sequential execution model.
 */

class Prediction {
  constructor(statement, confidence = 0.5, model = "default") {
    this.id = `pred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.statement = statement;
    this.confidence = confidence;
    this.model = model;
    this.createdAt = Date.now();
    this.resolvedAt = null;
    this.outcome = null; // "confirmed" | "violated" | "partial"
    this.error = null;   // prediction error magnitude
    this.surprise = null; // -log(P(outcome|prediction))
  }

  resolve(actualOutcome) {
    this.resolvedAt = Date.now();
    this.outcome = actualOutcome.match ? "confirmed" : "violated";
    this.error = actualOutcome.error || 0;
    this.surprise = actualOutcome.surprise || 0;
    return this;
  }
}

class InternalModel {
  constructor(name = "world_model") {
    this.name = name;
    this.beliefs = new Map();  // key -> { value, confidence, lastUpdated }
    this.updateHistory = [];
    this.accuracy = 1.0; // running accuracy score
    this.totalPredictions = 0;
    this.correctPredictions = 0;
  }

  /**
   * Set a belief in the internal model
   */
  setBelief(key, value, confidence = 0.5) {
    this.beliefs.set(key, {
      value,
      confidence,
      lastUpdated: Date.now()
    });
  }

  /**
   * Get a belief
   */
  getBelief(key) {
    return this.beliefs.get(key) || null;
  }

  /**
   * Update model based on prediction error (Bayesian update)
   */
  update(predictionError, context) {
    const learningRate = Math.min(0.3, predictionError * 0.5);
    
    this.updateHistory.push({
      timestamp: Date.now(),
      error: predictionError,
      learningRate,
      context
    });

    // Update running accuracy
    this.totalPredictions += 1;
    if (predictionError < 0.3) {
      this.correctPredictions += 1;
    }
    this.accuracy = this.correctPredictions / this.totalPredictions;

    return { learningRate, newAccuracy: this.accuracy };
  }

  /**
   * Get model confidence (how well it's been predicting)
   */
  getModelConfidence() {
    if (this.totalPredictions === 0) return 0.5;
    return this.accuracy;
  }
}

class PredictiveEngine {
  constructor(workspace, memorySystem) {
    this.workspace = workspace;
    this.memory = memorySystem;
    this.model = new InternalModel();
    this.activePredictions = new Map();
    this.predictionHistory = [];
    this.surpriseThreshold = 0.6; // triggers reflection when exceeded
    this.listeners = new Map(); // event -> handlers
  }

  /**
   * Predict: Generate a prediction about future state
   */
  predict(statement, confidence = 0.5, modelName = "default") {
    const prediction = new Prediction(statement, confidence, modelName);
    this.activePredictions.set(prediction.id, prediction);

    // Store prediction in workspace for conscious access
    if (this.workspace) {
      this.workspace.focus(`prediction:${prediction.id}`, {
        type: "prediction",
        statement,
        confidence
      }, confidence);
    }

    return prediction;
  }

  /**
   * Perceive: Process incoming sensory data and compare with predictions
   */
  perceive(data, source = "external") {
    const perception = {
      id: `perc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      data,
      source,
      timestamp: Date.now(),
      matchedPredictions: []
    };

    // Compare with active predictions
    for (const [id, prediction] of this.activePredictions) {
      const comparison = this._comparePredictionWithReality(prediction, data);
      
      if (comparison.relevant) {
        prediction.resolve(comparison);
        perception.matchedPredictions.push({
          predictionId: id,
          error: comparison.error,
          surprise: comparison.surprise,
          outcome: comparison.match ? "confirmed" : "violated"
        });

        // Update internal model
        this.model.update(comparison.error, {
          prediction: prediction.statement,
          reality: data
        });

        // Move resolved prediction to history
        this.predictionHistory.push(prediction);
        this.activePredictions.delete(id);

        // Trigger surprise event if threshold exceeded
        if (comparison.surprise > this.surpriseThreshold) {
          this._emitEvent("surprise", {
            prediction,
            perception: data,
            surprise: comparison.surprise,
            error: comparison.error
          });
        }
      }
    }

    // Store perception in workspace
    if (this.workspace) {
      this.workspace.focus(`perception:${perception.id}`, {
        type: "perception",
        data,
        source,
        surpriseLevel: perception.matchedPredictions.reduce(
          (max, mp) => Math.max(max, mp.surprise), 0
        )
      });
    }

    return perception;
  }

  /**
   * ComputeError: Explicitly calculate prediction error
   */
  computeError(predictionId, actualData) {
    const prediction = this.activePredictions.get(predictionId);
    if (!prediction) {
      // Check history
      const historical = this.predictionHistory.find(p => p.id === predictionId);
      if (historical) {
        return { error: historical.error, surprise: historical.surprise, resolved: true };
      }
      return { error: null, surprise: null, notFound: true };
    }

    const comparison = this._comparePredictionWithReality(prediction, actualData);
    prediction.resolve(comparison);
    this.model.update(comparison.error, { prediction: prediction.statement, reality: actualData });
    this.predictionHistory.push(prediction);
    this.activePredictions.delete(predictionId);

    return {
      error: comparison.error,
      surprise: comparison.surprise,
      match: comparison.match,
      predictionConfidence: prediction.confidence,
      modelAccuracy: this.model.getModelConfidence()
    };
  }

  /**
   * OnSurprise: Register handler for high-surprise events
   */
  onSurprise(handler) {
    this._on("surprise", handler);
  }

  /**
   * GetModelState: For metacognitive monitoring
   */
  getModelState() {
    return {
      accuracy: this.model.getModelConfidence(),
      activePredictions: this.activePredictions.size,
      totalPredictions: this.model.totalPredictions,
      beliefs: Object.fromEntries(this.model.beliefs),
      recentHistory: this.predictionHistory.slice(-10).map(p => ({
        statement: p.statement,
        outcome: p.outcome,
        error: p.error,
        surprise: p.surprise
      }))
    };
  }

  /**
   * Active Inference: Take action to make predictions come true
   * (Rather than just passively updating the model)
   */
  activeInference(prediction, availableActions) {
    // Find actions that would make the prediction more likely to be true
    const scoredActions = availableActions.map(action => {
      // Simple heuristic: check if action description relates to prediction
      const relevance = this._textSimilarity(
        prediction.statement,
        action.description || action.name || ""
      );
      return { action, score: relevance * prediction.confidence };
    });

    scoredActions.sort((a, b) => b.score - a.score);
    return scoredActions[0] || null;
  }

  _comparePredictionWithReality(prediction, reality) {
    const predStr = prediction.statement.toLowerCase();
    const realStr = typeof reality === "string" ? reality.toLowerCase() : JSON.stringify(reality).toLowerCase();

    // Compute semantic similarity (simplified)
    const similarity = this._textSimilarity(predStr, realStr);
    const error = 1 - similarity;
    const surprise = -Math.log(Math.max(0.01, similarity));

    return {
      relevant: similarity > 0.1, // at least somewhat related
      match: similarity > 0.7,
      error,
      surprise: Math.min(surprise, 5), // cap surprise
      similarity
    };
  }

  _textSimilarity(text1, text2) {
    const tokens1 = new Set(text1.split(/\s+/).filter(t => t.length > 2));
    const tokens2 = new Set(text2.split(/\s+/).filter(t => t.length > 2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    let intersection = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) intersection++;
    }

    // Jaccard similarity
    const union = tokens1.size + tokens2.size - intersection;
    return intersection / union;
  }

  _on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  _emitEvent(event, data) {
    const handlers = this.listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (e) {
        // Don't let listener errors break the engine
      }
    }
  }
}

module.exports = { PredictiveEngine, Prediction, InternalModel };
