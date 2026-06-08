'use strict';
const {
  buildGovernanceDecision,
  chooseStrategy,
  normalizeNextMemory,
  chooseStrategyWithMemory,
  updateStrategyMemory,
  buildEvolution,
  cloneNextState,
  applyEvolutionSelection,
  buildReflection,
  buildExecutionContext,
  setupMycelium,
  initializeFieldMemory,
  runFieldAndFlux,
  publishFieldToMycelium,
  processEchoes,
  persistFieldMemory,
  applyHotReloadIfNeeded,
  buildNextPhaseResult
} = require('./next-kernels');

async function runNextPhase(ast, options = {}) {
  const next = ast.next || {};
  const feedback = options.feedback || {};
  const strict = options.strict_next === true;
  const inputMemory = normalizeNextMemory(options.next_memory);
  const hasLivingField = (next.cells?.length || 0) > 0 || (next.fields?.length || 0) > 0;

  let { myceliumRuntime, myceliumEnv } = setupMycelium(next, ast, options);

  const programKey = ast.program || ast.task || ast.module || 'local';
  let fieldMemory = initializeFieldMemory(programKey, options);
  let echoResult = { written: [] };

  const { field, fluxCrystals } = runFieldAndFlux(next, options, hasLivingField, myceliumEnv, fieldMemory);

  const contextEval = buildExecutionContext(next, feedback, inputMemory);
  const {
    guarantees,
    vows,
    constitutions,
    rituals,
    ritualConflicts,
    actsPlanned,
    hasUnknownGuarantee,
    hasHardVowUnknown,
    hasHardConstitutionUnknown,
    goalPriority
  } = contextEval;
  const selectedStrategy = chooseStrategyWithMemory(next.strategies || [], goalPriority, inputMemory) ||
    chooseStrategy(next.strategies || [], goalPriority);

  // Autonomous mode: living programs proceed unless explicit guarantee failure + strict
  const governanceDecision = buildGovernanceDecision({
    guarantees,
    vows,
    constitutions,
    rituals,
    actsPlanned,
    ritualConflicts,
    strict,
    hasUnknownGuarantee,
    hasHardVowUnknown,
    hasHardConstitutionUnknown
  });
  const blocked = governanceDecision.blocked;
  const blockReason = governanceDecision.blockReason;

  const reflection = buildReflection(next, {
    guarantees,
    vows,
    constitutions,
    rituals,
    ritualConflicts,
    actsPlanned,
    governanceDecision,
    field,
    selectedStrategy,
    feedback
  });

  const evolution = buildEvolution(next, {
    guarantees,
    vows,
    constitutions,
    rituals,
    actsPlanned,
    ritualConflicts,
    reflection,
    selectedStrategy,
    field
  });

  const runtimeNext = cloneNextState(next);
  const autoEvolve = options.auto_evolve === true;
  const appliedEvolution = autoEvolve
    ? applyEvolutionSelection(runtimeNext, evolution.selected, { field, selectedStrategy, rituals, ritualConflicts })
    : { changed: false, mutation: null, reason: 'auto-evolve-off' };

  const nextMemory = updateStrategyMemory(
    inputMemory,
    selectedStrategy,
    guarantees,
    evolution,
    appliedEvolution,
    rituals,
    ritualConflicts,
    governanceDecision
  );

  evolution.applied = {
    enabled: autoEvolve,
    ...appliedEvolution
  };

  myceliumRuntime = publishFieldToMycelium(next, ast, options, field, myceliumRuntime);

  const echoState = processEchoes(next, field, fieldMemory, inputMemory, myceliumRuntime);
  myceliumRuntime = echoState.myceliumRuntime;
  fieldMemory = echoState.fieldMemory;
  echoResult = echoState.echoResult;

  fieldMemory = persistFieldMemory(next, options, field, fieldMemory, programKey);

  const hotReload = applyHotReloadIfNeeded(next, options, field, fluxCrystals);

  return buildNextPhaseResult({
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
  });
}

module.exports = {
  runNextPhase
};
