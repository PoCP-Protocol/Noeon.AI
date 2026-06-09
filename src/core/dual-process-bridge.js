'use strict';

/**
 * Bridge DualProcessEngine into the unified kernel without full MemorySystem.
 */

const { DualProcessEngine } = require('../runtime/cognitive/dual-process');

function createStubMemory() {
  return {
    recall() { return []; },
    store() { return true; }
  };
}

async function runDualCognition(query, options = {}) {
  // Prefer a real, populated memory (grounded reasoning); fall back to a stub
  // only when no memory is supplied so legacy callers still work.
  const memory = options.memory || createStubMemory();
  const engine = new DualProcessEngine(memory, options);
  const q = String(query || 'cognition');

  engine.system1.registerHeuristic('fast_pattern', async () => ({
    value: `intuition:${q.slice(0, 48)}`,
    confidence: options.intuitionConfidence ?? 0.55
  }));

  const originalReason = engine.system2.reason.bind(engine.system2);
  engine.system2.reason = async (subject, ctx = {}) => {
    if (options.llm?.reason) {
      try {
        const out = await options.llm.reason(subject, ctx);
        return {
          conclusion: out.conclusion || out.result,
          confidence: out.confidence ?? 0.65,
          model: out.model,
          system: 2
        };
      } catch {
        // fall through
      }
    }
    // Native System 2: deductive/inductive recall over the grounded memory.
    return originalReason(subject, { strategy: options.strategy, depth: options.depth });
  };

  const out = await engine.think(q, {
    forceSystem2: options.forceSystem2 === true,
    using: options.using || 'fast_pattern'
  });

  // Deliberate (analytical) mode: a grounded System-2 conclusion should win over
  // a gut-feel echo. The default ConflictMonitor compares raw confidences, which
  // lets System 1's fabricated certainty beat genuine but cautious reasoning.
  // Here we prefer System 2 whenever it produced a real, memory-grounded answer.
  if (options.forceSystem2 && out.details?.reasoning?.conclusion) {
    out.answer = out.details.reasoning.conclusion;
    out.confidence = out.details.reasoning.confidence;
    out.system = 2;
    out.resolution = out.conflict ? 'system2_deliberate' : out.resolution;
  }

  return {
    hypothesis: out.answer,
    conclusion: out.answer,
    result: out.answer,
    confidence: out.confidence,
    dual_process: {
      system: out.system,
      conflict: out.conflict,
      resolution: out.resolution,
      latency_ms: out.latency
    },
    evidence: [
      {
        claim: out.conflict
          ? `System ${out.system} won after conflict (${out.resolution})`
          : `System ${out.system} sufficient (${out.resolution})`,
        source: out.system === 2 ? 'system2' : 'system1',
        confidence: out.confidence
      }
    ],
    provenance: options.llm?.isConfigured?.() ? 'live' : 'deterministic'
  };
}

module.exports = {
  runDualCognition,
  createStubMemory
};
