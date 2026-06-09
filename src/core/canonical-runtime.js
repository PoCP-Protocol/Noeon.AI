'use strict';

const fs = require('fs');
const { lowerToCanonical } = require('./canonical-lower');
const { arbitrateGovernance, governanceFingerprint } = require('./canonical-governance');
const { canonicalSnapshot } = require('./canonical-ir');
const { planExecutionPhases, applyPlanGovernanceTier } = require('./canonical-plan');
const { mergeExecutionIntoCanonical } = require('./noeon-unified');
const { hydrateAstFromCanonical, setGovernanceWinnerOnContext } = require('./canonical-hydrate');
const { attachCognitiveBridge, enrichBridgeWithFlowPreview } = require('./canonical-cognitive-bridge');
const { buildCanonicalReport, appendCanonicalAudit } = require('./canonical-report');
const {
  buildExecutionTranscript,
  saveExecutionTranscript
} = require('./execution-transcript');
const {
  buildExecutionCheckpoint,
  saveExecutionCheckpoint
} = require('./execution-checkpoint');
const { attachSelfIntrospection, refreshSelfIntrospection } = require('./self-introspection');
const { runPostRunSelfImprove } = require('./self-improve');
const { runUniversalMeshRuntime } = require('../runtime/universal-mesh-runtime');
const { attachMeshTraceToResult } = require('../runtime/universal-mesh-trace');
const {
  resolveCanonicalForExecution,
  markCanonicalPrimaryContext,
  attachExecutionPresentation
} = require('./general-canonical-execution');

function prepareCanonicalExecution(ast, options = {}) {
  const resolved = resolveCanonicalForExecution(ast, options);
  const canonical = resolved.primary
    ? resolved.canonical
    : (resolved.canonical || lowerToCanonical(ast, options));
  if (resolved.primary) {
    markCanonicalPrimaryContext(ast, resolved);
  }
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

  attachSelfIntrospection(ast, { canonical, governance, plan, fingerprint: governanceFingerprint(governance) });

  return {
    canonical,
    governance,
    plan,
    snapshot: canonicalSnapshot(canonical),
    fingerprint: governanceFingerprint(governance),
    cognitiveBridge: ast.cognition?.context?._cognitiveBridge || bridge,
    canonicalPrimary: resolved.primary,
    canonicalSource: resolved.primary ? resolved.source : 'runtime.lower',
    executionDriver: resolved.primary ? 'snapshot-primary' : 'runtime-lower',
    snapshotActCount: resolved.primary
      ? (resolved.canonical?.execution?.acts?.length ?? 0)
      : null
  };
}

function mergeCanonicalIntoResult(result, prepared) {
  if (!prepared) return result;
  result.canonical = prepared.canonical;
  result.canonicalSnapshot = prepared.snapshot;
  result.governanceArbitration = prepared.governance;
  result.governanceFingerprint = prepared.fingerprint;
  result.executionPlan = prepared.plan;
  result.executionDriver = prepared.executionDriver || result.executionDriver || null;
  result.snapshotActCount = prepared.snapshotActCount ?? result.snapshotActCount ?? null;
  return result;
}

function finalizeCanonicalResult(result, ast, prepared, options = {}) {
  if (!prepared) return result;

  mergeExecutionIntoCanonical(prepared.canonical, result);
  attachExecutionPresentation(result, ast, options);
  if (ast?.noeonStack) {
    ast.noeonStack.runtime = {
      ...(ast.noeonStack.runtime || {}),
      success: result.success === true,
      phases: result.phases || [],
      blocked: result.blocked === true
    };
  }

  result.self = refreshSelfIntrospection(ast, result, prepared);
  const sourceText = options.source
    || (options.filename && fs.existsSync(options.filename) ? fs.readFileSync(options.filename, 'utf8') : null)
    || (options.source_path && fs.existsSync(options.source_path) ? fs.readFileSync(options.source_path, 'utf8') : null);
  result.selfImprove = runPostRunSelfImprove(ast, prepared, result, {
    source: sourceText,
    filename: options.filename || options.source_path
  });

  const report = buildCanonicalReport(result, prepared, ast, options);
  result.report = report;
  result.unifiedReport = report;

  if (options.canonical_audit !== false) {
    try {
      const transcript = buildExecutionTranscript(report, result, ast, options);
      const saved = saveExecutionTranscript(transcript, options);
      result.executionTranscript = saved;
      report.transcriptMeta = saved;
      try {
        const checkpoint = buildExecutionCheckpoint(report, result, ast, options, saved);
        const savedCp = saveExecutionCheckpoint(checkpoint, options);
        result.executionCheckpoint = savedCp;
        report.checkpointMeta = savedCp;
      } catch {
        // non-fatal
      }
      result.canonicalAuditPath = appendCanonicalAudit(report, { ...options, transcript: saved });
    } catch {
      // non-fatal
    }
  }

  const meshRuntime = runUniversalMeshRuntime(ast, result);
  if (meshRuntime) result.meshRuntime = meshRuntime;

  attachMeshTraceToResult(result, ast);

  return result;
}

module.exports = {
  prepareCanonicalExecution,
  mergeCanonicalIntoResult,
  finalizeCanonicalResult,
  buildCanonicalReport
};
