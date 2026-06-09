'use strict';

/**
 * Unified VM Executor — canonical-first with legacy fallback
 */

const { validateAel } = require('../validator');
const { runGovernancePreflight } = require('../core/governance');
const { detectProfile, resolveExecutionMode, getProfileInfo } = require('../core/profile');
const { detectFusionPlan } = require('../runtime/fusion/unified-fusion');
const { prepareCanonicalExecution, mergeCanonicalIntoResult, finalizeCanonicalResult } = require('../core/canonical-runtime');
const { deriveExecutionRoute } = require('../core/canonical-route');
const { resolveCanonicalPhases } = require('./canonical-phase-resolver');
const { executeCanonicalProgram } = require('./canonical-executor');
const { executeLegacyProgram } = require('./legacy-executor');
const { resolveScheduler, runConsciousnessPhase } = require('./consciousness-scheduler');
const { CognitiveKernel } = require('../core/kernel');
const { PHASE } = require('./phases');

const VM_VERSION = require('../core/release-version').NOEON_VERSION;

function finishExecution(result, ast, canonicalPrep, options) {
  if (canonicalPrep) {
    finalizeCanonicalResult(result, ast, canonicalPrep, {
      ...options,
      filename: options.filename || options.source_path
    });
  }
  return result;
}

function buildKernel(options = {}) {
  const enableLlm = options.enable_llm !== false && process.env.NOEON_LLM_MODE !== 'off';
  return new CognitiveKernel({
    enable_prediction: options.enable_prediction !== false,
    enable_evolution: options.enable_evolution !== false,
    enable_metacognition: options.enable_metacognition !== false,
    enable_llm: enableLlm,
    llm: options.llm || {},
    ...options
  });
}

async function executeProgram(ast, options = {}) {
  if (options.legacy_profile == null && process.env.NOEON_LEGACY_PROFILE === '1') {
    options = { ...options, legacy_profile: true };
  }

  const profile = detectProfile(ast, options);
  const mode = resolveExecutionMode(profile, options);
  const profileInfo = getProfileInfo(profile);

  const validation = validateAel(ast);
  const governance = runGovernancePreflight(ast, validation, options);
  const feedback = options.feedback || {};
  const canonicalPrep = options.canonical !== false
    ? prepareCanonicalExecution(ast, options)
    : null;

  if (options.require_valid !== false && !governance.valid) {
    return finishExecution({
      success: false,
      blocked: true,
      vm: VM_VERSION,
      profile,
      profileInfo,
      mode,
      governance,
      error: 'Governance preflight failed'
    }, ast, canonicalPrep, options);
  }

  if (canonicalPrep?.governance?.blocked) {
    return finishExecution({
      success: false,
      blocked: true,
      vm: VM_VERSION,
      profile,
      profileInfo,
      mode,
      governance,
      governanceArbitration: canonicalPrep.governance,
      error: canonicalPrep.governance.blockReason || 'Canonical governance blocked execution'
    }, ast, canonicalPrep, options);
  }

  const result = {
    vm: VM_VERSION,
    profile,
    profileInfo,
    mode,
    governance,
    phases: [],
    success: true
  };

  if (canonicalPrep) {
    mergeCanonicalIntoResult(result, canonicalPrep);
    result.phases.push(PHASE.CANONICAL);
  }

  const route = deriveExecutionRoute(canonicalPrep, profile, mode, options);
  if (route) result.executionRoute = route;

  const fusionPlan = detectFusionPlan(ast, options);
  const plan = canonicalPrep?.plan;
  const irPhases = resolveCanonicalPhases(route, canonicalPrep, ast, options, fusionPlan);
  const execCtx = {
    result,
    ast,
    canonicalPrep,
    route,
    profile,
    mode,
    options,
    feedback,
    fusionPlan,
    plan,
    finishExecution,
    buildKernel,
    resolveScheduler,
    runConsciousnessPhase
  };

  if (irPhases) {
    result.irFirst = true;
    result.canonicalPhases = irPhases;
    return executeCanonicalProgram({ ...execCtx, irPhases });
  }

  return executeLegacyProgram(execCtx);
}

module.exports = {
  VM_VERSION,
  executeProgram,
  buildKernel,
  resolveScheduler,
  runConsciousnessPhase,
  executeCanonicalProgram,
  executeLegacyProgram
};
