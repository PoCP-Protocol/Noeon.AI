'use strict';

const fs = require('fs');
const path = require('path');
const { runNoeonPipeline } = require('./pipeline');
const { buildDualView } = require('./dual-view');
const { buildAgentSurfaceReport } = require('./agent-surface');
const {
  loadExecutionCheckpoint,
  listExecutionCheckpoints
} = require('./execution-checkpoint');

const RESUME_SCHEMA = 'noeon.canonical.resume/v1';

async function resumeFromCheckpoint(checkpointId, options = {}) {
  const checkpoint = loadExecutionCheckpoint(checkpointId, options);
  if (!checkpoint) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }
  if (checkpoint.resumable !== true) {
    throw new Error(`Checkpoint ${checkpointId} is not resumable`);
  }

  const filePath = checkpoint.source?.path;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Checkpoint source file missing: ${filePath || 'unknown'}`);
  }

  const runOpts = {
    ...options,
    filename: filePath,
    quiet: options.quiet !== false,
    with_protocol: options.with_protocol ?? checkpoint.runOptions?.with_protocol ?? 'off',
    general_canonical: options.general_canonical ?? checkpoint.runOptions?.general_canonical,
    trace: options.trace !== false,
    canonical_audit: options.canonical_audit !== false,
    checkpoint_resume: checkpoint,
    persistMemory: options.persistMemory ?? true,
    agent_id: options.agent_id || checkpoint.intent?.agent || checkpoint.intent?.task
  };

  if (checkpoint.state?.awaiting_human && options.approval_token) {
    runOpts.approval_token = options.approval_token;
  }

  const out = await runNoeonPipeline(filePath, runOpts);
  const dualView = buildDualView(out.ast, out.result || {}, out.report);
  const agentSurface = buildAgentSurfaceReport(out.ast, out.result || {}, out.report, dualView);

  const resumedFrom = checkpoint.state?.phases_completed || [];
  const newPhases = out.report?.execution?.phases || [];
  const continued = newPhases.length > resumedFrom.length
    || out.result?.success === true;

  return {
    schema: RESUME_SCHEMA,
    checkpoint_id: checkpointId,
    resumed: continued,
    prior_phases: resumedFrom,
    new_phases: newPhases,
    success: out.report?.success === true,
    blocked: out.report?.blocked === true,
    awaiting_human: out.result?.awaitingHuman === true,
    worldModel: out.report?.worldModel || null,
    agentSurface,
    dualView,
    report: out.report,
    result: out.result
  };
}

async function resumeLastForFile(filePath, options = {}) {
  const resolved = path.resolve(process.cwd(), filePath);
  const list = listExecutionCheckpoints(options)
    .filter((cp) => cp.source === resolved && !cp.parse_error);
  if (!list.length) {
    throw new Error(`No checkpoint found for ${resolved}`);
  }
  return resumeFromCheckpoint(list[0].id, options);
}

function formatResumeReport(payload) {
  const lines = [
    `Resume ${payload.checkpoint_id}: ${payload.success ? 'success' : payload.blocked ? 'blocked' : 'incomplete'}`,
    `Phases: ${(payload.prior_phases || []).join(' → ')} → ${(payload.new_phases || []).slice(-3).join(' → ')}`
  ];
  if (payload.agentSurface?.primary) {
    lines.push(`Agent: ${payload.agentSurface.primary} · flow ${payload.agentSurface.summary?.flow_executed}/${payload.agentSurface.summary?.flow_steps}`);
  }
  if (payload.worldModel?.stats?.belief_count != null) {
    lines.push(`World model: ${payload.worldModel.stats.belief_count} beliefs`);
  }
  return lines.join('\n');
}

module.exports = {
  RESUME_SCHEMA,
  resumeFromCheckpoint,
  resumeLastForFile,
  listExecutionCheckpoints,
  formatResumeReport
};
