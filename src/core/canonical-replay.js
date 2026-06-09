'use strict';

const fs = require('fs');
const path = require('path');
const { runNoeonPipeline } = require('./pipeline');
const {
  loadExecutionTranscript,
  listExecutionTranscripts,
  buildExecutionTranscript,
  compareTranscripts,
  saveExecutionTranscript
} = require('./execution-transcript');

const REPLAY_SCHEMA = 'noeon.canonical.replay/v1';

async function replayFromTranscript(transcript, options = {}) {
  if (!transcript?.source?.path) {
    throw new Error('Transcript missing source path');
  }
  const sourcePath = path.resolve(process.cwd(), transcript.source.path);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  const currentSource = fs.readFileSync(sourcePath, 'utf8');
  if (transcript.source.sha256 && sha256(currentSource) !== transcript.source.sha256) {
    return {
      schema: REPLAY_SCHEMA,
      match: false,
      blocked: true,
      reason: 'source_changed',
      expected_sha256: transcript.source.sha256,
      actual_sha256: sha256(currentSource)
    };
  }

  const runOpts = {
    ...transcript.runOptions,
    filename: sourcePath,
    with_protocol: transcript.runOptions?.with_protocol ?? 'off',
    quiet: true,
    canonical_audit: options.write_audit !== false,
    NOEON_LLM_MODE: 'mock'
  };
  process.env.NOEON_LLM_MODE = 'mock';

  const pipeline = await runNoeonPipeline(sourcePath, runOpts);
  const exec = pipeline.result || pipeline;
  const actualTranscript = buildExecutionTranscript(
    pipeline.report,
    exec,
    pipeline.ast,
    { filename: sourcePath, source: currentSource, ...runOpts }
  );

  const comparison = compareTranscripts(transcript, actualTranscript);
  let saved = null;
  if (options.save_replay !== false) {
    saved = saveExecutionTranscript({
      ...actualTranscript,
      id: `${actualTranscript.id}-replay`,
      replay_of: transcript.id
    }, options);
  }

  return {
    schema: REPLAY_SCHEMA,
    replay_of: transcript.id,
    match: comparison.match,
    diffs: comparison.diffs,
    expected_fingerprint: comparison.expected_fingerprint,
    actual_fingerprint: comparison.actual_fingerprint,
    transcript: actualTranscript,
    saved,
    result: {
      success: exec.success,
      phases: exec.phases,
      report: pipeline.report
    }
  };
}

function sha256(text) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

async function replayLastForFile(filePath, options = {}) {
  const resolved = path.resolve(process.cwd(), filePath);
  const list = listExecutionTranscripts(options).filter(
    (t) => t.source && path.resolve(process.cwd(), t.source) === resolved
  );
  if (!list.length) {
    throw new Error(`No transcript found for ${resolved}`);
  }
  const transcript = loadExecutionTranscript(list[0].id, options);
  return replayFromTranscript(transcript, options);
}

async function replayById(id, options = {}) {
  const transcript = loadExecutionTranscript(id, options);
  if (!transcript) throw new Error(`Transcript not found: ${id}`);
  return replayFromTranscript(transcript, options);
}

function formatReplayReport(payload) {
  if (payload.blocked && payload.reason === 'source_changed') {
    return [
      'Replay blocked: source file changed since original run',
      `  expected sha256: ${payload.expected_sha256?.slice(0, 16)}…`,
      `  actual sha256:   ${payload.actual_sha256?.slice(0, 16)}…`
    ].join('\n');
  }
  const lines = [
    `Replay ${payload.match ? 'MATCH' : 'MISMATCH'} · transcript ${payload.replay_of}`,
    `  fingerprint: ${payload.actual_fingerprint?.slice(0, 16)}…`
  ];
  if (!payload.match && payload.diffs?.length) {
    lines.push(`  diffs: ${payload.diffs.join(', ')}`);
  }
  return lines.join('\n');
}

module.exports = {
  REPLAY_SCHEMA,
  replayFromTranscript,
  replayLastForFile,
  replayById,
  listExecutionTranscripts,
  formatReplayReport
};
