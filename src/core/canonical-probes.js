'use strict';

const fs = require('fs');
const path = require('path');
const { loadProjectConfig } = require('./config');
const {
  resolveGeneralCanonical,
  resolveExecutionStrategy,
  isHybridCanonicalCandidate,
  isToolCanonicalCandidate
} = require('./general-canonical-mode');

const DEFAULT_CANONICAL_PROBE_PROGRAMS = [
  'examples/web_fetch.noeon',
  'examples/hybrid_tool_agent.noeon',
  'examples/agent_research.noeon',
  'examples/agent_risk_review.noeon',
  'examples/agent_customer_service.noeon'
];

const { buildExecutionSummary } = require('./action-trace');

async function runCanonicalProbes(options = {}) {
  const root = options.root || process.cwd();
  const files = options.files || DEFAULT_CANONICAL_PROBE_PROGRAMS;
  const { parseProgram } = require('../runtime/unified-runtime');
  const { executeProgram } = require('../vm/unified-executor');
  const { config } = loadProjectConfig({ root });
  const results = [];

  for (const rel of files) {
    const filePath = path.join(root, rel);
    const entry = { file: rel, ok: false, errors: [] };

    if (!fs.existsSync(filePath)) {
      entry.errors.push('file missing');
      results.push(entry);
      continue;
    }

    try {
      const { ast } = parseProgram(filePath);
      const generalCanonical = resolveGeneralCanonical(ast, {
        projectConfig: config,
        ...options,
        general_canonical: options.general_canonical
      });
      const strategy = resolveExecutionStrategy(ast, {
        projectConfig: config,
        general_canonical: generalCanonical
      });

      entry.canonicalIr = Boolean(ast?.general?.canonicalIr);
      entry.toolCandidate = isToolCanonicalCandidate(ast);
      entry.hybridCandidate = isHybridCanonicalCandidate(ast);
      entry.strategy = strategy;
      entry.generalCanonical = generalCanonical;

      if (options.probe_only) {
        entry.ok = entry.canonicalIr && Boolean(strategy);
        results.push(entry);
        continue;
      }

      const run = await executeProgram(ast, {
        quiet: true,
        console: false,
        with_protocol: 'off',
        filename: filePath,
        general_canonical: generalCanonical
      });

      entry.execution = buildExecutionSummary(run);
      entry.ok = run.success === true && Boolean(strategy);
      if (strategy === 'tool-snapshot-primary' && !run.snapshotActExecution) {
        entry.ok = false;
        entry.errors.push('expected snapshotActExecution');
      }
      if (strategy === 'hybrid-canonical-acts' && !run.hybridActExecution) {
        entry.ok = false;
        entry.errors.push('expected hybridActExecution');
      }
    } catch (error) {
      entry.errors.push(error.message);
    }

    if (entry.errors.length) entry.ok = false;
    results.push(entry);
  }

  return {
    schema: 'noeon.canonical.probes/v1',
    generatedAt: new Date().toISOString(),
    ok: results.every((r) => r.ok),
    programs: results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.ok).length,
      hybrid: results.filter((r) => r.execution?.hybrid || r.hybridCandidate).length,
      snapshot: results.filter((r) => r.execution?.snapshotAct || r.toolCandidate).length
    }
  };
}

module.exports = {
  DEFAULT_CANONICAL_PROBE_PROGRAMS,
  buildExecutionSummary,
  runCanonicalProbes
};
