'use strict';

const { isGeneralCanonicalEnabled } = require('./general-canonical-mode');

function cloneCanonical(value) {
  if (!value) return null;
  return JSON.parse(JSON.stringify(value));
}

function resolveCanonicalForExecution(ast, options = {}) {
  const snapshot = ast?.general?.canonicalIr || null;
  const enabled = isGeneralCanonicalEnabled(options) && Boolean(snapshot);

  if (enabled) {
    return {
      canonical: cloneCanonical(snapshot),
      source: 'general.lower.snapshot',
      primary: true
    };
  }

  return {
    canonical: null,
    source: 'runtime.lower',
    primary: false
  };
}

function markCanonicalPrimaryContext(ast, meta = {}) {
  if (!ast || !meta.primary) return;
  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};
  ast.cognition.context._canonicalPrimary = true;
  ast.cognition.context._canonicalSource = meta.source || 'general.lower.snapshot';
}

function resolveExecutionDriver(ast, options = {}) {
  const meta = resolveCanonicalForExecution(ast, options);
  return meta.primary ? 'snapshot-primary' : 'runtime-lower';
}

function attachExecutionPresentation(result, ast, options = {}) {
  if (!result) return result;
  const primary = Boolean(ast?.cognition?.context?._canonicalPrimary);
  const enabled = isGeneralCanonicalEnabled(options);

  result.canonicalPrimary = primary;
  result.canonicalSource = primary
    ? (ast?.cognition?.context?._canonicalSource || 'general.lower.snapshot')
    : 'runtime.lower';
  result.executionDriver = primary && enabled ? 'snapshot-primary' : 'runtime-lower';
  result.actDriver = result.snapshotActExecution
    ? (result.actDriver || 'canonical.execution.acts')
    : (result.hybridActExecution ? 'canonical.execution.acts+kernel' : (primary && enabled ? null : result.actDriver || null));
  result.executionStrategy = result.executionStrategy || null;
  if (result.executionStrategy) {
    result.compileMode = primary && enabled ? 'canonical-primary' : result.compileMode;
  }
  result.compileMode = primary && enabled ? 'canonical-primary' : 'cognitive-primary';
  result.primaryIr = primary && enabled ? 'canonical' : 'cognitive';
  if (primary && result.snapshotActCount == null) {
    const acts = ast?.general?.canonicalIr?.execution?.acts;
    result.snapshotActCount = Array.isArray(acts) ? acts.length : 0;
  }
  return result;
}

module.exports = {
  resolveCanonicalForExecution,
  resolveExecutionDriver,
  markCanonicalPrimaryContext,
  attachExecutionPresentation
};
