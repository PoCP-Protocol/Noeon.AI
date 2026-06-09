'use strict';

/**
 * AI Imagination — synthesize "next epoch" guidance from lens + SELF.
 * No LLM required: structured creative brief for AI authors and humans.
 */

const { evaluateAiNative, suggestInnovations } = require('./ai-native-lens');
const { readSelfTopic } = require('./self-introspection');

const DREAM_SCHEMA = 'noeon.ai.dream/v1';

const VISION_LINES = [
  'Programs that know their own goal, grade, and governance fingerprint.',
  'Every external ACT passes through evidence or human gate.',
  'REFLECT reads SELF.run.aiNative and patches the next version.',
  'MCP tools are typed boundaries — not stringly-typed side effects.',
  'One canonical report is the shared language between AI, runtime, and auditor.'
];

function buildDreamFragments(ast, evaluation) {
  const fragments = [];
  const goal = ast?.cognition?.goal || ast?.agents?.[0]?.goal;

  if (!goal) {
    fragments.push('AGENT "DreamAgent"\n  GOAL "Define a measurable outcome in one sentence"');
  }

  for (const s of evaluation.suggestions.slice(0, 4)) {
    if (s.action.includes('GOAL')) {
      fragments.push(`  GOAL "${goal || 'Replace with verifiable outcome'}"`);
    } else if (s.action.includes('require_citation')) {
      fragments.push('  POLICY require_citation=true audit=true');
    } else if (s.action.includes('CONSTITUTION') || s.action.includes('human_must_approve')) {
      fragments.push(`FUSE relay {\n  human_must_approve: [external_send, uncited_claim]\n}`);
    } else if (s.action.includes('PERCEIVE')) {
      fragments.push('  FLOW\n    PERCEIVE source=user modality=text\n    REASON strategy=evidence_first\n    ACT action=respond\n    REFLECT depth=standard');
    } else if (s.action.includes('TOOLS')) {
      fragments.push('  TOOLS ["echo/echo", "web_search"]');
    } else if (s.action.includes('BUDGET')) {
      fragments.push('BUDGET tokens=8000 msat=50000');
    }
  }

  return [...new Set(fragments)];
}

function buildDreamMermaid(evaluation) {
  const dims = evaluation.dimensions || {};
  const weak = Object.entries(dims)
    .filter(([, v]) => (v.score ?? 0) < 0.55)
    .map(([k]) => k);

  const nodes = weak.length
    ? weak.map((w) => `  improve_${w}[Strengthen ${w.replace(/_/g, ' ')}]`)
    : ['  golden[Golden Path ready]'];

  return [
    'flowchart LR',
    '  dream[AI Dream] --> lens[AI-Native Lens]',
    '  lens --> self[SELF introspection]',
    '  self --> gate[Epistemic + Human Gate]',
    '  gate --> mcp[MCP typed effects]',
    ...nodes.map((n) => `  mcp --> ${n.split('[')[0].trim()}`),
    nodes.join('\n')
  ].join('\n');
}

function imagineProgram(ast, canonicalPrep, result = null) {
  const evaluation = evaluateAiNative(ast, canonicalPrep, result);
  const self = ast?.cognition?.context?.SELF;
  const suggestions = suggestInnovations(
    Object.fromEntries(
      Object.entries(evaluation.dimensions).map(([k, v]) => [k, { score: v.score, notes: v.notes }])
    ),
    ast,
    canonicalPrep?.canonical
  );

  const fragments = buildDreamFragments(ast, { ...evaluation, suggestions });
  const epoch = (ast?.cognition?.context?.dream_epoch || 0) + 1;
  const priorities = suggestions.length
    ? suggestions.slice(0, 5)
    : [{ priority: 'medium', action: 'Wire real MCP tools and run noeon golden in CI.' }];

  return {
    schema: DREAM_SCHEMA,
    epoch,
    vision: VISION_LINES,
    current: {
      grade: evaluation.grade,
      score: evaluation.score,
      goal: readSelfTopic(self || {}, 'goal') || canonicalPrep?.canonical?.intent?.goal,
      verdict: evaluation.verdict
    },
    imagination: {
      title: `Noeon Epoch ${epoch} — ${evaluation.grade === 'A' || evaluation.grade === 'B' ? 'Harden & Ship' : 'Become AI-Native'}`,
      narrative: evaluation.score >= 0.7
        ? 'This program is close to autonomous execution. Next: wire real MCP, tighten epistemic gate, ship Golden Path in CI.'
        : 'This program is a sketch. Next: declare GOAL, complete PERCEIVE→REFLECT loop, add governance before any external ACT.',
      fragments,
      mermaid: buildDreamMermaid(evaluation),
      priorities,
    },
    prompt_brief: [
      '# Noeon AI Dream Brief',
      `epoch: ${epoch}`,
      `grade: ${evaluation.grade} (${Math.round(evaluation.score * 100)}%)`,
      `verdict: ${evaluation.verdict}`,
      '',
      '## Priorities',
      ...priorities.map((s, i) => `${i + 1}. [${s.priority}] ${s.action}`),
      '',
      '## Suggested fragments',
      ...fragments.map((f) => `\`\`\`\n${f}\n\`\`\``),
      '',
      '## Vision',
      ...VISION_LINES.map((l) => `- ${l}`)
    ].join('\n')
  };
}

module.exports = {
  DREAM_SCHEMA,
  imagineProgram,
  buildDreamMermaid,
  VISION_LINES
};
