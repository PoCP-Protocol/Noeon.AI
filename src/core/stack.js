'use strict';

/**
 * Noeon stack facade — one import for surface semantics (Next = core).
 */

const {
  SURFACES,
  CORE_SURFACE,
  SURFACE_ROLES,
  resolveIntentGoal,
  resolveProgramTask,
  getSurfaceInfo
} = require('./surfaces');

const {
  buildStackManifest,
  syncAgentsToUnifiedStack,
  syncGoalAcrossSurfaces,
  attachCanonicalStack,
  mergeExecutionIntoCanonical,
  hydrateNextFromCanonical
} = require('./noeon-unified');

const {
  BRAIN_REGIONS,
  COGNITIVE_CYCLE,
  buildArchitectureMap,
  attachArchitecture,
  regionForPrimitive
} = require('./cognitive-architecture');

module.exports = {
  SURFACES,
  CORE_SURFACE,
  SURFACE_ROLES,
  resolveIntentGoal,
  resolveProgramTask,
  getSurfaceInfo,
  buildStackManifest,
  syncAgentsToUnifiedStack,
  syncGoalAcrossSurfaces,
  attachCanonicalStack,
  mergeExecutionIntoCanonical,
  hydrateNextFromCanonical,
  BRAIN_REGIONS,
  COGNITIVE_CYCLE,
  buildArchitectureMap,
  attachArchitecture,
  regionForPrimitive
};
