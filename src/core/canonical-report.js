'use strict';

const fs = require('fs');
const path = require('path');

const REPORT_SCHEMA = 'noeon.canonical.report/v1';
const AUDIT_SCHEMA = 'noeon.canonical.audit/v1';
const AUDIT_EXPORT_SCHEMA = 'noeon.canonical.audit.export/v1';
const { buildRuntimeTraceFromResult } = require('./cognitive-architecture');
const { buildEcosystemSnapshot } = require('./canonical-ecosystem');
const { evaluateAiNative } = require('./ai-native-lens');
const { buildSelfExport } = require('./self-introspection');
const { runPostRunSelfImprove } = require('./self-improve');
const { buildDeclarationBrief } = require('./declaration-ir');
const { evaluateCognitiveLoopContract } = require('./cognitive-loop-contract');
const { buildCognitiveEvidence, validateCognitiveEvidence } = require('./cognitive-evidence');
const { buildWorldModelReport } = require('./world-model-runtime');
const { buildEffectReport } = require('./cognitive-effect');
const { buildDualView } = require('./dual-view');
const { buildAgentSurfaceReport } = require('./agent-surface');

function buildCanonicalReport(result, canonicalPrep, ast, options = {}) {
  const canonical = canonicalPrep?.canonical;
  const ts = new Date().toISOString();

  const cognitiveLoop = evaluateCognitiveLoopContract(ast, {
    architecture: result.architecture,
    report: {
      execution: { phases: result.phases || [] },
      observability: { runtime_trace: buildRuntimeTraceFromResult(result) }
    }
  });
  const cognitiveEvidence = buildCognitiveEvidence(result, ast);
  const evidenceCheck = validateCognitiveEvidence(cognitiveEvidence);
  const effects = buildEffectReport(ast, result);
  const partialReport = {
    cognitiveEvidence,
    effects,
    cognitiveEvidenceValid: evidenceCheck.valid
  };
  const dualView = buildDualView(ast, result, partialReport);
  const agentSurface = buildAgentSurfaceReport(ast, result, partialReport, dualView);

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
    cognitiveLoop,
    cognitiveEvidence,
    cognitiveEvidenceValid: evidenceCheck.valid,
    worldModel: buildWorldModelReport(result, ast, options),
    effects,
    effectsValid: effects.valid === true,
    dualView,
    agentSurface,
    ecosystem: buildEcosystemSnapshot(ast, options, result),
    aiNative: evaluateAiNative(ast, canonicalPrep, result),
    self: buildSelfExport(ast),
    selfImprove: result.selfImprove || ast?.cognition?.context?.SELF_IMPROVE || null,
    patchPreview: result.selfImprove?.patchPreview || null,
    filename: options.filename || options.source_path || null
  };
}

function buildCanonicalAuditEntry(report, options = {}) {
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
    package_imports: report.ecosystem?.packages?.imports?.length || 0,
    checkpoint_id: report.checkpointMeta?.id || null,
    transcript_id: options.transcript?.id || report.transcriptMeta?.id || null,
    source_fingerprint: options.transcript?.source_fingerprint || report.transcriptMeta?.source_fingerprint || null,
    replay_fingerprint: options.transcript?.replay_fingerprint || report.transcriptMeta?.replay_fingerprint || null,
    cognitive_evidence_valid: report.cognitiveEvidenceValid === true,
    effects: report.effects?.runtime || null
  };
}

function resolveAuditRotationOptions(options = {}) {
  const audit = options.audit || options.observability?.audit || {};
  return {
    maxLines: Number(audit.maxLines ?? options.maxLines ?? 5000),
    maxBytes: Number(audit.maxBytes ?? options.maxBytes ?? 2 * 1024 * 1024),
    rotateKeep: Number(audit.rotateKeep ?? options.rotateKeep ?? 3)
  };
}

function listAuditArchiveFiles(dir, baseName = 'audit.jsonl') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name === baseName || name.startsWith(`${baseName}.`))
    .sort();
}

function rotateCanonicalAuditIfNeeded(auditFile, options = {}) {
  if (!fs.existsSync(auditFile)) {
    return { rotated: false, lines: 0, bytes: 0 };
  }

  const rot = resolveAuditRotationOptions(options);
  const stat = fs.statSync(auditFile);
  const lineCount = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean).length;
  if (lineCount <= rot.maxLines && stat.size <= rot.maxBytes) {
    return { rotated: false, lines: lineCount, bytes: stat.size };
  }

  const dir = path.dirname(auditFile);
  const baseName = path.basename(auditFile);
  const oldest = path.join(dir, `${baseName}.${rot.rotateKeep}`);
  if (fs.existsSync(oldest)) fs.unlinkSync(oldest);

  for (let i = rot.rotateKeep; i >= 2; i -= 1) {
    const from = path.join(dir, `${baseName}.${i - 1}`);
    const to = path.join(dir, `${baseName}.${i}`);
    if (fs.existsSync(from)) fs.renameSync(from, to);
  }

  fs.renameSync(auditFile, path.join(dir, `${baseName}.1`));
  return {
    rotated: true,
    previousLines: lineCount,
    previousBytes: stat.size,
    rotateKeep: rot.rotateKeep
  };
}

function appendCanonicalAudit(report, options = {}) {
  const dir = options.canonical_audit_dir ||
    options.audit?.dir ||
    path.join(process.cwd(), 'artifacts', 'canonical');
  const file = path.join(dir, 'audit.jsonl');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  rotateCanonicalAuditIfNeeded(file, options);
  fs.appendFileSync(file, `${JSON.stringify(buildCanonicalAuditEntry(report, options))}\n`, 'utf8');
  return file;
}

function summarizeAuditEntries(entries) {
  const summary = {
    total: entries.length,
    success: 0,
    blocked: 0,
    failed: 0,
    bySurface: {},
    byExecutor: {}
  };

  for (const entry of entries) {
    if (entry.success === true) summary.success += 1;
    else if (entry.blocked === true) summary.blocked += 1;
    else summary.failed += 1;

    const surface = entry.surface || 'unknown';
    summary.bySurface[surface] = (summary.bySurface[surface] || 0) + 1;

    const executor = entry.executor || 'unknown';
    summary.byExecutor[executor] = (summary.byExecutor[executor] || 0) + 1;
  }

  return summary;
}

function exportCanonicalAudit(options = {}) {
  const dir = options.dir || options.canonical_audit_dir || path.join(process.cwd(), 'artifacts', 'canonical');
  const file = path.join(dir, 'audit.jsonl');
  const ts = new Date().toISOString();

  if (!fs.existsSync(file)) {
    return {
      schema: AUDIT_EXPORT_SCHEMA,
      generatedAt: ts,
      source: file,
      exists: false,
      summary: summarizeAuditEntries([]),
      entries: []
    };
  }

  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { schema: 'parse_error', raw: line.slice(0, 120) };
    }
  });

  const limit = options.limit != null ? Number(options.limit) : null;
  const exported = limit != null && limit > 0 ? entries.slice(-limit) : entries;
  const archives = listAuditArchiveFiles(dir).filter((name) => name !== 'audit.jsonl');

  return {
    schema: AUDIT_EXPORT_SCHEMA,
    generatedAt: ts,
    source: file,
    exists: true,
    archives,
    summary: summarizeAuditEntries(entries),
    entries: exported
  };
}

module.exports = {
  REPORT_SCHEMA,
  AUDIT_SCHEMA,
  AUDIT_EXPORT_SCHEMA,
  buildCanonicalReport,
  buildCanonicalAuditEntry,
  appendCanonicalAudit,
  rotateCanonicalAuditIfNeeded,
  exportCanonicalAudit,
  summarizeAuditEntries,
  listAuditArchiveFiles
};
