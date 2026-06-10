'use strict';

const { lineIndent, collectIndentedLines } = require('./parse-utils');
const { parseFuseConfigBlock } = require('./fuse-block');

function readNestedBlock(lines, startIndex, lineNo) {
  const opener = lines[startIndex].trim();
  let depth = (opener.match(/\{/g) || []).length - (opener.match(/\}/g) || []).length;
  if (depth <= 0) {
    throw new Error(`Line ${lineNo}: expected block '{'`);
  }
  const body = [];
  let index = startIndex + 1;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    depth += (trimmed.match(/\{/g) || []).length;
    depth -= (trimmed.match(/\}/g) || []).length;
    if (depth <= 0) {
      const before = trimmed.replace(/\}\s*$/, '').trim();
      if (before) body.push(before);
      return { body, nextIndex: index + 1 };
    }
    body.push(trimmed);
    index += 1;
  }
  throw new Error(`Line ${lineNo}: unclosed block`);
}

function parseListValue(raw, lineNo) {
  const m = String(raw || '').trim().match(/^\[(.*)\]$/);
  if (!m) return raw;
  const inner = m[1].trim();
  if (!inner) return [];
  return inner.split(',').map((s) => {
    const t = s.trim();
    if (/^"[\s\S]*"$/.test(t)) return t.slice(1, -1);
    return t;
  });
}

function parseAlignBody(blockLines, lineNo) {
  const program = {
    covenant: null,
    beliefs: [],
    resonates: [],
    hypotheses: [],
    proposals: []
  };

  let index = 0;
  while (index < blockLines.length) {
    const line = blockLines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const beliefMatch = line.match(/^belief\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (beliefMatch) {
      const { body, nextIndex } = readNestedBlock(blockLines, index, lineNo + index);
      const belief = { name: beliefMatch[1], claim: null, confidence: 0.5, sources: [] };
      for (let i = 0; i < body.length; i += 1) {
        const idx = body[i].indexOf(':');
        if (idx === -1) continue;
        const key = body[i].slice(0, idx).trim();
        const raw = body[i].slice(idx + 1).trim().replace(/,$/, '');
        if (key === 'claim') {
          belief.claim = /^"[\s\S]*"$/.test(raw) ? raw.slice(1, -1) : raw;
        } else if (key === 'confidence') belief.confidence = Number(raw);
        else if (key === 'sources') belief.sources = parseListValue(raw, lineNo);
      }
      program.beliefs.push(belief);
      index = nextIndex;
      continue;
    }

    const resonateMatch = line.match(/^resonate\s+([a-zA-Z_][\w]*)\s*->\s*([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (resonateMatch) {
      const { body, nextIndex } = readNestedBlock(blockLines, index, lineNo + index);
      const resonate = {
        source: resonateMatch[1],
        target: resonateMatch[2],
        mirror: null
      };
      for (let i = 0; i < body.length; i += 1) {
        const idx = body[i].indexOf(':');
        if (idx === -1) continue;
        const key = body[i].slice(0, idx).trim();
        const raw = body[i].slice(idx + 1).trim().replace(/,$/, '');
        if (key === 'mirror') resonate.mirror = raw.replace(/^"|"$/g, '');
      }
      program.resonates.push(resonate);
      index = nextIndex;
      continue;
    }

    const idx = line.indexOf(':');
    if (idx === -1) {
      index += 1;
      continue;
    }
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim().replace(/,$/, '');
    if (!program.covenant) {
      program.covenant = {
        name: 'InlineAlign',
        intent: null,
        never: [],
        humanMustApprove: [],
        resonanceFloor: 0.7,
        whenUncertain: null
      };
    }
    switch (key) {
      case 'intent':
        program.covenant.intent = raw.replace(/^"|"$/g, '');
        break;
      case 'never':
        program.covenant.never = parseListValue(raw, lineNo);
        break;
      case 'human_must_approve':
        program.covenant.humanMustApprove = parseListValue(raw, lineNo);
        break;
      case 'resonance_floor':
        program.covenant.resonanceFloor = Number(raw);
        break;
      default:
        break;
    }
    index += 1;
  }

  return program;
}

function parseCapabilityStatement(lines, lineIndex, lineNo, rawLine) {
  const trimmed = rawLine.trim();
  const firstSpace = trimmed.indexOf(' ');
  const keyword = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();

  if (!/^\{$/.test(rest)) {
    return { capability: null, nextIndex: lineIndex };
  }

  const parentIndent = lineIndent(rawLine);
  const { blockLines, nextIndex } = collectIndentedLines(lines, lineIndex + 1, parentIndent);
  const body = blockLines.map((entry) => entry.raw.trim()).filter(Boolean);
  const kind = keyword.toUpperCase();

  if (kind === 'CONTRACT') {
    const cfg = parseFuseConfigBlock(blockLines, lineNo);
    return {
      capability: { kind: 'contract', cfg, lineNo },
      nextIndex
    };
  }

  if (kind === 'ALIGN') {
    return {
      capability: { kind: 'align', program: parseAlignBody(body, lineNo), lineNo },
      nextIndex
    };
  }

  if (kind === 'GOVERNANCE') {
    return {
      capability: { kind: 'governance', body, lineNo },
      nextIndex
    };
  }

  return { capability: null, nextIndex: lineIndex };
}

module.exports = {
  parseCapabilityStatement,
  parseAlignBody,
  readNestedBlock
};
