'use strict';

const {
  promoteAgentToAst,
  createGeneralAgentAstShell
} = require('./agent-block');
const { buildStackManifest } = require('../core/noeon-unified');
const { attachUniversalToAst } = require('../core/universal-kernel');
const { expandUniversalStdlib, expandMeshSocial } = require('../core/universal-expand');
const { buildImportContext, validateImports } = require('../stdlib/registry');
const { annotateFlowSteps } = require('../core/cognitive-architecture');
const { syncAgentsToUnifiedStack } = require('../core/noeon-unified');

function mergePolicy(epistemic, governance) {
  const policy = { ...(governance?.policy || {}) };
  if (epistemic?.require_citation != null) policy.require_citation = epistemic.require_citation;
  if (epistemic?.audit != null) policy.audit = epistemic.audit;
  if (epistemic?.confidence_floor != null) policy.confidence_floor = epistemic.confidence_floor;
  return policy;
}

function lowerUniversalProgram(parsed) {
  const importErrors = [];
  validateImports(parsed.imports || [], importErrors);
  if (importErrors.length) {
    throw new Error(importErrors.join('; '));
  }
  parsed.importContext = buildImportContext(parsed.imports || []);

  const expanded = expandUniversalStdlib(parsed);
  const { universal, header, profile, version } = expanded.parsed;
  const ast = createGeneralAgentAstShell();
  ast.profile = profile || 'universal';
  ast.languageProfile = 'universal';
  ast.version = version || '1.0.0';
  ast.detectedSurface = 'universal';

  const { intent, epistemic, cognition, capability, governance, evolution } = universal.dimensions;

  const agentBody = {
    name: universal.name,
    goal: intent?.goal || intent?.text || null,
    memory: capability?.memory || { type: 'episodic+semantic' },
    tools: capability?.tools || [],
    policy: mergePolicy(epistemic, governance),
    flow: cognition?.flow || [],
    constitutions: [],
    vows: [],
    rituals: [],
    strategies: []
  };

  if (governance?.budget) ast.budget = governance.budget;
  if (governance?.human_must_approve) {
    ast.fusionRelay = ast.fusionRelay || {};
    ast.fusionRelay.human_must_approve = governance.human_must_approve;
  }
  if (header?.fusionTriad) ast.fusionTriad = header.fusionTriad;
  if (header?.fusionRelay) ast.fusionRelay = { ...ast.fusionRelay, ...header.fusionRelay };
  if (header?.fuse?.length) ast.fusion = header.fuse;

  if (evolution?.learn) {
    ast.cognition.learn = evolution.learn;
  }
  if (evolution?.self_improve) {
    ast.cognition.nativeAI = {
      mode: 'hybrid',
      autonomy: 'native',
      reflection: 'adaptive',
      selfCheck: true,
      selfImprove: evolution.self_improve,
      dream: evolution.dream === true
    };
  }

  if (capability?.compute) {
    ast.compute.enabled = capability.compute.enabled !== 'false';
  }

  promoteAgentToAst(ast, agentBody);
  expandMeshSocial(ast, agentBody.flow, agentBody.tools);
  attachUniversalToAst(ast, universal);
  ast.general = ast.general || {};
  ast.general.imports = parsed.imports || [];
  ast.general.importContext = parsed.importContext;
  ast.general.stdlibExpansion = expanded.expanded ? expanded.fragments : [];

  syncAgentsToUnifiedStack(ast);
  for (const agent of ast.agents) {
    agent.flowArchitecture = annotateFlowSteps(agent.flow);
  }

  ast.noeonStack = buildStackManifest(ast);
  return ast;
}

function parseUniversalSource(source, options = {}) {
  const { parseUniversalProgram } = require('./universal-parser');
  return lowerUniversalProgram(parseUniversalProgram(source, options));
}

module.exports = {
  lowerUniversalProgram,
  parseUniversalSource,
  mergePolicy
};
