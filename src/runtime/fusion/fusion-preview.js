'use strict';

const { detectProfile } = require('../../core/profile');
const { detectFusionPlan, runUnifiedFusion } = require('./unified-fusion');

function summarizeNextField(nextField) {
  if (!nextField) return null;
  const ok = nextField.fusions?.find((f) => f.ok);
  return {
    layers: nextField.layers || [],
    summary: nextField.summary || null,
    dominant: ok?.next?.dominant || ok?.injected?.dominant || null,
    file: ok?.file || null,
    fusions: (nextField.fusions || []).map((f) => ({
      ok: f.ok,
      file: f.file,
      error: f.error || null,
      dominant: f.next?.dominant?.name || f.injected?.dominant?.name || null
    }))
  };
}

function summarizeLiminalField(liminalField) {
  if (!liminalField) return null;
  const first = liminalField.fusions?.[0];
  return {
    layers: liminalField.layers || [],
    sidecar: liminalField.sidecar || null,
    blocked: liminalField.blocked || false,
    fusions: (liminalField.fusions || []).map((f) => ({
      mode: f.mode,
      observe: f.observe,
      source: f.source,
      overall: f.resonance?.overall ?? null,
      alignments: (f.resonance?.alignments || []).map((a) => ({
        key: a.key,
        alignment: a.alignment,
        pass: a.pass
      }))
    })),
    mode: first?.mode || null
  };
}

function summarizeNextPhase(next) {
  if (!next) return null;
  return {
    blocked: next.blocked || false,
    blockReason: next.blockReason || null,
    dominant: next.dominant || next.field?.dominant || null,
    narrative_count: (next.narrative || next.field?.narrative || []).length,
    fieldMemory: next.fieldMemory ? { runs: next.fieldMemory.runs } : null
  };
}

function summarizeProfileFusion(fusion) {
  if (!fusion) return null;
  return {
    layers: fusion.layers || [],
    blocked: fusion.blocked || false,
    sidecars: fusion.sidecars || [],
    liminal: fusion.liminal ? {
      mode: fusion.liminal.mode,
      observe: fusion.liminal.observe,
      blocked: fusion.liminal.blocked,
      alignments: fusion.liminal.resonance?.alignments?.length || 0
    } : null,
    general: fusion.general ? {
      mode: fusion.general.mode,
      summary: fusion.general.bridge?.artifact?.summary || null
    } : null
  };
}

function buildPreviewSummary(result) {
  const parts = [];
  if (result.nextField?.dominant?.name) parts.push(`next:${result.nextField.dominant.name}`);
  if (result.liminalField?.fusions?.[0]?.overall != null) {
    parts.push(`liminal:${result.liminalField.fusions[0].overall.toFixed(3)}`);
  }
  if (result.next?.dominant?.name) parts.push(`field:${result.next.dominant.name}`);
  if (result.fusion?.general?.summary) parts.push(result.fusion.general.summary);
  return parts.join(' | ') || null;
}

function pickContextKeys(context) {
  if (!context) return null;
  const keys = [
    'next_field', 'next_dominant', 'next_narrative', 'next_summary',
    'liminal_resonance', 'liminal_mode'
  ];
  const picked = {};
  for (const key of keys) {
    if (context[key] != null) picked[key] = context[key];
  }
  return Object.keys(picked).length ? picked : null;
}

async function runFusionPreview(ast, options = {}) {
  const profile = detectProfile(ast, options);
  const planInfo = detectFusionPlan(ast, options);
  const fusionOut = await runUnifiedFusion(ast, {
    ...options,
    with_protocol: 'off',
    quiet: true,
    feedback: options.feedback || {}
  });

  const result = {
    profile,
    plan: planInfo.plan,
    triad: planInfo.triad,
    bidirectional: planInfo.bidirectional,
    layers: [...new Set(fusionOut.layers || [])],
    phases: fusionOut.phases || [],
    success: fusionOut.success !== false && !fusionOut.blocked,
    blockReason: fusionOut.blockReason || null,
    next: summarizeNextPhase(fusionOut.next),
    fusion: summarizeProfileFusion(fusionOut.fusion),
    nextField: summarizeNextField(fusionOut.nextField),
    liminalField: summarizeLiminalField(fusionOut.liminalField),
    summary: null,
    context: pickContextKeys(ast.cognition?.context)
  };

  result.summary = buildPreviewSummary(result);
  return result;
}

function formatFusionPreviewText(result) {
  const lines = ['\n\x1b[32m═══ Profile Fusion Preview ═══\x1b[0m'];
  lines.push(`Profile: ${result.profile}`);
  lines.push(`Layers: ${result.layers.join(', ') || '(none)'}`);
  lines.push(`Phases: ${result.phases.join(' → ') || '(none)'}`);

  if (result.nextField) {
    const dom = result.nextField.dominant;
    lines.push(`Next field: ${dom?.name || '—'}${dom?.energy != null ? ` (energy ${dom.energy})` : ''}`);
    if (result.nextField.summary) lines.push(`Bridge: ${result.nextField.summary}`);
  }

  if (result.liminalField) {
    const lf = result.liminalField.fusions?.[0];
    lines.push(`Liminal: ${lf?.mode || 'observe'} | source: ${lf?.source || '—'} | blocked: ${result.liminalField.blocked}`);
    if (lf?.overall != null) lines.push(`Resonance: ${lf.overall.toFixed(4)}`);
  }

  if (result.fusion?.liminal) {
    lines.push(`Liminal: ${result.fusion.liminal.mode} | alignments: ${result.fusion.liminal.alignments}`);
  }
  if (result.fusion?.general?.summary) {
    lines.push(`General bridge: ${result.fusion.general.summary}`);
  }

  if (result.triad) lines.push('Triad: next + liminal + general');
  if (result.bidirectional) lines.push('Bidirectional: General ← Next + Liminal');

  if (result.summary) lines.push(`Summary: ${result.summary}`);
  if (result.context) {
    lines.push(`Context: ${Object.keys(result.context).join(', ')}`);
  }

  return lines.join('\n');
}

module.exports = {
  runFusionPreview,
  formatFusionPreviewText,
  summarizeNextField,
  summarizeLiminalField
};
