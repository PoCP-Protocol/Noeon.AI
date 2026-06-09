'use strict';

const { detectProfile, PROFILES } = require('./profile');
const { resolveIntentGoal, resolveProgramTask } = require('./surfaces');
const { createCanonicalProgram } = require('./canonical-ir');
const { detectFusionPlan } = require('../runtime/fusion/unified-fusion');

function pushUnique(arr, item) {
  if (!item) return;
  arr.push(item);
}

function lowerGovernanceFromMetaRules(metaRules, governance) {
  for (const rule of metaRules || []) {
    const type = String(rule.type || '').toLowerCase();
    const entry = { ...rule, source: rule.source || 'meta' };

    if (type.includes('constitution')) pushUnique(governance.constitutions, entry);
    else if (type.includes('vow')) pushUnique(governance.vows, entry);
    else if (type.includes('ritual')) pushUnique(governance.rituals, entry);
    else if (type.includes('strategy') || type.includes('guarantee')) pushUnique(governance.strategies, entry);
    else pushUnique(governance.policies, entry);
  }
}

function lowerExecutionFromAst(ast, execution) {
  execution.budget = ast.budget ?? execution.budget;
  execution.deadline = ast.deadline ?? execution.deadline;
  execution.verify = ast.verify ?? execution.verify;

  for (const act of ast.cognition?.acts || []) {
    execution.acts.push({ ...act, source: 'cognition' });
  }

  for (const act of ast.cognitive?.decisions || []) {
    execution.flow.push({ kind: 'decide', ...act, source: 'cognitive' });
  }

  for (const step of ast.stateFlow || []) {
    execution.flow.push({ ...step, source: 'stateFlow' });
  }

  if (ast.agents?.length) {
    for (const agent of ast.agents) {
      for (const step of agent.flow || []) {
        execution.flow.push({ ...step, agent: agent.name, source: 'agent.flow' });
      }
    }
  }
}

function lowerAlignmentFromLiminal(liminal, alignment) {
  if (!liminal) return;

  alignment.covenant = liminal.covenant || null;
  alignment.resonance_floor = liminal.covenant?.resonanceFloor ?? liminal.covenant?.resonance_floor ?? null;

  for (const b of liminal.beliefs || []) {
    alignment.beliefs.push({ ...b, source: 'liminal' });
  }

  for (const r of liminal.resonates || []) {
    alignment.resonates.push({ ...r, source: 'liminal' });
  }

  for (const p of liminal.proposals || []) {
    alignment.approvals.push({ ...p, source: 'liminal.proposal' });
  }
}

function lowerNextDomain(ast, canonical) {
  const next = ast.next || {};
  if (!Object.keys(next).length && ast.profile !== 'next') return;

  canonical.capabilities.next = true;
  canonical.learning.field = {
    cells: next.cells || [],
    fields: next.fields || [],
    weaves: next.weaves || [],
    dreams: next.dreams || [],
    bonds: next.bonds || []
  };

  for (const s of next.strategies || []) {
    canonical.governance.strategies.push({ ...s, source: 'next.strategy' });
  }

  for (const g of next.guarantees || []) {
    canonical.governance.strategies.push({ ...g, source: 'next.guarantee' });
  }

  for (const c of next.constitutions || []) {
    canonical.governance.constitutions.push({ ...c, source: 'next.constitution' });
  }

  for (const v of next.vows || []) {
    canonical.governance.vows.push({ ...v, source: 'next.vow' });
  }

  for (const r of next.rituals || []) {
    canonical.governance.rituals.push({ ...r, source: 'next.ritual' });
  }

  for (const e of next.evolves || ast.evolution?.evolves || []) {
    canonical.learning.evolution.push({ ...e, source: 'next' });
  }
}

function lowerObservability(ast, observability) {
  for (const r of ast.cognitive?.reflections || []) {
    observability.reflections.push({ ...r, source: 'cognitive' });
  }

  for (const t of ast.cognition?.traces || []) {
    observability.traces.push({ ...t, source: 'cognition' });
  }
}

function lowerAgentGovernance(agent, governance) {
  for (const c of agent.constitutions || []) {
    governance.constitutions.push({ ...c, agent: agent.name, source: 'general.agent.constitution' });
  }
  for (const v of agent.vows || []) {
    governance.vows.push({ ...v, agent: agent.name, source: 'general.agent.vow' });
  }
  for (const r of agent.rituals || []) {
    governance.rituals.push({ ...r, agent: agent.name, source: 'general.agent.ritual' });
  }
  for (const s of agent.strategies || []) {
    governance.strategies.push({ ...s, agent: agent.name, source: 'general.agent.strategy' });
  }
  for (const [k, v] of Object.entries(agent.policy || {})) {
    governance.policies.push({
      type: 'agent_policy',
      key: k,
      value: v,
      agent: agent.name,
      source: 'general.agent.policy'
    });
  }
}

function lowerDeclarations(ast, canonical) {
  const decl = ast.general?.declarations;
  if (!decl) return;
  canonical.declarations.models = (decl.models || []).map((m) => ({ ...m }));
  canonical.declarations.tools = (decl.tools || []).map((t) => ({ ...t }));
  canonical.declarations.capabilities = (decl.capabilities || []).map((c) => ({ ...c }));
  canonical.declarations.effects = (decl.effects || []).map((e) => ({ ...e }));
}

function lowerToCanonical(ast, options = {}) {
  const profile = detectProfile(ast, options);
  const fusionPlan = detectFusionPlan(ast, options);

  const canonical = createCanonicalProgram({
    surface: profile,
    module: ast.module || ast.general?.module || null,
    task: resolveProgramTask(ast)
  });

  canonical.capabilities[profile] = true;
  if (ast.agents?.length || ast.general) canonical.capabilities.general = true;
  if (ast.next && Object.keys(ast.next).length) canonical.capabilities.next = true;
  if (ast.noeonStack?.capabilities) {
    for (const [cap, on] of Object.entries(ast.noeonStack.capabilities)) {
      if (on) canonical.capabilities[cap] = true;
    }
  }
  if (ast.task && (ast.budget != null || ast.collateral?.solver)) canonical.capabilities.ael = true;
  if (ast.liminal || profile === PROFILES.LIMINAL) canonical.capabilities.liminal = true;
  if (profile === PROFILES.COGNITIVE) canonical.capabilities.cognitive = true;

  canonical.intent.goal = resolveIntentGoal(ast);

  if (ast.cognition?.constraints) {
    canonical.intent.constraints = { ...ast.cognition.constraints };
  }

  for (const agent of ast.agents || []) {
    canonical.agents.push({
      name: agent.name,
      goal: agent.goal,
      tools: agent.tools || [],
      policy: agent.policy || {},
      flow_steps: (agent.flow || []).length,
      governance: {
        constitutions: (agent.constitutions || []).length,
        vows: (agent.vows || []).length,
        rituals: (agent.rituals || []).length,
        strategies: (agent.strategies || []).length
      }
    });
    lowerAgentGovernance(agent, canonical.governance);
  }

  lowerGovernanceFromMetaRules(ast.metaRules, canonical.governance);
  lowerExecutionFromAst(ast, canonical.execution);
  lowerAlignmentFromLiminal(ast.liminal, canonical.alignment);
  lowerNextDomain(ast, canonical);
  lowerObservability(ast, canonical.observability);
  lowerDeclarations(ast, canonical);

  if (ast.cognition?.context) {
    canonical.learning.context = { ...ast.cognition.context };
  }

  if (ast.cognition?.memory || ast.agents?.[0]?.memory) {
    canonical.learning.memory = ast.cognition?.memory || ast.agents[0].memory;
  }

  canonical.fusion = {
    plan: fusionPlan.plan,
    layers: fusionPlan.layers,
    triad: fusionPlan.triad,
    bidirectional: fusionPlan.bidirectional,
    coherence: fusionPlan.coherence || Boolean(ast.fusionCoherence?.enabled),
    relay: Boolean(ast.fusionRelay?.enabled || (ast.fusion || []).some((f) => f.target === 'relay'))
  };

  return canonical;
}

module.exports = {
  lowerToCanonical,
  lowerGovernanceFromMetaRules,
  lowerExecutionFromAst,
  lowerAlignmentFromLiminal,
  lowerNextDomain,
  lowerAgentGovernance,
  lowerDeclarations,
  resolveIntentGoal,
  resolveProgramTask
};
