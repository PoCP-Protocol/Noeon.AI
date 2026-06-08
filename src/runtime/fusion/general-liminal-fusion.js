'use strict';

const { loadFusionSidecars } = require('./profile-fusion');
const { attachLiminalAst } = require('./liminal-field-bridge');
const { runResonanceGate } = require('../liminal/resonance-gate');
const { buildTranscript } = require('../liminal/transcript');

function synthesizeLiminalFromGeneral(ast) {
  const agent = ast.agents?.[0];
  const goal = agent?.goal || ast.cognition?.goal || ast.task || 'general execution';
  const ctx = ast.cognition?.context || {};
  const dominant = ctx.next_dominant;

  const beliefs = [];
  if (dominant) {
    beliefs.push({
      name: dominant.name,
      claim: dominant.claim || dominant.name,
      confidence: dominant.energy ?? 0.6,
      sources: ['next_field']
    });
  }

  for (const u of (ast.cognition?.understandings || []).filter((x) => x.source === 'next_field')) {
    if (beliefs.some((b) => b.name === u.dominant)) continue;
    beliefs.push({
      name: u.dominant || 'field_signal',
      claim: u.claim || u.dominant,
      confidence: u.confidence ?? 0.5,
      sources: ['next_field']
    });
  }

  if (agent?.tools) {
    for (const t of agent.tools) {
      beliefs.push({
        name: `tool_${t}`,
        claim: `Agent may use ${t}`,
        confidence: 0.8,
        sources: ['agent']
      });
    }
  }

  const target = dominant?.name || 'execution';
  const resonates = [{
    source: 'agent_goal',
    target,
    mirror: goal,
    alignment: dominant?.energy ?? 0.65,
    alignmentFloor: 0.55
  }];

  if (dominant) {
    resonates.push({
      source: 'next_field',
      target: dominant.name,
      mirror: `Field dominant ${dominant.name} informs agent synthesis`,
      alignment: dominant.energy ?? 0.6,
      alignmentFloor: 0.55
    });
  }

  return {
    ...ast,
    profile: 'liminal',
    liminal: {
      covenant: {
        intent: goal,
        resonanceFloor: 0.55,
        never: [],
        humanMustApprove: agent?.policy?.require_citation === 'true' ? ['uncited_claims'] : []
      },
      beliefs,
      resonates,
      synthesized: true,
      from: 'general-agent'
    }
  };
}

function resonanceOverall(resonance) {
  const alignments = resonance?.alignments || [];
  if (!alignments.length) return null;
  return alignments.reduce((sum, a) => sum + a.alignment, 0) / alignments.length;
}

function injectLiminalIntoGeneral(ast, resonance, fuse) {
  ast.cognition = ast.cognition || {};
  ast.cognition.context = ast.cognition.context || {};
  ast.cognition.context.liminal_resonance = resonanceOverall(resonance);
  ast.cognition.context.liminal_alignment = !resonance.blocked;
  ast.cognition.context.liminal_mode = fuse.mode || 'observe';
  ast.cognition.context.liminal_alignments = (resonance.alignments || []).slice(0, 8);
}

async function runGeneralLiminalFusion(ast, options = {}) {
  const fusions = (ast.fusion || []).filter((f) => f.target === 'liminal' && f.enabled !== false);
  if (!fusions.length && !options.fuse_liminal) return null;

  const sidecars = loadFusionSidecars(options.source_path || options.filename);
  const plan = fusions.length ? fusions : [{ target: 'liminal', mode: 'observe' }];
  const results = [];

  for (const fuse of plan) {
    const limAst = sidecars.liminal
      ? attachLiminalAst(ast, sidecars.liminal)
      : synthesizeLiminalFromGeneral(ast);

    const observe = fuse.mode !== 'enforce';
    const ctx = ast.cognition?.context || {};
    const dom = ctx.next_dominant;
    const resonanceOverrides = {};
    if (dom) {
      resonanceOverrides[`field_goal->${dom.name}`] = dom.energy ?? 0.7;
      resonanceOverrides[`agent_goal->${dom.name}`] = dom.energy ?? 0.7;
      resonanceOverrides[`next_field->${dom.name}`] = dom.energy ?? 0.7;
    }

    const resonance = runResonanceGate(limAst, {
      ...options,
      skip_resonance_gate: observe,
      resonance_floor: fuse.resonance_floor ?? fuse.resonanceFloor,
      resonance: { ...(options.resonance || {}), ...(options.feedback?.resonance || {}), ...resonanceOverrides }
    });

    injectLiminalIntoGeneral(ast, resonance, fuse);

    results.push({
      ok: true,
      mode: fuse.mode || 'observe',
      observe,
      blocked: observe ? false : resonance.blocked,
      source: sidecars.liminal ? sidecars.liminalPath : 'synthesized',
      resonance: {
        passed: !resonance.blocked,
        overall: resonanceOverall(resonance),
        floor: resonance.floor,
        alignments: resonance.alignments
      }
    });
  }

  const blocked = results.some((r) => r.blocked);
  const fusion = {
    layers: ['liminal'],
    fusions: results,
    blocked,
    blockReason: blocked ? 'liminal-fusion' : null,
    sidecar: sidecars.liminalPath || null
  };

  if (blocked) {
    fusion.transcript = buildTranscript({ fusion, resonance: results[0]?.resonance }, ast, options);
  }

  return fusion;
}

module.exports = {
  runGeneralLiminalFusion,
  synthesizeLiminalFromGeneral,
  injectLiminalIntoGeneral
};
