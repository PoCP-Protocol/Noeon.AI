'use strict';

const MESH_RUNTIME_SCHEMA = 'noeon.universal.mesh.runtime/v1';

function pickPhase(phases, prefer) {
  if (!phases?.length) return prefer || 'mesh';
  if (prefer && phases.includes(prefer)) return prefer;
  return phases[phases.length - 1];
}

function runUniversalMeshRuntime(ast, result = {}) {
  const spawns = ast?.social?.spawns || [];
  const delegations = ast?.social?.delegations || [];
  if (!spawns.length && !delegations.length) return null;

  const phases = result.phases || [];
  const blocked = result.blocked === true || result.success === false;
  const spawnPhase = pickPhase(phases, 'cognitive');
  const routePhase = pickPhase(phases, 'relay') || pickPhase(phases, 'cognitive');
  const completePhase = phases[phases.length - 1] || 'mesh';
  const timeline = [];
  const stamp = () => new Date().toISOString();

  const workers = spawns.map((s, i) => {
    const id = `spawn_${i}`;
    const worker = {
      id,
      type: 'spawn',
      name: s.name || s.agent || `worker_${i}`,
      channel: s.channel || 'mesh',
      source: s.source || 'runtime',
      simulated: s.simulated === true,
      status: blocked ? 'blocked' : 'spawned',
      phase: spawnPhase,
      task: null
    };
    timeline.push({
      at: stamp(),
      event: 'spawn',
      phase: spawnPhase,
      id,
      name: worker.name,
      status: worker.status
    });
    if (!blocked) {
      worker.status = 'idle';
      timeline.push({ at: stamp(), event: 'ready', phase: spawnPhase, id, status: 'idle' });
    }
    return worker;
  });

  const routes = delegations.map((d, i) => {
    const id = `deleg_${i}`;
    const target = workers[i % Math.max(workers.length, 1)] || null;
    const route = {
      id,
      type: 'delegate',
      strategy: d.strategy || 'mesh',
      threshold: d.threshold != null ? Number(d.threshold) : 0.65,
      from: ast?.task || ast?.universal?.name || 'orchestrator',
      to: target?.id || null,
      source: d.source || 'runtime',
      simulated: d.simulated === true,
      status: blocked ? 'blocked' : 'pending',
      phase: routePhase
    };

    timeline.push({
      at: stamp(),
      event: 'delegate',
      phase: routePhase,
      id,
      strategy: route.strategy,
      status: route.status
    });

    if (!blocked && target) {
      route.status = 'routed';
      target.status = 'active';
      target.phase = routePhase;
      target.task = {
        strategy: route.strategy,
        threshold: route.threshold,
        delegatedAt: stamp()
      };
      timeline.push({
        at: stamp(),
        event: 'assign',
        phase: routePhase,
        id: target.id,
        deleg: id,
        status: 'active'
      });
      target.status = 'completed';
      target.phase = completePhase;
      timeline.push({
        at: stamp(),
        event: 'complete',
        phase: completePhase,
        id: target.id,
        status: 'completed'
      });
    }

    return route;
  });

  for (const fb of ast?.cognition?.feedback || []) {
    timeline.push({
      at: stamp(),
      event: 'feedback',
      phase: completePhase,
      source: fb.source || 'telemetry',
      simulated: fb.simulated === true
    });
  }

  return {
    schema: MESH_RUNTIME_SCHEMA,
    executedAt: stamp(),
    phases,
    workers,
    routes,
    timeline,
    summary: {
      spawns: workers.length,
      delegations: routes.length,
      completed: workers.filter((w) => w.status === 'completed').length,
      routed: routes.filter((r) => r.status === 'routed').length,
      blocked,
      live: true
    }
  };
}

module.exports = {
  MESH_RUNTIME_SCHEMA,
  runUniversalMeshRuntime
};
