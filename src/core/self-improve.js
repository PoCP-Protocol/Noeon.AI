'use strict';

/**
 * Epoch 2 — SELF-improve loop: REFLECT reads SELF + Lens, emits patch plan (no LLM).
 */

const { evaluateAiNative, suggestInnovations } = require('./ai-native-lens');
const { readSelfTopic } = require('./self-introspection');
const { buildPatchPreview } = require('./patch-preview');

const SELF_IMPROVE_SCHEMA = 'noeon.self.improve/v1';

const PATCH_SNIPPETS = {
  intent_clarity: '  GOAL "Replace with one measurable outcome"',
  epistemic_structure: '  POLICY require_citation=true audit=true',
  governable_autonomy: 'FUSE relay {\n  human_must_approve: [external_send, uncited_claim]\n}',
  cognitive_loop_perceive: '    PERCEIVE source=user modality=text',
  cognitive_loop_reason: '    REASON strategy=evidence_first depth=2',
  cognitive_loop_act: '    ACT action=respond channel=internal safety=low',
  cognitive_loop_reflect: '    REFLECT depth=standard metric=ai_native_grade',
  uncertainty_handling: '    DECIDE action=respond threshold=0.72',
  composable_tools: '  TOOLS ["echo/echo"]',
  resource_awareness: 'BUDGET tokens=8000 msat=50000'
};

function gradeRank(grade) {
  const order = { A: 5, B: 4, C: 3, D: 2, F: 1 };
  return order[String(grade || 'F').toUpperCase()] || 0;
}

function buildPatchPlan(lens, ast, ctx = null) {
  if (!lens) return [];

  const dimensions = Object.fromEntries(
    Object.entries(lens.dimensions || {}).map(([k, v]) => [k, { score: v.score, notes: v.notes }])
  );
  const suggestions = suggestInnovations(dimensions, ast, null);
  const patches = [];
  const cycle = lens.dimensions?.cognitive_loop;

  for (const s of suggestions) {
    patches.push({
      id: `patch_${patches.length + 1}`,
      priority: s.priority,
      action: s.action,
      snippet: inferSnippet(s.action, cycle)
    });
  }

  if (ctx?.confidence != null && ctx.confidence < 0.72) {
    patches.push({
      id: `patch_${patches.length + 1}`,
      priority: 'high',
      action: `Raise confidence (${ctx.confidence.toFixed(2)}) — add evidence or lower DECIDE threshold`,
      snippet: PATCH_SNIPPETS.uncertainty_handling
    });
  }

  const selfGoal = readSelfTopic(ast?.cognition?.context?.SELF || {}, 'goal');
  if (selfGoal && patches.length === 0) {
    patches.push({
      id: 'patch_ok',
      priority: 'low',
      action: 'Program is AI-native ready — consider wiring live MCP and Golden Path in CI',
      snippet: null
    });
  }

  return patches.slice(0, 8);
}

function inferSnippet(action, cycle) {
  const text = String(action || '').toLowerCase();
  if (text.includes('goal')) return PATCH_SNIPPETS.intent_clarity;
  if (text.includes('citation') || text.includes('epistemic')) return PATCH_SNIPPETS.epistemic_structure;
  if (text.includes('constitution') || text.includes('human')) return PATCH_SNIPPETS.governable_autonomy;
  if (text.includes('perceive')) return PATCH_SNIPPETS.cognitive_loop_perceive;
  if (text.includes('reason')) return PATCH_SNIPPETS.cognitive_loop_reason;
  if (text.includes(' act')) return PATCH_SNIPPETS.cognitive_loop_act;
  if (text.includes('reflect')) return PATCH_SNIPPETS.cognitive_loop_reflect;
  if (text.includes('threshold') || text.includes('uncertainty')) return PATCH_SNIPPETS.uncertainty_handling;
  if (text.includes('tools') || text.includes('mcp')) return PATCH_SNIPPETS.composable_tools;
  if (text.includes('budget')) return PATCH_SNIPPETS.resource_awareness;
  if (cycle && !cycle.notes?.includes('REFLECT')) return PATCH_SNIPPETS.cognitive_loop_reflect;
  return null;
}

function buildImproveBrief(payload) {
  const lines = [
    '# SELF-Improve Brief',
    `epoch: ${payload.epoch}`,
    `grade: ${payload.lens?.grade || '—'} (${Math.round((payload.lens?.score || 0) * 100)}%)`,
    `target_grade: ${payload.targetGrade || 'B'}`,
    `patches: ${payload.patches?.length || 0}`,
    ''
  ];
  for (const p of payload.patches || []) {
    lines.push(`## [${p.priority}] ${p.action}`);
    if (p.snippet) lines.push('```', p.snippet, '```');
  }
  return lines.join('\n');
}

function bumpDreamEpoch(ast) {
  if (!ast?.cognition) ast.cognition = {};
  if (!ast.cognition.context) ast.cognition.context = {};
  const epoch = (ast.cognition.context.dream_epoch || 0) + 1;
  ast.cognition.context.dream_epoch = epoch;
  return epoch;
}

function runInlineSelfReflect(ast, ctx = null) {
  const prep = ast?.cognition?.context?._canonicalPrep || null;
  const lens = prep ? evaluateAiNative(ast, prep, null) : null;
  const selfAi = ast?.cognition?.context?.SELF?.read?.('summary') || null;
  const patches = buildPatchPlan(lens, ast, ctx);
  const epoch = bumpDreamEpoch(ast);

  const payload = {
    schema: SELF_IMPROVE_SCHEMA,
    phase: 'reflect_inline',
    epoch,
    lens: lens
      ? { grade: lens.grade, score: lens.score, verdict: lens.verdict }
      : null,
    self: selfAi,
    patches,
    brief: buildImproveBrief({ epoch, lens, patches, targetGrade: 'B' })
  };

  if (ast?.cognition?.context) {
    ast.cognition.context.SELF_IMPROVE = payload;
  }

  return payload;
}

function runPostRunSelfImprove(ast, prep, result, options = {}) {
  const lens = result.report?.aiNative || evaluateAiNative(ast, prep, result);
  const self = ast?.cognition?.context?.SELF;
  const inline = ast?.cognition?.context?.SELF_IMPROVE || null;
  const patches = buildPatchPlan(lens, ast, result.cognitive?.context || null);
  const epoch = ast?.cognition?.context?.dream_epoch || bumpDreamEpoch(ast);

  const improved = gradeRank(lens?.grade) >= gradeRank(inline?.lens?.grade || 'F');
  const payload = {
    schema: SELF_IMPROVE_SCHEMA,
    phase: 'post_run',
    epoch,
    lens: { grade: lens.grade, score: lens.score, verdict: lens.verdict },
    self: {
      goal: readSelfTopic(self || {}, 'goal'),
      run: readSelfTopic(self || {}, 'run'),
      ai: readSelfTopic(self || {}, 'ai')
    },
    inline_reflected: Boolean(inline),
    improved_since_inline: improved,
    patches,
    next_epoch_hint: patches[0]?.action || 'Maintain golden_ready — ship MCP + CI gate',
    brief: buildImproveBrief({ epoch, lens, patches, targetGrade: 'B' })
  };

  if (options.source) {
    payload.patchPreview = buildPatchPreview(options.source, payload, {
      filename: options.filename || 'program.noeon'
    });
  }

  if (ast?.cognition?.context) {
    ast.cognition.context.SELF_IMPROVE = payload;
  }

  return payload;
}

module.exports = {
  SELF_IMPROVE_SCHEMA,
  buildPatchPlan,
  runInlineSelfReflect,
  runPostRunSelfImprove,
  buildImproveBrief,
  PATCH_SNIPPETS
};
