'use strict';

const EFFECT_ORDER = { pure: 0, io: 1, ai: 2, external: 3 };

const COGNITIVE_EFFECT = {
  PERCEIVE: 'io',
  PREDICT: 'ai',
  INTUIT: 'ai',
  REASON: 'ai',
  UNDERSTAND: 'ai',
  DECIDE: 'io',
  REFLECT: 'ai',
  ACT: 'external',
  FEEDBACK: 'io',
  CONSOLIDATE: 'io',
  ATTEND: 'io',
  MONITOR: 'io',
  FOCUS: 'io',
  ADAPT: 'io',
  EMOTION: 'io',
  SPAWN: 'external',
  DELEGATE: 'external',
  DEBATE: 'external',
  EVOLVE: 'ai'
};

const STDLIB_EFFECT = {
  ask: 'ai',
  embed: 'ai',
  think_with: 'ai',
  reason: 'ai',
  cognize: 'ai',
  intent: 'pure',
  epistemic: 'pure',
  equip: 'io',
  govern: 'external',
  evolve: 'ai',
  scaffold: 'pure'
};

function maxEffect(a, b) {
  return EFFECT_ORDER[a] >= EFFECT_ORDER[b] ? a : b;
}

function parseEffectTags(line) {
  const m = line.match(/^@effect\s*\(\s*([^)]+)\s*\)\s*$/i);
  if (!m) return null;
  const tags = m[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  let effect = 'pure';
  for (const tag of tags) {
    if (tag === 'trace') continue;
    if (EFFECT_ORDER[tag] !== undefined) {
      effect = maxEffect(effect, tag);
    }
  }
  return { effect, tags };
}

function classifyStatement(stmt, importContext = {}) {
  if (!stmt) return 'pure';
  if (stmt.kind === 'stdlib') return STDLIB_EFFECT[stmt.exportName] || 'ai';
  if (stmt.kind === 'call') {
    if (importContext.stdAi?.exports?.[stmt.callee]) return 'ai';
    if (importContext.stdUniversal?.exports?.[stmt.callee]) {
      return STDLIB_EFFECT[stmt.callee] || 'ai';
    }
    return 'pure';
  }
  if (stmt.kind === 'cognitive') {
    return COGNITIVE_EFFECT[stmt.keyword] || 'io';
  }
  if (stmt.kind === 'assert' || stmt.kind === 'let') return 'pure';
  return 'pure';
}

function inferBodyEffect(body, importContext = {}) {
  let effect = 'pure';
  for (const stmt of body || []) {
    effect = maxEffect(effect, classifyStatement(stmt, importContext));
  }
  return effect;
}

function validateGeneralEffects(ast, errors) {
  const functions = ast.general?.functions;
  if (!Array.isArray(functions) || functions.length === 0) return;

  const importContext = ast.general?.importContext || {};

  for (const fn of functions) {
    const declared = ast.general.effects?.[fn.name] || fn.effect || 'pure';
    const required = inferBodyEffect(fn.body, importContext);
    if (EFFECT_ORDER[required] > EFFECT_ORDER[declared]) {
      errors.push(
        `fn '${fn.name}': body requires @effect(${required}) but declared @effect(${declared})`
      );
    }
  }
}

module.exports = {
  EFFECT_ORDER,
  parseEffectTags,
  classifyStatement,
  inferBodyEffect,
  validateGeneralEffects
};
