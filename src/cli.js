#!/usr/bin/env node
'use strict';

/**
 * Noeon CLI v0.8 — Unified entry point
 *
 * Cognitive path:  run | compile | inspect | repl
 * Protocol path:   simulate | train | rollback | compile --format ael
 * Developer tools: playground | lsp | validate | parse | explain | init | status
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  parseProgram,
  validateProgram,
  compileProgram,
  runProgram,
  inspectProgram,
  simulateContract,
  trainContract,
  rollbackState,
  explainProgram,
  readFeedbackBatch,
  readJsonFileIfExists,
  getRuntimeStatus
} = require('./runtime/unified-runtime');
const { runDoctor, formatDoctorReport } = require('./doctor');

const VERSION = '1.0.0-alpha';

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const positional = args.slice(1).filter((a) => !a.startsWith('--'));
const flags = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    flags[key] = value;
    if (value !== true) i++;
  }
}

function showBanner() {
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════╗
║   ◈  N O E O N  ◈   v${VERSION}                          ║
║   Cognitive Programming Language                     ║
╚══════════════════════════════════════════════════════╝\x1b[0m`);
}

function resolveFile(filePath) {
  if (!filePath) return null;
  return path.resolve(process.cwd(), filePath);
}

async function cmdRun(filePath) {
  if (!filePath) { console.error('Usage: noeon run <file.ael> [--json] [--trace] [--verbose]'); process.exit(1); }
  const { ast } = parseProgram(filePath);
  const result = await runProgram(ast, {
    verbose: flags.verbose,
    trace: flags.trace,
    quiet: flags.quiet,
    program_name: path.basename(filePath),
    with_protocol: flags['with-protocol'] || flags.with_protocol || 'auto',
    strict_protocol: Boolean(flags['strict-protocol'] || flags.strict_protocol),
    feedback: flags.feedback ? readJsonFileIfExists(flags.feedback) : {}
  });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.blocked) {
    console.error('\x1b[31m✗ Blocked by governance preflight\x1b[0m');
    (result.validation?.errors || []).forEach((e) => console.error(`  • ${e}`));
  } else {
    console.log('\n\x1b[32m═══ Execution Result ═══\x1b[0m');
    console.log(`Program: ${result.program}`);
    console.log(`Status:  ${result.success ? '\x1b[32m✓ SUCCESS\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m'}`);
    console.log(`Cycles:  ${result.stats?.cycles ?? 0}`);
    console.log(`Nodes:   ${result.stats?.nodes_processed ?? 0}`);
    console.log(`Time:    ${result.stats?.elapsed_ms ?? 0}ms`);
    if (result.llm) console.log(`LLM:     ${result.llm.totalCalls} call(s), mode ${process.env.NOEON_LLM_MODE || 'auto'}`);
    if (result.protocol?.enriched) {
      console.log(`Protocol:  ${result.protocol.protocolSuccess ? '\x1b[32m✓ OK\x1b[0m' : '\x1b[33m⚠ issues\x1b[0m'} (compute + META)`);
    }
    if (flags.trace && result.trace) {
      result.trace.slice(0, 20).forEach((t, i) => {
        console.log(`  ${i + 1}. [${t.phase}] ${t.operation}`);
      });
    }
  }
  process.exit(result.success ? 0 : 1);
}

function cmdParse(filePath) {
  if (!filePath) { console.error('Usage: noeon parse <file.ael>'); process.exit(1); }
  const { ast } = parseProgram(filePath);
  console.log(flags.json ? JSON.stringify(ast, null, 2) : JSON.stringify(ast, null, 2));
}

function cmdCompile(filePath) {
  if (!filePath) { console.error('Usage: noeon compile <file.ael> [--format ir|ael|both] [--out file]'); process.exit(1); }
  const { ast } = parseProgram(filePath);
  const format = flags.format === 'ael' ? 'ael' : flags.format === 'both' ? 'both' : 'ir';
  const compiled = compileProgram(ast, format);

  let output;
  if (format === 'ir') output = compiled.program.toJSON();
  else if (format === 'both') output = { ir: compiled.program.toJSON(), artifact: compiled.artifact, warnings: compiled.warnings };
  else output = compiled.artifact;

  if (flags.out) {
    fs.writeFileSync(resolveFile(flags.out), JSON.stringify(output, null, 2), 'utf8');
    console.log(`Written: ${resolveFile(flags.out)}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

function cmdExplain(filePath) {
  if (!filePath) { console.error('Usage: noeon explain <file.ael>'); process.exit(1); }
  const { ast } = parseProgram(filePath);
  console.log(explainProgram(ast));
}

function cmdValidate(filePath) {
  if (!filePath) { console.error('Usage: noeon validate <file.ael>'); process.exit(1); }
  try {
    const { ast } = parseProgram(filePath);
    const result = validateProgram(ast);
    if (result.valid) {
      console.log('\x1b[32m✓ Valid\x1b[0m');
      process.exit(0);
    }
    console.log('\x1b[31m✗ Invalid\x1b[0m');
    (result.errors || []).forEach((e) => console.log(`  • ${e}`));
    process.exit(1);
  } catch (e) {
    console.error(`\x1b[31m✗ ${e.message}\x1b[0m`);
    process.exit(1);
  }
}

async function cmdInspect(filePath) {
  if (!filePath) { console.error('Usage: noeon inspect <file.ael>'); process.exit(1); }
  const { ast } = parseProgram(filePath);
  const { result, observability, trace, kernelStatus } = await inspectProgram(ast, {
    program_name: path.basename(filePath)
  });
  console.log('\x1b[32m═══ Inspection ═══\x1b[0m');
  console.log(`Status: ${result.success ? '✓' : '✗'} | ${result.stats?.elapsed_ms}ms`);
  if (trace) console.log(observability.tracer.explain(trace.id));
  console.log('Kernel:', JSON.stringify(kernelStatus, null, 2));
}

async function cmdSimulate() {
  const filePath = positional[0];
  const feedbackPath = positional[1];
  const cyclePath = positional[2];
  const statePath = positional[3];
  const reportPath = positional[4];
  const auditPath = positional[5];

  if (!filePath) {
    console.error('Usage: noeon simulate <contract.ael> [feedback.json] [cycle.json] [state.json] [report.json] [audit.jsonl]');
    process.exit(1);
  }

  const { ast } = parseProgram(filePath);
  const feedback = feedbackPath ? readJsonFileIfExists(feedbackPath) : {};
  const result = await simulateContract(ast, feedback, { cyclePath, statePath, reportPath, auditPath });

  if (!result.success) {
    console.error(result.error);
    console.error(JSON.stringify(result.validation, null, 2));
    process.exit(2);
  }

  if (flags.json || !cyclePath) {
    console.log(JSON.stringify(result.cycle, null, 2));
  } else {
    console.log('Simulation complete.');
    if (cyclePath) console.log(`  cycle:  ${resolveFile(cyclePath)}`);
    if (reportPath) console.log(`  report: ${resolveFile(reportPath)}`);
    if (auditPath) console.log(`  audit:  ${resolveFile(auditPath)}`);
  }
}

function cmdTrain() {
  const filePath = positional[0];
  const batchPath = positional[1];
  if (!filePath || !batchPath) {
    console.error('Usage: noeon train <contract.ael> <feedback_batch.json> [training.json] [state.json] [convergence.json] [audit.jsonl]');
    process.exit(1);
  }

  const { ast } = parseProgram(filePath);
  const batch = readFeedbackBatch(batchPath);
  const result = trainContract(ast, batch, {
    trainingPath: positional[2],
    statePath: positional[3],
    convergencePath: positional[4],
    auditPath: positional[5]
  });

  if (!result.success) {
    console.error(result.error);
    process.exit(2);
  }

  console.log(flags.json ? JSON.stringify(result.training, null, 2) : 'Training complete.');
}

function cmdRollback() {
  const statePath = positional[0];
  const steps = positional[1];
  if (!statePath) {
    console.error('Usage: noeon rollback <state.json> [steps]');
    process.exit(1);
  }
  const updated = rollbackState(statePath, steps);
  console.log(JSON.stringify(updated, null, 2));
}

async function cmdRepl() {
  const { startRepl } = require('./repl');
  startRepl(flags);
}

function cmdInit(name) {
  if (!name) { console.error('Usage: noeon init <project-name>'); process.exit(1); }
  const dir = path.join(process.cwd(), name);
  if (fs.existsSync(dir)) { console.error(`Directory exists: ${name}`); process.exit(1); }
  const profile = String(flags.profile || 'general').toLowerCase();
  if (!['general', 'ael'].includes(profile)) {
    console.error('Usage: noeon init <project-name> [--profile general|ael]');
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });
  const entry = profile === 'general' ? 'main.noeon' : 'main.ael';
  const source = profile === 'general'
    ? `PROFILE "general"\nVERSION "${VERSION}"\n\nAGENT "${name}"\n  GOAL "Solve the primary user goal"\n  POLICY audit=true\n  FLOW\n    PERCEIVE source=user_input modality=text\n    REASON strategy=deductive depth=2\n    DECIDE action=proceed threshold=0.7 fallback=escalate\n    ACT action=respond channel=runtime safety=standard\n    REFLECT "execution quality" depth=standard\n`
    : `VERSION "0.8"\nNETWORK "local"\nTASK "${name}"\n\nGOAL "Primary objective"\nBUDGET 1000 msat\n\nPERCEIVE input modality=text\nREASON strategy=deductive\nDECIDE action=proceed threshold=0.7\n`;
  fs.writeFileSync(path.join(dir, entry), source);
  fs.writeFileSync(path.join(dir, '.noeonrc.json'), JSON.stringify({
    environment: 'development',
    profile,
    entry,
    cognition: { enable_llm: true, with_protocol: profile === 'general' ? 'off' : 'auto' },
    observability: { log_level: 'debug' },
    llm: { mode: 'auto' }
  }, null, 2));
  console.log(`\x1b[32m✓ Created ${name}/ (${profile}, ${entry})\x1b[0m`);
}

function cmdStatus() {
  const status = getRuntimeStatus();
  console.log(JSON.stringify(status, null, 2));
}

function cmdDoctor() {
  const report = runDoctor({ file: flags.file });
  console.log(flags.json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
  process.exit(report.ok ? 0 : 1);
}

async function cmdTest() {
  const { testFile, testDirectory, runDefaultSuite } = require('./test-runner');
  const testTarget = positional[0];
  let summary;

  if (!testTarget) {
    summary = await runDefaultSuite({ trace: flags.trace });
  } else {
    const resolved = resolveFile(testTarget);
    if (!fs.existsSync(resolved)) {
      console.error(`\x1b[31m✗ Not found: ${resolved}\x1b[0m`);
      process.exit(1);
    }
    if (fs.statSync(resolved).isDirectory()) {
      summary = await testDirectory(resolved, { trace: flags.trace });
    } else {
      const result = await testFile(resolved, { trace: flags.trace });
      summary = {
        total: 1,
        passed: result.ok ? 1 : 0,
        failed: result.ok ? 0 : 1,
        skipped: 0,
        ok: result.ok,
        results: [result]
      };
    }
  }

  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('\n\x1b[32m═══ Test Results ═══\x1b[0m');
    for (const r of summary.results) {
      const name = path.basename(r.file);
      if (r.skipped) {
        console.log(`  \x1b[33m⊘ SKIP\x1b[0m ${name} (${r.error})`);
      } else if (r.ok) {
        const ms = r.run?.stats?.elapsed_ms ?? 0;
        console.log(`  \x1b[32m✓ PASS\x1b[0m ${name} (${ms}ms)`);
        if (flags.trace && r.run?.trace) {
          r.run.trace.slice(0, 10).forEach((t, i) => {
            console.log(`      ${i + 1}. [${t.phase}] ${t.operation}`);
          });
        }
      } else {
        console.log(`  \x1b[31m✗ FAIL\x1b[0m ${name} [${r.stage || 'error'}] ${r.error || ''}`);
      }
    }
    console.log(`\n${summary.passed} passed, ${summary.failed} failed${summary.skipped ? `, ${summary.skipped} skipped` : ''}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

async function cmdPlayground() {
  const port = flags.port || process.env.PORT || 5177;
  process.env.PORT = String(port);
  const { startServer } = require('./serve-site');
  await startServer(Number(port));
}

function cmdLsp() {
  const serverPath = path.join(__dirname, '..', 'language-server', 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error('Language server not found. Run: cd language-server && npm install');
    process.exit(1);
  }
  const child = spawn(process.execPath, [serverPath, '--stdio'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code || 0));
}

function cmdHelp() {
  showBanner();
  console.log(`
\x1b[1mCognitive:\x1b[0m   run | compile | inspect | repl | explain
\x1b[1mProtocol:\x1b[0m  simulate | train | rollback | compile --format ael
\x1b[1mTools:\x1b[0m      validate | parse | test | init | status | doctor | playground | lsp

\x1b[1mFlags:\x1b[0m --json --verbose --trace --format ir|ael|both --out file
       --with-protocol auto|on|off --strict-protocol --port 5177 --file program.ael
       --profile general|ael

\x1b[1mLLM:\x1b[0m Set OPENAI_API_KEY or NOEON_API_KEY (NOEON_LLM_MODE=auto|live|mock|off)

\x1b[1mExamples:\x1b[0m
  noeon init my-agent --profile general
  noeon run main.noeon --trace
  noeon compile examples/cognitive_minimal.ael --format both --out out.json
  noeon doctor --file examples/cognitive_minimal.ael
  noeon test examples/agent_research.noeon
  noeon test
  noeon playground
  noeon lsp
`);
}

async function main() {
  switch (command) {
    case 'run': await cmdRun(target); break;
    case 'parse': cmdParse(target); break;
    case 'compile': cmdCompile(target); break;
    case 'explain': cmdExplain(target); break;
    case 'validate': cmdValidate(target); break;
    case 'inspect': await cmdInspect(target); break;
    case 'repl': await cmdRepl(); break;
    case 'init': cmdInit(target); break;
    case 'status': cmdStatus(); break;
    case 'doctor': cmdDoctor(); break;
    case 'test': await cmdTest(); break;
    case 'simulate': await cmdSimulate(); break;
    case 'train': cmdTrain(); break;
    case 'rollback': cmdRollback(); break;
    case 'playground': await cmdPlayground(); break;
    case 'lsp': cmdLsp(); break;
    case 'help': case '--help': case '-h': cmdHelp(); break;
    case 'version': case '--version': case '-v': console.log(`noeon v${VERSION}`); break;
    default:
      if (!command) cmdHelp();
      else { console.error(`Unknown command: ${command}`); cmdHelp(); process.exit(1); }
  }
}

main().catch((e) => {
  console.error(`Fatal: ${e.message}`);
  if (flags.verbose) console.error(e.stack);
  process.exit(1);
});
