'use strict';

/**
 * Execute ACT plugins directly from Canonical IR execution.acts (snapshot-primary beta path).
 * Bypasses legacy AST → Cognitive IR → kernel COLLABORATE for tool-only general programs.
 */

const { buildActBinding } = require('../runtime/act-binding');
const { runActionStep } = require('../runtime/action-runner');

function resolveActStepName(act, index) {
  return act.step || act.action || act.name || `canonical_act_${index + 1}`;
}

function buildBindingsFromCanonicalActs(acts = []) {
  const actionBindings = {};
  const steps = [];

  for (let i = 0; i < acts.length; i++) {
    const act = acts[i];
    const stepName = resolveActStepName(act, i);
    const binding = buildActBinding(act);
    if (!binding?.plugin) continue;
    actionBindings[stepName] = binding;
    steps.push({ stepName, act, binding });
  }

  return { actionBindings, steps };
}

async function executeSnapshotCanonicalActs(canonical, ast, options = {}) {
  const acts = canonical?.execution?.acts || [];
  const { actionBindings, steps } = buildBindingsFromCanonicalActs(acts);

  if (steps.length === 0) {
    return {
      success: true,
      skipped: true,
      reason: 'no-plugin-acts',
      driver: 'canonical.execution.acts',
      actCount: 0,
      acts: [],
      cognitive: null
    };
  }

  const context = {
    network: ast?.network || 'noeon-local',
    task: ast?.task || canonical?.task || 'canonical-act',
    feedback: options.feedback || {},
    actionBindings
  };

  const executed = [];
  let success = true;

  for (const { stepName, act, binding } of steps) {
    const out = await runActionStep(stepName, context);
    executed.push({
      step: stepName,
      plugin: binding.plugin,
      status: out.status,
      reason: out.reason,
      content: out.receipt?.content || null,
      receipt: out.receipt,
      source: 'canonical.execution.acts',
      mocked: out.receipt?.pluginMeta?.mocked ?? null
    });
    if (out.status !== 'done') success = false;
  }

  const last = executed[executed.length - 1];
  const lastAct = acts.find((a, i) => resolveActStepName(a, i) === last?.step) || acts[acts.length - 1];
  const lastAction = last
    ? {
        mode: 'delegate',
        action: last.step,
        channel: lastAct?.channel || 'runtime',
        status: last.status,
        reason: last.reason,
        plugin: last.plugin,
        content: last.content,
        receipt: last.receipt,
        source: 'canonical.execution.acts'
      }
    : null;

  const workspace = {
    last_action: lastAction,
    last_fetch: last?.content || null
  };

  const trace = executed.map((item) => ({
    phase: 'collaborate',
    operation: 'delegate',
    result: {
      mode: 'delegate',
      action: item.step,
      status: item.status,
      reason: item.reason,
      plugin: item.plugin,
      content: item.content,
      receipt: item.receipt,
      source: 'canonical.execution.acts'
    }
  }));

  return {
    success,
    driver: 'canonical.execution.acts',
    actCount: executed.length,
    acts: executed,
    workspace,
    cognitive: {
      success,
      program: ast?.task || canonical?.task || 'snapshot-acts',
      workspace,
      trace,
      decisions: [],
      beliefs: {},
      stats: {
        cycles: 1,
        nodes_processed: executed.length,
        elapsed_ms: 0
      }
    }
  };
}

module.exports = {
  resolveActStepName,
  buildBindingsFromCanonicalActs,
  executeSnapshotCanonicalActs
};
