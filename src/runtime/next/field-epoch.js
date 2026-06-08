'use strict';

const { executeProgram } = require('../../vm/unified-executor');
const { parseNextSource } = require('../../grammar');

async function runFieldEpoch(source, ast, options = {}) {
  const runs = Math.max(1, Number(options.epochs || options.runs || 3));
  const results = [];
  let last = null;

  for (let i = 0; i < runs; i += 1) {
    const runOptions = {
      ...options,
      quiet: options.quiet !== false,
      with_protocol: options.with_protocol ?? 'off',
      epoch: i + 1,
      epoch_total: runs
    };

    last = await executeProgram(ast, runOptions);
    results.push({
      epoch: i + 1,
      success: last.success,
      dominant: last.next?.dominant || last.next?.field?.dominant || null,
      narrative: (last.next?.narrative || []).map((n) => n.text),
      fieldMemory: last.next?.fieldMemory || null,
      declaredSpawns: (last.next?.declaredSpawns || []).map((s) => s.name),
      semantic: last.next?.fieldMemory?.semantic || null
    });

    if (!last.success && options.stop_on_fail !== false) break;
  }

  const dominants = results.map((r) => r.dominant?.name).filter(Boolean);
  const uniqueDominants = [...new Set(dominants)];

  return {
    epochs: runs,
    completed: results.length,
    results,
    summary: {
      success: results.every((r) => r.success),
      dominant_sequence: dominants,
      stable_dominant: uniqueDominants.length === 1 ? uniqueDominants[0] : null,
      last_field_memory: results[results.length - 1]?.fieldMemory || null
    },
    last
  };
}

async function runFieldEpochFromFile(filePath, options = {}) {
  const fs = require('fs');
  const path = require('path');
  const resolved = path.resolve(filePath);
  const source = fs.readFileSync(resolved, 'utf8');
  const ast = parseNextSource(source);
  return runFieldEpoch(source, ast, {
    ...options,
    filename: resolved,
    source_path: resolved
  });
}

module.exports = {
  runFieldEpoch,
  runFieldEpochFromFile
};
