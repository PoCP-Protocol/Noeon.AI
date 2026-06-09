'use strict';

/**
 * First-class AGENT surface report (Koi-inspired agent card).
 * Schema: noeon.agent.surface/v1
 */

const AGENT_SURFACE_SCHEMA = 'noeon.agent.surface/v1';

function buildAgentFlowSteps(agent, dualView) {
  const rowsForAgent = (dualView?.rows || []).filter(
    (r) => r.declared?.source === 'agent.flow'
      && r.declared?.label?.startsWith(`${agent.name}:`)
  );

  return (agent.flow || []).map((step, index) => {
    const row = rowsForAgent[index];
    let status = 'unknown';
    if (row) status = row.status === 'matched' ? 'executed' : row.status;
    return {
      index,
      kind: step.kind,
      label: `${agent.name}: ${step.kind}`,
      params: Object.fromEntries(
        Object.entries(step).filter(([k]) => k !== 'kind')
      ),
      status
    };
  });
}

function buildAgentSurfaceReport(ast, result = {}, report = null, dualView = null) {
  const agents = ast?.agents || [];
  if (!agents.length) return null;

  const cards = agents.map((agent) => ({
    name: agent.name,
    goal: agent.goal || ast?.cognition?.goal || null,
    tools: agent.tools || [],
    policy: agent.policy || {},
    memory: agent.memory || null,
    governance: {
      constitutions: (agent.constitutions || []).length,
      vows: (agent.vows || []).length,
      rituals: (agent.rituals || []).length,
      strategies: (agent.strategies || []).length
    },
    flow: buildAgentFlowSteps(agent, dualView),
    flowArchitecture: agent.flowArchitecture || null,
    executed: result.success !== false && !result.blocked,
    awaitingHuman: result.awaitingHuman === true
  }));

  const flowMatched = cards.reduce(
    (sum, c) => sum + c.flow.filter((s) => s.status === 'executed').length,
    0
  );
  const flowTotal = cards.reduce((sum, c) => sum + c.flow.length, 0);

  return {
    schema: AGENT_SURFACE_SCHEMA,
    count: cards.length,
    primary: cards[0]?.name || null,
    cards,
    summary: {
      flow_steps: flowTotal,
      flow_executed: flowMatched,
      flow_alignment: flowTotal ? Number((flowMatched / flowTotal).toFixed(3)) : null,
      tools_declared: cards[0]?.tools?.length || 0,
      policy_keys: Object.keys(cards[0]?.policy || {})
    }
  };
}

function formatAgentSurfaceLines(surface) {
  if (!surface?.cards?.length) return [];
  const lines = [`智能体 ${surface.count} · ${surface.primary || '—'}`];
  const card = surface.cards[0];
  if (card.goal) lines.push(`目标：${card.goal}`);
  if (card.tools?.length) lines.push(`工具：${card.tools.join(', ')}`);
  const policyParts = Object.entries(card.policy || {})
    .map(([k, v]) => `${k}=${v}`)
    .slice(0, 4);
  if (policyParts.length) lines.push(`策略：${policyParts.join(' · ')}`);
  if (card.flow?.length) {
    lines.push('FLOW：');
    for (const step of card.flow) {
      const mark = step.status === 'executed' ? '✓' : step.status === 'missing' ? '✗' : '·';
      lines.push(`  ${mark} ${step.kind}`);
    }
  }
  if (surface.summary?.flow_alignment != null) {
    lines.push(`对齐 ${surface.summary.flow_executed}/${surface.summary.flow_steps}`);
  }
  return lines;
}

module.exports = {
  AGENT_SURFACE_SCHEMA,
  buildAgentFlowSteps,
  buildAgentSurfaceReport,
  formatAgentSurfaceLines
};
