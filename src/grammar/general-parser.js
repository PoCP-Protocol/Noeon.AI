'use strict';

const COGNITIVE_KEYWORDS = {
  observe: 'PERCEIVE',
  perceive: 'PERCEIVE',
  predict: 'PREDICT',
  intuit: 'INTUIT',
  reason: 'REASON',
  understand: 'UNDERSTAND',
  decide: 'DECIDE',
  reflect: 'REFLECT',
  consolidate: 'CONSOLIDATE',
  act: 'ACT',
  feedback: 'FEEDBACK',
  monitor: 'MONITOR',
  focus: 'FOCUS',
  adapt: 'ADAPT',
  attend: 'ATTEND',
  emotion: 'EMOTION',
  remember: 'CONSOLIDATE',
  spawn: 'SPAWN',
  debate: 'DEBATE',
  evolve: 'EVOLVE'
};

function stripComment(line) {
  const idx = line.indexOf('#');
  return idx >= 0 ? line.slice(0, idx) : line;
}

function parseQuoted(value, lineNo) {
  const m = value.match(/^"([\s\S]*)"$/);
  if (!m) throw new Error(`Line ${lineNo}: expected quoted string, got '${value}'`);
  return m[1];
}

function parseKeyValuePairs(input, lineNo) {
  const parts = input.match(/(?:[^\s"]+="[\s\S]*?"|[^\s"]+)/g) || [];
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

function parseFunctionHeader(line, lineNo) {
  const exportMatch = line.match(/^export\s+fn\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)\s*(?:->\s*([^{]+))?\s*\{\s*$/);
  const fnMatch = line.match(/^fn\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)\s*(?:->\s*([^{]+))?\s*\{\s*$/);
  const match = exportMatch || fnMatch;
  if (!match) return null;

  const params = match[2].trim()
    ? match[2].split(',').map((p) => {
        const [name, type] = p.trim().split(':').map((s) => s.trim());
        return { name, type: type || 'any' };
      })
    : [];

  return {
    name: match[1],
    params,
    returnType: match[3]?.trim() || null,
    exported: Boolean(exportMatch)
  };
}

function parseCallStatement(line) {
  const m = line.match(/^([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (!m) return null;
  const args = m[2].trim()
    ? m[2].split(',').map((a) => {
        const t = a.trim();
        if (/^"[\s\S]*"$/.test(t)) return parseQuoted(t, 0);
        if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
        return t;
      })
    : [];
  return { callee: m[1], args };
}

function parseCognitiveStatement(line, lineNo) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '}') return null;

  const call = parseCallStatement(trimmed);
  if (call) return { kind: 'call', ...call };

  const letMatch = trimmed.match(/^let\s+([a-zA-Z_][\w]*)\s*=\s*(.+)$/);
  if (letMatch) {
    const raw = letMatch[2].trim();
    return {
      kind: 'let',
      name: letMatch[1],
      value: /^"[\s\S]*"$/.test(raw) ? parseQuoted(raw, lineNo) : raw
    };
  }

  const space = trimmed.indexOf(' ');
  if (space === -1) throw new Error(`Line ${lineNo}: invalid statement '${trimmed}'`);
  const kw = trimmed.slice(0, space).toLowerCase();
  const rest = trimmed.slice(space + 1).trim();
  const canonical = COGNITIVE_KEYWORDS[kw];
  if (!canonical) throw new Error(`Line ${lineNo}: unknown cognitive statement '${kw}'`);

  if (canonical === 'REFLECT' && /^"[\s\S]*"/.test(rest)) {
    const subject = parseQuoted(rest.match(/^"[\s\S]*"/)[0], lineNo);
    const tail = rest.slice(rest.indexOf('"', 1) + 1).trim();
    const kv = tail ? parseKeyValuePairs(tail, lineNo) : {};
    return { kind: 'cognitive', keyword: canonical, subject, params: kv };
  }

  if (/^"[\s\S]*"$/.test(rest)) {
    return { kind: 'cognitive', keyword: canonical, subject: parseQuoted(rest, lineNo), params: {} };
  }

  const eqIdx = rest.indexOf('=');
  const spIdx = rest.indexOf(' ');
  if (spIdx > 0 && (eqIdx === -1 || spIdx < eqIdx)) {
    const subject = rest.slice(0, spIdx);
    const tail = rest.slice(spIdx + 1).trim();
    return {
      kind: 'cognitive',
      keyword: canonical,
      subject,
      params: tail ? parseKeyValuePairs(tail, lineNo) : {}
    };
  }

  return { kind: 'cognitive', keyword: canonical, params: parseKeyValuePairs(rest, lineNo) };
}

function parseEffect(line) {
  const m = line.match(/^@effect\s*\(\s*(pure|io|ai|external)\s*\)\s*$/i);
  return m ? m[1].toLowerCase() : null;
}

function parseGeneralProgram(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const program = {
    profile: 'general',
    version: '1.0.0-alpha',
    module: null,
    imports: [],
    functions: [],
    exports: [],
    effects: {},
    programBlock: null,
    topLevel: []
  };

  let pendingEffect = null;
  let i = 0;

  while (i < lines.length) {
    const lineNo = i + 1;
    const raw = stripComment(lines[i]);
    if (!raw.trim()) { i += 1; continue; }

    const trimmed = raw.trim();

    if (trimmed === '{') {
      throw new Error(`Line ${lineNo}: unexpected standalone '{'`);
    }

    const effect = parseEffect(trimmed);
    if (effect) {
      pendingEffect = effect;
      i += 1;
      continue;
    }

    const fnHeader = parseFunctionHeader(trimmed, lineNo);
    if (fnHeader) {
      const body = [];
      i += 1;
      while (i < lines.length) {
        const bodyLine = stripComment(lines[i]);
        if (bodyLine.trim() === '}') { i += 1; break; }
        if (!bodyLine.trim()) { i += 1; continue; }
        body.push(parseCognitiveStatement(bodyLine, i + 1));
        i += 1;
      }
      const fn = { ...fnHeader, body, effect: pendingEffect };
      program.functions.push(fn);
      if (fn.exported) program.exports.push(fn.name);
      if (pendingEffect) program.effects[fn.name] = pendingEffect;
      pendingEffect = null;
      continue;
    }

    const programMatch = trimmed.match(/^program\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (programMatch) {
      const body = [];
      i += 1;
      while (i < lines.length) {
        const bodyLine = stripComment(lines[i]);
        if (bodyLine.trim() === '}') { i += 1; break; }
        if (!bodyLine.trim()) { i += 1; continue; }
        const bt = bodyLine.trim();
        const obj = bt.match(/^objective\s+(.+)$/i);
        if (obj) {
          body.push({ kind: 'objective', value: parseQuoted(obj[1].trim(), i + 1) });
          i += 1;
          continue;
        }
        const ctx = bt.match(/^context\s+(.+)$/i);
        if (ctx) {
          body.push({ kind: 'context', params: parseKeyValuePairs(ctx[1].trim(), i + 1) });
          i += 1;
          continue;
        }
        body.push(parseCognitiveStatement(bodyLine, i + 1));
        i += 1;
      }
      program.programBlock = { name: programMatch[1], body };
      continue;
    }

    const headerMatch = trimmed.match(/^([a-zA-Z_][\w]*)\s+(.+)$/);
    if (headerMatch) {
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
        case 'import':
          program.imports.push(value.replace(/;$/, '').trim());
          break;
        case 'objective':
        case 'goal':
          program.objective = parseQuoted(value, lineNo);
          break;
        case 'context':
          program.context = parseKeyValuePairs(value, lineNo);
          break;
        default:
          program.topLevel.push(parseCognitiveStatement(trimmed, lineNo));
      }
      i += 1;
      continue;
    }

    program.topLevel.push(parseCognitiveStatement(trimmed, lineNo));
    i += 1;
  }

  program.entry = program.exports.includes('main')
    ? 'main'
    : (program.programBlock?.name || program.functions[0]?.name || 'main');

  return program;
}

module.exports = {
  parseGeneralProgram,
  parseCognitiveStatement,
  COGNITIVE_KEYWORDS
};
