'use strict';

function synthesizeLiminalFromField(ast, field) {
  const next = ast.next || {};
  const cells = field?.cells || next.cells || [];
  const dominant = field?.dominant;

  const beliefs = cells.slice(0, 12).map((c) => ({
    name: c.name,
    claim: c.claim || c.name,
    confidence: typeof c.energy === 'number' ? c.energy : 0.5,
    sources: ['field']
  }));

  const resonates = [];
  if (dominant) {
    resonates.push({
      source: 'field_goal',
      target: dominant.name,
      mirror: `Field dominant ${dominant.name} aligns with program goal`,
      alignment: dominant.energy,
      alignmentFloor: 0.5
    });
  }

  for (const cell of cells.filter((c) => (c.energy ?? 0) >= 0.55).slice(0, 4)) {
    resonates.push({
      source: 'field_signal',
      target: cell.name,
      mirror: `High-energy cell ${cell.name} resonates with field evolution`,
      alignment: cell.energy
    });
  }

  return {
    ...ast,
    profile: ast.profile || 'next',
    liminal: {
      covenant: {
        intent: next.goal?.text || ast.task || 'autonomous field',
        resonanceFloor: 0.55,
        never: [],
        humanMustApprove: []
      },
      beliefs,
      resonates,
      synthesized: true,
      from: 'next-field'
    }
  };
}

function attachLiminalAst(baseAst, liminalProgram) {
  return {
    ...baseAst,
    liminal: {
      covenant: liminalProgram.covenant,
      beliefs: liminalProgram.beliefs || [],
      resonates: liminalProgram.resonates || [],
      hypotheses: liminalProgram.hypotheses || [],
      proposals: liminalProgram.proposals || [],
      sidecar: true
    }
  };
}

module.exports = {
  synthesizeLiminalFromField,
  attachLiminalAst
};
