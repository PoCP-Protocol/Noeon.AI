'use strict';

const { lowerToCanonical } = require('./canonical-lower');
const { arbitrateGovernance, governanceFingerprint } = require('./canonical-governance');
const { canonicalSnapshot } = require('./canonical-ir');
const { planExecutionPhases, applyPlanGovernanceTier } = require('./canonical-plan');
const { mergeExecutionIntoCanonical } = require('./noeon-unified');
const { hydrateAstFromCanonical, setGovernanceWinnerOnContext } = require('./canonical-hydrate');
const { attachCognitiveBridge, enrichBridgeWithFlowPreview } = require('./canonical-cognitive-bridge');
const { buildCanonicalReport, appendCanonicalAudit } = require('./canonical-report');

function prepareCanonicalExecution(ast, options = {}) {
  const canonical = lowerToCanonical(ast, options);
  const governance = arbitrateGovernance(canonical, options);
  const plan = applyPlanGovernanceTier(planExecutionPhases(canonical, options), governance);

  hydrateAstFromCanonical(ast, canonical);
  setGovernanceWinnerOnContext(ast, governance);

  const bridge = attachCognitiveBridge(ast, canonical, governance, plan);
  if (bridge && ast.cognition?.context?._cognitiveBridge) {
    ast.cognition.context._cognitiveBridge = enrichBridgeWithFlowPreview(
      ast.cognition.context._cognitiveBridge,
      canonical
    );
  }

  return {
    canonical,
    governance,
    plan,
    snapshot: canonicalSnapshot(canonical),
    fingerprint: governanceFingerprint(governance),
    cognitiveBridge: ast.cognition?.context?._cognitiveBridge || bridge
  };
}

function mergeCanonicalIntoResult(result, prepared) {
  if (!prepared) return result;
  result.canonical = prepared.canonical;
  result.canonicalSnapshot = prepared.snapshot;
  result.governanceArbitration = prepared.governance;
  result.governanceFingerprint = prepared.fingerprint;
  result.executionPlan = prepared.plan;
  return result;
}

function finalizeCanonicalResult(result, ast, prepared, options = {}) {
  if (!prepared) return result;

  mergeExecutionIntoCanonical(prepared.canonical, result);
  if (ast?.noeonStack) {
    ast.noeonStack.runtime = {
      ...(ast.noeonStack.runtime || {}),
      success: result.success === true,
      phases: result.phases || [],
      blocked: result.blocked === true
    };
  }

  const report = buildCanonicalReport(result, prepared, ast, options);
  result.report = report;
  result.unifiedReport = report;

  if (options.canonical_audit !== false) {
    try {
      result.canonicalAuditPath = appendCanonicalAudit(report, options);
    } catch {
      // non-fatal
    }
  }

  return result;
}

module.exports = {
  prepareCanonicalExecution,
  mergeCanonicalIntoResult,
  finalizeCanonicalResult,
  buildCanonicalReport
};
