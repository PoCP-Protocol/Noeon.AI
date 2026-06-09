'use strict';

const fs = require('fs');
const path = require('path');

const REPORT_SCHEMA = 'noeon.canonical.report/v1';
const AUDIT_SCHEMA = 'noeon.canonical.audit/v1';
const { buildRuntimeTraceFromResult } = require('./cognitive-architecture');
const { buildEcosystemSnapshot } = require('./canonical-ecosystem');
const { evaluateAiNative } = require('./ai-native-lens');
const { buildSelfExport } = require('./self-introspection');
const { runPostRunSelfImprove } = require('./self-improve');
const { buildDeclarationBrief } = require('./declaration-ir');
const { evaluateCognitiveLoopContract } = require('./cognitive-loop-contract');

function buildCanonicalReport(result, canonicalPrep, ast, options = {}) {
  const canonical = canonicalPrep?.canonical;
  const ts = new Date().toISOString();

  return {
    schema: REPORT_SCHEMA,
    generatedAt: ts,
    success: result.success === true,
    blocked: result.blocked === true,
    error: result.error || null,
    surface: canonical?.surface || result.profile,
    capabilities: canonical?.capabilities || {},
    declarations: buildDeclarationBrief(canonical?.declarations) || buildDeclarationBrief(ast?.general?.declarations),
    ai: canonical?.ai || null,
    intent: {
      goal: canonical?.intent?.goal || ast?.cognition?.goal || ast?.task || null,
      task: canonical?.task || ast?.task || null
    },
    governance: {
      fingerprint: result.governanceFingerprint || canonicalPrep?.fingerprint || null,
      arbitration: result.governanceArbitration
        ? {
            winner_tier: result.governanceArbitration.winner?.tier || null,
            rule_count: result.governanceArbitration.rule_count,
            conflict_count: result.governanceArbitration.conflicts?.length || 0,
            precedence: result.governanceArbitration.precedence || [],
            model: result.governanceArbitration.model
          }
        : null,
      preflight_valid: result.governance?.valid !== false
    },
    fusion: {
      layers: canonical?.fusion?.layers || [],
      triad: canonical?.fusion?.triad || false,
      bidirectional: canonical?.fusion?.bidirectional || false,
      meta: result.fusionMeta || null,
      coherence: result.triad?.coherence?.score ?? null,
      relay: result.triad?.relay?.triggered ?? null
    },
    semantic: {
      pulse: result.semanticPulse || null,
      relay: result.semanticRelay || null,
      convergence: result.convergence?.coherence?.score ?? null,
      route: result.executionRoute?.engine || null
    },
    execution: {
      phases: result.phases || [],
      plan: result.executionPlan || null,
      scheduler: result.scheduler || null,
      mode: result.mode || null,
      architecture: result.architecture
        ? {
            active_regions: result.architecture.active_regions,
            phase_regions: result.architecture.phase_regions,
            pipeline_phases: result.architecture.pipeline_phases,
            executive: 'prefrontal_cortex',
            core_field: result.architecture.core_field
          }
        : null
    },
    observability: {
      reflections: (canonical?.observability?.reflections || []).length,
      traces: (canonical?.observability?.traces || []).length,
      audit_entries: (result.phases || []).length,
      cognitive_success: result.cognitive?.success !== false,
      protocol_success: result.protocolSuccess ?? null,
      runtime_trace: buildRuntimeTraceFromResult(result),
      architecture: result.architecture
        ? {
            active_regions: result.architecture.active_regions,
            phase_regions: result.architecture.phase_regions,
            pipeline_phases: result.architecture.pipeline_phases,
            executive: 'prefrontal_cortex',
            core_field: result.architecture.core_field
          }
        : canonical?.observability?.architecture || null
    },
    cognitiveLoop: evaluateCognitiveLoopContract(ast, {
      architecture: result.architecture,
      report: {
        execution: { phases: result.phases || [] },
        observability: { runtime_trace: buildRuntimeTraceFromResult(result) }
      }
    }),
    ecosystem: buildEcosystemSnapshot(ast, options, result),
    aiNative: evaluateAiNative(ast, canonicalPrep, result),
    self: buildSelfExport(ast),
    selfImprove: result.selfImprove || ast?.cognition?.context?.SELF_IMPROVE || null,
    patchPreview: result.selfImprove?.patchPreview || null,
    filename: options.filename || options.source_path || null
  };
}

function buildCanonicalAuditEntry(report) {
  return {
    schema: AUDIT_SCHEMA,
    ts: report.generatedAt,
    surface: report.surface,
    goal: report.intent?.goal,
    success: report.success,
    blocked: report.blocked,
    phases: report.execution?.phases || [],
    runtime_trace: report.observability?.runtime_trace || null,
    governance_winner: report.governance?.arbitration?.winner_tier || null,
    fusion_layers: report.fusion?.layers || [],
    triad: report.fusion?.triad || false,
    coherence: report.fusion?.coherence,
    executor: report.ecosystem?.runtime?.executor || null,
    mcp_tools: report.ecosystem?.mcp?.attached_tools?.length || 0,
    package_imports: report.ecosystem?.packages?.imports?.length || 0
  };
}

function appendCanonicalAudit(report, options = {}) {
  const dir = options.canonical_audit_dir || path.join(process.cwd(), 'artifacts', 'canonical');
  const file = path.join(dir, 'audit.jsonl');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(buildCanonicalAuditEntry(report))}\n`, 'utf8');
  return file;
}

module.exports = {
  REPORT_SCHEMA,
  AUDIT_SCHEMA,
  buildCanonicalReport,
  buildCanonicalAuditEntry,
  appendCanonicalAudit
};
