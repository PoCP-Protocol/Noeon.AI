#!/usr/bin/env node
'use strict';

/**
 * Legacy npm script entry — delegates to unified runtime (v0.8+).
 * Prefer: node src/cli.js <command>
 */

const path = require('path');
const {
  parseProgram,
  validateProgram,
  compileProgram,
  simulateContract,
  trainContract,
  rollbackState,
  explainProgram,
  readFeedbackBatch
} = require('./runtime/unified-runtime');

function printUsage() {
  console.log('Usage (legacy — use `noeon` CLI instead):');
  console.log('  npm run parse -- <file>');
  console.log('  npm run compile -- <file> [output.json]');
  console.log('  npm run explain -- <file>');
  console.log('  npm run simulate -- <file> [feedback] [cycle] [state] [report] [audit]');
  console.log('  npm run train -- <file> <batch> [training] [state] [convergence] [audit]');
  console.log('  npm run rollback -- <state> [steps]');
}

function main() {
  const argv = process.argv.slice(2);
  const commands = ['parse', 'compile', 'explain', 'simulate', 'train', 'rollback', 'cognitive'];
  const explicit = commands.includes(argv[0]);
  const command = explicit ? argv[0] : 'parse';
  const inputPath = explicit ? argv[1] : argv[0];
  const a2 = explicit ? argv[2] : undefined;
  const a3 = explicit ? argv[3] : undefined;
  const a4 = explicit ? argv[4] : undefined;
  const a5 = explicit ? argv[5] : undefined;
  const a6 = explicit ? argv[6] : undefined;

  if (!inputPath && command !== 'rollback') {
    printUsage();
    process.exitCode = 1;
    return;
  }

  try {
    if (command === 'rollback') {
      const updated = rollbackState(inputPath, a2);
      console.log(JSON.stringify(updated, null, 2));
      return;
    }

    const { ast } = parseProgram(inputPath);
    const validation = validateProgram(ast);

    if (command === 'parse') {
      console.log(JSON.stringify(ast, null, 2));
      console.log('\n=== Validation ===');
      console.log(JSON.stringify(validation, null, 2));
    }

    if (command === 'compile') {
      if (!validation.valid) {
        console.error('Compilation blocked.');
        process.exitCode = 2;
        return;
      }
      const { artifact } = compileProgram(ast, 'ael');
      if (a2) {
        const fs = require('fs');
        const out = path.resolve(process.cwd(), a2);
        fs.writeFileSync(out, JSON.stringify(artifact, null, 2), 'utf8');
        console.log(`Written: ${out}`);
      } else {
        console.log(JSON.stringify(artifact, null, 2));
      }
    }

    if (command === 'explain') {
      console.log(explainProgram(ast));
    }

    if (command === 'simulate') {
      if (!validation.valid) {
        console.error('Simulation blocked.');
        process.exitCode = 2;
        return;
      }
      const { readJsonFileIfExists } = require('./runtime/unified-runtime');
      const result = simulateContract(ast, readJsonFileIfExists(a2), {
        cyclePath: a3,
        statePath: a4,
        reportPath: a5,
        auditPath: a6
      });
      if (!result.success) {
        process.exitCode = 2;
        return;
      }
      if (!a3) console.log(JSON.stringify(result.cycle, null, 2));
    }

    if (command === 'train') {
      if (!validation.valid) {
        process.exitCode = 2;
        return;
      }
      const batch = readFeedbackBatch(a2);
      trainContract(ast, batch, {
        trainingPath: a3,
        statePath: a4,
        convergencePath: a5,
        auditPath: a6
      });
    }

    if (!validation.valid) process.exitCode = 2;
  } catch (err) {
    console.error(err.message);
    process.exitCode = 2;
  }
}

main();
