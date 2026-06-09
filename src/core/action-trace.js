'use strict';

function extractActionTrace(executionResult = {}) {
  const cognitive = executionResult.cognitive || {};
  const workspace = cognitive.workspace || executionResult.workspace || {};
  const lastAction = workspace.last_action || null;
  const lastFetch = workspace.last_fetch || lastAction?.content || null;
  const trace = cognitive.trace || executionResult.trace || [];
  const actions = [];

  for (const entry of trace) {
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

module.exports = { extractActionTrace };
