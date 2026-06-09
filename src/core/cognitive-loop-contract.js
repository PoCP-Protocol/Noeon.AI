'use strict';

const { COGNITIVE_CYCLE } = require('./cognitive-architecture');

const LOOP_CONTRACT_SCHEMA = 'noeon.cognitive.loop.contract/v1';

function flowKinds(ast) {
  const kinds = new Set();
  for (const agent of ast?.agents || []) {
    for (const step of agent.flow || []) {
      if (step?.kind) kinds.add(String(step.kind).toLowerCase());
    }
  }
  for (const step of ast?.cognition?.plan || []) {
    if (step?.kind || step?.type) kinds.add(String(step.kind || step.type).toLowerCase());
  }
  return kinds;
}

function hasExplicitPhase(phase, ast) {
  const kinds = flowKinds(ast);
  if (kinds.has(phase)) return true;

  const cognitive = ast?.cognitive || {};
  const cognition = ast?.cognition || {};
  const next = ast?.next || {};

  if (phase === 'perceive') return Boolean(cognitive.perceptions?.length || next.fields?.length);
  if (phase === 'attend') return Boolean(cognitive.attentions?.length || cognitive.focuses?.length);
  if (phase === 'reason') return Boolean(cognitive.reasonings?.length || cognition.understandings?.length);
  if (phase === 'decide') return Boolean(cognitive.decisions?.length);
  if (phase === 'act') return Boolean(cognition.acts?.length || next.acts?.length);
  if (phase === 'reflect') return Boolean(cognitive.reflections?.length || next.reflects?.length);
  if (phase === 'learn') return Boolean(cognition.learn || next.evolves?.length || ast?.evolution?.evolves?.length);
  return false;
}

function implicitEvidence(phase, ast, architecture, report) {
  const active = new Set(architecture?.active_regions || []);
  const phases = new Set(report?.execution?.phases || report?.observability?.runtime_trace?.phases || []);
  const hasMemory = Boolean(ast?.cognition?.memory || ast?.agents?.[0]?.memory || ast?.next?.fieldMemory);

  if (phase === 'attend' && active.has('thalamus')) return 'architecture.thalamus';
  if (phase === 'learn' && (active.has('neuromodulatory') || hasMemory)) return hasMemory ? 'memory-adaptation' : 'architecture.neuromodulatory';
  if (phase === 'perceive' && active.has('sensory_cortex')) return 'architecture.sensory_cortex';
  if (phase === 'reason' && active.has('association_cortex')) return 'architecture.association_cortex';
  if (phase === 'decide' && active.has('basal_ganglia')) return 'architecture.basal_ganglia';
  if (phase === 'act' && active.has('motor_cortex')) return 'architecture.motor_cortex';
  if (phase === 'reflect' && (active.has('cerebellum') || phases.has('cognitive'))) return active.has('cerebellum') ? 'architecture.cerebellum' : 'runtime.cognitive';
  return null;
}

function evaluateCognitiveLoopContract(ast, context = {}) {
  const architecture = context.architecture || ast?.cognitiveArchitecture || null;
  const report = context.report || null;
  const expected = COGNITIVE_CYCLE.map((x) => x.phase);
  const actual = (architecture?.cognitive_cycle || COGNITIVE_CYCLE).map((x) => x.phase || x);
  const orderValid = expected.every((phase, index) => actual[index] === phase);

  const stages = expected.map((phase) => {
    const explicit = hasExplicitPhase(phase, ast);
    const implicit = explicit ? null : implicitEvidence(phase, ast, architecture, report);
    return {
      phase,
      primitive: COGNITIVE_CYCLE.find((x) => x.phase === phase)?.primitive || phase.toUpperCase(),
      status: explicit ? 'explicit' : implicit ? 'implicit' : 'missing',
      evidence: explicit ? 'source-program' : implicit
    };
  });

  const missing = stages.filter((s) => s.status === 'missing').map((s) => s.phase);
  const explicitCount = stages.filter((s) => s.status === 'explicit').length;
  const implicitCount = stages.filter((s) => s.status === 'implicit').length;

  return {
    schema: LOOP_CONTRACT_SCHEMA,
    expected,
    actual,
    orderValid,
    ready: orderValid && missing.length === 0,
    completeness: Number(((explicitCount + implicitCount) / expected.length).toFixed(3)),
    explicitCount,
    implicitCount,
    missing,
    stages
  };
}

function assertCognitiveLoopContract(ast, context = {}) {
  const contract = evaluateCognitiveLoopContract(ast, context);
  if (!contract.ready) {
    throw new Error(
      `Cognitive loop contract failed: missing=${contract.missing.join(',') || 'none'} orderValid=${contract.orderValid}`
    );
  }
  return contract;
}

module.exports = {
  LOOP_CONTRACT_SCHEMA,
  evaluateCognitiveLoopContract,
  assertCognitiveLoopContract
};
