'use strict';

const fs = require('fs');
const path = require('path');
const { fingerprintSource, sanitizeRunOptions } = require('./execution-transcript');

const CHECKPOINT_SCHEMA = 'noeon.execution.checkpoint/v1';

function checkpointDir(options = {}) {
  const base = options.canonical_audit_dir
    || options.dir
    || options.audit?.dir
    || path.join(process.cwd(), 'artifacts', 'canonical');
  return path.join(base, 'checkpoints');
}

function buildExecutionCheckpoint(report, result, ast, options = {}, transcriptMeta = null) {
  const source = options.source
    || (options.filename && fs.existsSync(options.filename)
      ? fs.readFileSync(options.filename, 'utf8')
      : null);
  const id = transcriptMeta?.id
    || (report.generatedAt || new Date().toISOString()).replace(/[:.]/g, '-');

  const trace = result?.cognitive?.trace || result?.trace || [];
  const agent = ast?.agents?.[0] || null;

  return {
    schema: CHECKPOINT_SCHEMA,
    id,
    transcript_id: transcriptMeta?.id || id,
    generatedAt: report.generatedAt || new Date().toISOString(),
    source: fingerprintSource(source, options.filename || options.source_path || ast?.task || null),
    runOptions: sanitizeRunOptions(options),
    resumable: true,
    intent: {
      goal: report.intent?.goal || null,
      task: ast?.task || null,
      agent: agent?.name || null
    },
    state: {
      success: report.success === true,
      blocked: report.blocked === true,
      awaiting_human: result?.awaitingHuman === true,
      phases_completed: report.execution?.phases || [],
      trace_length: trace.length,
      flow_completed_steps: trace.filter((t) => t.phase && t.operation).length,
      agent_name: agent?.name || null,
      agent_flow_steps: agent?.flow?.length || 0
    },
    worldModel: report.worldModel || null,
    cognitiveEvidence: report.cognitiveEvidence
      ? {
          valid: report.cognitiveEvidenceValid === true,
          phases: report.cognitiveEvidence.summary?.phases || [],
          total: report.cognitiveEvidence.summary?.total ?? 0
        }
      : null,
    effects: report.effects || null,
    trace: trace.slice(-48),
    vm: result?.vm || null
  };
}

function saveExecutionCheckpoint(checkpoint, options = {}) {
  const dir = checkpointDir(options);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${checkpoint.id}.json`);
  fs.writeFileSync(file, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
  return { id: checkpoint.id, file, transcript_id: checkpoint.transcript_id };
}

function loadExecutionCheckpoint(id, options = {}) {
  const file = path.join(checkpointDir(options), `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function listExecutionCheckpoints(options = {}) {
  const dir = checkpointDir(options);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => {
      try {
        const cp = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
        return {
          id: cp.id,
          generatedAt: cp.generatedAt,
          goal: cp.intent?.goal,
          agent: cp.intent?.agent,
          resumable: cp.resumable === true,
          awaiting_human: cp.state?.awaiting_human === true,
          phases: cp.state?.phases_completed?.length || 0,
          source: cp.source?.path
        };
      } catch {
        return { id: n.replace(/\.json$/, ''), parse_error: true };
      }
    })
    .sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
}

module.exports = {
  CHECKPOINT_SCHEMA,
  checkpointDir,
  buildExecutionCheckpoint,
  saveExecutionCheckpoint,
  loadExecutionCheckpoint,
  listExecutionCheckpoints
};
