'use strict';

/**
 * Noeon unified execution pipeline.
 *
 * Canonical Architecture v1.0:
 *   Surface → AST → Canonical IR → Governance/Route → Cognitive IR → Runtime → Observability
 *
 * @see src/core/canonical-architecture.js
 * @see docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md
 */

const fs = require('fs');
const { parseProgram, parseFromSource, validateProgram } = require('../runtime/unified-runtime');
const { executeProgram } = require('../vm/unified-executor');
const { prepareCanonicalExecution } = require('./canonical-runtime');
const { deriveExecutionRoute, routePhaseLabel } = require('./canonical-route');
const { detectProfile, resolveExecutionMode } = require('./profile');
const { buildStackManifest } = require('./noeon-unified');
const { attachArchitecture, buildArchitectureMap, COGNITIVE_CYCLE } = require('./cognitive-architecture');
const { extractActionTrace } = require('./action-trace');
const { CORE_SURFACE } = require('./surfaces');

function isAst(input) {
  return input && typeof input === 'object' && (
    input.cognition != null ||
    input.cognitive != null ||
    input.agents != null ||
    input.next != null ||
    input.liminal != null ||
    input.task != null
  );
}

function parseNoeonInput(input, options = {}) {
  if (isAst(input)) {
    const ast = input;
    if (!ast.noeonStack) ast.noeonStack = buildStackManifest(ast);
    return {
      ast,
      filename: options.filename || ast.task || '<ast>',
      resolved: options.filename || null,
      source: options.source || null
    };
  }

  if (typeof input !== 'string') {
    throw new Error('parseNoeonInput expects file path, source string, or AST');
  }

  const looksLikeSource = input.includes('\n') || !fs.existsSync(input);
  if (looksLikeSource) {
    const { ast, filename } = parseFromSource(input, options.filename || '<input>');
    if (!ast.noeonStack) ast.noeonStack = buildStackManifest(ast);
    return { ast, filename, resolved: null, source: input };
  }

  const parsed = parseProgram(input, options);
  if (!parsed.ast.noeonStack) {
    parsed.ast.noeonStack = buildStackManifest(parsed.ast);
  }
  return {
    ast: parsed.ast,
    filename: parsed.resolved,
    resolved: parsed.resolved,
    source: parsed.source,
    config: parsed.config,
    evolved: parsed.evolved
  };
}

function planNoeonProgram(ast, options = {}) {
  const validation = validateProgram(ast);
  const profile = detectProfile(ast, options);
  const mode = resolveExecutionMode(profile, options);
  const prep = prepareCanonicalExecution(ast, options);
  const route = deriveExecutionRoute(prep, profile, mode, options);
  attachArchitecture(ast, { plan: prep.plan, route, governance: prep.governance });

  return {
    validation,
    profile,
    mode,
    coreSurface: CORE_SURFACE,
    prep,
    canonical: prep.canonical,
    governance: prep.governance,
    plan: prep.plan,
    snapshot: prep.snapshot,
    route,
    routeLabel: routePhaseLabel(route),
    stack: ast.noeonStack || buildStackManifest(ast),
    architecture: ast.cognitiveArchitecture || buildArchitectureMap(ast, {
      plan: prep.plan,
      route,
      governance: prep.governance
    }),
    cognitiveCycle: COGNITIVE_CYCLE
  };
}

async function runNoeonPipeline(input, options = {}) {
  const parsed = parseNoeonInput(input, options);
  const filename = options.filename || parsed.resolved || parsed.filename;
  const plan = planNoeonProgram(parsed.ast, { ...options, filename });

  if (options.validate_only) {
    return {
      ast: parsed.ast,
      ...plan,
      result: null,
      report: null
    };
  }

  if (options.plan_only) {
    return {
      ast: parsed.ast,
      ...plan,
      result: null,
      report: null
    };
  }

  const result = await executeProgram(parsed.ast, { ...options, filename });
  attachArchitecture(parsed.ast, {
    plan: plan.plan,
    route: plan.route,
    governance: plan.governance,
    result
  });

  return {
    ast: parsed.ast,
    validation: plan.validation,
    profile: plan.profile,
    mode: plan.mode,
    coreSurface: CORE_SURFACE,
    canonical: plan.canonical,
    governance: plan.governance,
    plan: plan.plan,
    snapshot: plan.snapshot,
    route: plan.route,
    routeLabel: plan.routeLabel,
    stack: plan.stack,
    architecture: parsed.ast.cognitiveArchitecture,
    cognitiveCycle: plan.cognitiveCycle,
    prep: plan.prep,
    result,
    report: result.report || result.unifiedReport || null,
    actionTrace: result ? extractActionTrace(result) : null
  };
}

module.exports = {
  parseNoeonInput,
  planNoeonProgram,
  runNoeonPipeline,
  CORE_SURFACE
};
