#!/usr/bin/env node
'use strict';

/**
 * Noeon CLI — Unified Command-Line Interface
 * 
 * The single entry point for all Noeon operations:
 *   noeon run <file>       — Parse, compile to IR, execute through Kernel
 *   noeon parse <file>     — Parse and show AST
 *   noeon compile <file>   — Compile to Cognitive IR
 *   noeon explain <file>   — Natural language explanation
 *   noeon repl             — Interactive cognitive session
 *   noeon inspect <file>   — Show execution trace and metrics
 *   noeon validate <file>  — Validate contract
 *   noeon status           — Show kernel status
 *   noeon init <name>      — Create new .ael project
 */

const fs = require('fs');
const path = require('path');
const { parseAel } = require('./parser');
const { AELtoIRCompiler } = require('./core/cognitive-ir');
const { CognitiveKernel } = require('./core/kernel');
const { ObservabilitySystem } = require('./core/observability');

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const flags = {};

// Parse flags
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    flags[key] = value;
    if (value !== true) i++;
  }
}

// ============================================================
// BANNER
// ============================================================

function showBanner() {
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════╗
║                                                      ║
║   ◈  N O E O N  ◈                                   ║
║                                                      ║
║   Cognitive Programming Language v0.7.0              ║
║   "A language that thinks like a brain"              ║
║                                                      ║
║   Created by Humans & AI together                    ║
║                                                      ║
╚══════════════════════════════════════════════════════╝\x1b[0m
`);
}

// ============================================================
// COMMANDS
// ============================================================

async function cmdRun(filePath, flags) {
  if (!filePath) { console.error('Usage: noeon run <file.ael> [--verbose] [--trace]'); process.exit(1); }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = parseAel(source);

  // Create observability
  const obs = new ObservabilitySystem({
    log_level: flags.verbose ? 'debug' : 'info',
    console: !flags.quiet,
    compact: !flags.verbose
  });

  // Create kernel
  const kernel = new CognitiveKernel({
    enable_prediction: !flags['no-predict'],
    enable_evolution: !flags['no-evolve'],
    enable_metacognition: !flags['no-meta']
  });

  // Execute
  obs.logger.info('kernel.start', { file: filePath, program: ast.task?.name || 'unnamed' });
  const traceId = obs.traceExecution(path.basename(filePath));

  const result = await kernel.execute(ast);

  obs.endExecution(result.success ? 'success' : 'failure');

  // Output
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n\x1b[32m═══ Execution Result ═══\x1b[0m');
    console.log(`Program: ${result.program}`);
    console.log(`Status:  ${result.success ? '\x1b[32m✓ SUCCESS\x1b[0m' : '\x1b[31m✗ FAILED\x1b[0m'}`);
    console.log(`Cycles:  ${result.stats.cycles}`);
    console.log(`Nodes:   ${result.stats.nodes_processed}`);
    console.log(`Time:    ${result.stats.elapsed_ms}ms`);
    
    if (result.decisions.length > 0) {
      console.log(`\n\x1b[33mDecisions:\x1b[0m`);
      result.decisions.forEach((d, i) => console.log(`  ${i + 1}. [${d.type}] ${d.chosen || d.current || JSON.stringify(d)}`));
    }

    if (result.beliefs && Object.keys(result.beliefs).length > 0) {
      console.log(`\n\x1b[36mBeliefs formed:\x1b[0m`);
      Object.entries(result.beliefs).slice(0, 5).forEach(([k, v]) => {
        console.log(`  • ${k}: ${v.value} (confidence: ${(v.confidence * 100).toFixed(0)}%)`);
      });
    }

    if (flags.trace && result.trace) {
      console.log(`\n\x1b[35mExecution Trace:\x1b[0m`);
      result.trace.forEach((t, i) => {
        console.log(`  ${i + 1}. [${t.phase}] ${t.operation} → ${JSON.stringify(t.result).slice(0, 80)}`);
      });
    }
  }

  process.exit(result.success ? 0 : 1);
}

function cmdParse(filePath, flags) {
  if (!filePath) { console.error('Usage: noeon parse <file.ael>'); process.exit(1); }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = parseAel(source);

  if (flags.json) {
    console.log(JSON.stringify(ast, null, 2));
  } else {
    console.log('\x1b[32m═══ AST Structure ═══\x1b[0m');
    console.log(`Contract: ${ast.task?.name || ast.contractName || 'unnamed'}`);
    console.log(`\nSections:`);
    const sections = Object.entries(ast).filter(([k, v]) => v && (Array.isArray(v) ? v.length > 0 : typeof v === 'object'));
    sections.forEach(([key, value]) => {
      const count = Array.isArray(value) ? value.length : Object.keys(value).length;
      console.log(`  • ${key}: ${count} items`);
    });
    
    if (flags.verbose) {
      console.log('\n\x1b[36mFull AST:\x1b[0m');
      console.log(JSON.stringify(ast, null, 2));
    }
  }
}

function cmdCompile(filePath, flags) {
  if (!filePath) { console.error('Usage: noeon compile <file.ael>'); process.exit(1); }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = parseAel(source);
  
  const compiler = new AELtoIRCompiler();
  const { program, warnings } = compiler.compile(ast);

  if (flags.json) {
    console.log(JSON.stringify(program.toJSON(), null, 2));
  } else {
    console.log('\x1b[32m═══ Cognitive IR ═══\x1b[0m');
    console.log(`Program: ${program.name}`);
    console.log(`\nIR Statistics:`);
    const stats = program.getStats();
    Object.entries(stats).filter(([k, v]) => v > 0 && k !== 'name').forEach(([key, value]) => {
      console.log(`  • ${key}: ${value}`);
    });

    if (warnings.length > 0) {
      console.log(`\n\x1b[33mWarnings:\x1b[0m`);
      warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }

    if (flags.verbose) {
      console.log('\n\x1b[36mExecution Order:\x1b[0m');
      const nodes = program.getAllNodes();
      program.execution_order.forEach((id, i) => {
        const node = nodes.find(n => n.id === id);
        if (node) console.log(`  ${i + 1}. [${node.type}] ${node.params.name || node.params.mode || node.params.type || ''} (source: ${node.source})`);
      });
    }
  }
}

function cmdExplain(filePath, flags) {
  if (!filePath) { console.error('Usage: noeon explain <file.ael>'); process.exit(1); }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = parseAel(source);
  
  // Use the existing explainer
  try {
    const { explainAel } = require('./explainer');
    const explanation = explainAel(ast);
    console.log('\x1b[32m═══ Natural Language Explanation ═══\x1b[0m\n');
    console.log(explanation);
  } catch (e) {
    // Fallback: explain via IR
    const compiler = new AELtoIRCompiler();
    const { program } = compiler.compile(ast);
    
    console.log('\x1b[32m═══ Cognitive Explanation ═══\x1b[0m\n');
    console.log(`This program "${program.name}" thinks as follows:\n`);
    
    if (program.intents.length > 0) {
      console.log(`GOALS: It wants to ${program.intents.map(i => i.params.description || i.params.name).join(', ')}`);
    }
    if (program.constraints.length > 0) {
      console.log(`LIMITS: It is constrained by ${program.constraints.map(c => `${c.params.type} (max: ${c.params.max_amount})`).join(', ')}`);
    }
    if (program.processes.length > 0) {
      console.log(`THINKING: It uses ${program.processes.map(p => p.params.mode).join(', ')} reasoning`);
    }
    if (program.validators.length > 0) {
      console.log(`CHECKING: It validates itself with ${program.validators.length} checks`);
    }
    if (program.collaborators.length > 0) {
      console.log(`COLLABORATING: It works with others via ${program.collaborators.map(c => c.params.mode).join(', ')}`);
    }
  }
}

function cmdValidate(filePath, flags) {
  if (!filePath) { console.error('Usage: noeon validate <file.ael>'); process.exit(1); }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  
  try {
    const ast = parseAel(source);
    const { validateAel } = require('./validator');
    const result = validateAel(ast);
    
    if (result.valid || result.exitCode === 0) {
      console.log('\x1b[32m✓ Valid Noeon contract\x1b[0m');
      process.exit(0);
    } else {
      console.log('\x1b[31m✗ Validation failed:\x1b[0m');
      (result.errors || []).forEach(e => console.log(`  • ${e}`));
      process.exit(1);
    }
  } catch (e) {
    console.error(`\x1b[31m✗ Parse error: ${e.message}\x1b[0m`);
    process.exit(1);
  }
}

async function cmdRepl(flags) {
  try {
    const { startRepl } = require('./repl');
    startRepl(flags);
  } catch (e) {
    console.error('REPL module not available:', e.message);
    process.exit(1);
  }
}

async function cmdInspect(filePath, flags) {
  if (!filePath) { console.error('Usage: noeon inspect <file.ael> [--verbose]'); process.exit(1); }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  const ast = parseAel(source);

  const obs = new ObservabilitySystem({ log_level: 'trace', console: false });
  const kernel = new CognitiveKernel();

  obs.traceExecution(path.basename(filePath));
  const result = await kernel.execute(ast);
  const trace = obs.endExecution(result.success ? 'success' : 'failure');

  console.log('\x1b[32m═══ Execution Inspection ═══\x1b[0m');
  console.log(`\nProgram: ${result.program}`);
  console.log(`Status: ${result.success ? '✓' : '✗'} | Time: ${result.stats.elapsed_ms}ms | Nodes: ${result.stats.nodes_processed}`);
  
  console.log('\n\x1b[36m── Cognitive Trace ──\x1b[0m');
  if (trace) {
    console.log(obs.tracer.explain(trace.id));
  }

  console.log('\n\x1b[33m── Metrics ──\x1b[0m');
  const metrics = obs.metrics.getAll();
  Object.entries(metrics).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.value || v.avg || JSON.stringify(v)}`);
  });

  console.log('\n\x1b[35m── Kernel Status ──\x1b[0m');
  const status = kernel.getStatus();
  console.log(`  State: ${status.state}`);
  console.log(`  Handlers: ${status.handlers}`);
  console.log(`  Programs executed: ${status.stats.programs_executed}`);
}

function cmdInit(name, flags) {
  if (!name) { console.error('Usage: noeon init <project-name>'); process.exit(1); }
  
  const dir = path.join(process.cwd(), name);
  if (fs.existsSync(dir)) { console.error(`Directory '${name}' already exists`); process.exit(1); }

  fs.mkdirSync(dir, { recursive: true });
  
  // Create main.ael
  const template = `# ${name} — Noeon Cognitive Contract
# Created: ${new Date().toISOString().slice(0, 10)}

TASK "${name}"
  DESCRIPTION "A cognitive program built with Noeon"

BUDGET
  MAX 1000 tokens

DRIVE goal
  GOAL "Achieve the primary objective"
  IMPORTANCE 0.9

PERCEIVE input
  MODALITY text
  SOURCE "user_input"

REASON analysis
  STRATEGY deductive
  DEPTH 5

DECIDE action
  OPTIONS ["proceed", "wait", "ask"]
  STRATEGY satisfice
  THRESHOLD 0.7

REFLECT check
  TARGET self
  CRITERIA coherence

VERIFY quality
  METHOD assertion
  THRESHOLD 0.8

REWARD success
  AMOUNT 1.0
  CONDITION task_success
`;

  fs.writeFileSync(path.join(dir, 'main.ael'), template);
  fs.writeFileSync(path.join(dir, '.noeonrc.json'), JSON.stringify({
    environment: 'development',
    cognition: { exploration_factor: 0.5 },
    observability: { log_level: 'debug' }
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}\n\nA cognitive program built with Noeon.\n\n## Run\n\n\`\`\`bash\nnoeon run main.ael\n\`\`\`\n`);

  console.log(`\x1b[32m✓ Created Noeon project: ${name}/\x1b[0m`);
  console.log(`  • main.ael       — Main cognitive contract`);
  console.log(`  • .noeonrc.json  — Configuration`);
  console.log(`  • README.md      — Documentation`);
  console.log(`\nGet started:`);
  console.log(`  cd ${name}`);
  console.log(`  noeon run main.ael`);
}

function cmdStatus(flags) {
  const kernel = new CognitiveKernel();
  const status = kernel.getStatus();
  
  console.log('\x1b[32m═══ Noeon Kernel Status ═══\x1b[0m');
  console.log(`Version:    0.7.0`);
  console.log(`State:      ${status.state}`);
  console.log(`Handlers:   ${status.handlers} registered`);
  console.log(`\nSubsystems:`);
  Object.entries(status.subsystems).forEach(([k, v]) => {
    const icon = v === 'connected' ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m';
    console.log(`  ${icon} ${k}: ${v}`);
  });
}

function cmdHelp() {
  showBanner();
  console.log(`\x1b[1mUsage:\x1b[0m noeon <command> [arguments] [flags]

\x1b[1mCommands:\x1b[0m
  run <file>       Execute a .ael file through the Cognitive Kernel
  parse <file>     Parse and display AST structure
  compile <file>   Compile to Cognitive IR (unified representation)
  explain <file>   Generate natural language explanation
  validate <file>  Validate contract syntax and semantics
  inspect <file>   Execute with full tracing and metrics
  repl             Start interactive cognitive session
  init <name>      Create a new Noeon project
  status           Show kernel status

\x1b[1mFlags:\x1b[0m
  --verbose        Show detailed output
  --json           Output in JSON format
  --trace          Show execution trace
  --quiet          Suppress log output
  --no-predict     Disable predictive processing
  --no-evolve      Disable evolution engine
  --no-meta        Disable metacognition

\x1b[1mExamples:\x1b[0m
  noeon run examples/cognitive_superbrain.ael --trace
  noeon compile examples/cognitive_minimal.ael --verbose
  noeon inspect examples/cognitive_advanced.ael
  noeon init my-brain
  noeon repl
`);
}

// ============================================================
// MAIN DISPATCH
// ============================================================

async function main() {
  switch (command) {
    case 'run':
      await cmdRun(target, flags);
      break;
    case 'parse':
      cmdParse(target, flags);
      break;
    case 'compile':
      cmdCompile(target, flags);
      break;
    case 'explain':
      cmdExplain(target, flags);
      break;
    case 'validate':
      cmdValidate(target, flags);
      break;
    case 'inspect':
      await cmdInspect(target, flags);
      break;
    case 'repl':
      await cmdRepl(flags);
      break;
    case 'init':
      cmdInit(target, flags);
      break;
    case 'status':
      cmdStatus(flags);
      break;
    case 'help':
    case '--help':
    case '-h':
      cmdHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log('noeon v0.7.0');
      break;
    default:
      if (!command) {
        cmdHelp();
      } else {
        console.error(`Unknown command: ${command}`);
        console.error('Run "noeon help" for usage information.');
        process.exit(1);
      }
  }
}

main().catch(e => {
  console.error(`\x1b[31mFatal error: ${e.message}\x1b[0m`);
  if (flags.verbose) console.error(e.stack);
  process.exit(1);
});
