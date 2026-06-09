'use strict';

const MESH_TRACE_SCHEMA = 'noeon.universal.mesh/v1';

function nodeStatusFromRuntime(worker, result) {
  if (!worker) {
    const blocked = result?.blocked === true;
    const success = result?.success !== false && !blocked;
    return success ? 'simulated' : 'blocked';
  }
  return worker.status || 'simulated';
}

function edgeStatusFromRuntime(route, result) {
  if (!route) {
    const blocked = result?.blocked === true;
    const success = result?.success !== false && !blocked;
    return success ? 'routed' : 'blocked';
  }
  return route.status || 'pending';
}

function buildUniversalMeshTrace(ast, result = null) {
  const spawns = ast?.social?.spawns || [];
  const delegations = ast?.social?.delegations || [];
  const feedback = ast?.cognition?.feedback || [];
  const meshRuntime = result?.meshRuntime || null;

  if (!spawns.length && !delegations.length && !feedback.length) {
    return null;
  }

  const blocked = result?.blocked === true;
  const success = result?.success !== false && !blocked;
  const generatedAt = meshRuntime?.executedAt || new Date().toISOString();
  const live = meshRuntime?.summary?.live === true;

  const nodes = spawns.map((s, i) => {
    const worker = meshRuntime?.workers?.[i];
    return {
      id: worker?.id || `spawn_${i}`,
      type: 'spawn',
      name: s.name || s.agent || worker?.name || `worker_${i}`,
      channel: s.channel || worker?.channel || 'mesh',
      status: nodeStatusFromRuntime(worker, result),
      phase: worker?.phase || null,
      source: s.source || worker?.source || 'runtime',
      simulated: live ? false : s.simulated === true,
      task: worker?.task || null
    };
  });

  const edges = delegations.map((d, i) => {
    const route = meshRuntime?.routes?.[i];
    return {
      id: route?.id || `deleg_${i}`,
      type: 'delegate',
      from: route?.from || ast?.task || ast?.agents?.[0]?.name || 'orchestrator',
      to: route?.to || null,
      strategy: d.strategy || route?.strategy || 'mesh',
      threshold: d.threshold ?? route?.threshold,
      status: edgeStatusFromRuntime(route, result),
      phase: route?.phase || null,
      source: d.source || route?.source || 'runtime',
      simulated: live ? false : d.simulated === true
    };
  });

  const timeline = meshRuntime?.timeline?.length
    ? meshRuntime.timeline
    : [
        ...nodes.map((n) => ({ at: generatedAt, event: 'spawn', id: n.id, name: n.name })),
        ...edges.map((e) => ({ at: generatedAt, event: 'delegate', id: e.id, strategy: e.strategy })),
        ...feedback.map((f, i) => ({
          at: generatedAt,
          event: 'feedback',
          id: `fb_${i}`,
          source: f.source || 'telemetry'
        }))
      ];

  return {
    schema: MESH_TRACE_SCHEMA,
    generatedAt,
    program: ast?.task || ast?.universal?.name || null,
    surface: ast?.profile || ast?.detectedSurface || null,
    live,
    summary: {
      spawns: nodes.length,
      delegations: edges.length,
      feedback: feedback.length,
      completed: meshRuntime?.summary?.completed ?? (success ? nodes.length : 0),
      success,
      blocked,
      live
    },
    nodes,
    edges,
    timeline,
    mermaid: buildMeshMermaid(nodes, edges, ast?.task)
  };
}

function buildMeshMermaid(nodes, edges, root) {
  if (!nodes.length && !edges.length) return null;
  const lines = ['flowchart LR', `  root["${root || 'program'}"]`];
  for (const n of nodes) {
    lines.push(`  root --> ${n.id}["${n.name}"]`);
  }
  for (const e of edges) {
    lines.push(`  ${e.from?.replace(/\W/g, '_') || 'root'} -.-> ${e.id}{delegate}`);
  }
  return lines.join('\n');
}

function attachMeshTraceToResult(result, ast) {
  const trace = buildUniversalMeshTrace(ast, result);
  if (!trace) return result;
  result.meshTrace = trace;
  if (result.report) {
    result.report.observability = result.report.observability || {};
    result.report.observability.mesh_trace = trace;
  }
  if (result.unifiedReport) {
    result.unifiedReport.observability = result.unifiedReport.observability || {};
    result.unifiedReport.observability.mesh_trace = trace;
  }
  return result;
}

module.exports = {
  MESH_TRACE_SCHEMA,
  buildUniversalMeshTrace,
  buildMeshMermaid,
  attachMeshTraceToResult
};
