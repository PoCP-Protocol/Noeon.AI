'use strict';

const { DIMENSIONS } = require('./universal-kernel');

const STDLIB_DEFAULT_FLOW = [
  { kind: 'perceive', source: 'input', modality: 'text', _stdlib: 'std.universal/cognize' },
  { kind: 'reason', strategy: 'abductive', depth: '3', _stdlib: 'std.universal/cognize' },
  { kind: 'decide', action: 'respond', threshold: '0.65', _stdlib: 'std.universal/cognize' },
  { kind: 'act', action: 'respond', channel: 'console', _stdlib: 'std.universal/cognize' },
  { kind: 'reflect', depth: 'standard', _stdlib: 'std.universal/cognize' }
];

const STDLIB_DEFAULTS = {
  epistemic: {
    require_citation: true,
    confidence_floor: 0.7,
    sources: ['memory', 'tools'],
    empty: false,
    from_stdlib: true
  },
  capability: {
    tools: ['echo/echo'],
    empty: false,
    from_stdlib: true
  },
  governance: {
    policy: { audit: true },
    empty: false,
    from_stdlib: true
  },
  evolution: {
    learn: { signal: 'feedback', rate: 0.1 },
    self_improve: true,
    empty: false,
    from_stdlib: true
  }
};

function cloneFlow(steps) {
  return steps.map((s) => ({ ...s }));
}

function expandMeshSocial(ast, flow, tools) {
  if (!ast?.social) return;
  const meshTools = new Set(tools || []);
  const wantsMesh = meshTools.has('spawn') || meshTools.has('delegate') ||
    flow.some((s) => s.action === 'spawn_agents' || s.action === 'delegate');

  if (!wantsMesh) return;

  for (const step of flow) {
    if (step.kind === 'act' && String(step.action || '').includes('spawn')) {
      ast.social.spawns.push({
        name: `${ast.task || 'agent'}_worker`,
        channel: step.channel || 'mesh',
        simulated: true,
        source: 'std.universal/mesh'
      });
    }
    if (step.kind === 'decide' && step.action === 'delegate') {
      ast.social.delegations.push({
        strategy: 'mesh',
        threshold: step.threshold || '0.65',
        simulated: true,
        source: 'std.universal/mesh'
      });
    }
  }

  if (flow.some((s) => s.kind === 'feedback')) {
    ast.cognition.feedback.push({
      source: 'telemetry',
      modality: 'metrics',
      simulated: true,
      source_stdlib: 'std.universal/mesh'
    });
  }
}

function expandUniversalStdlib(parsed) {
  const imports = parsed.imports || [];
  if (!imports.includes('std.universal')) {
    return { parsed, expanded: false, fragments: [] };
  }

  const universal = parsed.universal;
  const fragments = [];
  universal.stdlib = { module: 'std.universal', expanded: true, fragments };

  const dims = universal.dimensions;

  if (dims.epistemic?.empty) {
    dims.epistemic = { ...STDLIB_DEFAULTS.epistemic };
    fragments.push('epistemic.defaults');
  }

  if (dims.cognition?.empty || !(dims.cognition.flow?.length)) {
    dims.cognition = { flow: cloneFlow(STDLIB_DEFAULT_FLOW), empty: false, from_stdlib: true };
    fragments.push('cognize.default_flow');
  } else {
    for (const step of dims.cognition.flow) {
      if (!step._stdlib) step._stdlib = 'std.universal/cognize';
    }
    fragments.push('cognize.annotated');
  }

  if (dims.capability?.empty) {
    dims.capability = { ...STDLIB_DEFAULTS.capability };
    fragments.push('equip.default_tools');
  }

  if (dims.governance?.empty) {
    dims.governance = { ...STDLIB_DEFAULTS.governance };
    fragments.push('govern.default_policy');
  }

  if (dims.evolution?.empty) {
    dims.evolution = { ...STDLIB_DEFAULTS.evolution };
    fragments.push('evolve.default_learn');
  }

  if (dims.intent?.empty && universal.name) {
    dims.intent = {
      goal: `Achieve ${universal.name} objective with measurable outcome`,
      text: `Achieve ${universal.name} objective with measurable outcome`,
      empty: false,
      from_stdlib: true
    };
    fragments.push('intent.inferred');
  }

  return { parsed, expanded: true, fragments };
}

function buildUniversalStatusFromAst(ast) {
  const { validateUniversalProgram } = require('./universal-kernel');
  const universal = ast?.universal;
  if (!universal) return null;
  const validation = validateUniversalProgram(universal);
  return {
    name: universal.name,
    score: validation.score,
    ready: validation.ready,
    checks: validation.checks,
    stdlib: universal.stdlib || null,
    mesh: {
      spawns: ast?.social?.spawns?.length || 0,
      delegations: ast?.social?.delegations?.length || 0
    }
  };
}

module.exports = {
  STDLIB_DEFAULT_FLOW,
  expandUniversalStdlib,
  expandMeshSocial,
  buildUniversalStatusFromAst
};
