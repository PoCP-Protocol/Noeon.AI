'use strict';

const { loadFieldMemory } = require('./field-memory');

function cleanId(value, prefix) {
  const text = String(value || prefix || 'node').replace(/[^a-zA-Z0-9_]/g, '_');
  return `${prefix}_${text}`;
}

function cleanLabel(value) {
  return String(value ?? '').replace(/"/g, "'").replace(/\r?\n/g, ' ').trim();
}

function buildMemoryGraph(options = {}) {
  const program = options.program || 'genesis';
  const memory = options.memory || loadFieldMemory(program, { dir: options.dir });
  const graph = {
    title: `Field Memory: ${program}`,
    kind: 'field_memory',
    program,
    nodes: [],
    edges: []
  };

  const rootId = cleanId(program, 'program');
  graph.nodes.push({ id: rootId, label: `Program: ${program} (runs: ${memory.runs || 0})`, kind: 'program' });

  for (const [name, cell] of Object.entries(memory.cells || {})) {
    const id = cleanId(name, 'cell');
    graph.nodes.push({
      id,
      label: `${name} [${cell.energy ?? '?'}]`,
      kind: 'cell',
      energy: cell.energy
    });
    graph.edges.push({ from: rootId, to: id, label: 'remembers' });
  }

  for (const entry of memory.lineage || []) {
    const epochId = cleanId(entry.at, 'epoch');
    graph.nodes.push({
      id: epochId,
      label: `Epoch @ ${String(entry.at).slice(0, 19)}`,
      kind: 'epoch'
    });
    graph.edges.push({ from: rootId, to: epochId, label: 'lineage' });

    if (entry.dominant) {
      const domId = cleanId(entry.dominant, 'cell');
      if (graph.nodes.some((n) => n.id === domId)) {
        graph.edges.push({ from: epochId, to: domId, label: 'dominant' });
      }
    }
    for (const name of entry.declared || []) {
      const sid = cleanId(name, 'spawn');
      if (!graph.nodes.some((n) => n.id === sid)) {
        graph.nodes.push({ id: sid, label: `Spawn: ${name}`, kind: 'spawn' });
      }
      graph.edges.push({ from: epochId, to: sid, label: 'declared' });
    }
    for (const hybrid of entry.auto_spawns || []) {
      const hid = cleanId(hybrid.name, 'hybrid');
      if (!graph.nodes.some((n) => n.id === hid)) {
        graph.nodes.push({ id: hid, label: `Hybrid: ${hybrid.name}`, kind: 'hybrid' });
      }
      graph.edges.push({ from: epochId, to: hid, label: 'auto-spawn' });
      for (const parent of hybrid.parents || []) {
        const pid = cleanId(parent, 'cell');
        if (graph.nodes.some((n) => n.id === pid)) {
          graph.edges.push({ from: pid, to: hid, label: 'parent' });
        }
      }
    }
  }

  const semantic = memory.semantic || memory.echoes?.['memory.semantic']?.slice(-1)[0];
  if (semantic?.patterns?.length) {
    const semId = cleanId('semantic', 'memory');
    graph.nodes.push({ id: semId, label: 'Semantic Memory', kind: 'semantic' });
    graph.edges.push({ from: rootId, to: semId, label: 'consolidated' });
    for (const p of semantic.patterns.slice(0, 8)) {
      const pid = cleanId(p.pattern, 'pattern');
      graph.nodes.push({
        id: pid,
        label: `${p.pattern} (${p.weight})`,
        kind: 'pattern'
      });
      graph.edges.push({ from: semId, to: pid, label: p.kind || 'pattern' });
      const cellId = cleanId(p.pattern, 'cell');
      if (graph.nodes.some((n) => n.id === cellId)) {
        graph.edges.push({ from: pid, to: cellId, label: 'recalls' });
      }
    }
  }

  const episodic = memory.echoes?.['memory.episodic'] || [];
  if (episodic.length) {
    const epiId = cleanId('episodic', 'memory');
    graph.nodes.push({ id: epiId, label: `Episodic (${episodic.length})`, kind: 'episodic' });
    graph.edges.push({ from: rootId, to: epiId, label: 'echoes' });
  }

  return graph;
}

function formatMermaidGraph(graph) {
  const lines = ['flowchart TD'];
  lines.push(`  %% ${cleanLabel(graph.title)} (${graph.kind || 'graph'})`);
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
  buildMemoryGraph,
  formatMermaidGraph
};
