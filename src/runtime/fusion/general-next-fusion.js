'use strict';

const fs = require('fs');
const path = require('path');
const { parseNextSource } = require('../../grammar');
const { runNextPhase } = require('../../vm/next-phase');
const { bridgeNextToCognitive } = require('../next/cognitive-bridge');

function resolveFusionFile(fuse, options = {}) {
  const file = fuse.file || fuse.path || fuse.source;
  if (!file) return null;
  if (path.isAbsolute(file)) return file;

  const fromCwd = path.resolve(process.cwd(), file);
  if (fs.existsSync(fromCwd)) return fromCwd;

  if (options.filename) {
    const fromSourceDir = path.resolve(path.dirname(path.resolve(options.filename)), file);
    if (fs.existsSync(fromSourceDir)) return fromSourceDir;
  }

  return fromCwd;
}

function injectNextFieldIntoGeneral(ast, nextResult, fuse = {}) {
  const field = nextResult.field || {};
  const inject = fuse.inject || ['dominant', 'narrative', 'summary'];
  const asList = Array.isArray(inject) ? inject : [inject];

  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};

  const dominant = nextResult.dominant || field.dominant || null;
  const narrative = field.narrative || nextResult.narrative || [];
  const bridge = bridgeNextToCognitive({ next: nextResult }, ast);

  if (asList.includes('dominant') || asList.includes('field') || fuse.mode === 'field') {
    ast.cognition.context.next_dominant = dominant;
    ast.cognition.context.next_cells = (field.cells || []).slice(0, 12).map((c) => ({
      name: c.name,
      energy: c.energy,
      claim: c.claim
    }));
  }

  if (asList.includes('narrative') && narrative.length) {
    ast.cognition.context.next_narrative = narrative.map((n) => n.text || String(n));
  }

  if (asList.includes('summary') || asList.includes('bridge')) {
    ast.cognition.context.next_summary = bridge.artifact?.summary || null;
    ast.cognition.context.next_bridge = bridge.decide || null;
  }

  ast.cognition.understandings = ast.cognition.understandings || [];
  if (dominant) {
    ast.cognition.understandings.push({
      source: 'next_field',
      method: 'field_synthesis',
      confidence: dominant.energy ?? 0.6,
      dominant: dominant.name,
      claim: dominant.claim || null
    });
  }

  if (!ast.cognition.goal && nextResult.goal?.text) {
    ast.cognition.goal = nextResult.goal.text;
  }

  return {
    file: fuse.file || fuse.path,
    dominant,
    narrative_count: narrative.length,
    bridge_summary: bridge.artifact?.summary || null,
    injected: asList
  };
}

async function runGeneralNextFusion(ast, options = {}) {
  const fusions = [
    ...(ast.fusion || []),
    ...(ast.general?.fusion || [])
  ].filter((f) => f.target === 'next' && f.enabled !== false);

  if (options.fuse_next && !fusions.length) {
    fusions.push({
      target: 'next',
      file: options.fuse_next === true ? 'examples/genesis.next' : options.fuse_next,
      mode: 'field'
    });
  }

  if (!fusions.length) return null;

  const results = [];
  for (const fuse of fusions) {
    const resolved = resolveFusionFile(fuse, options);
    if (!resolved || !fs.existsSync(resolved)) {
      results.push({ file: fuse.file, error: 'file-not-found', ok: false });
      continue;
    }

    const nextAst = parseNextSource(fs.readFileSync(resolved, 'utf8'));
    const nextResult = await runNextPhase(nextAst, {
      ...options,
      filename: resolved,
      source_path: resolved,
      with_protocol: 'off',
      publish_mycelium: fuse.publish_mycelium === true
    });

    const injected = injectNextFieldIntoGeneral(ast, nextResult, fuse);
    results.push({
      ok: true,
      file: resolved,
      blocked: nextResult.blocked,
      next: {
        dominant: nextResult.dominant,
        narrative: (nextResult.narrative || []).length,
        fieldMemory: nextResult.fieldMemory || null
      },
      injected
    });
  }

  return {
    layers: ['next'],
    fusions: results,
    summary: results.find((r) => r.ok && r.injected?.bridge_summary)?.injected?.bridge_summary || null
  };
}

module.exports = {
  runGeneralNextFusion,
  injectNextFieldIntoGeneral,
  resolveFusionFile
};
