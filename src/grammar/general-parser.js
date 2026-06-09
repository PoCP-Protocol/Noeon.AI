'use strict';

const { parseEffectTags } = require('./effects');
const { tryParseExpr } = require('./expr');
const { isStdAiExport, isStdUniversalExport, isStdHttpExport, isStdFsExport, isStdGithubExport, isStdWebExport, buildImportContext } = require('../stdlib/registry');
const { tryParseDeclarationLine } = require('./declaration-parser');
const { createDeclarationBundle, normalizeDeclarationEntry } = require('../core/declaration-ir');

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
  delegate: 'DELEGATE',
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

function parseCallStatement(line, importContext = {}) {
  const dottedUni = line.match(/^std\.universal\.([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (dottedUni) {
    return {
      kind: 'stdlib',
      module: 'std.universal',
      exportName: dottedUni[1],
      args: parseCallArgs(dottedUni[2])
    };
  }

  const dottedGithub = line.match(/^std\.github\.([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (dottedGithub) {
    return {
      kind: 'stdlib',
      module: 'std.github',
      exportName: dottedGithub[1],
      args: parseCallArgs(dottedGithub[2])
    };
  }

  const dottedWeb = line.match(/^std\.web\.([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (dottedWeb) {
    return {
      kind: 'stdlib',
      module: 'std.web',
      exportName: dottedWeb[1],
      args: parseCallArgs(dottedWeb[2])
    };
  }

  const dottedFs = line.match(/^std\.fs\.([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (dottedFs) {
    return {
      kind: 'stdlib',
      module: 'std.fs',
      exportName: dottedFs[1],
      args: parseCallArgs(dottedFs[2])
    };
  }

  const dottedHttp = line.match(/^std\.http\.([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (dottedHttp) {
    return {
      kind: 'stdlib',
      module: 'std.http',
      exportName: dottedHttp[1],
      args: parseCallArgs(dottedHttp[2])
    };
  }

  const dotted = line.match(/^std\.ai\.([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (dotted) {
    return {
      kind: 'stdlib',
      module: 'std.ai',
      exportName: dotted[1],
      args: parseCallArgs(dotted[2])
    };
  }

  const m = line.match(/^([a-zA-Z_][\w]*)\s*\((.*)\)\s*;?\s*$/);
  if (!m) return null;

  if (isStdUniversalExport(m[1], importContext)) {
    return {
      kind: 'stdlib',
      module: 'std.universal',
      exportName: m[1],
      args: parseCallArgs(m[2])
    };
  }

  if (isStdGithubExport(m[1], importContext)) {
    return {
      kind: 'stdlib',
      module: 'std.github',
      exportName: m[1],
      args: parseCallArgs(m[2])
    };
  }

  if (isStdWebExport(m[1], importContext)) {
    return {
      kind: 'stdlib',
      module: 'std.web',
      exportName: m[1],
      args: parseCallArgs(m[2])
    };
  }

  if (isStdFsExport(m[1], importContext)) {
    return {
      kind: 'stdlib',
      module: 'std.fs',
      exportName: m[1],
      args: parseCallArgs(m[2])
    };
  }

  if (isStdHttpExport(m[1], importContext)) {
    return {
      kind: 'stdlib',
      module: 'std.http',
      exportName: m[1],
      args: parseCallArgs(m[2])
    };
  }

  if (isStdAiExport(m[1], importContext)) {
    return {
      kind: 'stdlib',
      module: 'std.ai',
      exportName: m[1],
      args: parseCallArgs(m[2])
    };
  }

  return { kind: 'call', callee: m[1], args: parseCallArgs(m[2]) };
}

function parseCallArgs(raw) {
  if (!raw.trim()) return [];
  return raw.split(',').map((a) => {
    const t = a.trim();
    if (/^"[\s\S]*"$/.test(t)) return parseQuoted(t, 0);
    if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
    if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true';
    return t;
  });
}

function parseCognitiveStatement(line, lineNo, importContext = {}) {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '}') return null;

  const call = parseCallStatement(trimmed, importContext);
  if (call) return call;

  const assertMatch = trimmed.match(/^assert\s+(.+)$/i);
  if (assertMatch) {
    const exprSource = assertMatch[1].trim();
    tryParseExpr(exprSource, lineNo);
    return { kind: 'assert', exprSource };
  }

  const letMatch = trimmed.match(/^let\s+([a-zA-Z_][\w]*)\s*=\s*(.+)$/);
  if (letMatch) {
    const exprSource = letMatch[2].trim();
    if (/^"[\s\S]*"$/.test(exprSource)) {
      return { kind: 'let', name: letMatch[1], value: parseQuoted(exprSource, lineNo) };
    }
    tryParseExpr(exprSource, lineNo);
    return { kind: 'let', name: letMatch[1], exprSource };
  }

  const space = trimmed.indexOf(' ');
  if (space === -1) throw new Error(`Line ${lineNo}: invalid statement '${trimmed}'`);
  const kw = trimmed.slice(0, space).toLowerCase();
  const rest = trimmed.slice(space + 1).trim();

  if (isStdUniversalExport(kw, importContext)) {
    return parseStdUniversalStatement(kw, rest, lineNo);
  }

  if (isStdAiExport(kw, importContext)) {
    return parseStdAiStatement(kw, rest, lineNo);
  }

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

function parseStdUniversalStatement(exportName, rest, lineNo) {
  if (!rest.trim()) {
    return { kind: 'stdlib', module: 'std.universal', exportName, args: [], params: {} };
  }
  if (/^"[\s\S]*"$/.test(rest)) {
    return {
      kind: 'stdlib',
      module: 'std.universal',
      exportName,
      args: [parseQuoted(rest, lineNo)],
      params: {}
    };
  }
  const params = parseKeyValuePairs(rest, lineNo);
  return { kind: 'stdlib', module: 'std.universal', exportName, args: [], params };
}

function parseStdAiStatement(exportName, rest, lineNo) {
  if (/^"[\s\S]*"$/.test(rest)) {
    return {
      kind: 'stdlib',
      module: 'std.ai',
      exportName,
      args: [parseQuoted(rest, lineNo)],
      params: {}
    };
  }

  const eqIdx = rest.indexOf('=');
  const spIdx = rest.indexOf(' ');
  if (spIdx > 0 && (eqIdx === -1 || spIdx < eqIdx)) {
    const subjectRaw = rest.slice(0, spIdx);
    const tail = rest.slice(spIdx + 1).trim();
    const subject = /^"[\s\S]*"$/.test(subjectRaw) ? parseQuoted(subjectRaw, lineNo) : subjectRaw;
    return {
      kind: 'stdlib',
      module: 'std.ai',
      exportName,
      args: [subject],
      params: tail ? parseKeyValuePairs(tail, lineNo) : {}
    };
  }

  return {
    kind: 'stdlib',
    module: 'std.ai',
    exportName,
    args: [],
    params: parseKeyValuePairs(rest, lineNo)
  };
}

function parseEffect(line) {
  const parsed = parseEffectTags(line);
  return parsed ? parsed.effect : null;
}

function parseFusionBlock(body, target, lineNo) {
  const fusion = { target: String(target).toLowerCase(), mode: 'field', enabled: true, inject: ['dominant', 'narrative', 'summary'] };
  for (let i = 0; i < body.length; i += 1) {
    const line = body[i];
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const valRaw = line.slice(idx + 1).trim();
    if (/^\[/.test(valRaw)) {
      fusion[key] = valRaw.slice(1, -1).split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    } else if (/^"[\s\S]*"$/.test(valRaw)) {
      fusion[key] = parseQuoted(valRaw, lineNo + i);
    } else if (/^(true|false)$/i.test(valRaw)) {
      fusion[key] = valRaw.toLowerCase() === 'true';
    } else {
      fusion[key] = valRaw;
    }
  }

  if (fusion.target === 'triad') {
    const { expandTriadFusionBlocks } = require('../runtime/fusion/fusion-triad');
    return expandTriadFusionBlocks(fusion);
  }

  if (fusion.target === 'coherence') {
    return { target: 'coherence', enabled: true, ...fusion };
  }

  if (fusion.target === 'relay') {
    return { target: 'relay', enabled: true, ...fusion };
  }

  return fusion;
}

function parseGeneralProgram(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const preImports = [];
  for (const line of lines) {
    const m = stripComment(line).trim().match(/^import\s+(.+)$/i);
    if (m) preImports.push(m[1].replace(/;$/, '').trim());
  }
  const importContext = buildImportContext(preImports);

  const program = {
    profile: 'general',
    version: '1.0.0',
    module: null,
    imports: [],
    declarations: createDeclarationBundle(),
    functions: [],
    exports: [],
    effects: {},
    programBlock: null,
    topLevel: [],
    fusion: [],
    fusionTriad: null
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
        body.push(parseCognitiveStatement(bodyLine, i + 1, importContext));
        i += 1;
      }
      const fn = { ...fnHeader, body, effect: pendingEffect };
      program.functions.push(fn);
      if (fn.exported) program.exports.push(fn.name);
      if (pendingEffect) program.effects[fn.name] = pendingEffect;
      pendingEffect = null;
      continue;
    }

    const fuseMatch = trimmed.match(/^fuse\s+([a-zA-Z_][\w]*)\s*\{\s*$/i);
    if (fuseMatch) {
      const body = [];
      i += 1;
      while (i < lines.length) {
        const bl = stripComment(lines[i]).trim();
        if (bl === '}') { i += 1; break; }
        if (bl) body.push(bl);
        i += 1;
      }
      const parsed = parseFusionBlock(body, fuseMatch[1], lineNo);
      if (Array.isArray(parsed)) {
        program.fusion.push(...parsed);
        if (fuseMatch[1].toLowerCase() === 'triad') program.fusionTriad = { enabled: true };
      } else {
        program.fusion.push(parsed);
        if (parsed.target === 'coherence') program.fusionCoherence = { enabled: true, ...parsed };
        if (parsed.target === 'relay') program.fusionRelay = { enabled: true, ...parsed };
      }
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
        body.push(parseCognitiveStatement(bodyLine, i + 1, importContext));
        i += 1;
      }
      program.programBlock = { name: programMatch[1], body };
      continue;
    }

    const headerMatch = trimmed.match(/^([a-zA-Z_][\w]*)\s+(.+)$/);
    if (headerMatch) {
      const decl = tryParseDeclarationLine(trimmed, lineNo);
      if (decl) {
        const entry = normalizeDeclarationEntry(decl.kind, decl.name, decl.params);
        if (decl.kind === 'model') program.declarations.models.push(entry);
        else if (decl.kind === 'tool') program.declarations.tools.push(entry);
        else if (decl.kind === 'data') program.declarations.data.push(entry);
        else if (decl.kind === 'capability') program.declarations.capabilities.push({ ...entry, name: decl.name, params: decl.params });
        else if (decl.kind === 'effect') program.declarations.effects.push({ ...entry, name: decl.name, params: decl.params });
        i += 1;
        continue;
      }

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
          program.topLevel.push(parseCognitiveStatement(trimmed, lineNo, importContext));
      }
      i += 1;
      continue;
    }

    program.topLevel.push(parseCognitiveStatement(trimmed, lineNo, importContext));
    i += 1;
  }

  program.entry = program.exports.includes('main')
    ? 'main'
    : (program.programBlock?.name || program.functions[0]?.name || 'main');

  program.importContext = buildImportContext(program.imports);

  return program;
}

module.exports = {
  parseGeneralProgram,
  parseCognitiveStatement,
  COGNITIVE_KEYWORDS
};
