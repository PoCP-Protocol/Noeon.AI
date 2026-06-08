'use strict';

const { createLegacyAstShell } = require('./lower');
const { buildStackManifest } = require('../core/noeon-unified');

function lowerNextProgram(nextProgram) {
  const shell = createLegacyAstShell({
    profile: 'next',
    version: nextProgram.version || '0.2.0',
    module: nextProgram.module || null,
    entry: nextProgram.name || 'next_program',
    objective: nextProgram.goal?.text || null,
    context: {}
  });

  shell.language = 'Noeon Next Language';
  shell.profile = 'next';
  shell.languageProfile = 'next';
  shell.task = nextProgram.name || shell.task;

  if (nextProgram.goal?.text) {
    shell.cognition.goal = nextProgram.goal.text;
  }

  for (const model of nextProgram.models || []) {
    shell.cognition.understandings.push({ kind: 'model', ...model });
  }

  for (const strategy of nextProgram.strategies || []) {
    shell.cognitive.reasonings.push({
      strategy: strategy.name || strategy.objective || 'strategy',
      depth: 2,
      premises: [strategy.objective || 'goal'],
      risk: strategy.risk || 'medium',
      candidate: strategy.name || null
    });
  }

  for (const guarantee of nextProgram.guarantees || []) {
    shell.metaRules.push({ type: 'next_guarantee', ...guarantee });
  }

  for (const vow of nextProgram.vows || []) {
    shell.metaRules.push({ type: 'next_vow', ...vow });
  }

  for (const constitution of nextProgram.constitutions || []) {
    shell.metaRules.push({ type: 'next_constitution', ...constitution });
  }

  for (const ritual of nextProgram.rituals || []) {
    shell.metaRules.push({ type: 'next_ritual', ...ritual });
  }

  for (const act of nextProgram.acts || []) {
    shell.cognition.acts.push({ ...act, plugin: act.plugin || 'runtime' });
  }

  for (const reflect of nextProgram.reflects || []) {
    shell.cognitive.reflections.push({
      target: reflect.target || 'execution',
      criteria: reflect.method || 'causal'
    });
  }

  for (const evolve of nextProgram.evolves || []) {
    shell.evolution.evolves.push({ ...evolve });
  }

  if ((nextProgram.selfModels || []).length > 0) {
    shell.cognition.context.next_selfmodels = nextProgram.selfModels.map((m) => ({ ...m }));
  }

  if ((nextProgram.myths || []).length > 0) {
    shell.cognition.context.next_myths = nextProgram.myths.map((m) => ({ ...m }));
  }

  for (const field of nextProgram.fields || []) {
    shell.cognitive.perceptions.push({
      source: field.name,
      modality: 'field',
      filter: (field.ingest || []).join('+') || 'all',
      decay: field.decay || null
    });
    shell.cognition.context[`field_${field.name}`] = field;
  }

  for (const cell of nextProgram.cells || []) {
    shell.cognition.hypotheses.push({
      id: cell.name,
      confidence: cell.energy ?? 0.5,
      type: 'predictive',
      claim: cell.claim,
      when: cell.when || [],
      source: 'next.cell'
    });
    shell.cognitive.drives.push({
      name: cell.name,
      goal: cell.claim || cell.name,
      importance: cell.energy ?? 0.5
    });
  }

  for (const weave of nextProgram.weaves || []) {
    shell.cognitiveFlow.competitions.push({
      pattern: weave.pattern,
      into: weave.into,
      strategy: weave.strategy || 'competitive',
      max: weave.max || 12
    });
  }

  for (const dream of nextProgram.dreams || []) {
    shell.cognitiveFlow.dreams.push({
      name: dream.name,
      branches: dream.branches || 3,
      depth: dream.depth || 2,
      merge_by: dream.merge_by || 'coherence'
    });
  }

  for (const echo of nextProgram.echoes || []) {
    shell.cognitive.consolidations.push({
      target: echo.into,
      strength: 0.8,
      from: echo.from
    });
  }

  for (const spawn of nextProgram.spawns || []) {
    shell.social.spawns.push({
      name: spawn.name,
      inherit: spawn.inherit || [],
      goal: spawn.goal
    });
  }

  for (const flux of nextProgram.fluxes || []) {
    shell.evolution.evolves.push({
      name: flux.name,
      trigger: flux.when,
      mutation: flux.mutate || flux.crystallize,
      crystallize: flux.crystallize,
      source: 'next.flux'
    });
  }

  for (const bond of nextProgram.bonds || []) {
    shell.cognition.context[`bond_${bond.from}_${bond.to}`] = bond;
    shell.cognitiveFlow.habits.push({
      from: bond.from,
      to: bond.to,
      strength: bond.strength,
      kind: bond.kind || 'amplifies'
    });
  }

  for (const mesh of nextProgram.mycelium || []) {
    shell.social.shares.push({
      cluster: mesh.cluster,
      share: mesh.share,
      absorb: mesh.absorb,
      isolate: mesh.isolate
    });
  }

  shell.next = {
    goal: nextProgram.goal || null,
    models: nextProgram.models || [],
    strategies: nextProgram.strategies || [],
    guarantees: nextProgram.guarantees || [],
    vows: nextProgram.vows || [],
    constitutions: nextProgram.constitutions || [],
    rituals: nextProgram.rituals || [],
    acts: nextProgram.acts || [],
    reflects: nextProgram.reflects || [],
    evolves: nextProgram.evolves || [],
    selfModels: nextProgram.selfModels || [],
    myths: nextProgram.myths || [],
    fields: nextProgram.fields || [],
    cells: nextProgram.cells || [],
    weaves: nextProgram.weaves || [],
    dreams: nextProgram.dreams || [],
    echoes: nextProgram.echoes || [],
    spawns: nextProgram.spawns || [],
    fluxes: nextProgram.fluxes || [],
    bonds: nextProgram.bonds || [],
    mycelium: nextProgram.mycelium || [],
    autobond: nextProgram.autobond || null,
    fusion: nextProgram.fusion || []
  };

  shell.noeonStack = buildStackManifest(shell);
  return shell;
}

module.exports = {
  lowerNextProgram
};
