'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../parser');
const { validateCanonicalReport, REPORT_SCHEMA } = require('./canonical-contract');
const { executeProgram } = require('../vm/unified-executor');

const PARITY_GOAL = 'Assess market risk with evidence';
const DEFAULT_PARITY_FILES = [
  'risk_assess.noeon',
  'risk_assess.next',
  'risk_assess.ael',
  'risk_assess.lim'
];

async function runParityConformance(options = {}) {
  const parityDir = options.parityDir ||
    path.join(__dirname, '../../examples/parity');
  const files = options.files || DEFAULT_PARITY_FILES;
  const results = [];

  for (const file of files) {
    const filePath = path.join(parityDir, file);
    if (!fs.existsSync(filePath)) {
      results.push({ file, valid: false, error: 'file not found', missing: ['file'] });
      continue;
    }
    const ast = parseAel(fs.readFileSync(filePath, 'utf8'), { filename: filePath });
    const run = await executeProgram(ast, {
      quiet: true,
      with_protocol: 'off',
      filename: filePath,
      triad: false,
      ...options.runOptions
    });
    const contract = validateCanonicalReport(run.report);
    results.push({
      file,
      valid: contract.valid && run.irFirst === true && run.executor === 'canonical',
      schema: run.report?.schema || null,
      goal: run.report?.intent?.goal || null,
      missing: contract.missing,
      executor: run.executor,
      irFirst: run.irFirst,
      phases: run.phases || [],
      governance_tier: run.report?.governance?.arbitration?.winner_tier || null
    });
  }

  return {
    schema: REPORT_SCHEMA,
    goal: PARITY_GOAL,
    allValid: results.every((r) => r.valid),
    surfaceCount: results.length,
    results
  };
}

module.exports = {
  PARITY_GOAL,
  DEFAULT_PARITY_FILES,
  runParityConformance
};
