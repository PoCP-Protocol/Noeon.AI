'use strict';

/**
 * Consciousness Scheduler — Phase 4 default VM cognitive scheduler.
 * Seeds a ConsciousnessStream from AST, runs bounded attention cycles,
 * then delegates IR execution to the Cognitive Kernel.
 */

const { ConsciousnessStream } = require('../runtime/cognitive/stream-of-consciousness');
const { regionForPrimitive, regionForFlowStep, activeRegionsFromAst } = require('../core/cognitive-architecture');

const DEFAULT_MAX_CYCLES = 32;

function resolveScheduler(options = {}, profile, mode) {
  if (options.scheduler === 'sequential') return 'sequential';
  if (options.scheduler === 'consciousness') return 'consciousness';

  const env = String(process.env.NOEON_SCHEDULER || '').toLowerCase();
  if (env === 'sequential') return 'sequential';
  if (env === 'consciousness') return 'consciousness';

  if (mode === 'protocol') return 'sequential';
  return 'consciousness';
}

function seedStreamFromAst(stream, ast) {
  const goal = ast.cognition?.goal || ast.task;
  if (goal) {
    stream.setGoal(String(goal), { priority: 0.9 });
  }

  for (const [key, value] of Object.entries(ast.cognition?.context || {})) {
    stream.believe(key, value, 0.85, 'context');
  }

  for (const p of ast.cognitive?.perceptions || []) {
    stream.inject(
      { key: 'perceive', source: p.source, modality: p.modality, filter: p.filter },
      { type: 'observation', salience: 0.78, source: p.source || 'input', urgency: 0.45, brainRegion: regionForPrimitive('perceive') }
    );
  }

  for (const p of ast.cognitive?.predictions || []) {
    stream.inject(
      { key: 'predict', target: p.target, model: p.model, confidence: p.confidence },
      { type: 'prediction', salience: 0.55, confidence: p.confidence || 0.6, brainRegion: regionForPrimitive('predict') }
    );
  }

  for (const agent of ast.agents || []) {
    for (const step of agent.flow || []) {
      const kind = String(step.kind || step).toLowerCase();
      stream.inject(
        { key: kind, agent: agent.name, ...step },
        {
          type: kind === 'reflect' || kind === 'feedback' ? 'meta' : kind === 'perceive' ? 'observation' : 'plan',
          salience: kind === 'decide' || kind === 'act' ? 0.8 : 0.72,
          source: agent.name || 'agent',
          brainRegion: regionForFlowStep(step)
        }
      );
    }
    if (agent.memory) {
      stream.inject(
        { key: 'memory', agent: agent.name, ...agent.memory },
        { type: 'memory', salience: 0.6, source: 'hippocampus', brainRegion: regionForPrimitive('memory') }
      );
    }
  }

  for (const r of ast.cognitive?.reasonings || []) {
    stream.inject(
      { key: 'reason', strategy: r.strategy, depth: r.depth, premises: r.premises },
      { type: 'plan', salience: 0.72, urgency: 0.5, brainRegion: regionForPrimitive('reason') }
    );
  }

  for (const d of ast.cognitive?.decisions || []) {
    stream.inject(
      { key: 'decide', action: d.action, threshold: d.threshold, strategy: d.strategy },
      { type: 'plan', salience: 0.68, urgency: 0.55, brainRegion: regionForPrimitive('decide') }
    );
  }

  for (const ref of ast.cognitive?.reflections || []) {
    stream.inject(
      { key: 'reflect', target: ref.target, criteria: ref.criteria },
      { type: 'meta', salience: 0.5, urgency: 0.25, brainRegion: regionForPrimitive('reflect') }
    );
  }

  for (const ask of ast.llm?.asks || []) {
    stream.inject(
      { key: 'ask', query: ask.query, model: ask.model },
      { type: 'plan', salience: 0.82, urgency: 0.5 }
    );
  }

  for (const act of ast.cognition?.acts || []) {
    stream.inject(
      { key: 'act', ...act },
      { type: 'plan', salience: 0.7, urgency: 0.6 }
    );
  }

  if (ast.cognitive?.drives?.length) {
    for (const drive of ast.cognitive.drives) {
      stream.inject(
        { key: 'drive', description: drive.description || drive.name, priority: drive.priority },
        { type: 'observation', salience: 0.65, source: 'drive' }
      );
    }
  }
}

async function runConsciousnessPhase(ast, kernel, options = {}) {
  const maxCycles =
    options.consciousness_cycles ??
    options.max_consciousness_cycles ??
    DEFAULT_MAX_CYCLES;

  const stream = new ConsciousnessStream({
    cycleInterval: options.cycleInterval || 50,
    maxStreamSize: options.maxStreamSize || 100,
    attentionThreshold: options.attentionThreshold || 0.25
  });

  seedStreamFromAst(stream, ast);

  const prelude = await stream.runBounded(maxCycles, { untilIdle: true });

  const cognitive = await kernel.execute(ast, {
    verbose: options.verbose,
    consciousness_state: stream.getState()
  });

  return {
    scheduler: 'consciousness',
    thalamus: 'attention_gate',
    activeRegions: [...new Set(['thalamus', ...activeRegionsFromAst(ast)])],
    prelude,
    stream: stream.getState(),
    cognitive
  };
}

module.exports = {
  DEFAULT_MAX_CYCLES,
  resolveScheduler,
  seedStreamFromAst,
  runConsciousnessPhase
};
