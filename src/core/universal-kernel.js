'use strict';

/**
 * Epoch 9 — Noeon Universal: AI-native general programming formula.
 *
 * Program = INTENT + EPISTEMIC + COGNITION + CAPABILITY + GOVERNANCE + EVOLUTION
 */

const UNIVERSAL_FORMULA = 'INTENT + EPISTEMIC + COGNITION + CAPABILITY + GOVERNANCE + EVOLUTION';
const UNIVERSAL_SCHEMA = 'noeon.universal/v1';

const DIMENSIONS = [
  'INTENT',
  'EPISTEMIC',
  'COGNITION',
  'CAPABILITY',
  'GOVERNANCE',
  'EVOLUTION'
];

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function validateUniversalProgram(universal) {
  const dims = universal?.dimensions || {};
  const missing = DIMENSIONS.filter((d) => !dims[d.toLowerCase()] || dims[d.toLowerCase()].empty);
  const present = DIMENSIONS.length - missing.length;
  const score = clamp01(present / DIMENSIONS.length);

  const checks = {
    intent: Boolean(dims.intent?.goal || dims.intent?.text),
    epistemic: Boolean(dims.epistemic?.require_citation != null || dims.epistemic?.confidence_floor != null),
    cognition: (dims.cognition?.flow?.length || 0) >= 3,
    capability: (dims.capability?.tools?.length || 0) > 0 || dims.capability?.compute != null,
    governance: Boolean(dims.governance?.policy || dims.governance?.budget || dims.governance?.human_must_approve),
    evolution: Boolean(dims.evolution?.learn || dims.evolution?.self_improve || dims.evolution?.dream)
  };

  const completeness = clamp01(Object.values(checks).filter(Boolean).length / DIMENSIONS.length);

  return {
    schema: UNIVERSAL_SCHEMA,
    name: universal?.name,
    formula: UNIVERSAL_FORMULA,
    score: completeness,
    dimensions_present: present,
    missing: missing.map((d) => d.toLowerCase()),
    checks,
    ready: completeness >= 0.83 && checks.intent && checks.cognition
  };
}

function buildUniversalBrief(universal, validation) {
  const v = validation || validateUniversalProgram(universal);
  const lines = [
    '# Noeon Universal Program',
    `name: ${universal?.name || '—'}`,
    `formula: ${UNIVERSAL_FORMULA}`,
    `completeness: ${Math.round(v.score * 100)}%`,
    '',
    '## Dimensions',
    ...DIMENSIONS.map((d) => {
      const key = d.toLowerCase();
      const ok = v.checks[key] ? '✓' : '○';
      return `- ${ok} ${d}`;
    }),
    '',
    v.ready ? 'Status: **ready for AI-native execution**' : 'Status: incomplete — fill missing dimensions'
  ];
  return lines.join('\n');
}

function attachUniversalToAst(ast, universal) {
  if (!ast || !universal) return ast;
  ast.universal = universal;
  ast.profile = 'universal';
  ast.languageProfile = 'universal';
  if (universal.name && !ast.task) ast.task = universal.name;
  if (universal.dimensions?.intent?.goal) {
    ast.cognition = ast.cognition || {};
    ast.cognition.goal = universal.dimensions.intent.goal;
    ast.next = ast.next || {};
    ast.next.goal = { text: universal.dimensions.intent.goal };
  }
  return ast;
}

function extractUniversalFromAst(ast) {
  if (ast?.universal) return ast.universal;
  if (ast?.profile !== 'universal' && ast?.languageProfile !== 'universal') return null;

  const agent = ast?.agents?.[0];
  return {
    schema: UNIVERSAL_SCHEMA,
    name: agent?.name || ast.task,
    dimensions: {
      intent: { goal: ast.cognition?.goal || agent?.goal, empty: !ast.cognition?.goal },
      epistemic: { require_citation: agent?.policy?.require_citation, empty: !agent?.policy?.require_citation },
      cognition: { flow: agent?.flow || [], empty: !(agent?.flow?.length) },
      capability: { tools: agent?.tools || [], empty: !(agent?.tools?.length) },
      governance: { policy: agent?.policy, empty: !agent?.policy },
      evolution: { learn: ast.cognition?.learn, empty: !ast.cognition?.learn }
    }
  };
}

module.exports = {
  UNIVERSAL_FORMULA,
  UNIVERSAL_SCHEMA,
  DIMENSIONS,
  validateUniversalProgram,
  buildUniversalBrief,
  attachUniversalToAst,
  extractUniversalFromAst
};
