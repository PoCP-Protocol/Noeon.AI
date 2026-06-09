'use strict';

/**
 * Cognitive effect classification (Axon-inspired) — what side effects a program may have.
 * Schema: noeon.cognitive.effects/v1
 */

const EFFECTS_SCHEMA = 'noeon.cognitive.effects/v1';

const EFFECT_ORDER = ['pure', 'ai', 'io', 'external', 'governance'];

function classifyActEffect(act = {}) {
  const plugin = String(act.plugin || act.capability || '').toLowerCase();
  const channel = String(act.channel || '').toLowerCase();
  if (plugin.includes('http') || plugin.includes('github') || plugin.includes('web')) return 'external';
  if (plugin.includes('fs') || plugin.includes('file')) return 'io';
  if (plugin === 'runtime' && channel === 'console') return 'io';
  if (act.signed || act.human_must_approve) return 'governance';
  if (plugin && plugin !== 'runtime' && plugin !== 'mock') return 'external';
  return 'io';
}

function classifyDeclaredEffects(ast) {
  const effects = new Set(['ai']);

  for (const act of ast?.cognition?.acts || []) {
    effects.add(classifyActEffect(act));
  }
  for (const act of ast?.next?.acts || []) {
    effects.add(classifyActEffect(act));
  }
  for (const agent of ast?.agents || []) {
    if (agent.policy?.human_must_approve || agent.policy?.require_citation) {
      effects.add('governance');
    }
    for (const tool of agent.tools || []) {
      if (String(tool).includes('http') || String(tool).includes('web')) effects.add('external');
      else effects.add('io');
    }
  }
  if (ast?.metaRules?.length || ast?.governance?.length) effects.add('governance');
  if (ast?.liminal?.covenant || ast?.cognition?.context?.never) effects.add('governance');

  const cognitiveOnly = !ast?.cognition?.acts?.length
    && !ast?.next?.acts?.length
    && effects.size === 1;
  if (cognitiveOnly) effects.add('pure');

  return EFFECT_ORDER.filter((e) => effects.has(e));
}

function classifyRuntimeEffects(result = {}) {
  const effects = new Set(classifyDeclaredEffects(result.ast || {}));
  if (result.awaitingHuman || result.pendingApproval) effects.add('governance');
  if (result.pluginActs?.total || result.snapshotActExecution) effects.add('external');
  if (result.actionTrace?.actions?.some((a) => a.plugin)) effects.add('external');
  return EFFECT_ORDER.filter((e) => effects.has(e));
}

function buildEffectReport(ast, result = {}) {
  const declared = classifyDeclaredEffects(ast);
  const runtime = classifyRuntimeEffects({ ...result, ast });
  const escalated = runtime.filter((e) => !declared.includes(e) && e !== 'ai');
  return {
    schema: EFFECTS_SCHEMA,
    declared,
    runtime,
    escalated,
    max_effect: runtime[runtime.length - 1] || 'pure',
    valid: escalated.length === 0
  };
}

function validateEffectPolicy(ast, result = {}, policy = {}) {
  const report = buildEffectReport(ast, result);
  const allowed = policy.allow || policy.allowed || EFFECT_ORDER;
  const blocked = (report.runtime || []).filter((e) => !allowed.includes(e));
  return {
    ...report,
    policy_allowed: allowed,
    policy_blocked: blocked,
    policy_valid: blocked.length === 0
  };
}

module.exports = {
  EFFECTS_SCHEMA,
  EFFECT_ORDER,
  classifyActEffect,
  classifyDeclaredEffects,
  classifyRuntimeEffects,
  buildEffectReport,
  validateEffectPolicy
};
