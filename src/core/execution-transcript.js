'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TRANSCRIPT_SCHEMA = 'noeon.execution.transcript/v1';

function sha256(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

function fingerprintSource(source, filename) {
  const resolved = filename ? path.resolve(process.cwd(), filename) : null;
  return {
    path: resolved || filename || null,
    sha256: sha256(source || ''),
    bytes: Buffer.byteLength(String(source || ''), 'utf8')
  };
}

function sanitizeRunOptions(options = {}) {
  return {
    with_protocol: options.with_protocol ?? 'auto',
    general_canonical: options.general_canonical === true,
    trace: options.trace === true,
    canonical_audit: options.canonical_audit !== false
  };
}

function buildReplayFingerprint(report) {
  const payload = {
    success: report.success === true,
    blocked: report.blocked === true,
    phases: report.execution?.phases || [],
    evidence_valid: report.cognitiveEvidenceValid === true,
    evidence_phases: report.cognitiveEvidence?.summary?.phases || [],
    evidence_total: report.cognitiveEvidence?.summary?.total ?? null,
    world_beliefs: report.worldModel?.stats?.belief_count ?? null,
    world_revisions: report.worldModel?.stats?.revision_count ?? null,
    effects: report.effects?.runtime || report.effects?.declared || []
  };
  return sha256(JSON.stringify(payload));
}

function buildExecutionTranscript(report, result, ast, options = {}) {
  const source = options.source
    || (options.filename && fs.existsSync(options.filename)
      ? fs.readFileSync(options.filename, 'utf8')
      : null);
  const id = (report.generatedAt || new Date().toISOString()).replace(/[:.]/g, '-');
  const transcript = {
    schema: TRANSCRIPT_SCHEMA,
    id,
    generatedAt: report.generatedAt || new Date().toISOString(),
    source: fingerprintSource(source, options.filename || options.source_path || ast?.task || null),
    runOptions: sanitizeRunOptions(options),
    outcome: {
      success: report.success === true,
      blocked: report.blocked === true,
      error: report.error || null,
      phases: report.execution?.phases || [],
      surface: report.surface || null
    },
    intent: { goal: report.intent?.goal || null },
    cognitive: {
      evidence_valid: report.cognitiveEvidenceValid === true,
      evidence_schema: report.cognitiveEvidence?.schema || null,
      artifact_phases: report.cognitiveEvidence?.summary?.phases || [],
      artifact_total: report.cognitiveEvidence?.summary?.total ?? 0,
      avg_confidence: report.cognitiveEvidence?.summary?.avgConfidence ?? null,
      loop_ready: report.cognitiveLoop?.ready === true
    },
    worldModel: report.worldModel
      ? {
          belief_count: report.worldModel.stats?.belief_count ?? 0,
          revision_count: report.worldModel.stats?.revision_count ?? 0,
          prediction_errors: report.worldModel.stats?.prediction_errors ?? 0,
          causal_insights: report.worldModel.stats?.causal_insights ?? 0
        }
      : null,
    effects: report.effects || null,
    replay_fingerprint: buildReplayFingerprint(report),
    vm: result?.vm || null
  };
  return transcript;
}

function transcriptDir(options = {}) {
  const base = options.canonical_audit_dir
    || options.dir
    || options.audit?.dir
    || path.join(process.cwd(), 'artifacts', 'canonical');
  return path.join(base, 'transcripts');
}

function saveExecutionTranscript(transcript, options = {}) {
  const dir = transcriptDir(options);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${transcript.id}.json`);
  fs.writeFileSync(file, `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
  return {
    id: transcript.id,
    file,
    replay_fingerprint: transcript.replay_fingerprint,
    source_fingerprint: transcript.source?.sha256 || null
  };
}

function loadExecutionTranscript(id, options = {}) {
  const file = path.join(transcriptDir(options), `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function listExecutionTranscripts(options = {}) {
  const dir = transcriptDir(options);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => {
      try {
        const t = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
        return {
          id: t.id,
          generatedAt: t.generatedAt,
          goal: t.intent?.goal,
          success: t.outcome?.success,
          replay_fingerprint: t.replay_fingerprint,
          source: t.source?.path
        };
      } catch {
        return { id: n.replace(/\.json$/, ''), parse_error: true };
      }
    })
    .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
}

function compareTranscripts(expected, actual) {
  const diffs = [];
  if (!expected || !actual) {
    return { match: false, diffs: ['missing transcript'] };
  }
  if (expected.replay_fingerprint !== actual.replay_fingerprint) {
    diffs.push('replay_fingerprint');
  }
  if (expected.outcome?.success !== actual.outcome?.success) {
    diffs.push(`success ${expected.outcome?.success} vs ${actual.outcome?.success}`);
  }
  if (JSON.stringify(expected.outcome?.phases) !== JSON.stringify(actual.outcome?.phases)) {
    diffs.push('execution.phases');
  }
  if (expected.cognitive?.evidence_valid !== actual.cognitive?.evidence_valid) {
    diffs.push('cognitive.evidence_valid');
  }
  if (expected.cognitive?.artifact_total !== actual.cognitive?.artifact_total) {
    diffs.push('cognitive.artifact_total');
  }
  if (expected.worldModel?.belief_count !== actual.worldModel?.belief_count) {
    diffs.push('worldModel.belief_count');
  }
  return {
    match: diffs.length === 0,
    diffs,
    expected_fingerprint: expected.replay_fingerprint,
    actual_fingerprint: actual.replay_fingerprint
  };
}

function sanitizeRunOptions(options = {}) {
  return {
    with_protocol: options.with_protocol ?? 'auto',
    general_canonical: options.general_canonical === true,
    trace: options.trace === true,
    canonical_audit: options.canonical_audit !== false
  };
}

module.exports = {
  TRANSCRIPT_SCHEMA,
  fingerprintSource,
  sanitizeRunOptions,
  buildExecutionTranscript,
  saveExecutionTranscript,
  loadExecutionTranscript,
  listExecutionTranscripts,
  compareTranscripts,
  buildReplayFingerprint
};
