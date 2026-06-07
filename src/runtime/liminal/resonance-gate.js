'use strict';

/**
 * Liminal Resonance Gate — hard runtime block when intent ↔ interpretation misaligns.
 *
 * Runs before the cognitive kernel for liminal programs. Alignment can be supplied
 * via options.resonance / options.feedback.resonance; otherwise computed heuristically
 * from belief confidence and lexical overlap between mirror and claim.
 */

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function tokenOverlapScore(...texts) {
  const sets = texts.map((t) => new Set(tokenize(t)));
  if (sets.every((s) => s.size === 0)) return 0.5;
  let intersection = 0;
  let union = new Set();
  for (const s of sets) {
    for (const tok of s) union.add(tok);
  }
  if (sets.length >= 2) {
    for (const tok of sets[0]) {
      if (sets.slice(1).every((s) => s.has(tok))) intersection += 1;
    }
  }
  return union.size === 0 ? 0.5 : Math.min(1, intersection / union.size + 0.35);
}

function resonateKey(res) {
  return `${res.source}->${res.target}`;
}

function resolveAlignment(res, beliefs, context, options) {
  const key = resonateKey(res);
  const overrides = options.resonance || options.feedback?.resonance || {};
  if (typeof overrides[key] === 'number') return overrides[key];
  if (typeof res.alignment === 'number') return res.alignment;

  const belief = (beliefs || []).find((b) => b.name === res.target);
  const sourceText =
    context[res.source] ||
    context[`belief_${res.target}`] ||
    belief?.claim ||
    '';
  const mirrorText = res.mirror || '';
  const claimText = belief?.claim || '';

  const lexical = tokenOverlapScore(sourceText, mirrorText, claimText);
  const confidence = typeof belief?.confidence === 'number' ? belief.confidence : 0.5;
  return Math.min(1, Math.max(0, lexical * 0.45 + confidence * 0.55));
}

function evaluateUncertaintyGate(covenant, beliefs, options) {
  if (!covenant?.whenUncertain) return { triggered: false };

  const cond = covenant.whenUncertain.condition || '';
  const m = cond.match(/confidence\s*<\s*(\d+(?:\.\d+)?)/i);
  if (!m) return { triggered: false, condition: cond };

  const threshold = Number(m[1]);
  const confidences = (beliefs || [])
    .map((b) => b.confidence)
    .filter((c) => typeof c === 'number');
  const minConfidence = confidences.length ? Math.min(...confidences) : 1;

  if (options.uncertainty_resolved === true) {
    return { triggered: false, minConfidence, threshold, resolved: true };
  }

  return {
    triggered: minConfidence < threshold,
    minConfidence,
    threshold,
    actions: covenant.whenUncertain.actions || []
  };
}

function runResonanceGate(ast, options = {}) {
  const liminal = ast.liminal;
  if (!liminal) {
    return { skipped: true, blocked: false, alignments: [], floor: null };
  }

  const covenant = liminal.covenant || {};
  const floor =
    typeof options.resonance_floor === 'number'
      ? options.resonance_floor
      : covenant.resonanceFloor ?? ast.cognition?.constraints?.resonance_floor ?? 0.7;

  const beliefs = liminal.beliefs || [];
  const resonates = liminal.resonates || [];
  const context = ast.cognition?.context || {};
  const alignments = [];
  const dialogues = [];
  let blocked = false;
  let blockReason = null;

  for (const res of resonates) {
    const resFloor =
      typeof res.alignmentFloor === 'number' ? res.alignmentFloor : floor;
    const alignment = resolveAlignment(res, beliefs, context, options);
    const pass = alignment >= resFloor;
    const entry = {
      key: resonateKey(res),
      source: res.source,
      target: res.target,
      alignment: Number(alignment.toFixed(4)),
      floor: resFloor,
      pass,
      mirror: res.mirror || null
    };
    alignments.push(entry);

    if (!pass) {
      blocked = true;
      blockReason = 'resonance_floor';
      if (res.mirror) {
        dialogues.push({ type: 'mirror', prompt: res.mirror, key: entry.key });
      }
      for (const line of res.dialogue || []) {
        dialogues.push({ type: 'dialogue', prompt: line, key: entry.key });
      }
    }
  }

  const uncertainty = evaluateUncertaintyGate(covenant, beliefs, options);
  if (uncertainty.triggered) {
    blocked = true;
    blockReason = blockReason || 'uncertainty_gate';
    for (const action of uncertainty.actions) {
      dialogues.push({ type: 'uncertainty', prompt: action, minConfidence: uncertainty.minConfidence });
    }
  }

  if (options.skip_resonance_gate === true) {
    blocked = false;
    blockReason = null;
  }

  return {
    skipped: false,
    blocked,
    blockReason,
    floor,
    alignments,
    dialogues,
    uncertainty,
    transcript: {
      phase: 'resonance',
      timestamp: new Date().toISOString(),
      alignments,
      blocked,
      blockReason
    }
  };
}

module.exports = {
  runResonanceGate,
  resolveAlignment,
  tokenOverlapScore,
  resonateKey
};
