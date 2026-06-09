'use strict';

/**
 * Phase D — Pure canonical (IR-first) execution pipeline.
 * All phase gates derive from resolveCanonicalPhases; profile is observability only.
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

async function executeCanonicalProgram(ctx) {
  const {
    result,
    ast,
    canonicalPrep,
    irPhases,
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

  result.executor = 'canonical';

  if (irPhases.triad) {
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
  } else if (irPhases.fusion) {
    const fusionOut = await runUnifiedFusion(ast, {
      ...options,
      feedback,
      canonicalPlan: plan || null
    });

    if (irPhases.record_next || fusionOut.next) {
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
        : 'Fusion blocked';
      if (fusionOut.transcript) result.transcript = fusionOut.transcript;
      return finishExecution(result, ast, canonicalPrep, options);
    }
  }

  if (irPhases.coherence && !result.triad) {
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

  if (irPhases.alignment) {
    const resonance = runResonanceGate(ast, { ...options, feedback });
    result.resonance = resonance;
    result.alignment = { layer: 'liminal', gate: 'resonance', ...resonance };
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

  if (irPhases.cognitive) {
    const { resolveExecutionStrategy } = require('../core/general-canonical-mode');
    const { executeSnapshotCanonicalActs } = require('../core/canonical-act-runner');
    const strategy = resolveExecutionStrategy(ast, options);
    result.executionStrategy = strategy;

    const snapshotActs = canonicalPrep?.canonical?.execution?.acts?.length ?? 0;
    const pluginSteps = irPhases.snapshot_primary === true && snapshotActs > 0;

    async function runKernelCognitive() {
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
        result.injectedContext = { ...(result.injectedContext || {}), ...ast.cognition.context };
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

    if (strategy === 'tool-snapshot-primary' && pluginSteps) {
      const actOut = await executeSnapshotCanonicalActs(canonicalPrep.canonical, ast, options);
      result.snapshotActExecution = true;
      result.actDriver = actOut.driver || 'canonical.execution.acts';
      result.canonicalActs = actOut;
      result.cognitive = actOut.cognitive;
      result.phases.push(PHASE.CANONICAL_ACT);
      if (actOut.workspace) {
        result.injectedContext = {
          ...(result.injectedContext || {}),
          ...actOut.workspace
        };
      }
      result.program = actOut.cognitive?.program;
      result.trace = actOut.cognitive?.trace;
      result.decisions = actOut.cognitive?.decisions;
      result.beliefs = actOut.cognitive?.beliefs;
      result.stats = actOut.cognitive?.stats;
      if (!actOut.success) result.success = false;
    } else {
      if (strategy === 'hybrid-canonical-acts' && pluginSteps) {
        const actOut = await executeSnapshotCanonicalActs(canonicalPrep.canonical, ast, options);
        result.hybridActExecution = true;
        result.actDriver = 'canonical.execution.acts+kernel';
        result.canonicalActs = actOut;
        result.phases.push(PHASE.CANONICAL_ACT);
        if (actOut.workspace) {
          ast.cognition = ast.cognition || {};
          ast.cognition.context = { ...(ast.cognition.context || {}), ...actOut.workspace };
          result.injectedContext = { ...(result.injectedContext || {}), ...actOut.workspace };
        }
        if (!actOut.success) result.success = false;
      }
      await runKernelCognitive();
    }
  }

  if (irPhases.protocol) {
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

  if (irPhases.transcript) {
    result.transcript = buildTranscript(result, ast, options);
    if (options.transcript === true || options.export_transcript) {
      result.transcriptExport = result.transcript;
    }
  }

  const pulse = computeSemanticPulse(result.convergence || options.convergence || null, {
    triadCoherence: result.triad?.coherence?.score,
    fusionLayers: route?.fusion_layers || canonicalPrep?.plan?.fusion_layers || [],
    unanimousGoal: result.convergence?.coherence?.unanimous_goal,
    canonicalRoute: true,
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

  const { enforceEpistemicGate, agentRequiresCitation } = require('../runtime/epistemic-gate');
  if (agentRequiresCitation(ast)) {
    const epistemicOutcome = enforceEpistemicGate(result, ast, options);
    if (epistemicOutcome.blocked) {
      result.success = false;
      result.blocked = true;
      result.awaitingHuman = epistemicOutcome.awaitingHuman === true;
      result.error = epistemicOutcome.blockReason || 'Epistemic gate blocked execution';
      result.phases.push(PHASE.HUMAN_GATE);
      return finishExecution(result, ast, canonicalPrep, options);
    }
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

  if (irPhases.relay || result.relayPolicy?.enabled) {
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
  executeCanonicalProgram
};
