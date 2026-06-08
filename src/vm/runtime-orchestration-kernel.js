'use strict';

const { runFieldEngine } = require('../runtime/next/field-engine');
const { loadCluster, publishCells, absorbFromCluster } = require('../runtime/next/mycelium-store');
const { publishEvent, readEvents } = require('../runtime/next/mycelium-bus');
const { relayToTargets } = require('../runtime/next/mycelium-relay');
const { applyFluxCrystallizations } = require('../grammar/next/macro-registry');
const { buildHotReloadPatch, applyHotReload } = require('../runtime/next/hot-reload');
const { buildDreamCrystallizePatch } = require('../runtime/next/weave-narrative');
const {
  loadFieldMemory,
  saveFieldMemory,
  mergeMemoryFromField,
  executeEchoes
} = require('../runtime/next/field-memory');
const { consolidateEpisodicToSemantic } = require('../runtime/next/memory-consolidate');
const { recordLineage } = require('../runtime/next/spawn-runner');

function setupMycelium(next, ast, options = {}) {
  let myceliumRuntime = null;
  const myceliumEnv = { absorbed: [], rejected: [], events: [] };

  if ((next.mycelium || []).length > 0) {
    for (const mesh of next.mycelium) {
      const clusterData = loadCluster(mesh.cluster, { dir: options.mycelium_dir });
      const { absorbed, rejected } = absorbFromCluster([mesh], clusterData, ast.task || ast.module || 'local');
      myceliumEnv.absorbed.push(...absorbed);
      myceliumEnv.rejected.push(...rejected);
      if (mesh.react !== false) {
        const events = readEvents(mesh.cluster, {
          dir: options.mycelium_dir,
          limit: mesh.react_limit || 15
        });
        myceliumEnv.events.push(...events.map((e) => ({ ...e, cluster: mesh.cluster })));
      }
    }
    myceliumRuntime = {
      clusters: next.mycelium.map((m) => m.cluster),
      absorbed: myceliumEnv.absorbed.length,
      rejected: myceliumEnv.rejected.length,
      events_seen: myceliumEnv.events.length
    };
  }

  return {
    myceliumRuntime,
    myceliumEnv
  };
}

function initializeFieldMemory(programKey, options = {}) {
  return options.field_memory === false
    ? null
    : (options.field_memory || loadFieldMemory(programKey, { dir: options.field_memory_dir }));
}

function runFieldAndFlux(next, options, hasLivingField, myceliumEnv, fieldMemory) {
  const field = hasLivingField
    ? runFieldEngine(next, { ...options, mycelium: myceliumEnv, field_memory: fieldMemory })
    : null;
  const fluxCrystals = applyFluxCrystallizations(field?.flux || []);
  return { field, fluxCrystals };
}

function publishFieldToMycelium(next, ast, options, field, myceliumRuntime) {
  let runtime = myceliumRuntime;

  if (field?.dominant && (next.mycelium || []).length > 0 && options.publish_mycelium !== false) {
    for (const mesh of next.mycelium) {
      publishCells(mesh.cluster, ast.task || ast.module || 'local', field.cells.filter((c) => !c.provenance), {
        dir: options.mycelium_dir
      });
      const domEvent = {
        type: 'field.dominant',
        program: ast.task || ast.module || 'local',
        dominant: field.dominant.name,
        energy: field.dominant.energy,
        hybrid_dreams: (field.hybridDreams || []).length,
        dream_feedback: (field.dreamFeedback?.applied || []).length,
        narrative: (field.narrative || []).slice(0, 3)
      };
      publishEvent(mesh.cluster, domEvent, { dir: options.mycelium_dir });
      if ((field.narrative || []).length) {
        publishEvent(mesh.cluster, {
          type: 'narrative.weave',
          program: ast.task || ast.module || 'local',
          items: field.narrative
        }, { dir: options.mycelium_dir });
      }
      if (mesh.relay?.length) {
        relayToTargets(mesh.cluster, mesh.relay, domEvent, { dir: options.mycelium_dir });
      }
    }
    runtime = runtime || {};
    runtime.published = true;
  }

  return runtime;
}

function processEchoes(next, field, fieldMemory, inputMemory, myceliumRuntime) {
  let runtime = myceliumRuntime;
  let memory = fieldMemory;
  let echoResult = { written: [] };

  if ((next.echoes || []).length > 0 && field?.cells) {
    runtime = runtime || {};
    const echoed = executeEchoes(next.echoes, field, memory, { runCount: inputMemory.runCount + 1 });
    memory = echoed.memory;
    echoResult = echoed;
    runtime.echoed = echoResult.written.map((e) => e.into);
  }

  return {
    myceliumRuntime: runtime,
    fieldMemory: memory,
    echoResult
  };
}

function persistFieldMemory(next, options, field, fieldMemory, programKey) {
  let memory = fieldMemory;

  if (field && options.field_memory !== false) {
    memory = mergeMemoryFromField(memory, field);
    memory = recordLineage(memory, field, field.declaredSpawns || []);

    const fieldCfg = (next.fields || [])[0] || {};
    const consolidation = consolidateEpisodicToSemantic(memory, fieldCfg);
    memory = consolidation.memory;

    if (options.save_field_memory !== false) {
      const savedPath = saveFieldMemory(programKey, memory, { dir: options.field_memory_dir });
      memory.path = savedPath;
      memory.runs = (memory.runs || 0) + 1;
    }
  }

  return memory;
}

function applyHotReloadIfNeeded(next, options, field, fluxCrystals) {
  let hotReload = { applied: false, reason: 'disabled' };
  const autoSpawns = field?.spawns?.autoGenerated || [];
  const declaredSpawns = field?.declaredSpawns || [];
  const dreamPatch = buildDreamCrystallizePatch(field?.dreamFeedback, next.autobond);
  if (options.hot_reload !== false && (fluxCrystals.length > 0 || (field?.bonds?.autoGenerated || []).length > 0 || autoSpawns.length > 0 || declaredSpawns.length > 0 || dreamPatch)) {
    const sourcePath = options.source_path || options.filename;
    if (sourcePath && String(sourcePath).endsWith('.next')) {
      const patch = [
        buildHotReloadPatch({
          fluxCrystals,
          autoBonds: field?.bonds?.autoGenerated || [],
          autoSpawns,
          declaredSpawns,
          field
        }),
        dreamPatch
      ].filter(Boolean).join('\n\n');
      hotReload = applyHotReload(sourcePath, patch, { evolved_dir: options.evolved_dir });
    }
  }
  return hotReload;
}

module.exports = {
  setupMycelium,
  initializeFieldMemory,
  runFieldAndFlux,
  publishFieldToMycelium,
  processEchoes,
  persistFieldMemory,
  applyHotReloadIfNeeded
};
