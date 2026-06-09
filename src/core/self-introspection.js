'use strict';

/**
 * SELF — runtime self-model for AI-authored programs.
 * Exposed on ast.cognition.context.SELF so REFLECT / agent logic can read
 * canonical intent, governance, and the latest unified report without re-parsing.
 */

const SELF_SCHEMA = 'noeon.self/v1';

function attachSelfIntrospection(ast, prep) {
  if (!ast) return null;
  if (!ast.cognition) ast.cognition = {};
  if (!ast.cognition.context) ast.cognition.context = {};

  const canonical = prep?.canonical || null;
  const self = {
    schema: SELF_SCHEMA,
    attachedAt: new Date().toISOString(),
    surface: canonical?.surface || ast.noeonStack?.surface || null,
    goal: canonical?.intent?.goal || ast.cognition?.goal || ast?.task || null,
    fingerprint: prep?.fingerprint || null,
    governance: prep?.governance
      ? {
          blocked: prep.governance.blocked === true,
          winner: prep.governance.winner?.tier || null,
          rule_count: prep.governance.rule_count
        }
      : null,
    plan: prep?.plan
      ? {
          phases: (prep.plan.phases || []).map((p) => p.id || p.phase || p),
          fusion_layers: prep.plan.fusion_layers || []
        }
      : null,
    capabilities: canonical?.capabilities || {},
    read(topic) {
      return readSelfTopic(self, topic);
    }
  };

  ast.cognition.context.SELF = self;
  if (prep) {
    ast.cognition.context._canonicalPrep = prep;
  }
  return self;
}

function readSelfTopic(self, topic) {
  const key = String(topic || 'summary').toLowerCase();
  switch (key) {
    case 'goal':
    case 'intent':
      return self.goal;
    case 'governance':
      return self.governance;
    case 'plan':
    case 'phases':
      return self.plan;
    case 'run':
      return self.run || null;
    case 'ai':
    case 'ainative':
    case 'ai_native':
      return self.run?.aiNative || null;
    case 'report':
      return self.run?.reportSummary || null;
    case 'blocked':
      return self.run?.blocked === true;
    case 'capabilities':
      return self.capabilities;
    default:
      return {
        schema: self.schema,
        goal: self.goal,
        surface: self.surface,
        run: self.run
          ? {
              success: self.run.success,
              grade: self.run.aiNative?.grade,
              blocked: self.run.blocked
            }
          : null
      };
  }
}

function refreshSelfIntrospection(ast, result, prep) {
  if (!ast?.cognition?.context?.SELF && prep) {
    attachSelfIntrospection(ast, prep);
  }
  const self = ast?.cognition?.context?.SELF;
  if (!self) return null;

  const report = result.report || result.unifiedReport || null;
  self.refreshedAt = new Date().toISOString();
  self.run = {
    success: result.success === true,
    blocked: result.blocked === true,
    awaitingHuman: result.awaitingHuman === true,
    humanGate: result.humanGate === true,
    epistemicGate: result.epistemicGate === true,
    phases: result.phases || [],
    error: result.error || null,
    aiNative: report?.aiNative || null,
    reportSummary: report
      ? {
          schema: report.schema,
          success: report.success,
          goal: report.intent?.goal,
          grade: report.aiNative?.grade,
          score: report.aiNative?.score
        }
      : null
  };

  return self;
}

function buildSelfExport(ast) {
  const self = ast?.cognition?.context?.SELF;
  if (!self) return null;
  const copy = { ...self };
  delete copy.read;
  return copy;
}

module.exports = {
  SELF_SCHEMA,
  attachSelfIntrospection,
  refreshSelfIntrospection,
  buildSelfExport,
  readSelfTopic
};
