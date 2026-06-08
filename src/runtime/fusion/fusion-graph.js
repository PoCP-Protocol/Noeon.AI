'use strict';

const path = require('path');
const { detectProfile } = require('../../core/profile');
const { formatMermaidGraph } = require('../next/mycelium-graph');

function cleanId(value, prefix) {
  const text = String(value || prefix || 'node').replace(/[^a-zA-Z0-9_]/g, '_');
  return `${prefix}_${text}`;
}

function cleanLabel(value) {
  return String(value ?? '').replace(/"/g, "'").replace(/\r?\n/g, ' ').trim();
}

function basenameRef(ref) {
  if (!ref) return null;
  return path.basename(String(ref));
}

function ensureNode(graph, seen, node) {
  if (seen.has(node.id)) return;
  seen.add(node.id);
  graph.nodes.push(node);
}

function ensureEdge(graph, edge) {
  graph.edges.push(edge);
}

function layerNodeId(target) {
  return cleanId(target, 'layer');
}

function buildFusionGraph(ast, preview = null, options = {}) {
  const profile = preview?.profile || detectProfile(ast, options);
  const filename = options.filename || options.source_path || 'program';
  const baseName = basenameRef(filename) || 'program';

  const graph = {
    title: `Fusion: ${baseName}`,
    kind: 'fusion',
    profile,
    nodes: [],
    edges: [],
    layers: preview?.layers || []
  };

  const seen = new Set();
  const rootId = cleanId(`${profile}_${baseName}`, 'root');
  ensureNode(graph, seen, {
    id: rootId,
    label: `${profile}: ${baseName}`,
    kind: profile
  });

  const fuseList = [
    ...(ast.fusion || []),
    ...(ast.general?.fusion || []),
    ...(ast.next?.fusion || [])
  ].filter((f) => f && f.enabled !== false);

  for (const fuse of fuseList) {
    const target = String(fuse.target || 'unknown').toLowerCase();
    const layerId = layerNodeId(target);
    const ref = fuse.file || fuse.path || fuse.source;
    const mode = fuse.mode || 'bridge';

    ensureNode(graph, seen, {
      id: layerId,
      label: `${target}${ref ? `: ${basenameRef(ref)}` : ''}`,
      kind: target
    });
    ensureEdge(graph, {
      from: rootId,
      to: layerId,
      label: `FUSE ${mode}`
    });

    if (ref) {
      const fileId = cleanId(basenameRef(ref), 'file');
      ensureNode(graph, seen, {
        id: fileId,
        label: basenameRef(ref),
        kind: `${target}_file`
      });
      ensureEdge(graph, { from: layerId, to: fileId, label: 'loads' });
    }
  }

  if (preview?.liminalField?.sidecar) {
    const sideId = cleanId(basenameRef(preview.liminalField.sidecar), 'sidecar');
    ensureNode(graph, seen, {
      id: sideId,
      label: `sidecar: ${basenameRef(preview.liminalField.sidecar)}`,
      kind: 'sidecar'
    });
    ensureEdge(graph, {
      from: layerNodeId('liminal'),
      to: sideId,
      label: 'sidecar'
    });
  }

  if (preview?.fusion?.sidecars?.length) {
    for (const side of preview.fusion.sidecars) {
      const sideId = cleanId(basenameRef(side), 'sidecar');
      ensureNode(graph, seen, {
        id: sideId,
        label: `sidecar: ${basenameRef(side)}`,
        kind: 'sidecar'
      });
      ensureEdge(graph, {
        from: layerNodeId('liminal'),
        to: sideId,
        label: 'sidecar'
      });
    }
  }

  const dominant = preview?.nextField?.dominant || preview?.next?.dominant;
  if (dominant?.name) {
    const domId = cleanId(dominant.name, 'dominant');
    ensureNode(graph, seen, {
      id: domId,
      label: `Dominant: ${dominant.name} (${dominant.energy ?? '?'})`,
      kind: 'dominant'
    });
    const nextLayer = layerNodeId('next');
    if (seen.has(nextLayer)) {
      ensureEdge(graph, { from: nextLayer, to: domId, label: 'field' });
    } else {
      ensureEdge(graph, { from: rootId, to: domId, label: 'dominant' });
    }
  }

  const liminalFusions = preview?.liminalField?.fusions || [];
  for (const lf of liminalFusions) {
    const alignments = lf.resonance?.alignments || lf.alignments || [];
    for (const a of alignments.slice(0, 6)) {
      const aId = cleanId(a.key || `${a.source}_${a.target}`, 'align');
      ensureNode(graph, seen, {
        id: aId,
        label: `${a.key || 'resonate'} [${Number(a.alignment).toFixed(3)}]`,
        kind: a.pass ? 'resonance_pass' : 'resonance_fail'
      });
      if (seen.has(layerNodeId('liminal'))) {
        ensureEdge(graph, {
          from: layerNodeId('liminal'),
          to: aId,
          label: a.pass ? 'pass' : 'fail'
        });
      }
    }
  }

  if (preview?.fusion?.general?.summary && seen.has(layerNodeId('general'))) {
    const bridgeId = cleanId('general_bridge', 'bridge');
    ensureNode(graph, seen, {
      id: bridgeId,
      label: cleanLabel(preview.fusion.general.summary).slice(0, 64),
      kind: 'bridge'
    });
    ensureEdge(graph, { from: layerNodeId('general'), to: bridgeId, label: 'bridge' });
  }

  if (preview?.summary) {
    graph.summary = preview.summary;
  }

  return graph;
}

function formatFusionMermaid(graph) {
  const lines = ['flowchart LR'];
  lines.push(`  %% ${cleanLabel(graph.title)}`);

  const styleByKind = {
    general: 'fill:#1f6feb,stroke:#58a6ff,color:#fff',
    next: 'fill:#238636,stroke:#3fb950,color:#fff',
    liminal: 'fill:#8957e5,stroke:#a371f7,color:#fff',
    dominant: 'fill:#d29922,stroke:#e3b341,color:#111',
    sidecar: 'fill:#30363d,stroke:#8b949e,color:#e6edf3',
    bridge: 'fill:#0d419d,stroke:#388bfd,color:#fff',
    resonance_pass: 'fill:#033a16,stroke:#3fb950,color:#aff5b4',
    resonance_fail: 'fill:#67060c,stroke:#f85149,color:#ffdcd7'
  };

  for (const node of graph.nodes || []) {
    lines.push(`  ${node.id}["${cleanLabel(node.label)}"]`);
    const style = styleByKind[node.kind] || styleByKind[node.kind?.split('_')[0]];
    if (style) lines.push(`  style ${node.id} ${style}`);
  }

  for (const edge of graph.edges || []) {
    const label = edge.label ? `|${cleanLabel(edge.label)}|` : '';
    lines.push(`  ${edge.from} -->${label} ${edge.to}`);
  }

  return `${lines.join('\n')}\n`;
}

async function runFusionGraph(ast, options = {}) {
  const { runFusionPreview } = require('./fusion-preview');
  const preview = options.preview || await runFusionPreview(ast, options);
  const graph = buildFusionGraph(ast, preview, options);
  const mermaid = options.format === 'json' ? null : formatFusionMermaid(graph);

  return {
    profile: preview.profile,
    layers: preview.layers,
    phases: preview.phases,
    success: preview.success,
    summary: preview.summary,
    triad: preview.triad,
    bidirectional: preview.bidirectional,
    plan: preview.plan,
    graph,
    mermaid: mermaid || formatFusionMermaid(graph),
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    preview: options.include_preview ? preview : undefined
  };
}

module.exports = {
  buildFusionGraph,
  formatFusionMermaid,
  runFusionGraph
};
