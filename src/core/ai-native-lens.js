'use strict';

/**
 * AI-Native Design Lens v1.0
 *
 * Evaluates Noeon programs from an AI-system perspective: epistemic hygiene,
 * governable autonomy, observable cognition, and machine legibility.
 * Intended for AI authors refining programs and for humans auditing AI output.
 */

const { validateUniversalProgram, UNIVERSAL_FORMULA } = require('./universal-kernel');

const LENS_SCHEMA = 'noeon.ai-native.lens/v1';

const WEIGHTS = {
  intent_clarity: 0.15,
  epistemic_structure: 0.18,
  governable_autonomy: 0.18,
  cognitive_loop: 0.14,
  uncertainty_handling: 0.12,
  resource_awareness: 0.08,
  composable_tools: 0.08,
  machine_legibility: 0.07
};

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hasCognitiveCycle(ast) {
  const flow = ast?.agents?.[0]?.flow || ast?.cognition?.plan || [];
  const kinds = new Set(
    (Array.isArray(flow) ? flow : []).map((s) => String(s.kind || s.type || s).toUpperCase())
  );
  const agentFlow = ast?.agents?.[0]?.flowSteps || [];
  for (const s of agentFlow) kinds.add(String(s).toUpperCase());

  const text = JSON.stringify(ast || {}).toUpperCase();
  const perceive = kinds.has('PERCEIVE') || kinds.has('OBSERVE') || /PERCEIVE|OBSERVE/.test(text);
  const reason = kinds.has('REASON') || kinds.has('UNDERSTAND') || /REASON|UNDERSTAND/.test(text);
  const act = kinds.has('ACT') || /"ACT"|\\bACT\\b/.test(text);
  const reflect = kinds.has('REFLECT') || /REFLECT/.test(text);
  return { perceive, reason, act, reflect, complete: perceive && reason && act && reflect };
}

function scoreIntentClarity(canonical, ast) {
  const goal = canonical?.intent?.goal || ast?.cognition?.goal;
  if (!goal) return { score: 0, notes: ['missing intent.goal'] };
  const len = String(goal).length;
  const score = clamp01(0.5 + (len >= 12 && len <= 200 ? 0.5 : 0.25));
  return { score, notes: goal ? ['goal declared'] : [] };
}

function scoreEpistemic(canonical, ast) {
  let score = 0;
  const notes = [];
  const beliefs = canonical?.alignment?.beliefs?.length || 0;
  const policies = canonical?.governance?.policies?.length || 0;
  const text = JSON.stringify(ast || {});
  const requireCitation = ast?.agents?.some((a) => a.policy?.require_citation) ||
    /require_citation\s*=\s*true/i.test(text) ||
    /citation_policy|policy modality=governance/i.test(text);

  if (beliefs > 0) { score += 0.35; notes.push(`${beliefs} belief(s)`); }
  if (requireCitation) { score += 0.35; notes.push('require_citation policy'); }
  if (policies > 0) { score += 0.15; notes.push(`${policies} policy rule(s)`); }
  if (canonical?.alignment?.resonance_floor != null) { score += 0.15; notes.push('resonance_floor set'); }
  return { score: clamp01(score), notes };
}

function scoreGovernance(canonical, ast) {
  const g = canonical?.governance || {};
  const tiers = ['constitutions', 'vows', 'rituals', 'strategies', 'policies'];
  let count = 0;
  for (const t of tiers) count += (g[t] || []).length;

  const text = JSON.stringify(ast || {});
  const humanGate = Boolean(ast?.fusionRelay?.human_must_approve?.length) ||
    Boolean(canonical?.alignment?.covenant?.humanMustApprove?.length) ||
    Boolean(canonical?.alignment?.covenant?.human_must_approve?.length) ||
    /human_must_approve|governance modality=relay/i.test(text);

  let score = clamp01(count > 0 ? 0.45 + Math.min(count, 4) * 0.1 : 0.15);
  const notes = [];
  if (humanGate) { score = clamp01(score + 0.25); notes.push('human_must_approve'); }
  if (count > 0) notes.push(`${count} governance rule(s)`);
  return { score, notes };
}

function scoreCognitiveLoop(ast) {
  const cycle = hasCognitiveCycle(ast);
  let score = 0;
  const notes = [];
  if (cycle.perceive) { score += 0.25; notes.push('PERCEIVE/OBSERVE'); }
  if (cycle.reason) { score += 0.25; notes.push('REASON/UNDERSTAND'); }
  if (cycle.act) { score += 0.25; notes.push('ACT'); }
  if (cycle.reflect) { score += 0.25; notes.push('REFLECT'); }
  return { score: clamp01(score), notes, cycle };
}

function scoreUncertainty(ast, canonical) {
  let score = 0;
  const notes = [];
  const text = JSON.stringify(ast || {});
  if (/threshold\s*=\s*[\d.]+/i.test(text) || /confidence/i.test(text)) {
    score += 0.35;
    notes.push('confidence/threshold on DECIDE');
  }
  if (/REFLECT/i.test(text)) { score += 0.25; notes.push('REFLECT present'); }
  if (canonical?.alignment?.resonance_floor != null) {
    score += 0.25;
    notes.push('resonance_floor');
  }
  if (/when uncertain|ask human|human_must_approve/i.test(text)) {
    score += 0.15;
    notes.push('uncertainty → human path');
  }
  return { score: clamp01(score), notes };
}

function scoreResources(canonical, result) {
  let score = 0;
  const notes = [];
  if (canonical?.execution?.budget != null) { score += 0.4; notes.push('budget declared'); }
  if (result?.llm?.totalCalls > 0) { score += 0.3; notes.push(`llm calls: ${result.llm.totalCalls}`); }
  if (result?.scheduler) { score += 0.15; notes.push(`scheduler: ${result.scheduler}`); }
  if (result?.report?.ecosystem?.mcp?.enabled) { score += 0.15; notes.push('MCP configured'); }
  return { score: clamp01(score || 0.2), notes };
}

function scoreTools(ast, canonical) {
  let score = 0;
  const notes = [];
  const text = JSON.stringify(ast || {});
  const tools = ast?.agents?.[0]?.tools || ast?.tools || [];
  const mcp = ast?.mcpTools?.length || 0;
  const acts = canonical?.execution?.acts?.length || 0;
  if (Array.isArray(tools) && tools.length > 0) { score += 0.4; notes.push(`${tools.length} tool(s)`); }
  if (mcp > 0) { score += 0.35; notes.push(`${mcp} MCP tool(s)`); }
  if (/tools modality|echo\/echo|"mcp"/i.test(text)) { score += 0.25; notes.push('tools observe'); }
  if (acts > 0) { score += 0.25; notes.push(`${acts} act(s)`); }
  return { score: clamp01(score || 0.1), notes };
}

function scoreLegibility(ast) {
  let score = 0;
  const notes = [];
  if (ast?.agents?.length === 1) { score += 0.35; notes.push('single AGENT block'); }
  if (ast?.agents?.[0]?.flow || ast?.agents?.[0]?.flowSteps) { score += 0.35; notes.push('structured FLOW'); }
  if (ast?.noeonStack) { score += 0.15; notes.push('noeonStack attached'); }
  if (!ast?.cognition?.plan?.length || ast?.agents?.length) { score += 0.15; }
  return { score: clamp01(score || 0.3), notes };
}

function computeComposite(dimensions) {
  let total = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    total += (dimensions[key]?.score ?? 0) * weight;
  }
  return clamp01(total);
}

function grade(score) {
  if (score >= 0.85) return 'A';
  if (score >= 0.7) return 'B';
  if (score >= 0.55) return 'C';
  if (score >= 0.4) return 'D';
  return 'F';
}

function suggestInnovations(dimensions, ast, canonical) {
  const suggestions = [];
  const cycle = dimensions.cognitive_loop?.cycle;

  if ((dimensions.intent_clarity?.score ?? 0) < 0.6) {
    suggestions.push({ priority: 'high', action: 'Declare a single measurable GOAL — AI authors need explicit intent anchors.' });
  }
  if ((dimensions.epistemic_structure?.score ?? 0) < 0.5) {
    suggestions.push({ priority: 'high', action: 'Add POLICY require_citation=true or liminal beliefs with confidence + sources.' });
  }
  if ((dimensions.governable_autonomy?.score ?? 0) < 0.5) {
    suggestions.push({ priority: 'high', action: 'Add CONSTITUTION/VOW or FUSE relay human_must_approve for external acts.' });
  }
  if (cycle && !cycle.complete) {
    const missing = [];
    if (!cycle.perceive) missing.push('PERCEIVE');
    if (!cycle.reason) missing.push('REASON');
    if (!cycle.act) missing.push('ACT');
    if (!cycle.reflect) missing.push('REFLECT');
    suggestions.push({ priority: 'medium', action: `Complete cognitive loop: add ${missing.join(' → ')}.` });
  }
  if ((dimensions.uncertainty_handling?.score ?? 0) < 0.4) {
    suggestions.push({ priority: 'medium', action: 'Add DECIDE threshold=0.7 and REFLECT — uncertainty must be routable, not implicit.' });
  }
  if ((dimensions.composable_tools?.score ?? 0) < 0.3) {
    suggestions.push({ priority: 'low', action: 'Declare TOOLS or MCP servers — AI agents need typed effect boundaries.' });
  }
  if ((dimensions.resource_awareness?.score ?? 0) < 0.3 && canonical?.capabilities?.ael) {
    suggestions.push({ priority: 'medium', action: 'Set BUDGET for AEL/protocol paths — token and msat limits are AI-native constraints.' });
  }
  return suggestions;
}

function buildAiNativeBrief(evaluation, canonical) {
  const lines = [
    `# Noeon AI Brief`,
    `grade: ${evaluation.grade} (${Math.round(evaluation.score * 100)}%)`,
    `goal: ${canonical?.intent?.goal || '—'}`,
    `surface: ${canonical?.surface || '—'}`,
    `governance_tiers: ${evaluation.dimensions.governable_autonomy?.notes?.join(', ') || 'none'}`,
    `cognitive_loop: ${evaluation.dimensions.cognitive_loop?.notes?.join(' → ') || 'incomplete'}`,
    `top_suggestion: ${evaluation.suggestions[0]?.action || 'program is well-formed for AI execution'}`
  ];
  return lines.join('\n');
}

function extractUniversalDims(ast) {
  const agent = ast?.agents?.[0];
  return {
    intent: { goal: ast?.cognition?.goal || agent?.goal, empty: !(ast?.cognition?.goal || agent?.goal) },
    epistemic: {
      require_citation: agent?.policy?.require_citation,
      confidence_floor: agent?.policy?.confidence_floor,
      empty: agent?.policy?.require_citation == null
    },
    cognition: { flow: agent?.flow || [], empty: !(agent?.flow?.length >= 3) },
    capability: { tools: agent?.tools || [], empty: !(agent?.tools?.length) },
    governance: { policy: agent?.policy, budget: ast?.budget, empty: !agent?.policy && !ast?.budget },
    evolution: { learn: ast?.cognition?.learn, self_improve: ast?.cognition?.nativeAI?.selfImprove, empty: !ast?.cognition?.learn }
  };
}

function evaluateAiNative(ast, canonicalPrep = null, result = null) {
  const canonical = canonicalPrep?.canonical || null;
  const dimensions = {
    intent_clarity: scoreIntentClarity(canonical, ast),
    epistemic_structure: scoreEpistemic(canonical, ast),
    governable_autonomy: scoreGovernance(canonical, ast),
    cognitive_loop: scoreCognitiveLoop(ast),
    uncertainty_handling: scoreUncertainty(ast, canonical),
    resource_awareness: scoreResources(canonical, result),
    composable_tools: scoreTools(ast, canonical),
    machine_legibility: scoreLegibility(ast)
  };

  const score = computeComposite(dimensions);
  let adjustedScore = score;
  let universalMeta = null;

  if (ast?.universal || ast?.profile === 'universal') {
    const validation = validateUniversalProgram(ast.universal || { dimensions: extractUniversalDims(ast) });
    universalMeta = { formula: UNIVERSAL_FORMULA, ...validation };
    adjustedScore = clamp01(score * 0.65 + validation.score * 0.35 + (validation.ready ? 0.08 : 0));
  }

  const suggestions = suggestInnovations(dimensions, ast, canonical);
  if (universalMeta && !universalMeta.ready) {
    suggestions.unshift({
      priority: 'high',
      action: `Complete Universal dimensions: ${universalMeta.missing.join(', ') || 'review six-dimension formula'}`
    });
  }

  return {
    schema: LENS_SCHEMA,
    score: adjustedScore,
    grade: grade(adjustedScore),
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([k, v]) => [k, { score: v.score, notes: v.notes || [] }])
    ),
    suggestions,
    brief: buildAiNativeBrief({ grade: grade(adjustedScore), score: adjustedScore, dimensions, suggestions }, canonical),
    universal: universalMeta,
    verdict: adjustedScore >= 0.7
      ? 'AI-native ready — program is legible, governable, and observable for autonomous execution.'
      : adjustedScore >= 0.5
        ? 'Partially AI-native — strengthen epistemics, governance, or cognitive loop before production.'
        : 'Not yet AI-native — reads like imperative config; add goal, policy, and reflect/gate paths.'
  };
}

module.exports = {
  LENS_SCHEMA,
  WEIGHTS,
  evaluateAiNative,
  buildAiNativeBrief,
  suggestInnovations,
  hasCognitiveCycle
};
