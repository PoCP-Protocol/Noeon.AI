'use strict';

function buildNextPhaseResult(input) {
  const {
    next,
    blocked,
    blockReason,
    selectedStrategy,
    guarantees,
    vows,
    constitutions,
    rituals,
    ritualConflicts,
    actsPlanned,
    reflection,
    evolution,
    nextMemory,
    runtimeNext,
    field,
    fieldMemory,
    echoResult,
    fluxCrystals,
    myceliumRuntime,
    hotReload,
    strict,
    governanceDecision,
    hasLivingField
  } = input;

  return {
    profile: 'next',
    blocked,
    blockReason,
    goal: next.goal || null,
    selectedStrategy,
    guarantees,
    vows,
    constitutions,
    rituals,
    ritualConflicts,
    models: next.models || [],
    acts: next.acts || [],
    actsPlanned,
    reflects: next.reflects || [],
    evolves: next.evolves || [],
    selfModels: next.selfModels || [],
    myths: next.myths || [],
    reflection,
    evolution,
    nextMemory,
    runtimeNext,
    field,
    dominant: field?.dominant || null,
    emissions: field?.emissions || [],
    woven: field?.woven || [],
    dreams: field?.dreams || [],
    hybridDreams: field?.hybridDreams || [],
    dreamFeedback: field?.dreamFeedback || null,
    fieldMemory: field ? {
      path: fieldMemory?.path || null,
      runs: fieldMemory?.runs || 0,
      restored: field?.memory?.restored || [],
      recall: field?.recall || null,
      echoes: echoResult.written,
      semantic: fieldMemory?.semantic || null,
      lineage_size: fieldMemory?.lineage?.length || 0
    } : null,
    declaredSpawns: field?.declaredSpawns || [],
    narrative: field?.narrative || [],
    flux: field?.flux || [],
    fluxCrystals,
    bonds: field?.bonds || null,
    spawns: field?.spawns || null,
    mycelium: myceliumRuntime,
    hotReload,
    strictMode: strict,
    governance: governanceDecision,
    autonomous: hasLivingField,
    recommendation: blocked ? 'halt' : (field?.dominant ? `emit:${field.dominant.name}` : 'proceed')
  };
}

module.exports = {
  buildNextPhaseResult
};
