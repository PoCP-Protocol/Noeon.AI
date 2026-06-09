'use strict';

/**
 * World Model Runtime — uncertainty-native beliefs + KnowledgeGraph causality +
 * predictive error loop + optional cross-run memory.
 */

const { UncertainValue } = require('../runtime/cognitive/stream-of-consciousness');
const { KnowledgeGraph } = require('../runtime/cognitive/knowledge-graph');
const {
  loadWorldModelMemory,
  saveWorldModelMemory,
  resolveMemoryOptions
} = require('./cognitive-memory-store');

const WORLD_MODEL_SCHEMA = 'noeon.world.model/v1';

const CAUSAL_RELATION_TYPES = new Set([
  'causes',
  'enables',
  'selects',
  'reasoned_via',
  'informed_by',
  'prevent'
]);

function clamp(n, fallback = 0.5) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(1, x));
}

function tokenSimilarity(a, b) {
  const t1 = new Set(String(a).toLowerCase().split(/\s+/).filter((t) => t.length > 2));
  const t2 = new Set(String(b).toLowerCase().split(/\s+/).filter((t) => t.length > 2));
  if (!t1.size || !t2.size) return 0;
  let inter = 0;
  for (const t of t1) if (t2.has(t)) inter += 1;
  return inter / (t1.size + t2.size - inter);
}

function graphRelationType(type) {
  if (type === 'selects' || type === 'reasoned_via') return 'causes';
  if (type === 'informed_by' || type === 'supported_by' || type === 'hypothesized') return 'enables';
  if (type === 'observes') return 'correlates';
  return CAUSAL_RELATION_TYPES.has(type) ? type : 'correlates';
}

class WorldModelRuntime {
  constructor(options = {}) {
    this.schema = WORLD_MODEL_SCHEMA;
    this.goal = options.goal || null;
    this.beliefs = new Map();
    this.relations = [];
    this.observations = [];
    this.hypotheses = [];
    this.revisions = [];
    this.strategies = [];
    this.constraints = [];
    this.graph = new KnowledgeGraph();
    this.activePredictions = [];
    this.predictionErrors = [];
    this.causalInsights = [];
    this.lastPercept = null;
    this.lastDecision = null;
    this._memoryOptions = options.memoryOptions || null;
    this._seq = 0;
  }

  static fromAst(ast, options = {}) {
    const memoryOpts = resolveMemoryOptions(ast, options);
    const wm = new WorldModelRuntime({ memoryOptions: memoryOpts });
    wm.seedFromAst(ast);

    if (memoryOpts.persist) {
      const prior = loadWorldModelMemory(memoryOpts);
      if (prior?.worldModel) wm.mergePriorSnapshot(prior.worldModel);
    }
    if (options.checkpoint_resume?.worldModel) {
      wm.mergePriorSnapshot(options.checkpoint_resume.worldModel);
      wm.revisions.push({
        op: 'checkpoint_resume',
        checkpoint_id: options.checkpoint_resume.id,
        ts: Date.now()
      });
    }
    return wm;
  }

  mergePriorSnapshot(prior) {
    for (const b of prior.beliefs || []) {
      if (!b.key) continue;
      this.setBelief(b.key, b.value, b.confidence, { source: 'memory', kind: b.kind || 'recalled' });
      this.graph.know(b.key, b.kind || 'belief', { _confidence: b.confidence });
    }
    this.revisions.push({
      op: 'memory_recall',
      belief_count: (prior.beliefs || []).length,
      ts: Date.now()
    });
  }

  seedFromAst(ast) {
    if (!ast || typeof ast !== 'object') return this;

    const goal = ast.cognition?.goal
      || ast.general?.programs?.[0]?.objective
      || ast.agents?.[0]?.goal
      || ast.task
      || null;

    if (goal) {
      this.goal = String(goal);
      this.setBelief('goal', this.goal, 1.0, { source: 'intent', kind: 'goal' });
      this.graph.know('goal', 'goal', { _confidence: 1.0, text: this.goal });
    }

    for (const u of ast.cognition?.understandings || []) {
      if (u.kind === 'model' || u.name) this.ingestDeclaredModel(u);
    }

    for (const h of ast.cognition?.hypotheses || []) {
      this.addHypothesis(h.claim || h.id, clamp(h.confidence, 0.5), h.source || 'program');
    }

    for (const r of ast.cognitive?.reasonings || []) {
      if (r.candidate || r.strategy) {
        this.strategies.push({
          name: r.candidate || r.strategy,
          objective: r.premises?.[0] || this.goal,
          risk: r.risk || 'medium',
          confidence: clamp(r.confidence, 0.55)
        });
        this.relate('goal', r.candidate || r.strategy, 'evaluates', clamp(r.confidence, 0.55));
      }
    }

    for (const rule of ast.metaRules || []) {
      if (rule.type === 'next_guarantee' || rule.expr) {
        this.constraints.push({
          name: rule.name || rule.id || 'constraint',
          expr: rule.expr || rule.expression || null
        });
        this.setBelief(
          `constraint:${rule.name || 'guard'}`,
          rule.expr || rule.name,
          1.0,
          { source: 'guarantee', kind: 'constraint' }
        );
      }
    }

    return this;
  }

  syncGraphEntity(id, kind, confidence, extra = {}) {
    this.graph.know(String(id), kind || 'belief', { _confidence: confidence, ...extra });
  }

  ingestDeclaredModel(model) {
    const name = model.name || model.id || `model_${++this._seq}`;
    const conf = clamp(model.confidence ?? model.params?.confidence, 0.7);
    const source = model.source || model.params?.source || 'declared';
    this.setBelief(
      name,
      { source, type: 'world-state', declared: true },
      conf,
      { source: 'model', kind: 'world-state', label: name }
    );
    this.syncGraphEntity(name, 'world-state', conf, { source });
    this.revisions.push({ op: 'declare_model', target: name, confidence: conf, source, ts: Date.now() });
  }

  setBelief(key, value, confidence, meta = {}) {
    const prev = this.beliefs.get(key);
    const uv = prev instanceof UncertainValue
      ? prev.update(value, confidence, meta.source || 'inference')
      : new UncertainValue(value, confidence, { source: meta.source || 'direct', ...meta });

    this.beliefs.set(key, uv);
    this.syncGraphEntity(key, meta.kind || 'belief', uv.confidence);

    if (prev) {
      this.revisions.push({
        op: 'revise_belief',
        target: key,
        from: prev.value,
        to: value,
        confidence: uv.confidence,
        source: meta.source || 'inference',
        ts: Date.now()
      });
    }
    return uv;
  }

  getBelief(key) {
    const b = this.beliefs.get(key);
    return b instanceof UncertainValue ? b : null;
  }

  relate(from, to, type, confidence = 0.6) {
    const edge = {
      from: String(from),
      to: String(to),
      type,
      confidence: clamp(confidence),
      ts: Date.now()
    };
    this.relations.push(edge);
    this.graph.relate(edge.from, edge.to, graphRelationType(type), {
      confidence: edge.confidence,
      weight: edge.confidence
    });
  }

  addHypothesis(claim, confidence, source = 'inference') {
    const id = `hyp_${++this._seq}`;
    this.hypotheses.push({ id, claim: String(claim), confidence: clamp(confidence), source, ts: Date.now() });
    this.setBelief(id, claim, confidence, { source, kind: 'hypothesis' });
    if (this.goal) this.relate(this.goal, id, 'hypothesized', confidence);
    this.revisions.push({ op: 'hypothesis', target: id, claim, confidence, source, ts: Date.now() });
    return id;
  }

  observe(percept) {
    const modality = percept.modality || 'text';
    const source = percept.source || 'environment';
    const obs = { id: `obs_${++this._seq}`, modality, source, ts: Date.now() };
    this.observations.push(obs);
    this.lastPercept = { modality, source, percept };
    this.setBelief(
      obs.id,
      { modality, source, processed: percept.processed !== false },
      clamp(percept.confidence, 0.76),
      { source: 'perceive', kind: 'observation' }
    );
    this.relate(source, obs.id, 'observes', 0.8);
    this.revisions.push({ op: 'observe', target: obs.id, modality, source, ts: obs.ts });
    this.resolvePredictionsAgainstReality(percept);
    return obs;
  }

  registerPrediction(result) {
    const target = result.target || result.statement;
    if (!target) return null;
    const conf = clamp(result.confidence, 0.6);
    const entry = {
      id: `pred_${++this._seq}`,
      target: String(target),
      confidence: conf,
      assessment: result.assessment || null,
      ts: Date.now(),
      resolved: false
    };
    this.activePredictions.push(entry);
    this.setBelief(entry.id, target, conf, { source: 'predict', kind: 'prediction' });
    this.revisions.push({ op: 'predict', target: entry.id, statement: target, confidence: conf, ts: entry.ts });

    if (this.lastPercept) {
      this.resolvePredictionsAgainstReality(this.lastPercept.percept || this.lastPercept);
    }
    return entry;
  }

  resolvePredictionsAgainstReality(reality) {
    const realityText = typeof reality === 'string'
      ? reality
      : JSON.stringify({
        modality: reality.modality,
        source: reality.source,
        processed: reality.processed
      });

    for (const pred of this.activePredictions) {
      if (pred.resolved) continue;
      const similarity = tokenSimilarity(pred.target, realityText);
      const error = Number((1 - similarity).toFixed(3));
      const surprise = Number(Math.min(5, -Math.log(Math.max(0.01, similarity))).toFixed(3));
      const outcome = similarity > 0.55 ? 'confirmed' : 'violated';

      pred.resolved = true;
      pred.error = error;
      pred.surprise = surprise;
      pred.outcome = outcome;

      this.predictionErrors.push({
        prediction: pred.target,
        error,
        surprise,
        outcome,
        ts: Date.now()
      });

      const newConf = clamp(pred.confidence * (1 - error * 0.5), 0.2);
      this.setBelief(pred.id, pred.target, newConf, { source: 'prediction_error', kind: 'prediction' });

      this.revisions.push({
        op: 'prediction_error',
        target: pred.id,
        error,
        surprise,
        outcome,
        ts: Date.now()
      });

      if (surprise > 1.2) {
        this.relate(pred.id, 'reflection:surprise', 'causes', clamp(surprise / 5, 0.9));
      }
    }
    this.activePredictions = this.activePredictions.filter((p) => !p.resolved);
  }

  ingestReasoning(result) {
    const hypothesis = result.hypothesis || result.conclusion || result.result;
    if (!hypothesis) return null;
    const conf = clamp(result.confidence, 0.62);
    const id = this.addHypothesis(hypothesis, conf, result.provenance || 'reason');
    for (const ev of result.evidence || []) {
      const evId = `ev_${String(ev.claim || 'x').slice(0, 40)}`;
      this.syncGraphEntity(evId, 'evidence', clamp(ev.confidence, conf));
      this.graph.relate(id, evId, 'supported_by', { confidence: clamp(ev.confidence, conf) });
      this.relate(id, ev.claim?.slice(0, 80) || 'evidence', 'supported_by', clamp(ev.confidence, conf));
    }
    if (this.goal) this.relate(this.goal, id, 'reasoned_via', conf);
    return id;
  }

  ingestDecision(decision) {
    const chosen = decision.chosen || decision.action;
    if (!chosen) return null;
    const conf = clamp(decision.confidence, 0.6);
    this.lastDecision = String(chosen);
    this.setBelief(`decision:${chosen}`, chosen, conf, { source: 'decide', kind: 'decision' });
    this.syncGraphEntity(`decision:${chosen}`, 'decision', conf);
    this.relate(this.goal || 'goal', chosen, 'selects', conf);
    this.graph.cause(this.goal || 'goal', chosen, conf);
    for (const ref of decision.evidence_refs || []) {
      this.relate(chosen, ref, 'informed_by', conf);
      this.graph.relate(chosen, ref, 'enables', { confidence: conf });
    }
    this.revisions.push({
      op: 'decide',
      target: chosen,
      rationale: decision.rationale || null,
      confidence: conf,
      ts: Date.now()
    });
    return chosen;
  }

  runCausalReflection() {
    const target = this.lastDecision || (this.goal ? 'goal' : null);
    if (!target) {
      return { target: null, chains: [], directCauses: [] };
    }
    const why = this.graph.why(target, 4);
    const causes = this.graph.whatCauses ? this.graph.whatCauses(target) : null;
    const insight = {
      target,
      chains: (why || []).slice(0, 3).map((c) => ({
        strength: c.strength,
        steps: c.steps?.map((s) => ({ from: s.from, to: s.to, relation: s.relation, confidence: s.confidence }))
      })),
      directCauses: causes?.direct?.map((r) => ({ from: r.source, confidence: r.confidence })) || [],
      ts: Date.now()
    };
    if (insight.chains.length || insight.directCauses.length) {
      this.causalInsights.push(insight);
      this.revisions.push({ op: 'causal_reflect', target, chain_count: insight.chains.length, ts: insight.ts });
    }
    return insight;
  }

  ingestReflection(result) {
    const passed = result.passed !== false;
    const conf = clamp(result.confidence, passed ? 0.75 : 0.45);
    this.setBelief(
      'reflection:last',
      { passed, type: result.type || 'reflection' },
      conf,
      { source: 'reflect', kind: 'meta' }
    );
    for (const ev of result.evidence || []) {
      if (ev.claim && this.goal) {
        this.relate('reflection:last', ev.claim.slice(0, 64), passed ? 'confirms' : 'questions', clamp(ev.confidence, conf));
      }
    }
    const causal = this.runCausalReflection();
    this.revisions.push({ op: 'reflect', passed, confidence: conf, causal_target: causal.target, ts: Date.now() });
  }

  ingestPrediction(result) {
    return this.registerPrediction(result);
  }

  ingestPhase(phase, operation, result) {
    if (!result || result.error) return;
    switch (phase) {
      case 'perceive':
        this.observe(result);
        break;
      case 'process':
        if (result.operation === 'understand' || result.mode === 'understand') {
          const claim = result.conclusion || result.result || result.hypothesis;
          if (claim) this.addHypothesis(claim, clamp(result.confidence, 0.72), 'understand');
        } else {
          this.ingestReasoning(result);
        }
        break;
      case 'decide':
        this.ingestDecision(result);
        break;
      case 'validate':
        this.ingestReflection(result);
        break;
      case 'predict':
        this.ingestPrediction(result);
        break;
      case 'learn':
        this.setBelief(
          'learning:last_signal',
          result.signal || 'reward',
          clamp(result.amount ? 0.5 + result.amount : 0.6, 0.6),
          { source: 'learn', kind: 'adaptation' }
        );
        this.revisions.push({ op: 'learn', signal: result.signal, ts: Date.now() });
        break;
      default:
        break;
    }
  }

  serializeBelief(key, uv) {
    if (!(uv instanceof UncertainValue)) return null;
    return {
      key,
      value: uv.value,
      confidence: uv.confidence,
      uncertainty: uv.uncertainty,
      source: uv.source,
      kind: uv.kind || null
    };
  }

  snapshot() {
    const beliefs = [];
    for (const [key, uv] of this.beliefs) {
      const row = this.serializeBelief(key, uv);
      if (row) beliefs.push(row);
    }

    const snap = {
      schema: WORLD_MODEL_SCHEMA,
      goal: this.goal,
      beliefs,
      relations: this.relations.slice(-64),
      observations: this.observations,
      hypotheses: this.hypotheses.slice(-32),
      strategies: this.strategies,
      constraints: this.constraints,
      revisions: this.revisions.slice(-48),
      predictionErrors: this.predictionErrors.slice(-16),
      causalInsights: this.causalInsights.slice(-8),
      graph: {
        entities: this.graph.stats.entities,
        relations: this.graph.stats.relations,
        causalLinks: this.graph.stats.causalLinks,
        inferencesRun: this.graph.stats.inferencesRun
      },
      stats: {
        belief_count: beliefs.length,
        relation_count: this.relations.length,
        revision_count: this.revisions.length,
        prediction_errors: this.predictionErrors.length,
        causal_insights: this.causalInsights.length,
        avg_confidence: beliefs.length
          ? Number((beliefs.reduce((s, b) => s + b.confidence, 0) / beliefs.length).toFixed(3))
          : null
      }
    };

    if (this._memoryOptions?.persist) {
      snap.memoryPath = saveWorldModelMemory(snap, this._memoryOptions);
    }
    return snap;
  }
}

function buildWorldModelReport(result = {}, ast = null, options = {}) {
  const memoryOpts = resolveMemoryOptions(ast, {
    ...options,
    filename: options.filename || result.filename
  });
  if (result.worldModel?.schema === WORLD_MODEL_SCHEMA) return result.worldModel;
  if (result.cognitive?.worldModel?.schema === WORLD_MODEL_SCHEMA) return result.cognitive.worldModel;
  if (result.cognitive?.trace?.length) {
    const wm = WorldModelRuntime.fromAst(ast, { ...options, ...memoryOpts });
    for (const entry of result.cognitive.trace) {
      wm.ingestPhase(entry.phase, entry.operation, entry.result);
    }
    return wm.snapshot();
  }
  return WorldModelRuntime.fromAst(ast, { ...options, ...memoryOpts }).snapshot();
}

module.exports = {
  WORLD_MODEL_SCHEMA,
  WorldModelRuntime,
  buildWorldModelReport,
  tokenSimilarity,
  graphRelationType
};
