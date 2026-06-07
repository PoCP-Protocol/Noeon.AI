'use strict';

function cleanId(value, prefix) {
  const text = String(value || prefix || 'node').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
  return text ? `${prefix}_${text}` : `${prefix}_node`;
}

function cleanLabel(value) {
  return String(value ?? '')
    .replace(/"/g, "'")
    .replace(/\r?\n/g, ' ')
    .trim();
}

function compactKv(obj, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  const entries = Object.entries(obj)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`);
  return entries.length ? entries.join(' ') : fallback;
}

function pushNode(graph, id, label, kind) {
  if (graph.nodes.some((node) => node.id === id)) return id;
  graph.nodes.push({ id, label: cleanLabel(label), kind });
  return id;
}

function pushEdge(graph, from, to, label) {
  if (!from || !to) return;
  graph.edges.push({ from, to, label: cleanLabel(label || '') });
}

function addSequence(graph, steps, options = {}) {
  let previous = options.from || null;
  for (const step of steps) {
    const id = pushNode(graph, step.id, step.label, step.kind);
    pushEdge(graph, previous, id, step.edge);
    previous = id;
  }
  if (options.to) pushEdge(graph, previous, options.to, options.edgeToEnd);
  return previous;
}

function phaseSteps(ast) {
  const cognition = ast.cognition || {};
  const cognitive = ast.cognitive || {};
  const steps = [];

  if (cognition.context && Object.keys(cognition.context).length) {
    steps.push({
      id: 'context',
      label: `Context: ${compactKv(cognition.context, 'context')}`,
      kind: 'context',
      edge: 'sets field'
    });
  }

  (cognitive.perceptions || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`perceive_${index + 1}`, 'phase'),
      label: `Perceive: ${compactKv(item, item.source || item.modality || 'input')}`,
      kind: 'perceive',
      edge: index === 0 ? 'observes' : 'and'
    });
  });

  (cognition.understandings || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`understand_${index + 1}`, 'phase'),
      label: `Understand: ${compactKv(item, item.context || item.method || 'meaning')}`,
      kind: 'understand',
      edge: index === 0 ? 'frames' : 'and'
    });
  });

  (cognitive.reasonings || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`reason_${index + 1}`, 'phase'),
      label: `Reason: ${compactKv(item, item.strategy || 'reason')}`,
      kind: 'reason',
      edge: index === 0 ? 'infers' : 'and'
    });
  });

  (cognitive.decisions || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`decide_${index + 1}`, 'phase'),
      label: `Decide: ${compactKv(item, item.action || 'decision')}`,
      kind: 'decide',
      edge: index === 0 ? 'chooses' : 'and'
    });
  });

  (cognition.acts || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`act_${index + 1}`, 'phase'),
      label: `Act: ${compactKv(item, item.action || 'action')}`,
      kind: 'act',
      edge: index === 0 ? 'executes' : 'and'
    });
  });

  (cognition.feedback || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`feedback_${index + 1}`, 'phase'),
      label: `Feedback: ${compactKv(item, item.signal || 'feedback')}`,
      kind: 'feedback',
      edge: index === 0 ? 'learns from' : 'and'
    });
  });

  (cognitive.reflections || []).forEach((item, index) => {
    steps.push({
      id: cleanId(`reflect_${index + 1}`, 'phase'),
      label: `Reflect: ${compactKv(item, item.target || 'reflection')}`,
      kind: 'reflect',
      edge: index === 0 ? 'examines' : 'and'
    });
  });

  return steps;
}

function agentStepLabel(step) {
  const kind = String(step.kind || 'step');
  const attrs = { ...step };
  delete attrs.kind;
  return `${kind[0].toUpperCase()}${kind.slice(1)}: ${compactKv(attrs, kind)}`;
}

function buildCognitiveGraph(ast) {
  const graph = {
    title: ast.task || ast.module || 'Noeon Program',
    profile: ast.profile || ast.languageProfile || 'ael',
    nodes: [],
    edges: [],
    agents: []
  };

  const rootId = pushNode(graph, 'goal', `Goal: ${ast.cognition?.goal || ast.task || graph.title}`, 'goal');
  const phases = phaseSteps(ast);
  const lastPhase = addSequence(graph, phases, { from: rootId });

  if ((ast.agents || []).length) {
    for (const agent of ast.agents) {
      const agentId = pushNode(graph, cleanId(agent.name, 'agent'), `Agent: ${agent.name}`, 'agent');
      graph.agents.push(agentId);
      pushEdge(graph, rootId, agentId, 'embodied by');
      if (agent.goal) {
        const agentGoalId = pushNode(graph, `${agentId}_goal`, `Goal: ${agent.goal}`, 'goal');
        pushEdge(graph, agentId, agentGoalId, 'pursues');
        const flowSteps = (agent.flow || []).map((step, index) => ({
          id: `${agentId}_flow_${index + 1}`,
          label: agentStepLabel(step),
          kind: step.kind || 'flow',
          edge: index === 0 ? 'starts' : 'then'
        }));
        addSequence(graph, flowSteps, { from: agentGoalId });
      }
    }
  } else if (!lastPhase) {
    pushNode(graph, 'empty_cognition', 'Cognition: no explicit phases', 'empty');
    pushEdge(graph, rootId, 'empty_cognition', 'awaits');
  }

  return graph;
}

function formatMermaidGraph(graph) {
  const lines = ['flowchart TD'];
  lines.push(`  %% Noeon cognitive graph: ${cleanLabel(graph.title)}`);

  for (const node of graph.nodes) {
    lines.push(`  ${node.id}["${cleanLabel(node.label)}"]`);
  }

  for (const edge of graph.edges) {
    const label = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${edge.from} -->${label} ${edge.to}`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  buildCognitiveGraph,
  formatMermaidGraph
};
