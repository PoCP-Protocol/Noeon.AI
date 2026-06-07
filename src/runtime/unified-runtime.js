'use strict';

/**
 * Noeon Unified Runtime — v0.9
 */

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../parser');
const { validateAel } = require('../validator');
const { compileAel } = require('../compiler');
const { explainAel } = require('../explainer');
const { AELtoIRCompiler } = require('../core/cognitive-ir');
const { CognitiveKernel } = require('../core/kernel');
const { ObservabilitySystem } = require('../core/observability');
const { runGovernancePreflight } = require('../core/governance');
const { loadProjectConfig, resolveRunOptions } = require('../core/config');
const { enrichWithProtocol, hasProtocolFeatures } = require('../core/protocol-bridge');
const { runSuperBrainCycle } = require('./simulator');
const { runTraining } = require('./trainer');
const { loadState, saveState, rollbackState } = require('./state-store');
const { generateReport } = require('./report');
const { appendAuditEntries } = require('./audit-logger');

const RUNTIME_VERSION = '0.9.0';

function readSource(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return { resolved, source: fs.readFileSync(resolved, 'utf8') };
}

function parseFromSource(source, filename = '<input>') {
  try {
    const ast = parseAel(source);
    return { ast, source, filename };
  } catch (e) {
    e.filename = filename;
    throw e;
  }
}

function readJsonFileIfExists(filePath) {
  if (!filePath) return {};
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Feedback file not found: ${resolved}`);
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function readFeedbackBatch(filePath) {
  const payload = readJsonFileIfExists(filePath);
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.rounds)) return payload.rounds;
  throw new Error("Feedback batch must be an array or an object with a 'rounds' array");
}

function parseProgram(filePath, options = {}) {
  const { resolved, source } = readSource(filePath);
  const { config } = loadProjectConfig({ cwd: path.dirname(resolved), ...options });
  const ast = parseAel(source);
  return { ast, resolved, source, config };
}

function validateProgram(ast) {
  return validateAel(ast);
}

function compileProgram(ast, format = 'ir') {
  if (format === 'ael' || format === 'artifact') {
    return { format: 'ael', artifact: compileAel(ast) };
  }
  if (format === 'both') {
    const compiler = new AELtoIRCompiler();
    const { program, warnings } = compiler.compile(ast);
    return {
      format: 'both',
      program,
      artifact: compileAel(ast),
      warnings
    };
  }
  const compiler = new AELtoIRCompiler();
  const { program, warnings } = compiler.compile(ast);
  return { format: 'ir', program, warnings };
}

function createKernel(options = {}) {
  const enableLlm = options.enable_llm !== false && process.env.NOEON_LLM_MODE !== 'off';
  const llmOpts = { ...(options.llm || {}) };
  if (options.llm?.model) llmOpts.model = options.llm.model;
  if (options.llm?.mode) llmOpts.mode = options.llm.mode;

  return new CognitiveKernel({
    enable_prediction: options.enable_prediction !== false,
    enable_evolution: options.enable_evolution !== false,
    enable_metacognition: options.enable_metacognition !== false,
    enable_llm: enableLlm,
    llm: llmOpts,
    ...options
  });
}

async function runProgram(ast, options = {}) {
  const { config, configPath } = loadProjectConfig(options);
  const runOpts = resolveRunOptions(options, config);

  if (runOpts.llm?.mode) process.env.NOEON_LLM_MODE = runOpts.llm.mode;

  const validation = validateAel(ast);
  const governance = runGovernancePreflight(ast, validation, options);

  if (options.require_valid !== false && !governance.valid) {
    return {
      success: false,
      blocked: true,
      validation: governance,
      error: 'Governance preflight failed'
    };
  }

  const obs = options.observability || new ObservabilitySystem({
    log_level: runOpts.verbose ? 'debug' : 'info',
    console: options.console !== false && !runOpts.quiet,
    compact: !runOpts.verbose
  });

  const kernel = createKernel(runOpts);
  if (runOpts.trace) {
    obs.traceExecution(options.program_name || ast.task?.name || 'program');
  }

  const result = await kernel.execute(ast, { verbose: runOpts.verbose });
  result.governance = governance;
  result.llm = kernel.llm ? kernel.llm.getStats() : null;
  result.config = { path: configPath, environment: config.environment };

  const feedback = options.feedback || {};
  const protocol = enrichWithProtocol(ast, result, feedback, {
    with_protocol: runOpts.with_protocol,
    pluginPolicy: options.pluginPolicy
  });

  if (protocol.enriched) {
    result.protocol = protocol;
    if (!protocol.protocolSuccess && options.strict_protocol) {
      result.success = false;
      result.error = 'Protocol enrichment failed (compute or META violations)';
    }
  }

  if (runOpts.trace) {
    result.observability = obs.endExecution(result.success ? 'success' : 'failure');
  }

  return result;
}

async function inspectProgram(ast, options = {}) {
  const obs = new ObservabilitySystem({ log_level: 'trace', console: false });
  const kernel = createKernel(options);
  obs.traceExecution(options.program_name || ast.task?.name || 'program');
  const result = await kernel.execute(ast);
  const trace = obs.endExecution(result.success ? 'success' : 'failure');
  const protocol = enrichWithProtocol(ast, result, options.feedback || {}, options);
  return {
    result: { ...result, protocol: protocol.enriched ? protocol : undefined },
    observability: obs,
    trace,
    kernelStatus: kernel.getStatus(),
    hasProtocolFeatures: hasProtocolFeatures(ast)
  };
}

function simulateContract(ast, feedback = {}, outputOptions = {}) {
  const validation = validateAel(ast);
  if (!validation.valid) {
    return { success: false, validation, error: 'Simulation blocked: contract is invalid.' };
  }

  const compiled = compileAel(ast);
  const cycle = runSuperBrainCycle(compiled, feedback);

  const statePath = outputOptions.statePath;
  if (statePath) {
    const state = loadState(statePath);
    state.rounds.push({
      cycleAt: cycle.cycleAt,
      task: cycle.contract.task,
      feedback,
      updates: cycle.adaptation.updates,
      diagnostics: cycle.adaptation.diagnostics
    });
    state.currentPolicy = cycle.adaptation.updates;
    saveState(statePath, state);
  }

  const state = statePath ? loadState(statePath) : null;
  const report = state ? generateReport(cycle, state) : generateReport(cycle, { rounds: [], currentPolicy: {} });

  if (outputOptions.reportPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputOptions.reportPath), JSON.stringify(report, null, 2), 'utf8');
  }
  if (outputOptions.auditPath) {
    appendAuditEntries(outputOptions.auditPath, cycle);
  }
  if (outputOptions.cyclePath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputOptions.cyclePath), JSON.stringify(cycle, null, 2), 'utf8');
  }

  return { success: true, cycle, report, validation };
}

function trainContract(ast, feedbackBatch, outputOptions = {}) {
  const validation = validateAel(ast);
  if (!validation.valid) {
    return { success: false, validation, error: 'Training blocked: contract is invalid.' };
  }

  const compiled = compileAel(ast);
  const training = runTraining(compiled, feedbackBatch);

  const statePath = outputOptions.statePath;
  if (statePath) {
    const state = loadState(statePath);
    for (const round of training.rounds) {
      state.rounds.push({
        cycleAt: new Date().toISOString(),
        task: compiled.contract.task,
        feedback: round.feedback,
        updates: round.policy,
        diagnostics: round.diagnostics,
        round: round.round
      });
    }
    state.currentPolicy = training.finalPolicy;
    saveState(statePath, state);
  }

  if (outputOptions.trainingPath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputOptions.trainingPath), JSON.stringify(training, null, 2), 'utf8');
  }
  if (outputOptions.convergencePath) {
    fs.writeFileSync(path.resolve(process.cwd(), outputOptions.convergencePath), JSON.stringify(training.convergence, null, 2), 'utf8');
  }
  if (outputOptions.auditPath) {
    for (const round of training.rounds) {
      appendAuditEntries(outputOptions.auditPath, {
        cycleAt: new Date().toISOString(),
        contract: {
          network: compiled.contract.network,
          task: compiled.contract.task,
          goal: compiled.contract.cognition.goal
        },
        cognition: {
          planTrace: {
            steps: [{
              name: `round_${round.round}`,
              status: round.plan.complete ? 'done' : 'failed',
              reason: round.plan.haltedReason || 'round-complete',
              failureCategory: round.plan.haltedReason ? 'training_halt' : null,
              receipt: { round: round.round, diagnostics: round.diagnostics, policy: round.policy }
            }]
          }
        }
      });
    }
  }

  return { success: true, training, validation };
}

function explainProgram(ast) {
  return explainAel(ast);
}

function getRuntimeStatus() {
  const kernel = createKernel({ enable_llm: false });
  const { configPath, config } = loadProjectConfig();
  return {
    version: RUNTIME_VERSION,
    kernel: kernel.getStatus(),
    config: { path: configPath, environment: config.environment },
    llm: {
      mode: process.env.NOEON_LLM_MODE || config.llm?.mode || 'auto',
      configured: Boolean(process.env.OPENAI_API_KEY || process.env.NOEON_API_KEY)
    }
  };
}

module.exports = {
  RUNTIME_VERSION,
  readSource,
  parseFromSource,
  readJsonFileIfExists,
  readFeedbackBatch,
  parseProgram,
  validateProgram,
  compileProgram,
  createKernel,
  runProgram,
  inspectProgram,
  simulateContract,
  trainContract,
  rollbackState,
  explainProgram,
  getRuntimeStatus,
  loadProjectConfig,
  hasProtocolFeatures,
  enrichWithProtocol
};
