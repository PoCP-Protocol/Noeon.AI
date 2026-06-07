'use strict';

/**
 * Unified VM Executor — Phase 1 single execution pipeline
 */

const { compileAel } = require('../compiler');
const { validateAel } = require('../validator');
const { CognitiveKernel } = require('../core/kernel');
const { runGovernancePreflight } = require('../core/governance');
const { detectProfile, resolveExecutionMode, PROFILES } = require('../core/profile');
const { shouldEnrichProtocol } = require('../core/protocol-bridge');
const { runProtocolCycle } = require('./protocol-phase');
const { runNextPhase } = require('./next-phase');
const { runResonanceGate } = require('../runtime/liminal/resonance-gate');
const { buildTranscript } = require('../runtime/liminal/transcript');

const VM_VERSION = '1.0.0-alpha';

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

  const validation = validateAel(ast);
  const governance = runGovernancePreflight(ast, validation, options);

  if (options.require_valid !== false && !governance.valid) {
    return {
      success: false,
      blocked: true,
      vm: VM_VERSION,
      profile,
      mode,
      governance,
      error: 'Governance preflight failed'
    };
  }

  const feedback = options.feedback || {};
  const result = {
    vm: VM_VERSION,
    profile,
    mode,
    governance,
    phases: [],
    success: true
  };

  // Phase 0: Next profile world-model gate
  if (profile === PROFILES.NEXT) {
    const next = await runNextPhase(ast, { ...options, feedback });
    result.next = next;
    result.phases.push('next');

    if (next.blocked) {
      result.success = false;
      result.blocked = true;
      result.error = `Next phase blocked execution (${next.blockReason || 'guarantee'})`;
      return result;
    }
  }

  // Phase 0: Liminal Resonance Gate (hard block before cognition)
  if (profile === PROFILES.LIMINAL) {
    const resonance = runResonanceGate(ast, { ...options, feedback });
    result.resonance = resonance;
    result.phases.push('resonance');

    if (resonance.blocked) {
      result.success = false;
      result.blocked = true;
      result.error = `Liminal ${resonance.blockReason || 'resonance'} gate blocked execution`;
      result.transcript = buildTranscript(result, ast, options);
      if (options.transcript === true || options.export_transcript) {
        result.transcriptExport = result.transcript;
      }
      return result;
    }
  }

  // Phase 1: Cognitive Kernel
  if (mode === 'full' || mode === 'cognitive') {
    const kernel = buildKernel(options);
    const cognitive = await kernel.execute(ast, { verbose: options.verbose });
    result.cognitive = cognitive;
    result.llm = kernel.llm ? kernel.llm.getStats() : null;
    result.phases.push('cognitive');
    result.program = cognitive.program;
    result.trace = cognitive.trace;
    result.decisions = cognitive.decisions;
    result.beliefs = cognitive.beliefs;
    result.stats = cognitive.stats;
    if (!cognitive.success) result.success = false;
  }

  // Phase 2: Protocol
  const wantsProtocol =
    mode === 'protocol' ||
    (mode === 'full' && shouldEnrichProtocol(ast, { with_protocol: options.with_protocol ?? 'auto' }));

  if (wantsProtocol) {
    const compiled = options.compiled || compileAel(ast);
    const protocolOut = await runProtocolCycle(compiled, feedback, {
      pluginPolicy: options.pluginPolicy
    });

    result.protocol = protocolOut;
    result.cycle = protocolOut;
    result.protocolSuccess = protocolOut.protocolSuccess;
    result.phases.push('protocol');

    if (options.strict_protocol && result.protocolSuccess === false) {
      result.success = false;
      result.error = 'Protocol phase failed';
    }
  }

  if (profile === PROFILES.LIMINAL) {
    result.transcript = buildTranscript(result, ast, options);
    if (options.transcript === true || options.export_transcript) {
      result.transcriptExport = result.transcript;
    }
  }

  return result;
}

module.exports = {
  VM_VERSION,
  executeProgram,
  buildKernel
};
