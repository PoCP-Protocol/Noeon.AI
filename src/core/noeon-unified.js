'use strict';

const { SURFACES, CORE_SURFACE, resolveIntentGoal, resolveProgramTask } = require('./surfaces');
const { buildArchitectureMap, buildRuntimeTraceFromResult } = require('./cognitive-architecture');

/**
 * Unified Noeon stack — one system, multiple capability layers.
 */

function buildStackManifest(ast) {
  const caps = {
    general: Boolean(ast.profile === 'general' || ast.agents?.length || ast.general),
    next: Boolean(ast.next && Object.keys(ast.next).length > 0),
    liminal: Boolean(ast.liminal || ast.profile === 'liminal'),
    ael: Boolean(ast.budget != null || ast.deadline || ast.verify),
    cognitive: Boolean(
      ast.cognitive?.perceptions?.length ||
        ast.cognitive?.reasonings?.length ||
        ast.agents?.length
    )
  };

  if (ast.fusion?.length) {
    for (const f of ast.fusion) {
      const t = String(f.target || '').toLowerCase();
      if (t === 'next') caps.next = true;
      if (t === 'liminal') caps.liminal = true;
      if (t === 'general') caps.general = true;
    }
  }

  const architecture = buildArchitectureMap(ast);

  return {
    version: '1.0.0',
    core: CORE_SURFACE,
    layers: Object.entries(caps)
      .filter(([, on]) => on)
      .map(([name]) => name),
    capabilities: caps,
    goal: resolveIntentGoal(ast),
    task: resolveProgramTask(ast),
    architecture: architecture.active_regions.length
      ? {
          active_regions: architecture.active_regions,
          core_field: architecture.core_field,
          executive: 'prefrontal_cortex'
        }
      : null
  };
}

function syncAgentsToUnifiedStack(ast) {
  if (!Array.isArray(ast.agents) || ast.agents.length === 0) return ast;

  ast.next = ast.next || {};
  const primary = ast.agents[0];

  if (primary.goal) {
    ast.cognition = ast.cognition || {};
    ast.cognition.goal = ast.cognition.goal || primary.goal;
    ast.next.goal = ast.next.goal || { text: primary.goal };
  }

  for (const tier of ['constitutions', 'vows', 'rituals', 'strategies']) {
    if (primary[tier]?.length) {
      ast.next[tier] = [...(ast.next[tier] || []), ...primary[tier]];
    }
  }

  ast.noeonStack = buildStackManifest(ast);
  return ast;
}

function syncGoalAcrossSurfaces(ast, goalText) {
  if (!goalText) return ast;
  ast.cognition = ast.cognition || {};
  ast.cognition.goal = goalText;
  ast.next = ast.next || {};
  ast.next.goal = { text: goalText, ...(ast.next.goal || {}) };
  if (ast.agents?.[0] && !ast.agents[0].goal) ast.agents[0].goal = goalText;
  return ast;
}

function attachCanonicalStack(ast, canonical) {
  if (!canonical) return ast;
  ast.noeonStack = {
    ...(ast.noeonStack || buildStackManifest(ast)),
    canonical: {
      version: canonical.version,
      surface: canonical.surface,
      capabilities: { ...canonical.capabilities },
      fusion_layers: [...(canonical.fusion?.layers || [])]
    }
  };
  return ast;
}

function mergeExecutionIntoCanonical(canonical, result) {
  if (!canonical || !result) return canonical;

  if (result.cognitive?.trace?.length) {
    canonical.observability.traces.push({
      kind: 'runtime_trace',
      steps: result.cognitive.trace.length,
      success: result.cognitive.success !== false,
      source: 'executor.cognitive'
    });
  }

  if (result.next?.fieldMemory || result.nextField?.memory) {
    canonical.learning.field = {
      ...(canonical.learning.field || {}),
      runtime: result.next?.fieldMemory || result.nextField?.memory || null,
      dominant: result.next?.dominant || result.nextField?.dominant || null
    };
  }

  if (result.resonance || result.alignment) {
    canonical.alignment = canonical.alignment || {};
    canonical.alignment.runtime_gate = {
      blocked: result.resonance?.blocked || result.alignment?.gate?.blocked || false,
      score: result.resonance?.score ?? null,
      floor: canonical.alignment.resonance_floor ?? null
    };
  }

  if (result.semanticPulse?.triggered) {
    canonical.observability.audit.push({
      kind: 'semantic_pulse',
      action: result.semanticPulse.action,
      score: result.semanticPulse.score,
      source: 'canonical.pulse'
    });
  }

  if (result.fusionMeta) {
    canonical.fusion = canonical.fusion || {};
    canonical.fusion.runtime = { ...result.fusionMeta };
  }

  if (result.architecture) {
    canonical.observability = canonical.observability || { traces: [], reflections: [], audit: [] };
    canonical.observability.architecture = {
      active_regions: result.architecture.active_regions,
      phase_regions: result.architecture.phase_regions,
      pipeline_phases: result.architecture.pipeline_phases,
      cognitive_cycle: result.architecture.cognitive_cycle?.map((c) => c.phase),
      executive: 'prefrontal_cortex',
      core_field: result.architecture.core_field
    };
    const runtimeTrace = buildRuntimeTraceFromResult(result);
    if (runtimeTrace) {
      canonical.observability.runtime_trace = runtimeTrace;
      canonical.observability.traces.push({
        kind: 'architecture_runtime',
        phases: runtimeTrace.phases,
        scheduler: runtimeTrace.scheduler,
        success: runtimeTrace.success,
        source: 'executor.architecture'
      });
    }
  }

  return canonical;
}

function hydrateNextFromCanonical(ast, canonical) {
  if (!canonical) return ast;
  ast.next = ast.next || {};

  if (canonical.intent?.goal && !ast.next.goal) {
    ast.next.goal = { text: canonical.intent.goal };
  }

  for (const tier of ['constitutions', 'vows', 'rituals', 'strategies']) {
    const rules = canonical.governance?.[tier] || [];
    if (rules.length && !(ast.next[tier]?.length)) {
      ast.next[tier] = rules.map((r) => ({ ...r }));
    }
  }

  if (canonical.learning?.field && !ast.next.fields?.length) {
    ast.cognition = ast.cognition || {};
    ast.cognition.context = {
      ...(ast.cognition.context || {}),
      next_field: canonical.learning.field
    };
  }

  return ast;
}

module.exports = {
  SURFACES,
  CORE_SURFACE,
  buildStackManifest,
  syncAgentsToUnifiedStack,
  syncGoalAcrossSurfaces,
  attachCanonicalStack,
  mergeExecutionIntoCanonical,
  hydrateNextFromCanonical
};
