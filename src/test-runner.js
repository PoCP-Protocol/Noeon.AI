'use strict';

const fs = require('fs');
const path = require('path');
const { parseProgram, validateProgram, runProgram } = require('./runtime/unified-runtime');
const { detectProfile, PROFILES } = require('./core/profile');

const DEFAULT_SUITE = [
  'hello.noeon',
  'agent_research.noeon',
  'agent_risk_review.noeon',
  'agent_customer_service.noeon'
];

function resolveWithProtocol(ast, filePath) {
  const profile = detectProfile(ast, { filename: path.basename(filePath) });
  return profile === PROFILES.GENERAL ? 'off' : 'auto';
}

function summarize(results) {
  const passed = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok && !r.skipped).length;
  return {
    total: results.length,
    passed,
    failed,
    skipped,
    ok: failed === 0,
    results
  };
}

function listNoeonFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((f) => f.endsWith('.noeon'))
    .map((f) => path.join(dirPath, f))
    .sort();
}

async function testFile(filePath, options = {}) {
  const result = {
    file: filePath,
    ok: false,
    stage: null,
    error: null,
    validation: null,
    run: null
  };

  try {
    const { ast, resolved } = parseProgram(filePath);
    result.file = resolved;

    const validation = validateProgram(ast);
    result.validation = validation;
    if (!validation.valid) {
      result.stage = 'validate';
      result.error = (validation.errors || []).join('; ') || 'Validation failed';
      return result;
    }

    const prevLlmMode = process.env.NOEON_LLM_MODE;
    process.env.NOEON_LLM_MODE = 'mock';

    try {
      const run = await runProgram(ast, {
        quiet: true,
        console: false,
        trace: options.trace,
        with_protocol: resolveWithProtocol(ast, resolved),
        program_name: path.basename(resolved),
        filename: path.basename(resolved)
      });
      result.run = run;

      if (!run.success || run.blocked) {
        result.stage = 'run';
        if (run.blocked) {
          result.error = 'Blocked by governance preflight';
        } else {
          result.error = 'Run did not succeed';
        }
        return result;
      }

      result.ok = true;
      return result;
    } finally {
      if (prevLlmMode === undefined) delete process.env.NOEON_LLM_MODE;
      else process.env.NOEON_LLM_MODE = prevLlmMode;
    }
  } catch (e) {
    result.stage = result.stage || 'parse';
    result.error = e.message;
    return result;
  }
}

async function testDirectory(dirPath, options = {}) {
  const resolved = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Not a directory: ${resolved}`);
  }

  const files = listNoeonFiles(resolved);
  const results = [];
  for (const file of files) {
    results.push(await testFile(file, options));
  }
  return summarize(results);
}

async function runDefaultSuite(options = {}) {
  const examplesDir = path.join(__dirname, '..', 'examples');
  const results = [];

  for (const filename of DEFAULT_SUITE) {
    const filePath = path.join(examplesDir, filename);
    if (!fs.existsSync(filePath)) {
      results.push({
        file: filePath,
        ok: false,
        skipped: true,
        stage: null,
        error: 'File not found',
        validation: null,
        run: null
      });
      continue;
    }
    results.push(await testFile(filePath, options));
  }

  return summarize(results);
}

module.exports = {
  DEFAULT_SUITE,
  testFile,
  testDirectory,
  runDefaultSuite,
  summarize
};
