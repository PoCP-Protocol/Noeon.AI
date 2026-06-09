'use strict';

/**
 * Epoch 9 — Universal Profile parser.
 * Six-dimension AI-native general programming surface.
 */

const {
  parseQuoted,
  parseKeyValuePairs,
  lineIndent,
  isSkippableLine,
  collectIndentedLines,
  interpolate
} = require('./parse-utils');
const {
  parseToolsList,
  parseCognitiveFlowSteps,
  DEFAULT_KEYWORD_ALIASES
} = require('./agent-block');
const { parseFuseStatement } = require('./fuse-block');

const DIMENSION_KEYWORDS = new Set([
  'INTENT', 'EPISTEMIC', 'COGNITION', 'CAPABILITY', 'GOVERNANCE', 'EVOLUTION'
]);

function parseJsonOrList(value, lineNo) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return parseToolsList(trimmed, lineNo);
    }
  }
  if (/^"[\s\S]*"$/.test(trimmed)) return [parseQuoted(trimmed, lineNo)];
  return trimmed.split(/\s+/).filter(Boolean);
}

function parseIntentSection(blockLines, variables) {
  const intent = { goal: null, metrics: {}, constraints: {} };
  for (const entry of blockLines) {
    const raw = entry.raw.trim();
    const firstSpace = raw.indexOf(' ');
    const keyword = (firstSpace === -1 ? raw : raw.slice(0, firstSpace)).toUpperCase();
    const value = firstSpace === -1 ? '' : interpolate(raw.slice(firstSpace + 1).trim(), variables, entry.lineNo);

    if (!intent.goal && /^"[\s\S]*"$/.test(value)) {
      intent.goal = parseQuoted(value, entry.lineNo);
      continue;
    }
    if (keyword === 'OBJECTIVE' || keyword === 'GOAL') {
      intent.goal = parseQuoted(value, entry.lineNo);
    } else if (keyword === 'METRIC' || keyword === 'SUCCESS_METRIC') {
      Object.assign(intent.metrics, parseKeyValuePairs(value, entry.lineNo));
    } else {
      Object.assign(intent.constraints, parseKeyValuePairs(raw, entry.lineNo));
    }
  }
  intent.text = intent.goal;
  intent.empty = !intent.goal;
  return intent;
}

function parseLooseDirective(raw, lineNo) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return {};
  try {
    return parseKeyValuePairs(trimmed, lineNo);
  } catch {
    const m = trimmed.match(/^([a-zA-Z_][\w]*)\s+([\s\S]+)$/);
    if (!m) return {};
    const key = m[1];
    let val = m[2].trim();
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (/^\d+(\.\d+)?$/.test(val)) val = Number(val);
    else if (/^"[\s\S]*"$/.test(val)) val = parseQuoted(val, lineNo);
    return { [key]: val };
  }
}

function parseEpistemicSection(blockLines, variables) {
  const epistemic = { empty: true };
  for (const entry of blockLines) {
    const raw = entry.raw.trim();
    const kv = parseLooseDirective(interpolate(raw, variables, entry.lineNo), entry.lineNo);
    for (const [k, v] of Object.entries(kv)) {
      if (k === 'require_citation' || k === 'audit') {
        epistemic[k] = v === true || v === 'true';
      } else if (k === 'confidence_floor' || k === 'resonance_floor') {
        epistemic[k] = Number(v);
      } else if (k === 'sources' || k === 'evidence_sources') {
        epistemic.sources = parseJsonOrList(v, entry.lineNo);
      } else {
        epistemic[k] = v;
      }
    }
  }
  epistemic.empty = epistemic.require_citation == null && epistemic.confidence_floor == null;
  return epistemic;
}

function parseCognitionSection(blockLines, variables, keywordAliases) {
  const cognition = { flow: [], empty: true };
  let index = 0;

  while (index < blockLines.length) {
    const { raw, lineNo, indent } = blockLines[index];
    const trimmed = raw.trim();
    const keyword = trimmed.split(/\s+/)[0].toUpperCase();

    if (keyword === 'FLOW') {
      index += 1;
      const subLines = [];
      while (index < blockLines.length && blockLines[index].indent > indent) {
        subLines.push(blockLines[index]);
        index += 1;
      }
      cognition.flow = parseCognitiveFlowSteps(subLines, variables, keywordAliases);
      continue;
    }

    cognition.flow.push(parseCognitiveFlowSteps([blockLines[index]], variables, keywordAliases)[0]);
    index += 1;
  }

  cognition.empty = cognition.flow.length === 0;
  return cognition;
}

function parseCapabilitySection(blockLines, variables) {
  const capability = { tools: [], plugins: [], compute: null, empty: true };
  for (const entry of blockLines) {
    const raw = entry.raw.trim();
    const firstSpace = raw.indexOf(' ');
    const keyword = (firstSpace === -1 ? raw : raw.slice(0, firstSpace)).toUpperCase();
    const value = firstSpace === -1 ? '' : interpolate(raw.slice(firstSpace + 1).trim(), variables, entry.lineNo);

    if (keyword === 'TOOLS') {
      capability.tools = parseToolsList(value, entry.lineNo);
    } else if (keyword === 'PLUGINS') {
      capability.plugins = parseJsonOrList(value, entry.lineNo);
    } else if (keyword === 'COMPUTE') {
      capability.compute = parseKeyValuePairs(value || 'enabled=true', entry.lineNo);
    } else if (keyword === 'MEMORY') {
      capability.memory = parseLooseDirective(value, entry.lineNo);
    } else {
      capability[keyword.toLowerCase()] = value;
    }
  }
  capability.empty = !capability.tools.length && !capability.compute && !capability.plugins.length;
  return capability;
}

function parseGovernanceSection(blockLines, variables) {
  const governance = { policy: {}, empty: true };
  for (const entry of blockLines) {
    const raw = entry.raw.trim();
    const firstSpace = raw.indexOf(' ');
    const keyword = (firstSpace === -1 ? raw : raw.slice(0, firstSpace)).toUpperCase();
    const value = firstSpace === -1 ? '' : interpolate(raw.slice(firstSpace + 1).trim(), variables, entry.lineNo);

    if (keyword === 'POLICY') {
      Object.assign(governance.policy, parseLooseDirective(value, entry.lineNo));
    } else if (keyword === 'BUDGET') {
      governance.budget = parseLooseDirective(value, entry.lineNo);
    } else if (keyword === 'HUMAN_MUST_APPROVE') {
      governance.human_must_approve = parseJsonOrList(value, entry.lineNo);
    } else {
      Object.assign(governance, parseLooseDirective(raw, entry.lineNo));
    }
  }
  governance.empty = !Object.keys(governance.policy).length && !governance.budget && !governance.human_must_approve;
  return governance;
}

function parseEvolutionSection(blockLines, variables) {
  const evolution = { empty: true };
  for (const entry of blockLines) {
    const raw = entry.raw.trim();
    const firstSpace = raw.indexOf(' ');
    const keyword = (firstSpace === -1 ? raw : raw.slice(0, firstSpace)).toUpperCase();
    const value = firstSpace === -1 ? '' : interpolate(raw.slice(firstSpace + 1).trim(), variables, entry.lineNo);

    if (keyword === 'LEARN') {
      evolution.learn = parseLooseDirective(value, entry.lineNo);
    } else if (keyword === 'SELF') {
      const kv = parseLooseDirective(value || 'improve=true', entry.lineNo);
      evolution.self_improve = kv.improve === true || kv.improve === 'true';
      evolution.dream = kv.dream === true || kv.dream === 'true';
    } else if (keyword === 'EVOLVE') {
      evolution.evolve = parseLooseDirective(value, entry.lineNo);
    } else {
      Object.assign(evolution, parseLooseDirective(raw, entry.lineNo));
    }
  }
  evolution.empty = !evolution.learn && !evolution.self_improve && !evolution.evolve;
  return evolution;
}

function parseDimensionBody(keyword, blockLines, variables, keywordAliases) {
  switch (keyword) {
    case 'INTENT': return parseIntentSection(blockLines, variables);
    case 'EPISTEMIC': return parseEpistemicSection(blockLines, variables);
    case 'COGNITION': return parseCognitionSection(blockLines, variables, keywordAliases);
    case 'CAPABILITY': return parseCapabilitySection(blockLines, variables);
    case 'GOVERNANCE': return parseGovernanceSection(blockLines, variables);
    case 'EVOLUTION': return parseEvolutionSection(blockLines, variables);
    default:
      throw new Error(`Unknown universal dimension '${keyword}'`);
  }
}

function parseUniversalBlock(name, blockLines, variables, keywordAliases) {
  const dimensions = {};
  let index = 0;

  while (index < blockLines.length) {
    const { raw, lineNo, indent } = blockLines[index];
    const trimmed = raw.trim();
    const firstSpace = trimmed.indexOf(' ');
    const keyword = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toUpperCase();
    const inlineValue = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();

    if (!DIMENSION_KEYWORDS.has(keyword)) {
      index += 1;
      continue;
    }

    const dimKey = keyword.toLowerCase();

    if (keyword === 'INTENT' && /^"[\s\S]*"$/.test(inlineValue)) {
      dimensions.intent = {
        goal: parseQuoted(inlineValue, lineNo),
        text: parseQuoted(inlineValue, lineNo),
        metrics: {},
        constraints: {},
        empty: false
      };
      index += 1;
      continue;
    }

    index += 1;
    const inner = [];
    while (index < blockLines.length && blockLines[index].indent > indent) {
      inner.push(blockLines[index]);
      index += 1;
    }

    if (keyword === 'INTENT' && inlineValue) {
      inner.unshift({ raw: inlineValue, lineNo, indent: indent + 2 });
    }

    dimensions[dimKey] = inner.length
      ? parseDimensionBody(keyword, inner, variables, keywordAliases)
      : { empty: true };
  }

  return { name, dimensions, schema: 'noeon.universal/v1' };
}

function parseUniversalProgram(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const variables = {};
  const keywordAliases = { ...DEFAULT_KEYWORD_ALIASES, ...(options.keywordAliases || {}) };
  let profile = 'universal';
  let version = '1.0.0';
  let universal = null;
  const header = { fuse: [] };
  const imports = [];

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const rawLine = lines[i];
    if (isSkippableLine(rawLine)) continue;

    const raw = rawLine.trim();
    const firstSpace = raw.indexOf(' ');
    if (firstSpace === -1) continue;

    const rawKeyword = raw.slice(0, firstSpace).toUpperCase();
    const rawValue = raw.slice(firstSpace + 1).trim();

    if (rawKeyword === 'FUSE') {
      const fuseResult = parseFuseStatement(lines, i, lineNo, rawLine, rawValue);
      header.fusionTriad = fuseResult.fusionTriad || header.fusionTriad;
      header.fusionRelay = fuseResult.fusionRelay || header.fusionRelay;
      header.fuse.push(...fuseResult.fusionEntries);
      i = fuseResult.nextIndex;
      continue;
    }

    if (rawKeyword === 'UNIVERSAL') {
      const name = parseQuoted(rawValue, lineNo);
      const parentIndent = lineIndent(rawLine);
      const { blockLines, nextIndex } = collectIndentedLines(lines, i + 1, parentIndent);
      universal = parseUniversalBlock(name, blockLines, variables, keywordAliases);
      i = nextIndex - 1;
      continue;
    }

    const value = interpolate(rawValue, variables, lineNo);
    if (/^import\s+/i.test(raw)) {
      imports.push(raw.replace(/^import\s+/i, '').replace(/;$/, '').trim());
      continue;
    }
    switch (rawKeyword) {
      case 'PROFILE':
        profile = parseQuoted(value, lineNo).toLowerCase();
        break;
      case 'VERSION':
        version = parseQuoted(value, lineNo);
        break;
      default:
        break;
    }
  }

  if (!universal) {
    throw new Error('Universal program requires UNIVERSAL "Name" block with six dimensions');
  }

  return {
    profile,
    version,
    imports,
    universal,
    header
  };
}

module.exports = {
  DIMENSION_KEYWORDS,
  parseUniversalProgram,
  parseDimensionBody
};
