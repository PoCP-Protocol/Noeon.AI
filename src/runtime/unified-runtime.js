'use strict';

/**
 * Noeon Unified Runtime — v0.9
 */

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../parser');
const { assertFrozenFilename } = require('../core/canonical-architecture');
const { validateAel } = require('../validator');
const { compileAel } = require('../compiler');
const { explainAel } = require('../explainer');
const { AELtoIRCompiler } = require('../core/cognitive-ir');
const { CognitiveKernel } = require('../core/kernel');
const { ObservabilitySystem } = require('../core/observability');
const { runGovernancePreflight } = require('../core/governance');
const { loadProjectConfig, resolveRunOptions } = require('../core/config');
const { prepareCanonicalExecution, finalizeCanonicalResult } = require('../core/canonical-runtime');
const { planExecutionPhases } = require('../core/canonical-plan');
const { loadConvergenceFromDir, buildConvergenceMatrix } = require('../core/canonical-convergence');
const { deriveExecutionRoute } = require('../core/canonical-route');
const { computeSemanticPulse } = require('../core/canonical-pulse');
const { readCanonicalAudit } = require('../core/canonical-audit-read');
const { validateCanonicalReport, REPORT_SCHEMA } = require('../core/canonical-contract');
const { lowerToCanonical } = require('../core/canonical-lower');
const { runProtocolCycle } = require('../vm/protocol-phase');
const { hasProtocolFeatures, enrichWithProtocol } = require('../core/protocol-bridge');
const { runTraining } = require('./trainer');
const { loadState, saveState, rollbackState } = require('./state-store');
const { generateReport } = require('./report');
const { appendAuditEntries } = require('./audit-logger');
const { VM_VERSION, executeProgram, executeCanonicalProgram } = require('../vm/unified-executor');

const RUNTIME_VERSION = VM_VERSION;

function readSource(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return { resolved, source: fs.readFileSync(resolved, 'utf8') };
}

function parseFromSource(source, filename = '<input>', options = {}) {
  assertFrozenFilename(filename, options);
  try {
    const ast = parseAel(source, { filename });
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
  const resolved = path.resolve(process.cwd(), filePath);
  assertFrozenFilename(resolved, options);
  const { config } = loadProjectConfig({ cwd: path.dirname(resolved), ...options });

  const humanSidecar = resolved.endsWith('.lim.human')
    ? resolved
    : `${resolved.endsWith('.lim') ? resolved : `${resolved}.lim`}.human`;
  const isLiminal =
    resolved.endsWith('.lim') ||
    resolved.endsWith('.lim.human') ||
    fs.existsSync(humanSidecar);

  if (isLiminal) {
    const { loadLiminalFromFile } = require('../grammar/liminal');
    const loadTarget = resolved.endsWith('.lim.human')
      ? resolved.replace(/\.human$/, '')
      : (resolved.endsWith('.lim') ? resolved : `${resolved}.lim`);
    if (!fs.existsSync(loadTarget) && !fs.existsSync(humanSidecar)) {
      throw new Error(`File not found: ${resolved}`);
    }
    const ast = loadLiminalFromFile(loadTarget, { filename: loadTarget, ...options });
    const sourcePath = fs.existsSync(humanSidecar) ? humanSidecar : loadTarget;
    const source = fs.readFileSync(sourcePath, 'utf8');
    return { ast, resolved: loadTarget, source, config };
  }

  if (resolved.endsWith('.next')) {
    const { readSourceWithEvolved } = require('./next/hot-reload');
    const loaded = readSourceWithEvolved(resolved, options);
    const ast = parseAel(loaded.source, { filename: loaded.path, ...options });
    return { ast, resolved, source: loaded.source, config, evolved: loaded.evolved };
  }

  const { source } = readSource(filePath);
  const ast = parseAel(source, { filename: resolved, ...options });
  return { ast, resolved, source, config };
}

function validateProgram(ast, options = {}) {
  return validateAel(ast, options);
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
  const { attachMcpTools, enrichMcpToolsFromDiscovery, setActiveMcpServers } = require('./mcp-bridge');
  setActiveMcpServers(config.mcp?.servers || []);
  attachMcpTools(ast, config);
  if (config.mcp?.servers?.some((s) => s.discover)) {
    await enrichMcpToolsFromDiscovery(ast, config, runOpts);
  }

  if (runOpts.llm?.mode) process.env.NOEON_LLM_MODE = runOpts.llm.mode;

  const obs = options.observability || new ObservabilitySystem({
    log_level: runOpts.verbose ? 'debug' : 'info',
    console: options.console !== false && !runOpts.quiet,
    compact: !runOpts.verbose
  });

  if (runOpts.trace) {
    obs.traceExecution(options.program_name || ast.task?.name || 'program');
  }

  const result = await executeProgram(ast, {
    ...runOpts,
    ...options,
    with_protocol: runOpts.with_protocol,
    feedback: options.feedback || {},
    verbose: runOpts.verbose
  });

  result.config = { path: configPath, environment: config.environment };

  if (runOpts.trace && !result.blocked) {
    result.observability = obs.endExecution(result.success ? 'success' : 'failure');
  }

  return result;
}

async function inspectProgram(ast, options = {}) {
  const obs = new ObservabilitySystem({ log_level: 'trace', console: false });
  obs.traceExecution(options.program_name || ast.task?.name || 'program');
  const result = await executeProgram(ast, { ...options, with_protocol: 'on' });
  const trace = obs.endExecution(result.success ? 'success' : 'failure');
  return {
    result,
    observability: obs,
    trace,
    kernelStatus: result.cognitive ? buildKernelStatus(result) : null,
    hasProtocolFeatures: hasProtocolFeatures(ast),
    vm: result.vm,
    profile: result.profile,
    phases: result.phases
  };
}

function buildKernelStatus(result) {
  return {
    state: 'idle',
    phases: result.phases,
    vm: result.vm,
    profile: result.profile
  };
}

function buildNextCycleFromExecution(ast, execution, feedback, cycleAt = new Date().toISOString(), options = {}) {
  const memorySource = options.memorySource || 'fresh';
  const steps = [];
  if (execution.next?.selectedStrategy) {
    steps.push({
      name: `strategy:${execution.next.selectedStrategy.name || execution.next.selectedStrategy.objective || 'selected'}`,
      status: execution.success ? 'done' : 'failed',
      reason: execution.blocked ? execution.next?.blockReason || 'blocked' : 'selected',
      failureCategory: execution.blocked ? 'next_block' : null,
      latencyMs: 0,
      receipt: {
        utility: execution.next.selectedStrategy.utility,
        memoryBias: execution.next.selectedStrategy.memoryBias || 0
      }
    });
  }
  for (const g of execution.next?.guarantees || []) {
    steps.push({
      name: `guarantee:${g.name}`,
      status: g.status === 'unknown' ? 'failed' : (g.passed ? 'done' : 'failed'),
      reason: g.status === 'unknown' ? 'unknown' : (g.passed ? 'pass' : 'fail'),
      failureCategory: g.status === 'unknown' ? 'missing_operand' : (g.passed ? null : 'guarantee_failed'),
      latencyMs: 0,
      receipt: g
    });
  }

  return {
    cycleAt,
    contract: {
      network: ast.network || 'next-native',
      task: ast.task || ast.next?.goal?.text || 'next-program',
      goal: ast.next?.goal?.text || ast.cognition?.goal || null
    },
    cognition: {
      planTrace: {
        totalNodes: steps.length,
        steps
      },
      metaPolicy: {
        enabled: false,
        totalRules: 0,
        hardened: false,
        violations: []
      }
    },
    adaptation: {
      updates: execution.next?.evolution?.applied?.changed
        ? {
            mutation: execution.next.evolution.applied.mutation,
            reason: execution.next.evolution.applied.reason
          }
        : {},
      diagnostics: execution.next?.reflection?.insights || []
    },
    next: {
      ...execution.next,
      memorySource
    },
    profile: 'next',
    protocolSuccess: execution.success,
    blocked: execution.blocked === true,
    feedback
  };
}

async function simulateContract(ast, feedback = {}, outputOptions = {}) {
  const validation = validateAel(ast);
  if (!validation.valid) {
    return { success: false, validation, error: 'Simulation blocked: contract is invalid.' };
  }

  const isNextProfile = ast.profile === 'next' || ast.languageProfile === 'next';
  const statePath = outputOptions.statePath;
  const state = statePath ? loadState(statePath) : null;
  let cycle;
  let nextMemoryOut = null;

  if (isNextProfile) {
    const inheritedNextMemory = outputOptions.nextMemoryIn || state?.currentNextMemory || null;
    const memorySource = outputOptions.nextMemoryIn
      ? 'explicit'
      : (state?.currentNextMemory ? 'state' : 'fresh');
    const execution = await executeProgram(ast, {
      with_protocol: outputOptions.withProtocol || 'off',
      strict_next: outputOptions.strictNext === true,
      auto_evolve: outputOptions.autoEvolve === true,
      next_memory: inheritedNextMemory,
      feedback
    });

    cycle = buildNextCycleFromExecution(ast, execution, feedback, new Date().toISOString(), {
      memorySource
    });

    nextMemoryOut = execution.next?.nextMemory || null;
  } else {
    const compiled = compileAel(ast);
    cycle = await runProtocolCycle(compiled, feedback, {});
  }

  if (statePath) {
    const round = {
      cycleAt: cycle.cycleAt,
      task: cycle.contract.task,
      feedback,
      updates: cycle.adaptation.updates,
      diagnostics: cycle.adaptation.diagnostics
    };
    if (isNextProfile) {
      round.next = {
        blocked: cycle.blocked === true,
        blockReason: cycle.next?.blockReason || null,
        selectedStrategy: cycle.next?.selectedStrategy
          ? (cycle.next.selectedStrategy.name || cycle.next.selectedStrategy.objective || 'strategy')
          : null,
        reflectionVerdict: cycle.next?.reflection?.verdict || null,
        memorySource: cycle.next?.memorySource || null,
        evolutionApplied: cycle.next?.evolution?.applied || null,
        memoryRunCount: nextMemoryOut?.runCount || 0
      };
      if (nextMemoryOut) {
        round.nextMemorySnapshot = nextMemoryOut;
      }
    }
    state.rounds.push(round);
    state.currentPolicy = cycle.adaptation.updates;
    if (isNextProfile && nextMemoryOut) {
      state.currentNextMemory = nextMemoryOut;
    }
    saveState(statePath, state);
  }

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

  if (isNextProfile && outputOptions.nextMemoryOutPath && nextMemoryOut) {
    fs.writeFileSync(path.resolve(process.cwd(), outputOptions.nextMemoryOutPath), JSON.stringify(nextMemoryOut, null, 2), 'utf8');
  }

  return {
    success: !cycle.blocked,
    cycle,
    report,
    validation,
    nextMemory: nextMemoryOut
  };
}

async function trainContract(ast, feedbackBatch, outputOptions = {}) {
  const validation = validateAel(ast);
  if (!validation.valid) {
    return { success: false, validation, error: 'Training blocked: contract is invalid.' };
  }

  const isNextProfile = ast.profile === 'next' || ast.languageProfile === 'next';
  const rounds = Array.isArray(feedbackBatch) ? feedbackBatch : [];

  if (isNextProfile) {
    const statePath = outputOptions.statePath;
    const state = statePath ? loadState(statePath) : null;
    let nextMemory = outputOptions.nextMemoryIn || state?.currentNextMemory || null;
    let memorySource = outputOptions.nextMemoryIn
      ? 'explicit'
      : (state?.currentNextMemory ? 'state' : 'fresh');
    const trainingRounds = [];
    let lastCycle = null;

    for (let i = 0; i < rounds.length; i += 1) {
      const feedback = rounds[i] || {};
      const execution = await executeProgram(ast, {
        with_protocol: outputOptions.withProtocol || 'off',
        strict_next: outputOptions.strictNext === true,
        auto_evolve: outputOptions.autoEvolve === true,
        next_memory: nextMemory,
        feedback
      });

      const cycle = buildNextCycleFromExecution(ast, execution, feedback, new Date().toISOString(), {
        memorySource
      });
      lastCycle = cycle;
      nextMemory = execution.next?.nextMemory || nextMemory;

      trainingRounds.push({
        round: i + 1,
        feedback,
        plan: {
          complete: execution.success,
          haltedReason: execution.blocked ? (execution.next?.blockReason || 'next_block') : null
        },
        policy: cycle.adaptation.updates,
        diagnostics: cycle.adaptation.diagnostics,
        next: {
          selectedStrategy: execution.next?.selectedStrategy
            ? (execution.next.selectedStrategy.name || execution.next.selectedStrategy.objective || 'strategy')
            : null,
          reflectionVerdict: execution.next?.reflection?.verdict || null,
          memorySource,
          evolutionApplied: execution.next?.evolution?.applied || null,
          memoryRunCount: nextMemory?.runCount || 0
        },
        nextMemorySnapshot: nextMemory
      });

      memorySource = 'round-carry';

      if (outputOptions.auditPath) {
        appendAuditEntries(outputOptions.auditPath, cycle);
      }
    }

    const blockedRounds = trainingRounds.filter((r) => r.plan.complete === false).length;
    const training = {
      profile: 'next',
      rounds: trainingRounds,
      convergence: {
        totalRounds: trainingRounds.length,
        blockedRounds,
        successRounds: trainingRounds.length - blockedRounds,
        stabilized: blockedRounds === 0
      },
      finalPolicy: lastCycle?.adaptation?.updates || {}
    };

    if (statePath) {
      for (const round of trainingRounds) {
        state.rounds.push({
          cycleAt: new Date().toISOString(),
          task: ast.task || ast.next?.goal?.text || 'next-program',
          feedback: round.feedback,
          updates: round.policy,
          diagnostics: round.diagnostics,
          round: round.round,
          next: round.next,
          nextMemorySnapshot: round.nextMemorySnapshot || null
        });
      }
      state.currentPolicy = training.finalPolicy;
      if (nextMemory) state.currentNextMemory = nextMemory;
      saveState(statePath, state);
    }

    if (outputOptions.trainingPath) {
      fs.writeFileSync(path.resolve(process.cwd(), outputOptions.trainingPath), JSON.stringify(training, null, 2), 'utf8');
    }
    if (outputOptions.convergencePath) {
      fs.writeFileSync(path.resolve(process.cwd(), outputOptions.convergencePath), JSON.stringify(training.convergence, null, 2), 'utf8');
    }
    if (outputOptions.nextMemoryOutPath && nextMemory) {
      fs.writeFileSync(path.resolve(process.cwd(), outputOptions.nextMemoryOutPath), JSON.stringify(nextMemory, null, 2), 'utf8');
    }

    return { success: true, training, validation, nextMemory };
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
    vm: VM_VERSION,
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
  enrichWithProtocol,
  executeProgram,
  executeCanonicalProgram,
  VM_VERSION,
  lowerToCanonical,
  prepareCanonicalExecution,
  finalizeCanonicalResult,
  planExecutionPhases,
  loadConvergenceFromDir,
  buildConvergenceMatrix,
  deriveExecutionRoute,
  computeSemanticPulse,
  readCanonicalAudit,
  validateCanonicalReport,
  REPORT_SCHEMA,
  get runParityConformance() { return require('../core/canonical-conform').runParityConformance; },
  get listMcpTools() { return require('./mcp-bridge').listMcpTools; },
  get getMcpStatus() { return require('./mcp-bridge').getMcpStatus; },
  get runNoeonPipeline() { return require('../core/pipeline').runNoeonPipeline; },
  get planNoeonProgram() { return require('../core/pipeline').planNoeonProgram; },
  get parseNoeonInput() { return require('../core/pipeline').parseNoeonInput; }
};
