'use strict';

const { parseLiminalProgram } = require('./parser');

/**
 * Dual-source Liminal: `.lim.human` (constitution) + `.lim.machine` (AI interpretation layer).
 */

function isMachineLayer(source) {
  return /^\s*layer\s+"machine"/im.test(source) || /^\s*#\s*machine layer/im.test(source);
}

function parseMachineLayer(source, options = {}) {
  const program = parseLiminalProgram(wrapMachineAsProgram(source), {
    ...options,
    _machineLayer: true
  });
  return {
    beliefs: program.beliefs,
    resonates: program.resonates,
    hypotheses: program.hypotheses
  };
}

function wrapMachineAsProgram(source) {
  if (/^\s*covenant\s+/m.test(source)) return source;
  return [
    'profile "liminal"',
    'layer "machine"',
    '',
    'covenant MachineLayer {',
    '  intent: "AI interpretation layer (merged into human covenant)"',
    '  resonance_floor: 0.0',
    '}',
    '',
    source
  ].join('\n');
}

function mergeResonate(human, machine) {
  const key = `${machine.source}->${machine.target}`;
  const idx = human.findIndex((r) => `${r.source}->${r.target}` === key);
  if (idx === -1) {
    human.push({ ...machine });
    return;
  }
  human[idx] = {
    ...human[idx],
    ...machine,
    mirror: machine.mirror || human[idx].mirror,
    alignment: machine.alignment ?? human[idx].alignment,
    dialogue: machine.dialogue?.length ? machine.dialogue : human[idx].dialogue
  };
}

function mergeBelief(human, machine) {
  const idx = human.findIndex((b) => b.name === machine.name);
  if (idx === -1) {
    human.push({ ...machine });
    return;
  }
  human[idx] = {
    ...human[idx],
    ...machine,
    claim: human[idx].claim || machine.claim,
    sources: machine.sources?.length ? machine.sources : human[idx].sources
  };
}

function mergeHypothesisGroup(human, machine) {
  const idx = human.findIndex((h) => h.name === machine.name);
  if (idx === -1) {
    human.push({ ...machine });
    return;
  }
  human[idx] = {
    ...human[idx],
    observe: machine.observe?.length ? machine.observe : human[idx].observe,
    items: human[idx].items?.length ? human[idx].items : machine.items,
    commit: human[idx].commit || machine.commit
  };
}

function mergeDualSource(humanSource, machineSource, options = {}) {
  const human = parseLiminalProgram(humanSource, options);
  if (!machineSource || !machineSource.trim()) {
    return { program: human, machine: null, conflicts: [] };
  }

  const machine = parseMachineLayer(machineSource, options);
  const conflicts = [];

  for (const mb of machine.beliefs) {
    const existing = human.beliefs.find((b) => b.name === mb.name);
    if (existing && mb.claim && existing.claim && mb.claim !== existing.claim) {
      conflicts.push({
        type: 'belief_claim',
        name: mb.name,
        human: existing.claim,
        machine: mb.claim,
        resolution: 'human'
      });
      mergeBelief(human.beliefs, { ...mb, claim: existing.claim });
    } else {
      mergeBelief(human.beliefs, mb);
    }
  }

  for (const mr of machine.resonates) {
    mergeResonate(human.resonates, mr);
  }

  for (const mh of machine.hypotheses) {
    mergeHypothesisGroup(human.hypotheses, mh);
  }

  human.machine = {
    layer: 'machine',
    merged_at: new Date().toISOString(),
    belief_updates: machine.beliefs.length,
    resonate_updates: machine.resonates.length,
    conflicts
  };

  return { program: human, machine, conflicts };
}

function resolveDualSourcePaths(filePath) {
  const humanPath = filePath.endsWith('.lim.human') ? filePath : `${filePath}.human`;
  const machinePath = filePath.endsWith('.lim.human')
    ? filePath.replace(/\.human$/, '.machine')
    : `${filePath}.machine`;
  return { humanPath, machinePath, basePath: filePath };
}

module.exports = {
  isMachineLayer,
  parseMachineLayer,
  mergeDualSource,
  resolveDualSourcePaths
};
