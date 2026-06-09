'use strict';

function extractActionTrace(executionResult = {}) {
  const cognitive = executionResult.cognitive || {};
  const workspace = cognitive.workspace || executionResult.workspace || executionResult.canonicalActs?.workspace || {};
  const lastAction = workspace.last_action || null;
  const lastFetch = workspace.last_fetch || lastAction?.content || null;
  const trace = cognitive.trace || executionResult.trace || [];
  const actions = [];

  if (Array.isArray(executionResult.canonicalActs?.acts) && executionResult.canonicalActs.acts.length) {
    for (const item of executionResult.canonicalActs.acts) {
      actions.push({
        phase: 'canonical-act',
        action: item.step || 'act',
        status: item.status || 'done',
        plugin: item.plugin || null,
        reason: item.reason || null,
        content: item.content || null,
        simulated: false,
        mocked: item.mocked ?? item.receipt?.pluginMeta?.mocked ?? null,
        pluginMeta: item.receipt?.pluginMeta || null,
        source: item.source || 'canonical.execution.acts'
      });
    }
  } else for (const entry of trace) {
    if (entry.phase !== 'collaborate') continue;
    const result = entry.result || {};
    if (result.mode !== 'delegate' && !result.plugin && !result.receipt) continue;
    actions.push({
      phase: entry.phase,
      action: result.action || result.step || 'act',
      status: result.status || (result.simulated ? 'simulated' : 'done'),
      plugin: result.plugin || result.receipt?.plugin || null,
      reason: result.reason || null,
      content: result.content || result.receipt?.content || null,
      simulated: result.simulated === true,
      mocked: result.pluginMeta?.mocked ?? result.receipt?.pluginMeta?.mocked ?? null,
      pluginMeta: result.pluginMeta || result.receipt?.pluginMeta || null
    });
  }

  return {
    lastAction,
    lastFetch,
    actions,
    count: actions.length,
    succeeded: actions.filter((a) => a.status === 'done').length,
    failed: actions.filter((a) => a.status === 'failed').length
  };
}

function buildExecutionSummary(result = {}) {
  const strategy = result.executionStrategy || null;
  let pathLabel = 'cognitive';
  if (strategy === 'tool-snapshot-primary') pathLabel = 'snapshot-act';
  else if (strategy === 'hybrid-canonical-acts') pathLabel = 'hybrid';
  else if (strategy === 'snapshot-primary') pathLabel = 'canonical';

  return {
    schema: 'noeon.execution.summary/v1',
    strategy,
    path: pathLabel,
    driver: result.executionDriver || null,
    actDriver: result.actDriver || null,
    hybrid: result.hybridActExecution === true,
    snapshotAct: result.snapshotActExecution === true,
    canonicalPrimary: result.canonicalPrimary === true,
    phases: result.phases || []
  };
}

function formatExecutionSummaryCompact(summary) {
  if (!summary?.strategy) return null;
  return [
    summary.path || summary.strategy,
    summary.strategy !== summary.path ? summary.strategy : null,
    summary.hybrid ? 'hybrid' : null,
    summary.snapshotAct ? 'snapshot-act' : null,
    summary.actDriver ? `act: ${summary.actDriver}` : null,
    summary.phases?.length ? summary.phases.join('→') : null
  ].filter(Boolean).join(' · ');
}

function formatExecutionSummaryLines(result = {}) {
  const summary = result.schema ? result : buildExecutionSummary(result);
  const hasPath = Boolean(
    summary.strategy ||
    summary.driver ||
    summary.actDriver ||
    summary.hybrid ||
    summary.snapshotAct ||
    summary.phases?.length
  );
  if (!hasPath) return [];

  const lines = ['Path:'];
  if (summary.path) lines.push(`  path: ${summary.path}`);
  if (summary.strategy) lines.push(`  strategy: ${summary.strategy}`);
  if (summary.driver) lines.push(`  driver: ${summary.driver}`);
  if (summary.actDriver) lines.push(`  act: ${summary.actDriver}`);
  if (summary.hybrid) lines.push('  hybrid: canonical acts then cognitive kernel');
  if (summary.snapshotAct) lines.push('  snapshot-act: plugin acts via canonical snapshot');
  if (summary.phases?.length) lines.push(`  phases: ${summary.phases.join(' → ')}`);
  return lines;
}

function formatActionTraceLines(trace = {}) {
  const lines = [];
  if (trace.count) {
    lines.push(`${trace.count} action(s) · ${trace.succeeded} ok · ${trace.failed} fail`);
  }
  for (const item of trace.actions || []) {
    const mock = item.mocked ? ' mock' : '';
    const preview = item.content ? ` · ${String(item.content).slice(0, 80)}` : '';
    lines.push(`  ${item.action} [${item.plugin || 'sim'}] ${item.status}${mock}${preview}`);
  }
  if (trace.lastAction) {
    const last = trace.lastAction;
    lines.push(`  last: ${last.action || '?'} · ${last.status || '?'} · ${last.plugin || 'sim'}`);
  }
  if (trace.lastFetch) {
    lines.push(`  fetch: ${String(trace.lastFetch).slice(0, 160)}`);
  }
  return lines;
}

module.exports = {
  extractActionTrace,
  formatActionTraceLines,
  buildExecutionSummary,
  formatExecutionSummaryCompact,
  formatExecutionSummaryLines
};
