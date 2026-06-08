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
const { buildCognitiveGraph, formatMermaidGraph } = require('./graph');

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
  if (!filePath) { console.error('Usage: noeon run <file.ael|file.noeon> [--json] [--trace] [--verbose] [--auto-evolve] [--next-memory-in file] [--next-memory-out file]'); process.exit(1); }
  const nextMemoryInFlag = flags['next-memory-in'] || flags.next_memory_in;
  const nextMemoryOutFlag = flags['next-memory-out'] || flags.next_memory_out;
  const nextMemoryInPath = nextMemoryInFlag ? (nextMemoryInFlag === true ? 'next-memory.json' : nextMemoryInFlag) : null;
  const nextMemoryOutPath = nextMemoryOutFlag ? (nextMemoryOutFlag === true ? 'next-memory.json' : nextMemoryOutFlag) : null;
  const nextMemoryIn = nextMemoryInPath ? readJsonFileIfExists(nextMemoryInPath) : undefined;

  const { ast, resolved } = parseProgram(filePath);
  const result = await runProgram(ast, {
    verbose: flags.verbose,
    trace: flags.trace,
    quiet: flags.quiet,
    auto_evolve: Boolean(flags['auto-evolve'] || flags.auto_evolve),
    hot_reload: flags['no-hot-reload'] ? false : true,
    evolved_dir: flags['evolved-dir'] || flags.evolved_dir,
    next_memory: nextMemoryIn,
    program_name: path.basename(filePath),
    source_path: resolved,
    filename: resolved,
    with_protocol: flags['with-protocol'] || flags.with_protocol || 'auto',
    strict_protocol: Boolean(flags['strict-protocol'] || flags.strict_protocol),
    feedback: flags.feedback ? readJsonFileIfExists(flags.feedback) : {}
  });

  let writtenNextMemory = null;
  if (nextMemoryOutPath && result.next?.nextMemory) {
    writtenNextMemory = resolveFile(nextMemoryOutPath);
    fs.writeFileSync(writtenNextMemory, JSON.stringify(result.next.nextMemory, null, 2), 'utf8');
  }

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    if (writtenNextMemory) {
      console.error(`next memory -> ${writtenNextMemory}`);
    }
  } else if (result.blocked) {
    if (result.resonance?.blocked) {
      console.error('\x1b[31m✗ Blocked by Liminal resonance gate\x1b[0m');
      for (const a of result.resonance.alignments || []) {
        if (!a.pass) console.error(`  • ${a.key}: alignment ${a.alignment} < floor ${a.floor}`);
      }
      for (const d of result.resonance.dialogues || []) {
        console.error(`  ↳ dialogue: ${d.prompt}`);
      }
    } else {
      console.error('\x1b[31m✗ Blocked by governance preflight\x1b[0m');
      (result.validation?.errors || result.governance?.errors || []).forEach((e) => console.error(`  • ${e}`));
    }
    if (flags.transcript && result.transcript) {
      const out = resolveFile(flags.transcript === true ? 'transcript.json' : flags.transcript);
      fs.writeFileSync(out, JSON.stringify(result.transcript, null, 2), 'utf8');
      console.error(`  transcript → ${out}`);
    }
    if (writtenNextMemory) {
      console.error(`  next memory → ${writtenNextMemory}`);
    }
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
    if (result.resonance?.alignments?.length) {
      console.log('\nResonance:');
      result.resonance.alignments.forEach((a) => {
        console.log(`  ${a.pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${a.key}  ${a.alignment} / ${a.floor}`);
      });
    }
    if (flags.transcript && result.transcript) {
      const out = resolveFile(flags.transcript === true ? 'transcript.json' : flags.transcript);
      fs.writeFileSync(out, JSON.stringify(result.transcript, null, 2), 'utf8');
      console.log(`Transcript: ${out}`);
    }
    if (writtenNextMemory) {
      console.log(`Next memory: ${writtenNextMemory}`);
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

async function cmdFuse(filePath) {
  if (!filePath) {
    console.error('Usage: noeon fuse <file.next|file.noeon> [--fuse liminal,general] [--json] [--graph] [--save]');
    process.exit(1);
  }
  const { ast, resolved } = parseProgram(filePath);
  const { detectProfile, PROFILES } = require('./core/profile');
  const { runFusionPreview, formatFusionPreviewText } = require('./runtime/fusion/fusion-preview');
  const { runFusionGraph } = require('./runtime/fusion/fusion-graph');
  const profile = detectProfile(ast, { filename: resolved });

  const opts = {
    quiet: flags.quiet,
    with_protocol: 'off',
    fuse: flags.fuse || (profile === PROFILES.GENERAL ? undefined : 'liminal,general'),
    filename: resolved,
    source_path: resolved,
    hot_reload: flags['no-hot-reload'] ? false : true,
    field_memory_dir: flags['field-memory-dir'] || flags.field_memory_dir,
    mycelium_dir: flags['mycelium-dir'] || flags.mycelium_dir,
    evolved_dir: flags['evolved-dir'] || flags.evolved_dir,
    publish_mycelium: false,
    feedback: flags.feedback ? readJsonFileIfExists(flags.feedback) : {}
  };

  const result = flags.graph
    ? await runFusionGraph(ast, opts)
    : await runFusionPreview(ast, opts);

  if (flags.save || flags.record) {
    const { recordFusionRun } = require('./runtime/fusion/fusion-history');
    recordFusionRun({
      file: resolved,
      profile: result.profile,
      layers: result.layers,
      phases: result.phases,
      success: result.success,
      summary: result.summary,
      triad: result.triad,
      bidirectional: result.bidirectional
    }, opts);
  }

  if (flags.graph) {
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Profile: ${result.profile} | Layers: ${(result.layers || []).join(', ')}`);
      if (result.summary) console.log(`Summary: ${result.summary}`);
      console.log('\n--- Mermaid ---\n');
      console.log(result.mermaid);
    }
  } else if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatFusionPreviewText(result));
  }
  process.exit(result.success ? 0 : 1);
}

async function cmdTriad(filePath) {
  if (!filePath) {
    console.error('Usage: noeon triad <file.noeon> [--json] [--graph] [--save] [--run]');
    process.exit(1);
  }
  const { ast, resolved } = parseProgram(filePath);
  const { runFusionTriad, buildTriadGraph } = require('./runtime/fusion/fusion-triad');
  const { executeProgram } = require('./vm/unified-executor');

  const opts = {
    quiet: flags.quiet,
    with_protocol: 'off',
    filename: resolved,
    source_path: resolved,
    field_memory_dir: flags['field-memory-dir'] || flags.field_memory_dir,
    mycelium_dir: flags['mycelium-dir'] || flags.mycelium_dir,
    publish_mycelium: false,
    hot_reload: flags['no-hot-reload'] ? false : true,
    save: flags.save || flags.record
  };

  const triad = await runFusionTriad(ast, opts);

  if (flags.run) {
    const run = await executeProgram(ast, { ...opts, triad: false, quiet: true });
    triad.cognitive = { success: run.success, phases: run.phases };
  }

  if (flags.graph) {
    const { mermaid } = buildTriadGraph(triad);
    if (flags.json) {
      console.log(JSON.stringify({ ...triad, mermaid }, null, 2));
    } else {
      console.log('\n\x1b[32m═══ Triad Fusion ═══\x1b[0m');
      console.log(`Coherence: ${triad.coherence?.score ?? '—'} | Relay: ${triad.relay?.triggered ? triad.relay.action : 'idle'}`);
      console.log(triad.summary || '');
      console.log('\n--- Mermaid ---\n');
      console.log(mermaid);
    }
  } else if (flags.json) {
    console.log(JSON.stringify(triad, null, 2));
  } else {
    console.log('\n\x1b[32m═══ Triad Fusion ═══\x1b[0m');
    console.log(`Forward: ${triad.forward?.dominant?.name || '—'} → Reverse: ${triad.reverse?.dominant?.name || '—'}`);
    console.log(`Coherence: ${triad.coherence?.score ?? '—'} | Aligned: ${triad.coherence?.aligned}`);
    console.log(`Relay: ${triad.relay?.triggered ? triad.relay.action : 'idle'}`);
    if (triad.summary) console.log(`Summary: ${triad.summary}`);
  }

  process.exit(triad.success ? 0 : 1);
}

function cmdConverge(targetPath) {
  const path = require('path');
  const {
    loadConvergenceFromDir,
    loadConvergenceFromFiles,
    formatConvergenceText,
    DEFAULT_PARITY
  } = require('./core/canonical-convergence');
  const { computeSemanticPulse } = require('./core/canonical-pulse');

  let matrix;
  if (!targetPath || targetPath === 'parity') {
    const dir = path.join(__dirname, '..', 'examples', 'parity');
    matrix = loadConvergenceFromDir(dir, DEFAULT_PARITY);
  } else if (fs.existsSync(resolveFile(targetPath)) && fs.statSync(resolveFile(targetPath)).isDirectory()) {
    matrix = loadConvergenceFromDir(resolveFile(targetPath));
  } else {
    const files = positional.length ? positional.map(resolveFile) : [resolveFile(targetPath)];
    matrix = loadConvergenceFromFiles(files);
  }

  matrix.pulse = computeSemanticPulse(matrix);
  if (flags.out) {
    fs.writeFileSync(resolveFile(flags.out), JSON.stringify(matrix, null, 2), 'utf8');
    console.log(`Written: ${resolveFile(flags.out)}`);
  } else if (flags.json) {
    console.log(JSON.stringify(matrix, null, 2));
  } else {
    console.log(formatConvergenceText(matrix));
    console.log(`\nPulse: ${matrix.pulse.action} (score=${matrix.pulse.score ?? '—'})`);
    if (flags.graph && matrix.mermaid) {
      console.log('\n--- Mermaid ---\n');
      console.log(matrix.mermaid);
    }
  }
  process.exit(matrix.aligned ? 0 : 1);
}

function cmdReport() {
  const { readCanonicalAudit, formatAuditReport } = require('./core/canonical-audit-read');
  const report = readCanonicalAudit({
    dir: flags.dir,
    limit: flags.limit ? Number(flags.limit) : 30
  });
  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatAuditReport(report));
  }
  process.exit(0);
}

async function cmdEpoch(filePath) {
  if (!filePath) { console.error('Usage: noeon epoch <file.next> [--runs N] [--json] [--bridge] [--field-memory-dir dir]'); process.exit(1); }
  const { runFieldEpochFromFile } = require('./runtime/next/field-epoch');
  const { bridgeNextToCognitive } = require('./runtime/next/cognitive-bridge');
  const runs = Number(flags.runs || flags.epochs || 3);
  const result = await runFieldEpochFromFile(resolveFile(filePath), {
    epochs: runs,
    field_memory_dir: flags['field-memory-dir'] || flags.field_memory_dir,
    mycelium_dir: flags['mycelium-dir'] || flags.mycelium_dir,
    evolved_dir: flags['evolved-dir'] || flags.evolved_dir,
    hot_reload: flags['no-hot-reload'] ? false : true,
    publish_mycelium: flags['no-mycelium'] ? false : true
  });

  if (flags.bridge) {
    const { ast } = parseProgram(filePath);
    result.cognitive = bridgeNextToCognitive(result.last, ast);
  }

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n\x1b[32m═══ Field Epoch ═══\x1b[0m');
    console.log(`Epochs: ${result.completed}/${result.epochs} | Stable dominant: ${result.summary.stable_dominant || '(varied)'}`);
    for (const r of result.results) {
      console.log(`  ${r.epoch}. ${r.success ? '✓' : '✗'} dominant=${r.dominant?.name || '-'} energy=${r.dominant?.energy ?? '-'}`);
    }
    if (result.cognitive?.artifact?.summary) {
      console.log(`Bridge: ${result.cognitive.artifact.summary}`);
    }
  }
  process.exit(result.summary.success ? 0 : 1);
}

async function cmdGraph(filePath) {
  if (!filePath) { console.error('Usage: noeon graph <file> [--json] [--out graph.mmd] [--mycelium] [--memory] [--fusion] [--mycelium-dir dir] [--field-memory-dir dir]'); process.exit(1); }
  const { ast, resolved } = parseProgram(filePath);
  let graph;
  let output;

  if (flags.fusion) {
    const { runFusionGraph } = require('./runtime/fusion/fusion-graph');
    const fusionResult = await runFusionGraph(ast, {
      filename: resolved,
      source_path: resolved,
      field_memory_dir: flags['field-memory-dir'] || flags.field_memory_dir,
      publish_mycelium: false,
      hot_reload: false
    });
    output = flags.json ? JSON.stringify(fusionResult.graph, null, 2) : fusionResult.mermaid;
  } else if (flags.memory) {
    const { buildMemoryGraph, formatMermaidGraph: fmt } = require('./runtime/next/memory-graph');
    const { loadFieldMemory } = require('./runtime/next/field-memory');
    const memDir = flags['field-memory-dir'] || flags.field_memory_dir;
    const program = flags.program || ast.program || ast.task || path.basename(filePath, path.extname(filePath));
    const memory = loadFieldMemory(program, { dir: memDir });
    graph = buildMemoryGraph({ program, memory, dir: memDir });
    output = flags.json ? JSON.stringify(graph, null, 2) : fmt(graph);
  } else if (flags.mycelium || (ast.profile === 'next' && ast.next?.cells?.length)) {
    const { buildMyceliumGraph, buildNextFieldGraph, mergeGraphs, formatMermaidGraph: fmt } = require('./runtime/next/mycelium-graph');
    const { runFieldEngine } = require('./runtime/next/field-engine');
    const myceliumDir = flags['mycelium-dir'] || flags.mycelium_dir;
    const field = ast.next?.cells?.length ? runFieldEngine(ast.next, { mycelium_dir: myceliumDir }) : null;
    const parts = [buildNextFieldGraph(ast, field)];
    if (flags.mycelium || ast.next?.mycelium?.length) {
      parts.push(buildMyceliumGraph({ dir: myceliumDir, field }));
    }
    graph = mergeGraphs(...parts);
    output = flags.json ? JSON.stringify(graph, null, 2) : fmt(graph);
  } else {
    graph = buildCognitiveGraph(ast);
    output = flags.json ? JSON.stringify(graph, null, 2) : formatMermaidGraph(graph);
  }

  if (flags.out) {
    const out = resolveFile(flags.out);
    fs.writeFileSync(out, output, 'utf8');
    console.log(`Written: ${out}`);
  } else {
    console.log(output);
  }
}

function cmdDiff(filePath) {
  if (!filePath) { console.error('Usage: noeon diff <file.next> [--evolved-dir dir] [--json]'); process.exit(1); }
  const { evolvedPath } = require('./runtime/next/hot-reload');
  const { diffEvolvedSources, formatDiffReport } = require('./runtime/next/evolved-sync');
  const resolved = resolveFile(filePath);
  const base = fs.readFileSync(resolved, 'utf8');
  const evoFile = evolvedPath(resolved, { evolved_dir: flags['evolved-dir'] || flags.evolved_dir });
  if (!fs.existsSync(evoFile)) {
    console.error(`No evolved source: ${evoFile}`);
    process.exit(1);
  }
  const evolved = fs.readFileSync(evoFile, 'utf8');
  const diff = diffEvolvedSources(base, evolved);
  if (flags.json) {
    console.log(JSON.stringify(diff, null, 2));
  } else {
    console.log(formatDiffReport(diff, { base: resolved, evolved: evoFile }));
  }
}

function cmdMerge(filePath) {
  if (!filePath) { console.error('Usage: noeon merge <file.next> [--strategy union|smart|base-wins|evolved-wins] [--three-way] [--theirs file] [--evolved-dir dir] [--out file]'); process.exit(1); }
  const { evolvedPath } = require('./runtime/next/hot-reload');
  const { mergeEvolvedSources } = require('./runtime/next/evolved-sync');
  const { mergeEvolvedThreeWay, formatThreeWayReport } = require('./runtime/next/evolved-three-way');
  const resolved = resolveFile(filePath);
  const base = fs.readFileSync(resolved, 'utf8');
  const evoFile = evolvedPath(resolved, { evolved_dir: flags['evolved-dir'] || flags.evolved_dir });
  if (!fs.existsSync(evoFile)) {
    console.error(`No evolved source: ${evoFile}`);
    process.exit(1);
  }
  const evolved = fs.readFileSync(evoFile, 'utf8');
  const strategy = flags.strategy || 'union';

  if (flags['three-way'] || flags.three_way) {
    const theirsPath = flags.theirs ? resolveFile(flags.theirs) : `${evoFile}.merged`;
    if (!fs.existsSync(theirsPath)) {
      console.error(`No theirs source for three-way merge: ${theirsPath}`);
      process.exit(1);
    }
    const theirs = fs.readFileSync(theirsPath, 'utf8');
    const result = mergeEvolvedThreeWay(base, evolved, theirs, strategy);
    const outPath = flags.out ? resolveFile(flags.out) : `${evoFile}.3way`;
    fs.writeFileSync(outPath, result.merged, 'utf8');
    console.log(formatThreeWayReport(result));
    console.log(`Three-way merged → ${outPath}`);
    if (flags.json) console.log(JSON.stringify({ ...result, outPath }, null, 2));
    return;
  }

  const result = mergeEvolvedSources(base, evolved, strategy);
  const outPath = flags.out ? resolveFile(flags.out) : `${evoFile}.merged`;
  fs.writeFileSync(outPath, result.merged, 'utf8');
  console.log(`Merged (${strategy}) → ${outPath}`);
  if (result.conflicts.length) {
    console.log(`Conflicts: ${result.conflicts.length}${result.hasConflictMarkers ? ' (markers written)' : ''}`);
  }
  if (flags.json) console.log(JSON.stringify({ ...result, outPath }, null, 2));
}

function cmdMycelium(sub) {
  const { readEvents } = require('./runtime/next/mycelium-bus');
  const { loadCluster } = require('./runtime/next/mycelium-store');
  const cluster = positional[0] || 'dream_cluster';
  const dir = flags['mycelium-dir'] || flags.mycelium_dir;

  if (sub === 'events' || sub === 'subscribe') {
    const events = readEvents(cluster, { dir, limit: Number(flags.limit) || 20, sinceTs: flags.since });
    if (flags.json) console.log(JSON.stringify({ cluster, events }, null, 2));
    else {
      console.log(`# Mycelium events: ${cluster}`);
      for (const e of events) console.log(`${e.ts} [${e.type}] ${JSON.stringify(e)}`);
    }
    return;
  }

  if (sub === 'status') {
    const data = loadCluster(cluster, { dir });
    const events = readEvents(cluster, { dir, limit: 5 });
    console.log(JSON.stringify({ cluster, cells: data.cells?.length || 0, programs: data.programs || [], recent_events: events }, null, 2));
    return;
  }

  console.error('Usage: noeon mycelium events|status [cluster] [--mycelium-dir dir] [--limit N] [--json]');
  process.exit(1);
}

function cmdFieldMemory(sub) {
  const { loadFieldMemory, saveFieldMemory, memoryPath, emptyMemory } = require('./runtime/next/field-memory');
  const program = positional[0] || 'genesis';
  const dir = flags['field-memory-dir'] || flags.field_memory_dir;

  if (sub === 'show' || !sub) {
    const mem = loadFieldMemory(program, { dir });
    if (flags.json) console.log(JSON.stringify(mem, null, 2));
    else {
      console.log(`# Field memory: ${program}`);
      console.log(`Path: ${memoryPath(program, { dir })}`);
      console.log(`Runs: ${mem.runs || 0} | Cells stored: ${Object.keys(mem.cells || {}).length}`);
      if (mem.dominant_history?.length) {
        const last = mem.dominant_history[mem.dominant_history.length - 1];
        console.log(`Last dominant: ${last.name} (${last.energy}) @ ${last.at}`);
      }
    }
    return;
  }

  if (sub === 'clear') {
    const file = memoryPath(program, { dir });
    fs.writeFileSync(file, JSON.stringify(emptyMemory(program), null, 2), 'utf8');
    console.log(`Cleared field memory: ${file}`);
    return;
  }

  console.error('Usage: noeon field-memory show|clear [program] [--field-memory-dir dir] [--json]');
  process.exit(1);
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
  const nextMemoryInFlag = flags['next-memory-in'] || flags.next_memory_in;
  const nextMemoryOutFlag = flags['next-memory-out'] || flags.next_memory_out;
  const nextMemoryInPath = nextMemoryInFlag ? (nextMemoryInFlag === true ? 'next-memory.json' : nextMemoryInFlag) : null;
  const nextMemoryOutPath = nextMemoryOutFlag ? (nextMemoryOutFlag === true ? 'next-memory.json' : nextMemoryOutFlag) : null;
  const nextMemoryIn = nextMemoryInPath ? readJsonFileIfExists(nextMemoryInPath) : undefined;

  if (!filePath) {
    console.error('Usage: noeon simulate <contract.ael|contract.noeon> [feedback.json] [cycle.json] [state.json] [report.json] [audit.jsonl] [--auto-evolve] [--next-memory-in file] [--next-memory-out file]');
    process.exit(1);
  }

  const { ast } = parseProgram(filePath);
  const feedback = feedbackPath ? readJsonFileIfExists(feedbackPath) : {};
  const result = await simulateContract(ast, feedback, {
    cyclePath,
    statePath,
    reportPath,
    auditPath,
    autoEvolve: Boolean(flags['auto-evolve'] || flags.auto_evolve),
    strictNext: Boolean(flags['strict-next'] || flags.strict_next),
    nextMemoryIn,
    nextMemoryOutPath,
    withProtocol: flags['with-protocol'] || flags.with_protocol || 'off'
  });

  if (!result.success) {
    if (result.error) console.error(result.error);
    if (result.cycle?.blocked) {
      console.error('Simulation blocked by next guarantee gate');
    }
    if (result.validation) {
      console.error(JSON.stringify(result.validation, null, 2));
    }
    if (nextMemoryOutPath && result.nextMemory) {
      console.error(`next memory: ${resolveFile(nextMemoryOutPath)}`);
    }
    process.exit(2);
  }

  if (flags.json || !cyclePath) {
    console.log(JSON.stringify(result.cycle, null, 2));
  } else {
    console.log('Simulation complete.');
    if (cyclePath) console.log(`  cycle:  ${resolveFile(cyclePath)}`);
    if (reportPath) console.log(`  report: ${resolveFile(reportPath)}`);
    if (auditPath) console.log(`  audit:  ${resolveFile(auditPath)}`);
    if (nextMemoryOutPath && result.nextMemory) console.log(`  next memory: ${resolveFile(nextMemoryOutPath)}`);
  }
}

async function cmdTrain() {
  const filePath = positional[0];
  const batchPath = positional[1];
  const nextMemoryInFlag = flags['next-memory-in'] || flags.next_memory_in;
  const nextMemoryOutFlag = flags['next-memory-out'] || flags.next_memory_out;
  const nextMemoryInPath = nextMemoryInFlag ? (nextMemoryInFlag === true ? 'next-memory.json' : nextMemoryInFlag) : null;
  const nextMemoryOutPath = nextMemoryOutFlag ? (nextMemoryOutFlag === true ? 'next-memory.json' : nextMemoryOutFlag) : null;
  const nextMemoryIn = nextMemoryInPath ? readJsonFileIfExists(nextMemoryInPath) : undefined;
  if (!filePath || !batchPath) {
    console.error('Usage: noeon train <contract.ael|contract.noeon> <feedback_batch.json> [training.json] [state.json] [convergence.json] [audit.jsonl] [--auto-evolve] [--next-memory-in file] [--next-memory-out file]');
    process.exit(1);
  }

  const { ast } = parseProgram(filePath);
  const batch = readFeedbackBatch(batchPath);
  const result = await trainContract(ast, batch, {
    trainingPath: positional[2],
    statePath: positional[3],
    convergencePath: positional[4],
    auditPath: positional[5],
    autoEvolve: Boolean(flags['auto-evolve'] || flags.auto_evolve),
    strictNext: Boolean(flags['strict-next'] || flags.strict_next),
    nextMemoryIn,
    nextMemoryOutPath,
    withProtocol: flags['with-protocol'] || flags.with_protocol || 'off'
  });

  if (!result.success) {
    console.error(result.error);
    process.exit(2);
  }

  if (flags.json) {
    console.log(JSON.stringify(result.training, null, 2));
    if (nextMemoryOutPath && result.nextMemory) {
      console.error(`next memory -> ${resolveFile(nextMemoryOutPath)}`);
    }
  } else {
    console.log('Training complete.');
    if (nextMemoryOutPath && result.nextMemory) {
      console.log(`  next memory: ${resolveFile(nextMemoryOutPath)}`);
    }
  }
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
  if (!['general', 'ael', 'liminal', 'next'].includes(profile)) {
    console.error('Usage: noeon init <project-name> [--profile general|ael|liminal|next]');
    process.exit(1);
  }

  fs.mkdirSync(dir, { recursive: true });
  const entry = profile === 'general'
    ? 'main.noeon'
    : profile === 'liminal'
      ? 'main.lim'
      : profile === 'next'
        ? 'genesis.next'
        : 'main.ael';
  const source = profile === 'next'
    ? `profile "next"\nversion "${VERSION}"\nprogram "genesis"\n\nGOAL "Evolve a living field toward the primary objective"\n\nCONSTITUTION name=evidence rule="Claims require field evidence" priority=1.0\n\nFIELD core {\n  ingest: [signals]\n  decay: 1h\n}\n\nCELL seed {\n  claim: "Initial field hypothesis"\n  energy: 0.55\n}\n\nACT action=observe channel=field\nREFLECT target=execution method=causal\n`
    : profile === 'liminal'
    ? `profile "liminal"\nversion "${VERSION}"\nmodule "${name}"\n\ncovenant ${name.replace(/[^a-zA-Z0-9_]/g, '_')} {\n  intent: "Achieve the primary user goal with human-AI alignment"\n  never: [autonomous_spend, unsupervised_publish]\n  human_must_approve: [external_action]\n  resonance_floor: 0.70\n\n  when uncertain(confidence < 0.55) {\n    ask human\n  }\n}\n\nbelief user_goal {\n  claim: "User wants a helpful, auditable outcome"\n  confidence: 0.65\n  sources: [user_input]\n}\n\n@effect(ai, trace)\nresonate user_input -> user_goal {\n  mirror: "Confirming I understood the request correctly"\n}\n\npropose respond(body) {\n  requires: belief(user_goal) >= 0.55\n  on approve(human) -> act respond channel=runtime\n  on veto(human) -> reflect\n}\n`
    : profile === 'general'
    ? `profile "general"\nversion "${VERSION}"\nmodule "${name}"\n\nimport std.ai\n\n@effect(external)\nfn main() {\n  observe input modality=text source="user"\n  ask("What is the primary goal?")\n  reason strategy=deductive depth=2\n  decide action=respond threshold=0.7\n  act action=respond channel=runtime\n  reflect "execution quality" depth=standard\n}\n`
    : `VERSION "0.8"\nNETWORK "local"\nTASK "${name}"\n\nGOAL "Primary objective"\nBUDGET 1000 msat\n\nPERCEIVE input modality=text\nREASON strategy=deductive\nDECIDE action=proceed threshold=0.7\n`;
  fs.writeFileSync(path.join(dir, entry), source);
  fs.writeFileSync(path.join(dir, '.noeonrc.json'), JSON.stringify({
    environment: 'development',
    profile,
    profile_role: profile === 'next' ? 'core' : profile === 'liminal' ? 'alignment' : profile === 'ael' ? 'protocol' : 'authoring',
    entry,
    cognition: { enable_llm: true, with_protocol: profile === 'general' || profile === 'liminal' ? 'off' : 'auto' },
    observability: { log_level: 'debug' },
    llm: { mode: 'auto' }
  }, null, 2));
  if (profile === 'general') {
    fs.writeFileSync(path.join(dir, 'noeon.json'), JSON.stringify({
      name,
      version: VERSION,
      profile: 'general',
      dependencies: { 'std.ai': 'builtin', 'std.cognition': 'builtin' }
    }, null, 2));
    const { installPackages } = require('./pkg/manifest');
    installPackages(dir);
  }
  const role = profile === 'next' ? 'core' : profile === 'liminal' ? 'alignment' : profile === 'ael' ? 'protocol' : 'authoring';
  console.log(`\x1b[32m✓ Created ${name}/ (${profile}, ${role}, ${entry})\x1b[0m`);
}

function cmdPkg(subcommand, arg) {
  const {
    addDependency,
    listDependencies,
    installPackages,
    BUILTIN_PACKAGES
  } = require('./pkg/manifest');
  const {
    searchPackages,
    searchPackagesAsync,
    publishPackage,
    getBundledRegistryDir,
    getUserRegistryDir
  } = require('./pkg/registry');

  const action = subcommand || 'help';

  if (action === 'help' || action === '--help') {
    console.log(`Usage:
  noeon pkg list
  noeon pkg search [query]
  noeon pkg add <package> [--spec builtin|registry[:version]|path:./lib]
  noeon pkg install
  noeon pkg publish [--local] [--registry-dir path]

Builtin packages: ${BUILTIN_PACKAGES.join(', ')}
Bundled registry: ${getBundledRegistryDir()}
User registry:    ${getUserRegistryDir()}
Remote index:     ${process.env.NOEON_REGISTRY_URL || '(not set)'}`);
    return;
  }

  if (action === 'search') {
    const query = arg || positional[1] || '';
    const run = async () => {
      const results = await searchPackagesAsync(query, { registryUrl: flags.registry });
      if (flags.json) {
        console.log(JSON.stringify({ query, results }, null, 2));
        return;
      }
      if (results.length === 0) {
        console.log(query ? `No packages match '${query}'` : 'No registry packages found');
        return;
      }
      for (const pkg of results) {
        console.log(`${pkg.name}@${pkg.latest}  ${pkg.description || ''}`.trim());
      }
    };
    run().catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
    return;
  }

  if (action === 'publish') {
    try {
      const result = publishPackage(process.cwd(), {
        local: flags.local === true,
        registryDir: flags['registry-dir'] || flags.registry_dir
      });
      console.log(`\x1b[32m✓ Published ${result.name}@${result.version}\x1b[0m`);
      console.log(`  registry: ${result.registryDir}`);
      console.log(`  package:  ${result.packageRoot}`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    return;
  }

  if (action === 'list') {
    const deps = listDependencies(process.cwd());
    console.log(JSON.stringify(deps, null, 2));
    return;
  }

  if (action === 'add') {
    const pkg = arg || positional[1];
    if (!pkg) {
      console.error('Usage: noeon pkg add <package>');
      process.exit(1);
    }
    const spec = flags.spec || 'builtin';
    const result = addDependency(process.cwd(), pkg, spec);
    const installed = installPackages(process.cwd());
    console.log(`\x1b[32m✓ Added ${result.added} to ${result.manifestPath}\x1b[0m`);
    console.log(`\x1b[32m✓ Lockfile updated (${installed.installed.length} packages)\x1b[0m`);
    return;
  }

  if (action === 'install') {
    const result = installPackages(process.cwd());
    console.log(`\x1b[32m✓ Installed ${result.installed.length} packages → ${result.lockPath}\x1b[0m`);
    return;
  }

  console.error(`Unknown pkg subcommand: ${action}`);
  cmdPkg('help');
  process.exit(1);
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

async function cmdPipeline(filePath) {
  if (!filePath) {
    console.error('Usage: noeon pipeline <file> [--json] [--plan-only]');
    process.exit(1);
  }
  const { runNoeonPipeline } = require('./core/pipeline');
  const out = await runNoeonPipeline(filePath, {
    filename: path.resolve(process.cwd(), filePath),
    with_protocol: flags['with-protocol'] || flags.with_protocol || 'off',
    quiet: !flags.verbose,
    trace: flags.trace === true
  });
  if (flags.json) {
    console.log(JSON.stringify({
      success: out.result?.success,
      blocked: out.result?.blocked,
      profile: out.profile,
      coreSurface: out.coreSurface,
      routeLabel: out.routeLabel,
      stack: out.stack,
      plan: out.plan,
      architecture: out.architecture,
      phases: out.result?.phases,
      scheduler: out.result?.scheduler,
      report: out.report
    }, null, 2));
  } else {
    console.log(`\x1b[36mPipeline\x1b[0m ${filePath}`);
    console.log(`  core: ${out.coreSurface} | profile: ${out.profile} | route: ${out.routeLabel}`);
    console.log(`  layers: ${(out.stack?.layers || []).join(', ') || '(none)'}`);
    console.log(`  success: ${out.result?.success !== false}`);
  }
  process.exit(out.result?.success === false ? 1 : 0);
}

function cmdArchitecture() {
  const { buildArchitectureManifest } = require('./core/canonical-architecture');
  const manifest = buildArchitectureManifest();
  if (flags.json) {
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }
  console.log(`\x1b[36mNoeon Canonical Architecture v${manifest.version}\x1b[0m`);
  console.log(`  core: ${manifest.coreSurface} | rule: ${manifest.rule}`);
  console.log('  pipeline:');
  for (const stage of manifest.pipeline) {
    console.log(`    · ${stage.id} — ${stage.label}`);
  }
  console.log('  frozen extensions:', Object.keys(manifest.frozenExtensions).join(', '));
  console.log('  golden:', manifest.goldenManifest);
}

function cmdPlan(filePath) {
  if (!filePath) {
    console.error('Usage: noeon plan <file> [--json]');
    process.exit(1);
  }
  const { planNoeonProgram, parseNoeonInput } = require('./core/pipeline');
  const { ast } = parseNoeonInput(filePath, { filename: path.resolve(process.cwd(), filePath) });
  const out = planNoeonProgram(ast, { filename: path.resolve(process.cwd(), filePath), plan_only: true });
  const payload = {
    profile: out.profile,
    coreSurface: out.coreSurface,
    mode: out.mode,
    routeLabel: out.routeLabel,
    route: out.route,
    stack: out.stack,
    plan: out.plan,
    governance: {
      winner: out.governance?.winner?.tier || null,
      rule_count: out.governance?.rule_count,
      model: out.governance?.model
    },
    intent: out.canonical?.intent,
    fusion_layers: out.canonical?.fusion?.layers || []
  };
  console.log(flags.json ? JSON.stringify(payload, null, 2) : JSON.stringify(payload, null, 2));
}

function cmdStack(filePath) {
  if (!filePath) {
    console.error('Usage: noeon stack <file> [--json]');
    process.exit(1);
  }
  const { parseNoeonInput } = require('./core/pipeline');
  const { ast } = parseNoeonInput(filePath, { filename: path.resolve(process.cwd(), filePath) });
  console.log(flags.json ? JSON.stringify(ast.noeonStack, null, 2) : JSON.stringify(ast.noeonStack, null, 2));
}

function cmdBrain(filePath) {
  if (!filePath) {
    console.error('Usage: noeon brain <file> [--json]');
    process.exit(1);
  }
  const { planNoeonProgram, parseNoeonInput } = require('./core/pipeline');
  const { BRAIN_REGIONS } = require('./core/cognitive-architecture');
  const { ast } = parseNoeonInput(filePath, { filename: path.resolve(process.cwd(), filePath) });
  const out = planNoeonProgram(ast, {
    filename: path.resolve(process.cwd(), filePath),
    with_protocol: 'off'
  });
  const payload = {
    model: out.architecture?.model,
    disclaimer: out.architecture?.disclaimer,
    cognitive_cycle: out.cognitiveCycle,
    active_regions: out.architecture?.active_regions,
    agent_flows: out.architecture?.agent_flows,
    regions: out.architecture?.active_regions?.map((id) => ({
      id,
      ...BRAIN_REGIONS[id]
    }))
  };
  console.log(flags.json ? JSON.stringify(payload, null, 2) : JSON.stringify(payload, null, 2));
}

function cmdHelp() {
  showBanner();
  console.log(`
\x1b[1mSystem:\x1b[0m    plan | stack | pipeline | brain
\x1b[1mCognitive:\x1b[0m   run | compile | inspect | repl | explain
\x1b[1mProtocol:\x1b[0m  simulate | train | rollback | compile --format ael
\x1b[1mFusion:\x1b[0m     fuse | triad | converge
\x1b[1mCanonical:\x1b[0m report
\x1b[1mNext:\x1b[0m       epoch | diff | merge | mycelium | field-memory
\x1b[1mTools:\x1b[0m      validate | parse | graph | test | init | pkg | status | doctor | playground | lsp

\x1b[1mFlags:\x1b[0m --json --verbose --trace --format ir|ael|both --out file
       --with-protocol auto|on|off --strict-protocol --port 5177 --file program.ael
      --profile general|ael|liminal --auto-evolve --strict-next --next-memory-in file --next-memory-out file

\x1b[1mLLM:\x1b[0m Set OPENAI_API_KEY or NOEON_API_KEY (NOEON_LLM_MODE=auto|live|mock|off)

\x1b[1mExamples:\x1b[0m
  noeon brain examples/agent_research.noeon
  noeon architecture --json
  noeon stack examples/agent_research.noeon
  noeon pipeline examples/agent_research.noeon
  noeon init my-field --profile next
  noeon run examples/genesis.next
  noeon fuse examples/genesis.next
  noeon fuse examples/agent_field.noeon --json
  noeon triad examples/fusion_triad.noeon --graph --save
  noeon triad examples/fusion_triad.noeon --run
  noeon converge parity --graph
  noeon converge examples/parity --json --out artifacts/convergence.json
  noeon report --limit 20
  noeon graph examples/genesis.next --memory
  noeon graph examples/hello.noeon --out hello.mmd
  noeon diff examples/genesis.next
  noeon merge examples/genesis.next --three-way --theirs file.merged
  noeon mycelium events dream_cluster --limit 10
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
    case 'brain': cmdBrain(target); break;
    case 'architecture': cmdArchitecture(); break;
    case 'plan': cmdPlan(target); break;
    case 'stack': cmdStack(target); break;
    case 'pipeline': await cmdPipeline(target); break;
    case 'run': await cmdRun(target); break;
    case 'epoch': await cmdEpoch(target); break;
    case 'fuse': await cmdFuse(target); break;
    case 'triad': await cmdTriad(target); break;
    case 'converge': cmdConverge(target); break;
    case 'report': cmdReport(); break;
    case 'parse': cmdParse(target); break;
    case 'compile': cmdCompile(target); break;
    case 'explain': cmdExplain(target); break;
    case 'graph': await cmdGraph(target); break;
    case 'diff': cmdDiff(target); break;
    case 'merge': cmdMerge(target); break;
    case 'mycelium': cmdMycelium(target); break;
    case 'field-memory': cmdFieldMemory(target); break;
    case 'validate': cmdValidate(target); break;
    case 'inspect': await cmdInspect(target); break;
    case 'repl': await cmdRepl(); break;
    case 'init': cmdInit(target); break;
    case 'pkg': cmdPkg(target, positional[1]); break;
    case 'status': cmdStatus(); break;
    case 'doctor': cmdDoctor(); break;
    case 'test': await cmdTest(); break;
    case 'simulate': await cmdSimulate(); break;
    case 'train': await cmdTrain(); break;
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
