'use strict';

const { detectProfile, PROFILES } = require('../../core/profile');
const { runNextPhase } = require('../../vm/next-phase');
const { runProfileFusion } = require('./profile-fusion');
const { runGeneralNextFusion } = require('./general-next-fusion');
const { runGeneralLiminalFusion } = require('./general-liminal-fusion');
const { buildTranscript } = require('../liminal/transcript');

function collectFusionBlocks(ast) {
  return [
    ...(ast.fusion || []),
    ...(ast.general?.fusion || []),
    ...(ast.next?.fusion || [])
  ].filter((f) => f && f.enabled !== false);
}

function detectFusionPlan(ast, options = {}) {
  const profile = detectProfile(ast, options);
  const blocks = collectFusionBlocks(ast);
  const plan = blocks.map((f) => ({
    target: String(f.target || '').toLowerCase(),
    mode: f.mode || 'bridge',
    file: f.file || f.path || f.source || null
  }));

  if (profile === PROFILES.NEXT && options.fuse) {
    for (const target of String(options.fuse).split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!plan.some((p) => p.target === target)) {
        plan.push({ target, mode: target === 'liminal' ? 'observe' : 'bridge', file: null });
      }
    }
  }

  if (options.fuse_next && !plan.some((p) => p.target === 'next')) {
    plan.push({
      target: 'next',
      mode: 'field',
      file: options.fuse_next === true ? null : options.fuse_next
    });
  }
  if (options.fuse_liminal && !plan.some((p) => p.target === 'liminal')) {
    plan.push({ target: 'liminal', mode: 'observe', file: null });
  }

  const targets = new Set(plan.map((p) => p.target));
  const triad = targets.has('next') && targets.has('liminal') && targets.has('general');
  const bidirectional = profile === PROFILES.GENERAL && targets.has('next') && targets.has('liminal') && !triad;

  return {
    profile,
    plan,
    layers: [...targets],
    triad,
    bidirectional
  };
}

async function runUnifiedFusion(ast, options = {}) {
  const profile = detectProfile(ast, options);
  const planInfo = detectFusionPlan(ast, options);
  const canonicalPlan = options.canonicalPlan || null;
  const layers = canonicalPlan?.fusion_layers?.length
    ? canonicalPlan.fusion_layers
    : planInfo.layers;

  const result = {
    profile,
    plan: planInfo.plan,
    triad: planInfo.triad,
    bidirectional: planInfo.bidirectional,
    layers: [],
    phases: [],
    success: true,
    blocked: false,
    blockReason: null,
    next: null,
    fusion: null,
    nextField: null,
    liminalField: null,
    transcript: null
  };

  const runNextCore =
    profile === PROFILES.NEXT ||
    (canonicalPlan?.next_field === true && Boolean(ast.next || ast.profile === 'next'));

  if (runNextCore && profile === PROFILES.NEXT) {
    const next = await runNextPhase(ast, { ...options, feedback: options.feedback || {} });
    result.next = next;
    result.phases.push('next');

    if (next.blocked) {
      result.success = false;
      result.blocked = true;
      result.blockReason = next.blockReason || 'next';
      return result;
    }

    const fusion = await runProfileFusion(ast, next, options);
    if (fusion) {
      result.fusion = fusion;
      result.layers.push(...(fusion.layers || []));
      result.phases.push('fusion');

      if (fusion.blocked) {
        result.success = false;
        result.blocked = true;
        result.blockReason = fusion.blockReason || 'liminal';
        result.transcript = fusion.transcript || null;
        return result;
      }
    }
  }

  const needsNextLayer = layers.includes('next');
  const needsLiminalLayer = layers.includes('liminal');

  if (needsNextLayer && profile !== PROFILES.NEXT) {
    const nextField = await runGeneralNextFusion(ast, options);
    if (nextField) {
      result.nextField = nextField;
      result.layers.push(...(nextField.layers || []));
      result.phases.push('next-field');
    }
  }

  if (needsLiminalLayer) {
    const liminalField = await runGeneralLiminalFusion(ast, options);
    if (liminalField) {
      result.liminalField = liminalField;
      result.layers.push(...(liminalField.layers || []));
      result.phases.push('liminal-field');

      if (liminalField.blocked) {
        result.success = false;
        result.blocked = true;
        result.blockReason = liminalField.blockReason || 'liminal';
        result.transcript = liminalField.transcript || buildTranscript(
          { liminalField, fusion: result },
          ast,
          options
        );
        return result;
      }
    }
  }

  result.layers = [...new Set(result.layers)];
  return result;
}

module.exports = {
  collectFusionBlocks,
  detectFusionPlan,
  runUnifiedFusion
};
