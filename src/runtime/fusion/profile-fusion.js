'use strict';

const fs = require('fs');
const path = require('path');
const { parseLiminalProgram } = require('../../grammar/liminal/parser');
const { runResonanceGate } = require('../liminal/resonance-gate');
const { buildTranscript } = require('../liminal/transcript');
const { bridgeNextToCognitive } = require('../next/cognitive-bridge');
const { CognitiveKernel } = require('../../core/kernel');
const { synthesizeLiminalFromField, attachLiminalAst } = require('./liminal-field-bridge');

function loadFusionSidecars(filePath) {
  if (!filePath) return {};
  const resolved = path.resolve(filePath);
  const limPath = /\.(next|noeon)$/i.test(resolved)
    ? resolved.replace(/\.(next|noeon)$/i, '.lim')
    : `${resolved}.lim`;
  if (limPath === resolved) return {};
  if (!fs.existsSync(limPath)) return {};
  return {
    liminalPath: limPath,
    liminal: parseLiminalProgram(fs.readFileSync(limPath, 'utf8'))
  };
}

function resolveFusionPlan(ast, options = {}) {
  const plan = [...(ast.next?.fusion || [])];
  const sidecars = loadFusionSidecars(options.source_path || options.filename);

  if (sidecars.liminal && !plan.some((f) => f.target === 'liminal')) {
    plan.push({ target: 'liminal', mode: 'observe', source: 'sidecar' });
  }

  if (options.fuse) {
    const extra = String(options.fuse).split(',').map((s) => s.trim()).filter(Boolean);
    for (const target of extra) {
      if (!plan.some((f) => f.target === target)) {
        plan.push({ target, mode: target === 'liminal' ? 'observe' : 'bridge' });
      }
    }
  }

  return { plan, sidecars };
}

function injectBridgeContext(ast, bridge) {
  const patched = JSON.parse(JSON.stringify(ast));
  patched.cognition = patched.cognition || {};
  patched.cognition.context = {
    ...(patched.cognition.context || {}),
    next_bridge: bridge.decide,
    next_narrative: bridge.artifact?.narrative_lines || [],
    next_summary: bridge.artifact?.summary || null
  };
  patched.cognition.goal = patched.cognition.goal || bridge.goal;
  if (!patched.agents?.length && bridge.goal) {
    patched.agents = [{
      name: 'next_field_agent',
      goal: bridge.goal,
      policy: { mode: 'field-synthesis' }
    }];
  }
  return patched;
}

async function runProfileFusion(ast, nextResult, options = {}) {
  const { plan, sidecars } = resolveFusionPlan(ast, options);
  if (!plan.length) return null;

  const fusion = { layers: [], sidecars: sidecars.liminalPath ? [sidecars.liminalPath] : [] };
  const field = nextResult.field || null;

  for (const fuse of plan) {
    if (fuse.enabled === false) continue;

    if (fuse.target === 'liminal') {
      const limAst = sidecars.liminal
        ? attachLiminalAst(ast, sidecars.liminal)
        : synthesizeLiminalFromField(ast, field);

      const observe = fuse.mode === 'observe' || fuse.mode === 'soft' || fuse.source === 'sidecar';
      const domKey = `field_goal->${field?.dominant?.name || 'unknown'}`;
      const resonance = runResonanceGate(limAst, {
        ...options,
        skip_resonance_gate: observe,
        resonance_floor: fuse.resonance_floor,
        resonance: {
          ...(options.resonance || {}),
          ...(options.feedback?.resonance || {}),
          [domKey]: field?.dominant?.energy ?? 0.75
        }
      });

      fusion.liminal = {
        mode: fuse.mode || 'observe',
        observe,
        blocked: observe ? false : resonance.blocked,
        resonance,
        source: sidecars.liminal ? 'sidecar' : 'synthesized'
      };
      fusion.layers.push('liminal');

      if (!observe && resonance.blocked) {
        fusion.blocked = true;
        fusion.blockReason = 'liminal-fusion';
        fusion.transcript = buildTranscript({ resonance, next: nextResult, fusion }, limAst, options);
      }
    }

    if (fuse.target === 'general') {
      const bridge = bridgeNextToCognitive({ next: nextResult }, ast);
      fusion.general = { mode: fuse.mode || 'bridge', bridge };
      fusion.layers.push('general');

      if (fuse.mode === 'run') {
        const kernel = new CognitiveKernel({ ...options, enable_llm: false });
        const patched = injectBridgeContext(ast, bridge);
        fusion.general.cognitive = await kernel.execute(patched, { verbose: false });
      }
    }
  }

  return fusion.layers.length ? fusion : null;
}

module.exports = {
  loadFusionSidecars,
  resolveFusionPlan,
  runProfileFusion,
  injectBridgeContext
};
