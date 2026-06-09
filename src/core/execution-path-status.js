'use strict';

const fs = require('fs');
const path = require('path');
const { loadProjectConfig } = require('./config');
const { resolveExecutionStrategy } = require('./general-canonical-mode');
const { buildExecutionSummary } = require('./action-trace');

const EXECUTION_PATH_STATUS_SCHEMA = 'noeon.execution.path.status/v1';

const DEFAULT_EXECUTION_PATH_PROBES = [
  { file: 'examples/agent_research.noeon', strategy: 'hybrid-canonical-acts', path: 'hybrid' },
  { file: 'examples/web_fetch.noeon', strategy: 'tool-snapshot-primary', path: 'snapshot-act' },
  { file: 'examples/http_demo.noeon', strategy: 'tool-snapshot-primary', path: 'snapshot-act' },
  { file: 'examples/hello.noeon', strategy: 'cognitive-primary', path: 'cognitive' }
];

function runExecutionPathProbes(options = {}) {
  const root = options.root || process.cwd();
  const { config } = loadProjectConfig({ cwd: root, ...options });
  const probes = options.probes || DEFAULT_EXECUTION_PATH_PROBES;
  const { parseProgram } = require('../runtime/unified-runtime');
  const results = [];

  for (const probe of probes) {
    const resolved = path.join(root, probe.file);
    const entry = {
      file: probe.file,
      strategy: null,
      path: null,
      ok: false
    };

    if (!fs.existsSync(resolved)) {
      results.push(entry);
      continue;
    }

    try {
      const { ast } = parseProgram(resolved);
      const strategy = resolveExecutionStrategy(ast, { projectConfig: config });
      const summary = buildExecutionSummary({
        executionStrategy: strategy,
        hybridActExecution: strategy === 'hybrid-canonical-acts',
        snapshotActExecution: strategy === 'tool-snapshot-primary'
      });
      entry.strategy = strategy;
      entry.path = summary.path;
      entry.ok =
        summary.schema === 'noeon.execution.summary/v1' &&
        strategy === probe.strategy &&
        summary.path === probe.path;
    } catch {
      entry.ok = false;
    }

    results.push(entry);
  }

  return results;
}

function buildExecutionPathStatusSummary(options = {}) {
  const probes = runExecutionPathProbes(options);
  return {
    schema: EXECUTION_PATH_STATUS_SCHEMA,
    tracked: probes.length,
    hybrid: probes.filter((p) => p.path === 'hybrid').length,
    snapshotAct: probes.filter((p) => p.path === 'snapshot-act').length,
    cognitive: probes.filter((p) => p.path === 'cognitive').length,
    strategies: [...new Set(probes.map((p) => p.strategy).filter(Boolean))],
    probes: probes.map(({ file, strategy, path: pathLabel, ok }) => ({
      file,
      strategy,
      path: pathLabel,
      ok
    }))
  };
}

function formatExecutionPathStatusLine(summary) {
  if (!summary?.tracked) return 'Execution path: —';
  return `Execution path: hybrid=${summary.hybrid} snapshot=${summary.snapshotAct} cognitive=${summary.cognitive} (${summary.tracked} tracked)`;
}

module.exports = {
  EXECUTION_PATH_STATUS_SCHEMA,
  DEFAULT_EXECUTION_PATH_PROBES,
  runExecutionPathProbes,
  buildExecutionPathStatusSummary,
  formatExecutionPathStatusLine
};
