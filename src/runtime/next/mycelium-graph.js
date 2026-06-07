'use strict';

const fs = require('fs');
const path = require('path');
const { DEFAULT_DIR, loadCluster } = require('./mycelium-store');
const { bondKey } = require('./auto-bond');

function cleanId(value, prefix) {
  const text = String(value || prefix || 'node').replace(/[^a-zA-Z0-9_]/g, '_');
  return `${prefix}_${text}`;
}

function cleanLabel(value) {
  return String(value ?? '').replace(/"/g, "'").replace(/\r?\n/g, ' ').trim();
}

function listClusters(dir = DEFAULT_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function buildMyceliumGraph(options = {}) {
  const dir = options.dir || DEFAULT_DIR;
  const field = options.field || null;
  const graph = {
    title: 'Mycelium Field',
    kind: 'mycelium',
    nodes: [],
    edges: [],
    clusters: []
  };

  for (const clusterName of listClusters(dir)) {
    const data = loadCluster(clusterName, { dir });
    graph.clusters.push(clusterName);

    const clusterId = cleanId(clusterName, 'cluster');
    graph.nodes.push({
      id: clusterId,
      label: `Cluster: ${clusterName}`,
      kind: 'cluster'
    });

    for (const program of data.programs || []) {
      const progId = cleanId(`${clusterName}_${program}`, 'program');
      graph.nodes.push({ id: progId, label: `Program: ${program}`, kind: 'program' });
      graph.edges.push({ from: clusterId, to: progId, label: 'hosts' });
    }

    for (const cell of data.cells || []) {
      const cellId = cleanId(`${clusterName}_${cell.program}_${cell.name}`, 'cell');
      const energy = cell.energy != null ? ` (${cell.energy})` : '';
      graph.nodes.push({
        id: cellId,
        label: `${cell.name}${energy}`,
        kind: 'cell',
        program: cell.program,
        cluster: clusterName
      });
      const progId = cleanId(`${clusterName}_${cell.program}`, 'program');
      if (graph.nodes.some((n) => n.id === progId)) {
        graph.edges.push({ from: progId, to: cellId, label: 'published' });
      } else {
        graph.edges.push({ from: clusterId, to: cellId, label: 'contains' });
      }
    }
  }

  if (field?.cells) {
    for (const cell of field.cells) {
      if (!cell.provenance) continue;
      const localId = cleanId(cell.name, 'local');
      graph.nodes.push({ id: localId, label: `Local: ${cell.name}`, kind: 'local_cell' });
      const provId = graph.nodes.find((n) => n.label.startsWith(cell.name.split('__').pop()))?.id;
      if (provId) graph.edges.push({ from: provId, to: localId, label: 'absorbed' });
    }
  }

  const bondList = field?.bonds?.all || field?.bonds?.activations || [];
  for (const bond of bondList) {
    const fromId = cleanId(bond.from, 'cell');
    const toId = cleanId(bond.to, 'cell');
    graph.edges.push({
      from: fromId,
      to: toId,
      label: bond.auto ? `auto-${bond.kind || 'bond'}` : (bond.kind || 'bond')
    });
  }

  return graph;
}

function buildNextFieldGraph(ast, fieldResult = null) {
  const next = ast.next || {};
  const graph = {
    title: ast.task || 'Next Field',
    profile: 'next',
    kind: 'next_field',
    nodes: [],
    edges: []
  };

  const goalId = cleanId('goal', 'node');
  graph.nodes.push({ id: goalId, label: `Goal: ${next.goal?.text || ast.cognition?.goal}`, kind: 'goal' });

  for (const cell of next.cells || []) {
    const id = cleanId(cell.name, 'cell');
    const energy = fieldResult?.cells?.find((c) => c.name === cell.name)?.energy ?? cell.energy;
    graph.nodes.push({
      id,
      label: `${cell.name} [${energy ?? '?'}]`,
      kind: 'cell'
    });
    graph.edges.push({ from: goalId, to: id, label: 'expresses' });
  }

  const bonds = fieldResult?.bonds?.all || next.bonds || [];
  for (const bond of bonds) {
    graph.edges.push({
      from: cleanId(bond.from, 'cell'),
      to: cleanId(bond.to, 'cell'),
      label: bond.auto ? `auto ${bond.kind}` : bond.kind
    });
  }

  for (const weave of next.weaves || []) {
    const wId = cleanId(weave.into, 'weave');
    graph.nodes.push({ id: wId, label: `Weave → ${weave.into}`, kind: 'weave' });
    for (const winner of fieldResult?.woven?.[0]?.winners || []) {
      graph.edges.push({ from: cleanId(winner, 'cell'), to: wId, label: 'contributes' });
    }
  }

  if (fieldResult?.dominant) {
    const dId = cleanId('dominant', 'node');
    graph.nodes.push({
      id: dId,
      label: `Dominant: ${fieldResult.dominant.name}`,
      kind: 'dominant'
    });
    graph.edges.push({
      from: cleanId(fieldResult.dominant.name, 'cell'),
      to: dId,
      label: 'emerges'
    });
  }

  return graph;
}

function mergeGraphs(...graphs) {
  const merged = { nodes: [], edges: [], title: 'Combined', kind: 'combined' };
  const seenNodes = new Set();
  for (const g of graphs) {
    if (!g) continue;
    for (const n of g.nodes || []) {
      if (seenNodes.has(n.id)) continue;
      seenNodes.add(n.id);
      merged.nodes.push(n);
    }
    merged.edges.push(...(g.edges || []));
    if (g.title) merged.title = g.title;
  }
  return merged;
}

function formatMermaidGraph(graph) {
  const lines = ['flowchart TD'];
  lines.push(`  %% ${cleanLabel(graph.title)} (${graph.kind || graph.profile || 'graph'})`);

  for (const node of graph.nodes || []) {
    lines.push(`  ${node.id}["${cleanLabel(node.label)}"]`);
  }

  for (const edge of graph.edges || []) {
    const label = edge.label ? `|${cleanLabel(edge.label)}|` : '';
    lines.push(`  ${edge.from} -->${label} ${edge.to}`);
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  buildMyceliumGraph,
  buildNextFieldGraph,
  mergeGraphs,
  formatMermaidGraph,
  listClusters
};
