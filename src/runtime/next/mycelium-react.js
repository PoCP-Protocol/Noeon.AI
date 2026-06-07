'use strict';

const { matchPattern } = require('./mycelium-store');

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function meshListens(mesh, eventType) {
  const listen = mesh.listen || mesh.react_to || ['field.dominant', 'cells.published'];
  const types = Array.isArray(listen) ? listen : [listen];
  if (mesh.react === false) return false;
  return types.includes('*') || types.includes(eventType);
}

function reactToMyceliumEvents(cells, events, myceliumMeshes = [], config = {}) {
  const boost = config.react_boost ?? 0.12;
  const reactions = [];
  const map = new Map(cells.map((c) => [c.name, { ...c }]));

  for (const event of events || []) {
    if (event.type === 'relay') continue;

    for (const mesh of myceliumMeshes) {
      if (event.cluster && event.cluster !== mesh.cluster) continue;
      if (!meshListens(mesh, event.type)) continue;

      if (event.type === 'field.dominant' && event.dominant) {
        for (const cell of map.values()) {
          if (cell.name === event.dominant || matchPattern(cell.name, event.dominant)) {
            const before = cell.energy;
            cell.energy = clamp(cell.energy + (event.energy ?? 0.5) * boost);
            reactions.push({
              type: 'dominant-resonance',
              cell: cell.name,
              peer: event.dominant,
              program: event.program,
              delta: Number((cell.energy - before).toFixed(4))
            });
          }
        }
      }

      if (event.type === 'cells.published') {
        for (const peerName of event.cell_names || []) {
          for (const cell of map.values()) {
            const filters = mesh.absorb || mesh.share || [];
            const matches = filters.some((f) => matchPattern(cell.name, f) || matchPattern(peerName, f));
            if (!matches) continue;
            const before = cell.energy;
            cell.energy = clamp(cell.energy + boost * 0.5);
            reactions.push({
              type: 'peer-published',
              cell: cell.name,
              peer: peerName,
              program: event.program,
              delta: Number((cell.energy - before).toFixed(4))
            });
          }
        }
      }
    }
  }

  return { cells: [...map.values()], reactions };
}

module.exports = {
  reactToMyceliumEvents,
  meshListens
};
