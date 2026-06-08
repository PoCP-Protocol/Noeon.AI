'use strict';

/**
 * Unified VM Executor — Phase 1 single execution pipeline
 */

const { compileAel } = require('../compiler');
const { validateAel } = require('../validator');
const { CognitiveKernel } = require('../core/kernel');
const { runGovernancePreflight } = require('../core/governance');
const { detectProfile, resolveExecutionMode, PROFILES, getProfileInfo } = require('../core/profile');
const { shouldEnrichProtocol } = require('../core/protocol-bridge');
const { runProtocolCycle } = require('./protocol-phase');
const { runResonanceGate } = require('../runtime/liminal/resonance-gate');
const { buildTranscript } = require('../runtime/liminal/transcript');
const { detectFusionPlan, runUnifiedFusion } = require('../runtime/fusion/unified-fusion');
const { prepareCanonicalExecution, mergeCanonicalIntoResult, finalizeCanonicalResult } = require('../core/canonical-runtime');
const { deriveExecutionRoute } = require('../core/canonical-route');
const { computeSemanticPulse, injectSemanticPulse } = require('../core/canonical-pulse');
const { resolveScheduler, runConsciousnessPhase } = require('./consciousness-scheduler');
const { attachExecutionArchitecture } = require('../core/cognitive-architecture');
const { PHASE } = require('./phases');

const VM_VERSION = '1.0.0-alpha';

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

  // Phase 0: Triad cross-file orchestrator or standard fusion
  const fusionPlan = detectFusionPlan(ast, options);
  const plan = canonicalPrep?.plan;
  const useTriadOrchestrator = route
    ? route.triad === true
    : (ast.fusionTriad?.enabled || fusionPlan.triad) && options.triad !== false;

  const fusionActive = route
    ? route.fusion === true || route.next_field === true || route.forward_fusion === true
    : profile === PROFILES.NEXT ||
      (fusionPlan.layers.length > 0 || options.fuse_next || options.fuse_liminal);

  if (useTriadOrchestrator) {
    const { runFusionTriad } = require('../runtime/fusion/fusion-triad');
    const triadOut = await runFusionTriad(ast, { ...options, feedback });
    result.triad = triadOut;
    result.phases.push(PHASE.TRIAD);
    result.fusionMeta = {
      triad: true,
      cross_file: triadOut.cross_file,
      coherence: triadOut.coherence,
      relay: triadOut.relay,
      plan: triadOut.plan
    };
    if (triadOut.reverse?.context) {
      result.injectedContext = { ...triadOut.reverse.context };
    }
    if (triadOut.blocked || triadOut.success === false) {
      result.success = false;
      result.blocked = triadOut.blocked || false;
      result.error = triadOut.error || `Triad fusion failed (${triadOut.blockReason || 'triad'})`;
      return finishExecution(result, ast, canonicalPrep, options);
    }
  } else if (fusionActive) {
    const fusionOut = await runUnifiedFusion(ast, {
      ...options,
      feedback,
      canonicalPlan: plan || null
    });

    if (profile === PROFILES.NEXT || fusionOut.next) {
      result.next = fusionOut.next;
      result.phases.push(PHASE.NEXT);
      if (fusionOut.fusion) {
        result.fusion = fusionOut.fusion;
        result.phases.push(PHASE.FUSION);
      }
    }

    if (fusionOut.nextField) {
      result.nextField = fusionOut.nextField;
      result.phases.push(PHASE.NEXT_FIELD);
    }

    if (fusionOut.liminalField) {
      result.liminalField = fusionOut.liminalField;
      result.phases.push(PHASE.LIMINAL_FIELD);
    }

    if (fusionOut.triad || fusionOut.bidirectional) {
      result.fusionMeta = {
        triad: fusionOut.triad,
        bidirectional: fusionOut.bidirectional,
        plan: fusionOut.plan
      };
    }

    if (fusionOut.blocked) {
      result.success = false;
      result.blocked = true;
      result.error = fusionOut.blockReason
        ? `Fusion blocked (${fusionOut.blockReason})`
        : profile === PROFILES.NEXT
          ? `Next/fusion blocked (${fusionOut.blockReason || 'next'})`
          : `Liminal fusion blocked (${fusionOut.blockReason || 'liminal'})`;
      if (fusionOut.transcript) result.transcript = fusionOut.transcript;
      return finishExecution(result, ast, canonicalPrep, options);
    }
  }

  // Liminal resonance gate — profile-native or canonical alignment route
  const needsAlignmentGate = route
    ? route.alignment
    : profile === PROFILES.LIMINAL ||
      (canonicalPrep?.plan?.alignment_gate && options.alignment_gate !== false);

  if (needsAlignmentGate) {
    const resonance = runResonanceGate(ast, { ...options, feedback });
    const alignment = {
      layer: 'liminal',
      gate: 'resonance',
      ...resonance
    };
    result.resonance = resonance;
    result.alignment = alignment;
    result.phases.push(PHASE.ALIGNMENT);

    if (resonance.blocked) {
      result.success = false;
      result.blocked = true;
      result.error = `Alignment ${resonance.blockReason || 'resonance'} gate blocked execution`;
      result.transcript = buildTranscript(result, ast, options);
      if (options.transcript === true || options.export_transcript) {
        result.transcriptExport = result.transcript;
      }
      return finishExecution(result, ast, canonicalPrep, options);
    }
  }

  // Phase 1: Cognitive Kernel (consciousness scheduler by default)
  const runCognitive = route
    ? route.cognitive
    : (mode === 'full' || mode === 'cognitive') &&
      canonicalPrep?.plan?.cognitive !== false;

  if (runCognitive) {
    const kernel = buildKernel(options);
    const scheduler = resolveScheduler(options, profile, mode);
    result.scheduler = scheduler;

    if (scheduler === 'consciousness') {
      const conscious = await runConsciousnessPhase(ast, kernel, options);
      result.consciousness = conscious;
      result.cognitive = conscious.cognitive;
      result.phases.push(PHASE.CONSCIOUSNESS);
    } else {
      result.cognitive = await kernel.execute(ast, { verbose: options.verbose });
    }

    if (ast.cognition?.context && Object.keys(ast.cognition.context).length) {
      result.injectedContext = { ...ast.cognition.context };
    }
    result.llm = kernel.llm ? kernel.llm.getStats() : null;
    result.phases.push(PHASE.COGNITIVE);
    result.program = result.cognitive.program;
    result.trace = result.cognitive.trace;
    result.decisions = result.cognitive.decisions;
    result.beliefs = result.cognitive.beliefs;
    result.stats = result.cognitive.stats;
    if (!result.cognitive.success) result.success = false;
  }

  // Phase 2: Protocol — canonical route or legacy auto-detection
  const wantsProtocol = route
    ? route.protocol
    : mode === 'protocol' ||
      (mode === 'full' &&
        (canonicalPrep?.plan?.protocol ??
          shouldEnrichProtocol(ast, { with_protocol: options.with_protocol ?? 'auto' })));

  if (wantsProtocol) {
    const compiled = options.compiled || compileAel(ast);
    const protocolOut = await runProtocolCycle(compiled, feedback, {
      pluginPolicy: options.pluginPolicy
    });

    result.protocol = protocolOut;
    result.cycle = protocolOut;
    result.protocolSuccess = protocolOut.protocolSuccess;
    result.phases.push(PHASE.PROTOCOL);

    if (options.strict_protocol && result.protocolSuccess === false) {
      result.success = false;
      result.error = 'Protocol phase failed';
    }
  }

  if (profile === PROFILES.LIMINAL || route?.alignment || canonicalPrep?.plan?.alignment_gate) {
    result.transcript = buildTranscript(result, ast, options);
    if (options.transcript === true || options.export_transcript) {
      result.transcriptExport = result.transcript;
    }
  }

  const pulse = computeSemanticPulse(options.convergence || null, {
    triadCoherence: result.triad?.coherence?.score,
    fusionLayers: route?.fusion_layers || canonicalPrep?.plan?.fusion_layers || [],
    unanimousGoal: options.convergence?.coherence?.unanimous_goal,
    canonicalRoute: Boolean(route),
    hasCanonicalGoal: Boolean(canonicalPrep?.canonical?.intent?.goal)
  });
  if (pulse.triggered) {
    injectSemanticPulse(ast, pulse);
    result.semanticPulse = pulse;
    result.injectedContext = {
      ...(result.injectedContext || {}),
      _semantic_pulse: {
        action: pulse.action,
        score: pulse.score,
        message: pulse.message
      }
    };
  }

  attachExecutionArchitecture(result, ast, {
    plan: canonicalPrep?.plan,
    route,
    governance: canonicalPrep?.governance
  });

  return finishExecution(result, ast, canonicalPrep, options);
}

module.exports = {
  VM_VERSION,
  executeProgram,
  buildKernel,
  resolveScheduler,
  runConsciousnessPhase
};
