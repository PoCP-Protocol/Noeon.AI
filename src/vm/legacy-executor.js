'use strict';

/**
 * Legacy profile execution pipeline — deprecated; use executeCanonicalProgram.
 * @see docs/adr/ADR-004-legacy-profile-sunset.md
 */

const { compileAel } = require('../compiler');
const { PROFILES } = require('../core/profile');
const { shouldEnrichProtocol } = require('../core/protocol-bridge');
const { runProtocolCycle } = require('./protocol-phase');
const { runResonanceGate } = require('../runtime/liminal/resonance-gate');
const { buildTranscript } = require('../runtime/liminal/transcript');
const { runUnifiedFusion } = require('../runtime/fusion/unified-fusion');
const { computeSemanticPulse, injectSemanticPulse } = require('../core/canonical-pulse');
const { attachExecutionArchitecture } = require('../core/cognitive-architecture');
const { PHASE } = require('./phases');

async function executeLegacyProgram(ctx) {
  const {
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
  } = ctx;

  result.executor = 'legacy';
  if (options.legacy_profile === true) {
    result.legacyDeprecation = {
      active: true,
      message: 'legacy_profile execution path is deprecated; canonical IR-first is the default',
      opt_out: 'NOEON_LEGACY_PROFILE=1'
    };
    if (!options.quiet && options.warn_legacy !== false) {
      console.warn('[noeon] legacy_profile is deprecated — unset NOEON_LEGACY_PROFILE for canonical IR-first execution');
    }
  }

  const useTriadOrchestrator = route
    ? route.triad === true && profile === PROFILES.GENERAL
    : profile === PROFILES.GENERAL &&
      (ast.fusionTriad?.enabled || fusionPlan.triad) &&
      options.triad !== false;

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
      semanticRelay: triadOut.semanticRelay,
      plan: triadOut.plan
    };
    if (triadOut.convergence) result.convergence = triadOut.convergence;
    if (triadOut.semanticRelay) result.semanticRelay = triadOut.semanticRelay;
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

  const needsCoherenceFusion = options.coherence !== false &&
    (fusionPlan.coherence || ast.fusionCoherence?.enabled) &&
    !result.triad;

  if (needsCoherenceFusion) {
    const { runFusionCoherence } = require('../runtime/fusion/fusion-coherence');
    const { buildSemanticRelay } = require('../runtime/fusion/semantic-relay');
    const coherenceOut = runFusionCoherence(ast, options);
    if (coherenceOut.enabled) {
      result.convergence = coherenceOut.matrix;
      result.semanticRelay = buildSemanticRelay(null, coherenceOut.matrix, coherenceOut.pulse, options);
      result.phases.push(PHASE.COHERENCE);
      result.fusionMeta = { ...(result.fusionMeta || {}), coherence: true, summary: coherenceOut.summary };
      if (coherenceOut.blocked) {
        result.success = false;
        result.blocked = true;
        result.error = coherenceOut.summary;
        return finishExecution(result, ast, canonicalPrep, options);
      }
    }
  }

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

  const pulse = computeSemanticPulse(result.convergence || options.convergence || null, {
    triadCoherence: result.triad?.coherence?.score,
    fusionLayers: route?.fusion_layers || canonicalPrep?.plan?.fusion_layers || [],
    unanimousGoal: result.convergence?.coherence?.unanimous_goal ||
      options.convergence?.coherence?.unanimous_goal,
    canonicalRoute: Boolean(route),
    hasCanonicalGoal: Boolean(canonicalPrep?.canonical?.intent?.goal),
    convergenceScore: result.convergence?.coherence?.score
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

  if (!result.semanticRelay) {
    const { buildSemanticRelay } = require('../runtime/fusion/semantic-relay');
    const { resolveRelayPolicy } = require('../runtime/fusion/fusion-relay-policy');
    const relayPolicy = resolveRelayPolicy(ast, options);
    result.semanticRelay = buildSemanticRelay(
      result.triad ? { coherence: result.triad.coherence, relay: result.triad.relay } : null,
      result.convergence,
      result.semanticPulse,
      { threshold: relayPolicy?.threshold, ...options }
    );
  }

  const { finalizeSemanticRelay } = require('../runtime/fusion/fusion-relay-finalize');
  const relayOutcome = finalizeSemanticRelay(result, ast, options);
  if (relayOutcome.blocked) {
    result.success = false;
    result.blocked = true;
    result.error = relayOutcome.blockReason || 'Relay policy blocked execution';
    if (relayOutcome.awaitingHuman) {
      result.awaitingHuman = true;
      result.phases.push(PHASE.HUMAN_GATE);
    } else {
      result.phases.push(PHASE.RELAY);
    }
    return finishExecution(result, ast, canonicalPrep, options);
  }
  if (result.relayPolicy?.enabled) {
    result.phases.push(PHASE.RELAY);
  }

  attachExecutionArchitecture(result, ast, {
    plan: canonicalPrep?.plan,
    route,
    governance: canonicalPrep?.governance
  });

  return finishExecution(result, ast, canonicalPrep, options);
}

module.exports = {
  executeLegacyProgram
};
