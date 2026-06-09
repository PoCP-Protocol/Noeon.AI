'use strict';

function parseQuoted(raw, lineNo) {
  if (!/^"[\s\S]*"$/.test(raw)) {
    throw new Error(`Line ${lineNo}: expected quoted string`);
  }
  return raw.slice(1, -1);
}

function parseDeclarationParams(input, lineNo) {
  const parts = input.match(/(?:[^\s"]+="[\s\S]*?"|[^\s"]+)/g) || [];
  const out = {};
  for (const part of parts) {
    const m = part.match(/^([a-zA-Z_][\w]*)=(.+)$/);
    if (!m) throw new Error(`Line ${lineNo}: invalid declaration param '${part}'`);
    const key = m[1];
    const raw = m[2];
    if (/^\[[\s\S]*\]$/.test(raw)) {
      out[key] = raw.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else if (/^"[\s\S]*"$/.test(raw)) {
      out[key] = parseQuoted(raw, lineNo);
    } else if (/^(true|false)$/i.test(raw)) {
      out[key] = raw.toLowerCase() === 'true';
    } else if (/^\d+(\.\d+)?$/.test(raw)) {
      out[key] = Number(raw);
    } else {
      out[key] = raw;
    }
  }
  return out;
}

function parseNamedDeclaration(keyword, rest, lineNo) {
  const space = rest.indexOf(' ');
  const name = space === -1 ? rest.trim() : rest.slice(0, space).trim();
  if (!name || !/^[a-zA-Z_][\w]*$/.test(name)) {
    throw new Error(`Line ${lineNo}: ${keyword} requires a name identifier`);
  }
  const tail = space === -1 ? '' : rest.slice(space + 1).trim();
  const params = tail ? parseDeclarationParams(tail, lineNo) : {};
  return { kind: keyword.toLowerCase(), name, params };
}

const DECLARATION_KEYWORDS = new Set(['model', 'tool', 'capability', 'effect']);

function tryParseDeclarationLine(trimmed, lineNo) {
  const m = trimmed.match(/^([a-zA-Z_][\w]*)\s+(.+)$/);
  if (!m) return null;
  const key = m[1].toLowerCase();
  if (!DECLARATION_KEYWORDS.has(key)) return null;
  return parseNamedDeclaration(key, m[2].trim(), lineNo);
}

module.exports = {
  DECLARATION_KEYWORDS,
  parseDeclarationParams,
  parseNamedDeclaration,
  tryParseDeclarationLine
};
