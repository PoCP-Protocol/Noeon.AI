'use strict';

/**
 * Structured cognitive evidence — mandatory artifacts for each reasoning phase.
 * Mock and live paths share the same schema (no bare strings in reports).
 */

const { COGNITIVE_CYCLE } = require('./cognitive-architecture');
const { extractActionTrace } = require('./action-trace');

const EVIDENCE_SCHEMA = 'noeon.cognitive.evidence/v1';

const REQUIRED_PHASES = ['perceive', 'reason', 'decide', 'act', 'reflect'];

function clampConfidence(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function resolveGoal(ast, result) {
  return result?.report?.intent?.goal
    || ast?.cognition?.goal
    || ast?.agents?.[0]?.goal
    || ast?.general?.programs?.[0]?.objective
    || null;
}

function goalFromContext(ctx) {
  if (ctx?.goals?.[0]?.description) return ctx.goals[0].description;
  const ast = ctx?.noeonAst;
  return ast?.cognition?.goal
    || ast?.general?.programs?.[0]?.objective
    || ast?.agents?.[0]?.goal
    || null;
}

function provenanceFromRaw(raw) {
  if (raw?.provenance) return raw.provenance;
  if (raw?.llm === 'live') return 'live';
  if (raw?.llm === 'mock') return 'mock';
  if (raw?.model && raw.model !== 'noeon-mock') return 'live';
  if (raw?.simulated || raw?.mocked) return 'mock';
  return 'deterministic';
}

function buildDeterministicReasonEvidence(params = {}, goal = null) {
  const strategy = params.strategy || 'deductive';
  const hypothesis = goal
    ? `Goal "${goal}" is addressable via ${strategy} reasoning`
    : `Proceed with ${strategy} analysis on declared program steps`;
  return [
    {
      claim: hypothesis,
      source: 'inference',
      confidence: clampConfidence(params.confidence ?? params.confidence_floor, 0.65)
    },
    {
      claim: `Strategy "${strategy}" taken from program declaration`,
      source: 'program',
      confidence: 0.92
    }
  ];
}

function enrichUnderstandResult(node, ctx) {
  const conf = clampConfidence(node.params.confidence ?? node.params.confidence_floor, 0.72);
  const goal = goalFromContext(ctx);
  const method = node.params.method || 'semantic';
  const contextLabel = node.params.context || 'current_context';
  return {
    operation: 'understand',
    mode: 'understand',
    method,
    context: contextLabel,
    confidence: conf,
    hypothesis: `Intent interpreted in context "${contextLabel}" via ${method}`,
    evidence: [
      { claim: `Context channel: ${contextLabel}`, source: 'percept', confidence: conf },
      {
        claim: goal ? `Objective aligned: ${goal}` : 'Developer intent summarized from input',
        source: 'inference',
        confidence: conf
      }
    ],
    result: goal ? `Understood objective: ${goal}` : 'Intent understood',
    conclusion: goal ? `Understood objective: ${goal}` : 'Intent understood',
    provenance: 'deterministic'
  };
}

function enrichAnalyticalResult(raw, node, ctx) {
  const goal = goalFromContext(ctx);
  const strategy = node.params.strategy || raw.strategy || 'deductive';
  const confidence = clampConfidence(raw.confidence, 0.62);
  const conclusion = raw.conclusion || raw.result
    || (goal ? `Reasoning supports "${goal}"` : `Completed ${strategy} reasoning`);
  const hypothesis = raw.hypothesis
    || (goal ? `Analysis supports progressing toward: ${goal}` : conclusion);
  return {
    ...raw,
    strategy,
    hypothesis,
    confidence,
    conclusion,
    evidence: raw.evidence || buildDeterministicReasonEvidence(node.params, goal),
    provenance: provenanceFromRaw(raw)
  };
}

function enrichIntuitiveResult(raw, node) {
  const confidence = clampConfidence(raw.confidence ?? node.params.confidence_floor, 0.55);
  const judgment = raw.result || raw.judgment || `intuition:${node.params.pattern || 'general'}`;
  return {
    ...raw,
    confidence,
    hypothesis: judgment,
    evidence: raw.evidence || [{
      claim: judgment,
      source: 'intuition',
      confidence
    }],
    conclusion: judgment,
    provenance: provenanceFromRaw(raw)
  };
}

function enrichDecideResult(decision, ctx) {
  const reasoning = ctx.getFromWorkspace('reasoning_result');
  const understanding = ctx.getFromWorkspace('understanding');
  const refs = [];
  if (reasoning) refs.push('reasoning_result');
  if (understanding) refs.push('understanding');

  const rationale = decision.influenced_by
    ? `Workspace "${decision.influenced_by}" informed choice "${decision.chosen}"`
    : `Confidence ${clampConfidence(decision.confidence, ctx.confidence)} vs threshold ${decision.threshold ?? 0.6}`;

  return {
    ...decision,
    evidence_refs: refs,
    rationale,
    evidence: [
      ...(reasoning?.evidence?.slice(0, 2) || []),
      {
        claim: rationale,
        source: 'policy',
        confidence: clampConfidence(decision.confidence, ctx.confidence)
      }
    ]
  };
}

function enrichValidationResult(result) {
  const details = result.details || {};
  const insights = details.insights || [];
  const evidence = insights.length
    ? insights.map((item) => ({
      claim: typeof item === 'string' ? item : (item.content || JSON.stringify(item)),
      source: 'reflection',
      confidence: 0.72
    }))
    : [{
      claim: result.passed ? 'Reflection criteria satisfied' : 'Reflection criteria not met',
      source: 'validation',
      confidence: result.passed ? 0.78 : 0.42
    }];

  if (details.avg_confidence != null) {
    evidence.push({
      claim: `Average belief confidence ${Number(details.avg_confidence).toFixed(3)}`,
      source: 'beliefs',
      confidence: clampConfidence(details.avg_confidence, 0.5)
    });
  }

  return {
    ...result,
    hypothesis: result.type === 'reflection' ? 'Execution quality assessed' : null,
    evidence,
    confidence: clampConfidence(details.avg_confidence, result.passed ? 0.75 : 0.45),
    provenance: details.llm === 'engaged' ? 'live' : details.llm === 'mock' ? 'mock' : 'deterministic'
  };
}

function enrichPerceiveResult(percept) {
  return {
    ...percept,
    evidence: [{
      claim: `Perceived ${percept.modality || 'input'} from ${percept.source || 'environment'}`,
      source: percept.source || 'percept',
      confidence: 0.76
    }],
    confidence: 0.76,
    provenance: 'deterministic'
  };
}

function mapProcessPhase(entry) {
  const raw = entry.result || {};
  if (raw.operation === 'understand' || raw.mode === 'understand') return 'reason';
  if (entry.phase === 'process') return 'reason';
  return entry.phase;
}

function normalizeTraceEntry(entry, ctxMeta = {}) {
  const raw = entry.result || {};
  const logicalPhase = entry.phase === 'process' ? mapProcessPhase(entry) : entry.phase;
  const ts = entry.timestamp || Date.now();
  const base = {
    id: `${logicalPhase}:${entry.operation}:${ts}`,
    phase: logicalPhase,
    operation: entry.operation,
    timestamp: ts,
    source: 'kernel',
    provenance: provenanceFromRaw(raw)
  };

  if (entry.phase === 'perceive') {
    return {
      ...base,
      hypothesis: null,
      evidence: raw.evidence || [{
        claim: `Perceived ${raw.modality || 'input'} from ${raw.source || 'environment'}`,
        source: raw.source || 'percept',
        confidence: clampConfidence(raw.confidence, 0.76)
      }],
      confidence: clampConfidence(raw.confidence, 0.76),
      decision: null,
      outcome: raw.processed ? 'perception_complete' : 'perception_pending'
    };
  }

  if (entry.phase === 'process') {
    const conf = clampConfidence(raw.confidence, 0.62);
    return {
      ...base,
      hypothesis: raw.hypothesis || raw.conclusion || raw.result || null,
      evidence: Array.isArray(raw.evidence) && raw.evidence.length
        ? raw.evidence
        : [{ claim: String(raw.result || raw.conclusion || 'processed'), source: 'inference', confidence: conf }],
      confidence: conf,
      decision: null,
      outcome: raw.conclusion || raw.result || raw.hypothesis || null
    };
  }

  if (entry.phase === 'decide') {
    const chosen = raw.chosen || raw.action;
    return {
      ...base,
      hypothesis: null,
      evidence: raw.evidence || [{
        claim: raw.rationale || `Selected "${chosen}"`,
        source: 'policy',
        confidence: clampConfidence(raw.confidence, 0.6)
      }],
      confidence: clampConfidence(raw.confidence, 0.6),
      decision: {
        chosen,
        alternatives: raw.options || (raw.fallback ? [raw.fallback] : []),
        rationale: raw.rationale || null,
        evidence_refs: raw.evidence_refs || []
      },
      outcome: chosen
    };
  }

  if (entry.phase === 'validate') {
    return {
      ...base,
      phase: 'reflect',
      hypothesis: raw.hypothesis || (raw.type === 'reflection' ? 'Execution quality assessed' : null),
      evidence: raw.evidence || [{
        claim: raw.passed ? 'Validation passed' : 'Validation failed',
        source: 'validation',
        confidence: raw.passed ? 0.78 : 0.42
      }],
      confidence: clampConfidence(raw.confidence, raw.passed ? 0.75 : 0.45),
      decision: null,
      outcome: raw.passed ? 'validated' : 'validation_failed'
    };
  }

  if (entry.phase === 'collaborate') {
    const isAct = raw.mode === 'delegate' || raw.plugin || raw.receipt;
    return {
      ...base,
      phase: 'act',
      hypothesis: null,
      evidence: [{
        claim: isAct
          ? `Action ${raw.action} via ${raw.plugin || 'runtime'} (${raw.status || 'done'})`
          : (raw.outcome || 'collaboration completed'),
        source: raw.plugin || 'runtime',
        confidence: raw.status === 'done' ? 0.88 : 0.52
      }],
      confidence: raw.status === 'done' ? 0.88 : 0.52,
      decision: isAct
        ? { chosen: raw.action, alternatives: [], rationale: raw.reason || 'program act binding', evidence_refs: [] }
        : null,
      outcome: raw.content || raw.outcome || raw.status
    };
  }

  if (entry.phase === 'learn') {
    return {
      ...base,
      hypothesis: `Learning signal: ${raw.signal || 'reward'}`,
      evidence: [{
        claim: `Applied ${raw.signal || 'reward'} signal (amount ${raw.amount ?? 0.1})`,
        source: 'feedback',
        confidence: 0.66
      }],
      confidence: 0.66,
      decision: null,
      outcome: raw.signal || 'learned'
    };
  }

  return {
    ...base,
    hypothesis: null,
    evidence: [{ claim: JSON.stringify(raw).slice(0, 180), source: 'kernel', confidence: 0.5 }],
    confidence: 0.5,
    decision: null,
    outcome: raw.outcome || raw.result || null
  };
}

function actionToEvidence(action, index) {
  return {
    id: `act:${action.action}:${index}`,
    phase: 'act',
    operation: 'act',
    timestamp: Date.now(),
    source: 'action',
    provenance: action.mocked || action.simulated ? 'mock' : 'deterministic',
    hypothesis: null,
    evidence: [{
      claim: `${action.action} [${action.plugin || 'builtin'}] ${action.status}${action.signed ? ' signed' : ''}`,
      source: action.plugin || action.source || 'act',
      confidence: action.status === 'done' ? 0.9 : 0.4
    }],
    confidence: action.status === 'done' ? 0.9 : 0.4,
    decision: {
      chosen: action.action,
      alternatives: [],
      rationale: action.reason || null,
      evidence_refs: []
    },
    outcome: action.content || action.status
  };
}

function buildCognitiveEvidence(result = {}, ast = null) {
  const trace = result.cognitive?.trace || result.trace || [];
  const goal = resolveGoal(ast, result);
  const artifacts = [];

  for (const entry of trace) {
    artifacts.push(normalizeTraceEntry(entry, { goal }));
  }

  const actionTrace = extractActionTrace(result);
  for (let i = 0; i < actionTrace.actions.length; i += 1) {
    const ev = actionToEvidence(actionTrace.actions[i], i);
    const dup = artifacts.some(
      (a) => a.phase === 'act'
        && a.decision?.chosen === ev.decision?.chosen
        && a.outcome === ev.outcome
    );
    if (!dup) artifacts.push(ev);
  }

  const phasesCovered = new Set(artifacts.map((a) => a.phase));
  const missingRequired = REQUIRED_PHASES.filter((p) => !phasesCovered.has(p));
  const avgConfidence = artifacts.length
    ? Number((artifacts.reduce((s, a) => s + (a.confidence || 0), 0) / artifacts.length).toFixed(3))
    : null;

  return {
    schema: EVIDENCE_SCHEMA,
    goal,
    artifacts,
    summary: {
      total: artifacts.length,
      phases: [...phasesCovered],
      missingRequired,
      complete: missingRequired.length === 0,
      avgConfidence
    },
    loopAlignment: COGNITIVE_CYCLE.map((x) => x.phase).filter((p) => phasesCovered.has(p))
  };
}

function validateCognitiveEvidence(evidence) {
  const missing = [];
  if (!evidence || evidence.schema !== EVIDENCE_SCHEMA) {
    return { valid: false, missing: ['schema'], schema: evidence?.schema || null };
  }
  if (!Array.isArray(evidence.artifacts)) {
    missing.push('artifacts');
  } else {
    for (let i = 0; i < evidence.artifacts.length; i += 1) {
      const a = evidence.artifacts[i];
      if (!a.phase) missing.push(`artifacts[${i}].phase`);
      if (!Array.isArray(a.evidence) || a.evidence.length === 0) missing.push(`artifacts[${i}].evidence`);
      if (a.confidence == null) missing.push(`artifacts[${i}].confidence`);
    }
  }
  return { valid: missing.length === 0, missing, schema: evidence.schema };
}

function assertCognitiveEvidence(evidence, options = {}) {
  const check = validateCognitiveEvidence(evidence);
  if (!check.valid) {
    throw new Error(`Cognitive evidence invalid: ${check.missing.join(', ')}`);
  }
  if (options.requireComplete && !evidence.summary?.complete) {
    throw new Error(
      `Cognitive evidence incomplete: missing phases ${evidence.summary.missingRequired.join(', ')}`
    );
  }
  return evidence;
}

module.exports = {
  EVIDENCE_SCHEMA,
  REQUIRED_PHASES,
  clampConfidence,
  buildDeterministicReasonEvidence,
  enrichUnderstandResult,
  enrichAnalyticalResult,
  enrichIntuitiveResult,
  enrichDecideResult,
  enrichValidationResult,
  enrichPerceiveResult,
  buildCognitiveEvidence,
  validateCognitiveEvidence,
  assertCognitiveEvidence
};
