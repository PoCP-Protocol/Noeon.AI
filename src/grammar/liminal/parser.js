'use strict';

function stripComment(line) {
  const idx = line.indexOf('#');
  return idx >= 0 ? line.slice(0, idx) : line;
}

function parseQuoted(value, lineNo) {
  const m = value.match(/^"([\s\S]*)"$/);
  if (!m) throw new Error(`Line ${lineNo}: expected quoted string, got '${value}'`);
  return m[1];
}

function parseNumber(value, lineNo) {
  if (!/^\d+(\.\d+)?$/.test(String(value))) {
    throw new Error(`Line ${lineNo}: expected number, got '${value}'`);
  }
  return Number(value);
}

function parseList(value, lineNo) {
  const m = value.match(/^\[(.*)\]$/);
  if (!m) throw new Error(`Line ${lineNo}: expected [item, ...] list`);
  const inner = m[1].trim();
  if (!inner) return [];
  return inner.split(',').map((s) => {
    const t = s.trim();
    if (/^"[\s\S]*"$/.test(t)) return parseQuoted(t, lineNo);
    return t;
  });
}

function parseKeyValue(line, lineNo) {
  const idx = line.indexOf(':');
  if (idx === -1) throw new Error(`Line ${lineNo}: expected key: value`);
  const key = line.slice(0, idx).trim();
  const raw = line.slice(idx + 1).trim();
  if (/^"[\s\S]*"$/.test(raw)) return { key, value: parseQuoted(raw, lineNo) };
  if (/^\[/.test(raw)) return { key, value: parseList(raw, lineNo) };
  if (/^\d+(\.\d+)?$/.test(raw)) return { key, value: parseNumber(raw, lineNo) };
  if (/^(true|false)$/i.test(raw)) return { key, value: raw.toLowerCase() === 'true' };
  return { key, value: raw.replace(/,$/, '') };
}

function readBlock(lines, startIdx) {
  const opener = stripComment(lines[startIdx]).trim();
  let depth = (opener.match(/\{/g) || []).length - (opener.match(/\}/g) || []).length;
  if (depth <= 0) throw new Error(`Line ${startIdx + 1}: expected block opener '{'`);

  const body = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    const raw = stripComment(lines[i]);
    const trimmed = raw.trim();
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

function parseEffect(line) {
  const m = line.match(/^@(?:effect|morph)\s*\(\s*([^)]+)\s*\)\s*$/i);
  if (!m) return null;
  const raw = m[1];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase());
  return {
    kind: /^@morph/i.test(line) ? 'morph' : 'effect',
    tags: parts.filter((p) => ['pure', 'io', 'ai', 'external', 'trace'].includes(p)),
    requireHumanSign: /require_human_sign\s*=\s*true/i.test(raw)
  };
}

function parseCovenantBlock(body, lineNo) {
  const covenant = {
    intent: null,
    never: [],
    humanMustApprove: [],
    resonanceFloor: 0.7,
    whenUncertain: null
  };

  let i = 0;
  while (i < body.length) {
    const line = body[i];
    const whenMatch = line.match(/^when\s+uncertain\s*\(([^)]+)\)\s*\{\s*$/i);
    if (whenMatch) {
      const inner = [];
      i += 1;
      while (i < body.length && body[i] !== '}') {
        inner.push(body[i]);
        i += 1;
      }
      covenant.whenUncertain = { condition: whenMatch[1].trim(), actions: inner };
      i += 1;
      continue;
    }
    const { key, value } = parseKeyValue(line, lineNo + i);
    switch (key) {
      case 'intent': covenant.intent = value; break;
      case 'never': covenant.never = value; break;
      case 'human_must_approve': covenant.humanMustApprove = value; break;
      case 'resonance_floor': covenant.resonanceFloor = value; break;
      default:
        throw new Error(`Line ${lineNo + i}: unknown covenant field '${key}'`);
    }
    i += 1;
  }
  return covenant;
}

function parseBeliefBlock(body, lineNo) {
  const belief = { claim: null, confidence: 0.5, sources: [], decay: null, dispute: 'open' };
  for (let i = 0; i < body.length; i += 1) {
    const { key, value } = parseKeyValue(body[i], lineNo + i);
    switch (key) {
      case 'claim': belief.claim = value; break;
      case 'confidence': belief.confidence = value; break;
      case 'sources': belief.sources = value; break;
      case 'decay': belief.decay = value; break;
      case 'dispute': belief.dispute = value; break;
      default:
        throw new Error(`Line ${lineNo + i}: unknown belief field '${key}'`);
    }
  }
  return belief;
}

function parseResonateBlock(body, lineNo) {
  const block = { mirror: null, alignment: null, alignmentFloor: null, dialogue: [] };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const dlg = line.match(/^dialogue\s*\{\s*$/i);
    if (dlg) {
      i += 1;
      while (i < body.length && body[i] !== '}') {
        block.dialogue.push(body[i]);
        i += 1;
      }
      continue;
    }
    const { key, value } = parseKeyValue(line, lineNo + i);
    if (key === 'mirror') block.mirror = value;
    else if (key === 'alignment') block.alignment = value;
    else if (key === 'alignment_floor') block.alignmentFloor = value;
    else block.dialogue.push(line);
  }
  return block;
}

function parseHypothesesBlock(body, lineNo) {
  const block = { items: [], observe: [], commit: null };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const hMatch = line.match(/^(h\d+):\s*"([^"]+)"\s+prior:\s*(\d+(?:\.\d+)?)/i);
    if (hMatch) {
      block.items.push({ id: hMatch[1], label: hMatch[2], prior: Number(hMatch[3]) });
      continue;
    }
    if (/^observe\s+/i.test(line)) {
      block.observe = line.replace(/^observe\s+/i, '').split(',').map((s) => s.trim());
      continue;
    }
    const commitMatch = line.match(/^commit\s+(?:to\s+)?(.+)$/i);
    if (commitMatch) {
      block.commit = commitMatch[1].trim();
      continue;
    }
    const pruneMatch = line.match(/^prune\s+by\s+evidence\s*\((.+)\)$/i);
    if (pruneMatch) block.prune = pruneMatch[1].trim();
  }
  return block;
}

function parseProposeBlock(body, lineNo) {
  const block = { requires: null, onApprove: null, onVeto: null, onTimeout: null, body: null };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const req = line.match(/^requires:\s*(.+)$/i);
    if (req) { block.requires = req[1].trim(); continue; }
    const approve = line.match(/^on\s+approve\s*\(([^)]*)\)\s*->\s*(.+)$/i);
    if (approve) { block.onApprove = { actor: approve[1] || 'human', action: approve[2].trim() }; continue; }
    const veto = line.match(/^on\s+veto\s*\(([^)]*)\)\s*->\s*(.+)$/i);
    if (veto) { block.onVeto = { actor: veto[1] || 'human', action: veto[2].trim() }; continue; }
    const timeout = line.match(/^on\s+timeout\s*\(([^)]*)\)\s*->\s*(.+)$/i);
    if (timeout) { block.onTimeout = { duration: timeout[1], action: timeout[2].trim() }; continue; }
    const bodyMatch = line.match(/^body:\s*(.+)$/i);
    if (bodyMatch) block.body = bodyMatch[1].trim();
  }
  return block;
}

function parseMorphBlock(body, lineNo) {
  const block = { when: null, suggest: null, trial: null, promote: null };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const when = line.match(/^when\s+(.+?)\s*\{/i);
    if (when) {
      block.when = when[1].trim();
      i += 1;
      while (i < body.length && body[i] !== '}') {
        const inner = body[i];
        const suggest = inner.match(/^suggest\s+(.+)$/i);
        if (suggest) block.suggest = suggest[1].trim();
        const trial = inner.match(/^trial\s+in\s+(.+)$/i);
        if (trial) block.trial = trial[1].trim();
        const promote = inner.match(/^promote\s+if\s+(.+)$/i);
        if (promote) block.promote = promote[1].trim();
        i += 1;
      }
      continue;
    }
    const suggest = line.match(/^suggest\s+(.+)$/i);
    if (suggest) block.suggest = suggest[1].trim();
  }
  return block;
}

function parseLiminalProgram(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const program = {
    profile: 'liminal',
    version: '0.1.0-alpha',
    module: null,
    layer: null,
    covenant: null,
    beliefs: [],
    resonates: [],
    hypotheses: [],
    proposals: [],
    morphs: [],
    effects: {}
  };

  let pendingEffect = null;
  let i = 0;

  while (i < lines.length) {
    const lineNo = i + 1;
    const raw = stripComment(lines[i]);
    if (!raw.trim()) { i += 1; continue; }
    const trimmed = raw.trim();

    const effect = parseEffect(trimmed);
    if (effect) {
      pendingEffect = effect;
      i += 1;
      continue;
    }

    const headerMatch = trimmed.match(/^([a-zA-Z_][\w]*)\s+(.+)$/);
    if (headerMatch && !trimmed.includes('{')) {
      const key = headerMatch[1].toLowerCase();
      const value = headerMatch[2].trim();
      switch (key) {
        case 'profile':
          program.profile = parseQuoted(value, lineNo).toLowerCase();
          break;
        case 'version':
          program.version = parseQuoted(value, lineNo);
          break;
        case 'module':
          program.module = /^"[\s\S]*"$/.test(value) ? parseQuoted(value, lineNo) : value;
          break;
        case 'layer':
          program.layer = parseQuoted(value, lineNo).toLowerCase();
          break;
        default:
          throw new Error(`Line ${lineNo}: unknown header '${key}'`);
      }
      i += 1;
      continue;
    }

    const covenantMatch = trimmed.match(/^covenant\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (covenantMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.covenant = {
        name: covenantMatch[1],
        ...parseCovenantBlock(body, lineNo)
      };
      i = nextIdx;
      continue;
    }

    const beliefMatch = trimmed.match(/^belief\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (beliefMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.beliefs.push({
        name: beliefMatch[1],
        ...parseBeliefBlock(body, lineNo)
      });
      i = nextIdx;
      continue;
    }

    const resonateMatch = trimmed.match(/^resonate\s+([a-zA-Z_][\w]*)\s*->\s*([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (resonateMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      const block = {
        source: resonateMatch[1],
        target: resonateMatch[2],
        ...parseResonateBlock(body, lineNo),
        effect: pendingEffect
      };
      program.resonates.push(block);
      if (pendingEffect?.kind === 'effect') {
        program.effects[`resonate_${resonateMatch[1]}_${resonateMatch[2]}`] = pendingEffect.tags;
      }
      pendingEffect = null;
      i = nextIdx;
      continue;
    }

    const hypMatch = trimmed.match(/^hypotheses\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (hypMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.hypotheses.push({
        name: hypMatch[1],
        ...parseHypothesesBlock(body, lineNo)
      });
      i = nextIdx;
      continue;
    }

    const proposeMatch = trimmed.match(/^propose\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)\s*\{\s*$/i);
    if (proposeMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.proposals.push({
        name: proposeMatch[1],
        params: proposeMatch[2].trim() ? proposeMatch[2].split(',').map((p) => p.trim()) : [],
        ...parseProposeBlock(body, lineNo)
      });
      i = nextIdx;
      continue;
    }

    const morphMatch = trimmed.match(/^evolve\s*\{\s*$/i);
    if (morphMatch) {
      const { body, nextIdx } = readBlock(lines, i);
      program.morphs.push({
        ...parseMorphBlock(body, lineNo),
        requireHumanSign: pendingEffect?.requireHumanSign ?? true,
        effect: pendingEffect
      });
      pendingEffect = null;
      i = nextIdx;
      continue;
    }

    throw new Error(`Line ${lineNo}: unrecognized Liminal statement '${trimmed}'`);
  }

  if (!program.covenant && !options._machineLayer) {
    throw new Error('Liminal program requires a covenant block');
  }

  program.entry = program.covenant.name;
  return program;
}

module.exports = {
  parseLiminalProgram
};
