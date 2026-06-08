'use strict';

function stripComment(line) {
  const idx = line.indexOf('#');
  return idx >= 0 ? line.slice(0, idx) : line;
}

function parseQuoted(value, lineNo) {
  const m = String(value || '').trim().match(/^"([\s\S]*)"$/);
  if (!m) throw new Error(`Line ${lineNo}: expected quoted string, got '${value}'`);
  return m[1];
}

function parseKeyValuePairs(input, lineNo) {
  const parts = String(input || '').match(/(?:[^\s"]+="[\s\S]*?"|[^\s"]+)/g) || [];
  const out = {};
  for (const part of parts) {
    const m = part.match(/^([a-zA-Z_][\w]*)=(.+)$/);
    if (!m) throw new Error(`Line ${lineNo}: invalid key=value token '${part}'`);
    const key = m[1];
    const raw = m[2];
    out[key] = /^"[\s\S]*"$/.test(raw) ? parseQuoted(raw, lineNo) : raw;
  }
  return out;
}

function parseList(value, lineNo) {
  const m = String(value || '').trim().match(/^\[(.*)\]$/);
  if (!m) throw new Error(`Line ${lineNo}: expected [a, b, ...] list`);
  const inner = m[1].trim();
  if (!inner) return [];
  return inner.split(',').map((s) => {
    const t = s.trim();
    if (/^"[\s\S]*"$/.test(t)) return parseQuoted(t, lineNo);
    return t;
  });
}

function parseKeyValueLine(line, lineNo) {
  const idx = line.indexOf(':');
  if (idx === -1) throw new Error(`Line ${lineNo}: expected key: value`);
  const key = line.slice(0, idx).trim();
  const raw = line.slice(idx + 1).trim();
  if (/^"[\s\S]*"$/.test(raw)) return { key, value: parseQuoted(raw, lineNo) };
  if (/^\[/.test(raw)) return { key, value: parseList(raw, lineNo) };
  if (/^\d+(\.\d+)?$/.test(raw)) return { key, value: Number(raw) };
  return { key, value: raw.replace(/,$/, '') };
}

function readBlock(lines, startIdx) {
  const opener = stripComment(lines[startIdx]).trim();
  let depth = (opener.match(/\{/g) || []).length - (opener.match(/\}/g) || []).length;
  if (depth <= 0) throw new Error(`Line ${startIdx + 1}: expected block '{'`);
  const body = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const trimmed = stripComment(lines[i]).trim();
    if (!trimmed) { i += 1; continue; }
    depth += (trimmed.match(/\{/g) || []).length;
    depth -= (trimmed.match(/\}/g) || []).length;
    if (depth <= 0) {
      const before = trimmed.replace(/\}\s*$/, '').trim();
      if (before) body.push(before);
      return { body, nextIdx: i + 1 };
    }
    body.push(trimmed);
    i += 1;
  }
  throw new Error(`Line ${startIdx + 1}: unclosed block`);
}

function parseWhenRule(line, lineNo) {
  const m = line.match(/^when\s+(.+?)\s*\{\s*(.+)\s*\}$/i);
  if (!m) return null;
  const cond = m[1].trim();
  const actionPart = m[2].trim();
  const emit = actionPart.match(/^emit\s+(.+)$/i);
  if (emit) return { condition: cond, action: 'emit', target: emit[1].trim() };
  const split = actionPart.match(/^split\s+(.+)$/i);
  if (split) {
    return {
      condition: cond,
      action: 'split',
      targets: split[1].split(',').map((s) => s.trim())
    };
  }
  const merge = actionPart.match(/^merge\s+into\s+(.+)$/i);
  if (merge) return { condition: cond, action: 'merge', target: merge[1].trim() };
  return { condition: cond, action: 'raw', target: actionPart };
}

function parseFieldBlock(body, lineNo) {
  const field = { ingest: [], decay: null, resonance: null, recall: true, consolidate_after: 5 };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'ingest') field.ingest = value;
    else if (key === 'decay') field.decay = value;
    else if (key === 'resonance') field.resonance = value;
    else if (key === 'recall') field.recall = value === true || value === 'true';
    else if (key === 'consolidate_after') field.consolidate_after = value;
    else if (key === 'recall_depth') field.recall_depth = value;
    else field[key] = value;
  }
  return field;
}

function parseCellBlock(body, lineNo) {
  const cell = { energy: 0.5, claim: null, when: [] };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const when = parseWhenRule(line, lineNo + i);
    if (when) { cell.when.push(when); continue; }
    const { key, value } = parseKeyValueLine(line, lineNo + i);
    if (key === 'energy') cell.energy = value;
    else if (key === 'claim') cell.claim = value;
    else cell[key] = value;
  }
  return cell;
}

function parseDreamBlock(body, lineNo) {
  const dream = { branches: 3, depth: 2, merge_by: 'coherence', on: null, feedback: true };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'branches') dream.branches = value;
    else if (key === 'depth') dream.depth = value;
    else if (key === 'merge_by') dream.merge_by = value;
    else if (key === 'on') dream.on = value;
    else if (key === 'hybrid') dream.hybrid = value === true || value === 'true';
    else if (key === 'feedback') dream.feedback = value === true || value === 'true';
    else dream[key] = value;
  }
  return dream;
}

function parseFluxBlock(body, lineNo) {
  const flux = { when: null, crystallize: null, mutate: null };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const whenOpen = line.match(/^when\s+(.+?)\s*\{\s*$/i);
    if (whenOpen) {
      flux.when = whenOpen[1].trim();
      i += 1;
      while (i < body.length && body[i] !== '}') {
        const inner = body[i];
        const cry = inner.match(/^crystallize\s+(.+)$/i);
        if (cry) flux.crystallize = cry[1].trim();
        const mut = inner.match(/^mutate\s+(.+)$/i);
        if (mut) flux.mutate = mut[1].trim();
        i += 1;
      }
      continue;
    }
    const { key, value } = parseKeyValueLine(line, lineNo + i);
    flux[key] = value;
  }
  return flux;
}

function parseGoal(rest, lineNo) {
  const m = String(rest || '').match(/^"([\s\S]*?)"(\s+.*)?$/);
  if (!m) throw new Error(`Line ${lineNo}: GOAL requires quoted text`);
  const goal = { text: m[1] };
  const tail = (m[2] || '').trim();
  if (tail) Object.assign(goal, parseKeyValuePairs(tail, lineNo));
  if (goal.priority !== undefined) goal.priority = Number(goal.priority);
  return goal;
}

function parseWeave(rest, lineNo) {
  const m = rest.match(/^([^\s]+)\s+INTO\s+([^\s{]+)(?:\s*\{)?(.*)$/i);
  if (!m) throw new Error(`Line ${lineNo}: WEAVE requires 'pattern INTO name'`);
  const weave = { pattern: m[1], into: m[2], strategy: 'competitive', max: 12 };
  const tail = (m[3] || '').trim().replace(/\{\s*$/, '');
  if (tail) Object.assign(weave, parseKeyValuePairs(tail.replace(/\}\s*$/, ''), lineNo));
  if (weave.max !== undefined) weave.max = Number(weave.max);
  return weave;
}

function parseEcho(rest, lineNo) {
  const m = rest.match(/^([^\s]+)\s+INTO\s+(.+)$/i);
  if (!m) throw new Error(`Line ${lineNo}: ECHO requires 'source INTO target'`);
  return { from: m[1], into: m[2].trim() };
}

function parseSpawnBlock(body, lineNo) {
  const spawn = { inherit: [], goal: null };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'inherit') spawn.inherit = value;
    else if (key === 'goal') spawn.goal = value;
    else spawn[key] = value;
  }
  return spawn;
}

function parseBondBlock(body, lineNo, from, to, bidirectional) {
  const bond = { from, to, bidirectional, strength: 0.3, kind: 'amplifies' };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'strength') bond.strength = value;
    else if (key === 'kind') bond.kind = value;
    else bond[key] = value;
  }
  return bond;
}

function parseMyceliumBlock(body, lineNo, cluster) {
  const mesh = { cluster, share: [], absorb: [], isolate: [], react: true, listen: ['field.dominant', 'cells.published'], relay: [] };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'share') mesh.share = Array.isArray(value) ? value : [value];
    else if (key === 'absorb') mesh.absorb = Array.isArray(value) ? value : [value];
    else if (key === 'isolate') mesh.isolate = Array.isArray(value) ? value : [value];
    else if (key === 'relay') mesh.relay = Array.isArray(value) ? value : [value];
    else if (key === 'listen') mesh.listen = Array.isArray(value) ? value : [value];
    else if (key === 'react') mesh.react = value === true || value === 'true';
    else mesh[key] = value;
  }
  return mesh;
}

function parseAutobondBlock(body, lineNo) {
  const cfg = {
    enabled: true,
    threshold: 0.55,
    max: 6,
    kind: 'resonates',
    min_similarity: 0.12,
    spawn: true,
    spawn_min_similarity: 0.18,
    spawn_min_strength: 0.25,
    dream_feedback: 0.25,
    dream_crystallize_delta: 0.06
  };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'enabled') cfg.enabled = value === true || value === 'true';
    else if (key === 'spawn') cfg.spawn = value === true || value === 'true';
    else if (key === 'threshold') cfg.threshold = value;
    else if (key === 'max') cfg.max = value;
    else if (key === 'kind') cfg.kind = value;
    else if (key === 'min_similarity') cfg.min_similarity = value;
    else if (key === 'spawn_min_similarity') cfg.spawn_min_similarity = value;
    else if (key === 'spawn_min_strength') cfg.spawn_min_strength = value;
    else if (key === 'dream_feedback') cfg.dream_feedback = value;
    else if (key === 'dream_crystallize_delta') cfg.dream_crystallize_delta = value;
    else cfg[key] = value;
  }
  return cfg;
}

function parseFusionBlock(body, target, lineNo) {
  const fusion = { target: String(target).toLowerCase(), mode: 'observe', enabled: true };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValueLine(body[i], lineNo + i);
    if (key === 'mode') fusion.mode = value;
    else if (key === 'enabled') fusion.enabled = value === true || value === 'true';
    else if (key === 'resonance_floor') fusion.resonance_floor = value;
    else fusion[key] = value;
  }
  return fusion;
}

function parseBondLine(rest, lineNo) {
  const sym = rest.match(/^([a-zA-Z_][\w]*)\s*<->\s*([a-zA-Z_][\w]*)\s*(.*)$/i);
  if (sym) {
    const bond = { from: sym[1], to: sym[2], bidirectional: true, strength: 0.3, kind: 'amplifies' };
    const tail = sym[3].trim();
    if (tail) Object.assign(bond, parseKeyValuePairs(tail.replace(/\{\s*$/, ''), lineNo));
    if (bond.strength !== undefined) bond.strength = Number(bond.strength);
    return bond;
  }
  const dir = rest.match(/^([a-zA-Z_][\w]*)\s*->\s*([a-zA-Z_][\w]*)\s*(.*)$/i);
  if (dir) {
    const bond = { from: dir[1], to: dir[2], bidirectional: false, strength: 0.3, kind: 'amplifies' };
    const tail = dir[3].trim();
    if (tail) Object.assign(bond, parseKeyValuePairs(tail, lineNo));
    if (bond.strength !== undefined) bond.strength = Number(bond.strength);
    return bond;
  }
  throw new Error(`Line ${lineNo}: BOND requires 'a <-> b' or 'a -> b'`);
}

function parseNextProgram(source, options = {}) {
  if (options.expandMacros !== false) {
    const { expandNextSource } = require('./next/macro-registry');
    source = expandNextSource(source, options).source;
  }
  const lines = String(source || '').split(/\r?\n/);
  const program = {
    profile: 'next',
    version: '1.0.0',
    module: null,
    name: null,
    goal: null,
    models: [],
    strategies: [],
    guarantees: [],
    vows: [],
    constitutions: [],
    rituals: [],
    acts: [],
    reflects: [],
    evolves: [],
    selfModels: [],
    myths: [],
    fields: [],
    cells: [],
    weaves: [],
    dreams: [],
    echoes: [],
    spawns: [],
    fluxes: [],
    bonds: [],
    mycelium: [],
    autobond: null,
    fusion: []
  };

  let i = 0;
  while (i < lines.length) {
    const lineNo = i + 1;
    const raw = stripComment(lines[i]);
    const trimmed = raw.trim();
    if (!trimmed) { i += 1; continue; }

    const fieldMatch = trimmed.match(/^field\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (fieldMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.fields.push({ name: fieldMatch[1], ...parseFieldBlock(body, lineNo) });
      i = nextIdx;
      continue;
    }

    const cellMatch = trimmed.match(/^cell\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (cellMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.cells.push({ name: cellMatch[1], ...parseCellBlock(body, lineNo) });
      i = nextIdx;
      continue;
    }

    const dreamMatch = trimmed.match(/^dream\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (dreamMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.dreams.push({ name: dreamMatch[1], ...parseDreamBlock(body, lineNo) });
      i = nextIdx;
      continue;
    }

    const fluxMatch = trimmed.match(/^flux\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (fluxMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.fluxes.push({ name: fluxMatch[1], ...parseFluxBlock(body, lineNo) });
      i = nextIdx;
      continue;
    }

    const spawnMatch = trimmed.match(/^spawn\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (spawnMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.spawns.push({ name: spawnMatch[1], ...parseSpawnBlock(body, lineNo) });
      i = nextIdx;
      continue;
    }

    const bondBlock = trimmed.match(/^bond\s+([a-zA-Z_][\w]*)\s*(<->|->)\s*([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (bondBlock) {
      const { body, nextIdx } = readBlock(lines, i);
      program.bonds.push(parseBondBlock(body, lineNo, bondBlock[1], bondBlock[3], bondBlock[2] === '<->'));
      i = nextIdx;
      continue;
    }

    const myceliumMatch = trimmed.match(/^mycelium\s+join\s+"([^"]+)"\s*\{\s*$/i);
    if (myceliumMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.mycelium.push(parseMyceliumBlock(body, lineNo, myceliumMatch[1]));
      i = nextIdx;
      continue;
    }

    const fuseMatch = trimmed.match(/^fuse\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (fuseMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.fusion.push(parseFusionBlock(body, fuseMatch[1], lineNo));
      i = nextIdx;
      continue;
    }

    const autobondMatch = trimmed.match(/^autobond\s*\{\s*$/i);
    if (autobondMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.autobond = parseAutobondBlock(body, lineNo);
      i = nextIdx;
      continue;
    }

    const weaveBlock = trimmed.match(/^weave\s+([^\s]+)\s+INTO\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (weaveBlock) {
      const { body, nextIdx } = readBlock(lines, i);
      const weave = { pattern: weaveBlock[1], into: weaveBlock[2], strategy: 'competitive', max: 12 };
      for (let j = 0; j < body.length; j += 1) {
        const { key, value } = parseKeyValueLine(body[j], lineNo + j);
        if (key === 'max') weave.max = Number(value);
        else weave[key] = value;
      }
      program.weaves.push(weave);
      i = nextIdx;
      continue;
    }

    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace === -1) throw new Error(`Line ${lineNo}: missing statement value`);
    const keyword = trimmed.slice(0, firstSpace).toLowerCase();
    const rest = trimmed.slice(firstSpace + 1).trim();

    switch (keyword) {
      case 'profile':
        program.profile = parseQuoted(rest, lineNo).toLowerCase();
        break;
      case 'version':
        program.version = parseQuoted(rest, lineNo);
        break;
      case 'module':
        program.module = /^"[\s\S]*"$/.test(rest) ? parseQuoted(rest, lineNo) : rest;
        break;
      case 'program':
        program.name = /^"[\s\S]*"$/.test(rest) ? parseQuoted(rest, lineNo) : rest;
        break;
      case 'goal':
        program.goal = parseGoal(rest, lineNo);
        break;
      case 'model':
        program.models.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'strategy':
        program.strategies.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'guarantee':
        program.guarantees.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'vow':
        program.vows.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'constitution':
        program.constitutions.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'ritual':
        program.rituals.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'act':
        program.acts.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'reflect':
        program.reflects.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'evolve':
        program.evolves.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'selfmodel':
        program.selfModels.push(parseKeyValuePairs(rest, lineNo));
        break;
      case 'myth': {
        const m = String(rest || '').match(/^"([\s\S]*?)"(\s+.*)?$/);
        if (!m) throw new Error(`Line ${lineNo}: MYTH requires quoted text`);
        const myth = { text: m[1] };
        const tail = (m[2] || '').trim();
        if (tail) Object.assign(myth, parseKeyValuePairs(tail, lineNo));
        program.myths.push(myth);
        break;
      }
      case 'weave':
        program.weaves.push(parseWeave(rest, lineNo));
        break;
      case 'echo':
        program.echoes.push(parseEcho(rest, lineNo));
        break;
      case 'bond':
        program.bonds.push(parseBondLine(rest, lineNo));
        break;
      default:
        throw new Error(`Line ${lineNo}: unknown next statement '${keyword}'`);
    }
    i += 1;
  }

  if (program.profile !== 'next') {
    throw new Error(`Expected profile "next", got '${program.profile}'`);
  }
  if (!program.name) {
    program.name = options.defaultProgramName || 'next_program';
  }
  return program;
}

module.exports = {
  parseNextProgram
};
