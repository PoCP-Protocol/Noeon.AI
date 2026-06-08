'use strict';

const {
  parseQuoted,
  parseKeyValuePairs,
  parseGovernanceLine,
  lineIndent,
  isSkippableLine,
  collectIndentedLines,
  interpolate
} = require('./parse-utils');
const { parseFuseStatement } = require('./fuse-block');
const { annotateFlowSteps } = require('../core/cognitive-architecture');
const { syncAgentsToUnifiedStack, buildStackManifest } = require('../core/noeon-unified');

const AGENT_GOVERNANCE_KEYWORDS = {
  CONSTITUTION: 'constitutions',
  VOW: 'vows',
  RITUAL: 'rituals',
  STRATEGY: 'strategies',
  GUARANTEE: 'strategies'
};

const DEFAULT_KEYWORD_ALIASES = {
  OBJECTIVE: 'GOAL',
  OBSERVE: 'PERCEIVE',
  EXECUTE: 'ACT',
  EVALUATE: 'FEEDBACK'
};

function parseToolsList(value, lineNo) {
  const trimmed = String(value || '').trim();
  if (!trimmed) throw new Error(`Line ${lineNo}: TOOLS requires a tool list`);

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      return parsed.map((item) => String(item));
    } catch (_err) {
      const quoted = trimmed.match(/"([^"]+)"/g);
      if (quoted?.length) return quoted.map((item) => item.slice(1, -1));
      throw new Error(`Line ${lineNo}: TOOLS array must be valid JSON or quoted list`);
    }
  }

  const quoted = trimmed.match(/"([^"]+)"/g);
  if (quoted?.length) return quoted.map((item) => item.slice(1, -1));
  return trimmed.split(/\s+/).filter(Boolean).map(String);
}

function parseAgentMemory(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!Object.keys(kv).length) throw new Error(`Line ${lineNo}: MEMORY requires key=value pairs`);
  return kv;
}

function parseFlowReflectStep(value, lineNo) {
  if (!value) return { kind: 'reflect' };

  const quoted = value.match(/^"([\s\S]*)"(\s+[\s\S]*)?$/);
  if (quoted) {
    const step = { kind: 'reflect', subject: quoted[1] };
    const rest = (quoted[2] || '').trim();
    if (rest) Object.assign(step, parseKeyValuePairs(rest, lineNo));
    return step;
  }

  return { kind: 'reflect', ...parseKeyValuePairs(value, lineNo) };
}

function parseCognitiveFlowStep(rawLine, lineNo, variables, keywordAliases) {
  const trimmed = rawLine.trim();
  const firstSpace = trimmed.indexOf(' ');
  const rawKeyword = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toUpperCase();
  const keyword = keywordAliases[rawKeyword] || rawKeyword;
  const rawValue = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();
  const value = rawValue ? interpolate(rawValue, variables, lineNo) : '';

  switch (keyword) {
    case 'PERCEIVE':
      return { kind: 'perceive', ...parseKeyValuePairs(value, lineNo) };
    case 'REASON':
      return { kind: 'reason', ...parseKeyValuePairs(value, lineNo) };
    case 'ACT':
      return { kind: 'act', ...parseKeyValuePairs(value, lineNo) };
    case 'REFLECT':
      return parseFlowReflectStep(value, lineNo);
    case 'UNDERSTAND':
      return { kind: 'understand', ...parseKeyValuePairs(value, lineNo) };
    case 'DECIDE':
      return { kind: 'decide', ...parseKeyValuePairs(value, lineNo) };
    case 'FEEDBACK':
      return { kind: 'feedback', ...parseKeyValuePairs(value, lineNo) };
    default:
      throw new Error(`Line ${lineNo}: unsupported FLOW step keyword '${rawKeyword}'`);
  }
}

function parseCognitiveFlowSteps(blockLines, variables, keywordAliases) {
  return blockLines.map((entry) =>
    parseCognitiveFlowStep(entry.raw, entry.lineNo, variables, keywordAliases)
  );
}

function parseAgentBlockBody(blockLines, variables, keywordAliases = DEFAULT_KEYWORD_ALIASES) {
  const agent = {
    goal: null,
    memory: null,
    tools: [],
    policy: {},
    flow: [],
    constitutions: [],
    vows: [],
    rituals: [],
    strategies: []
  };

  let index = 0;
  while (index < blockLines.length) {
    const { raw, lineNo, indent } = blockLines[index];
    const trimmed = raw.trim();
    const firstSpace = trimmed.indexOf(' ');
    const rawKeyword = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toUpperCase();
    const keyword = keywordAliases[rawKeyword] || rawKeyword;
    const rawValue = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();
    const value = rawValue ? interpolate(rawValue, variables, lineNo) : '';

    if (AGENT_GOVERNANCE_KEYWORDS[keyword]) {
      const tier = AGENT_GOVERNANCE_KEYWORDS[keyword];
      agent[tier].push(parseGovernanceLine(value, lineNo, tier.slice(0, -1)));
      index += 1;
      continue;
    }

    switch (keyword) {
      case 'GOAL':
        agent.goal = parseQuoted(value, lineNo);
        index += 1;
        break;
      case 'MEMORY':
        agent.memory = parseAgentMemory(value, lineNo);
        index += 1;
        break;
      case 'TOOLS':
        agent.tools = parseToolsList(value, lineNo);
        index += 1;
        break;
      case 'POLICY':
        agent.policy = { ...agent.policy, ...parseKeyValuePairs(value, lineNo) };
        index += 1;
        break;
      case 'FLOW':
        if (value) {
          throw new Error(`Line ${lineNo}: AGENT FLOW must be an indented block, not inline value`);
        }
        index += 1;
        const subLines = [];
        while (index < blockLines.length && blockLines[index].indent > indent) {
          subLines.push(blockLines[index]);
          index += 1;
        }
        agent.flow = parseCognitiveFlowSteps(subLines, variables, keywordAliases);
        break;
      default:
        throw new Error(`Line ${lineNo}: unsupported AGENT child keyword '${rawKeyword}'`);
    }
  }

  return agent;
}

function promoteAgentToAst(ast, agent) {
  ast.agents.push(agent);

  if (!ast.task) ast.task = agent.name;
  if (!ast.cognition.goal && agent.goal) ast.cognition.goal = agent.goal;
  if (agent.memory && !ast.cognition.memory) {
    const type = agent.memory.type || 'balanced';
    ast.cognition.memory = {
      shortSeconds: Number(agent.memory.short || 300),
      longDays: Number(agent.memory.long || 30),
      mode: String(type).split('+')[0] || 'balanced'
    };
  }

  for (const step of agent.flow) {
    switch (step.kind) {
      case 'perceive':
        ast.cognitive.perceptions.push(step);
        break;
      case 'reason':
        ast.cognitive.reasonings.push(step);
        break;
      case 'act':
        ast.cognition.acts.push(step);
        break;
      case 'reflect':
        ast.cognitive.reflections.push(
          step.subject
            ? { subject: step.subject, depth: step.depth || 'standard', trigger: step.trigger || 'uncertainty' }
            : { subject: 'self', depth: step.depth || 'standard', trigger: step.trigger || 'uncertainty' }
        );
        break;
      case 'understand':
        ast.cognition.understandings.push(step);
        break;
      case 'decide':
        ast.cognitive.decisions.push(step);
        break;
      case 'feedback':
        ast.cognition.feedback.push(step);
        break;
      default:
        break;
    }
  }

  syncAgentsToUnifiedStack(ast);
  for (const agent of ast.agents) {
    agent.flowArchitecture = annotateFlowSteps(agent.flow);
  }
  return ast;
}

function createGeneralAgentAstShell() {
  return {
    language: 'Noeon Unified Language',
    version: '1.0.0-alpha',
    network: null,
    profile: 'general',
    languageProfile: 'general',
    module: null,
    task: null,
    tags: {},
    budget: null,
    deadline: null,
    verify: null,
    cognition: {
      goal: null,
      constraints: {},
      context: {},
      understandings: [],
      risk: null,
      memory: null,
      learn: null,
      nativeAI: null,
      selfCheck: null,
      infer: null,
      critic: null,
      hypotheses: [],
      evidences: [],
      counterexamples: [],
      traces: [],
      debate: null,
      arbitration: null,
      jurors: [],
      plan: [],
      actions: {},
      acts: [],
      feedback: []
    },
    collateral: null,
    onSuccess: null,
    onSlash: null,
    stateFlow: [],
    metaRules: [],
    metaProfile: null,
    compute: { functions: [], bindings: [], branches: [], assertions: [], calls: [], returnExpr: null },
    cognitive: {
      drives: [], attentions: [], workspace: null, predictions: [], perceptions: [],
      intuitions: [], reasonings: [], reflections: [], consolidations: [], decisions: [],
      emotions: [], monitors: [], focuses: [], adaptations: []
    },
    cognitiveFlow: {
      whenSalient: [], ruminations: [], perceiveAll: [], competitions: [],
      habits: [], surpriseHandlers: [], dreams: [], primes: [], inhibitions: []
    },
    social: { spawns: [], delegations: [], debates: [], votes: [], shares: [], dismissals: [] },
    evolution: { evolves: [], mutations: [], syntheses: [], freezes: [] },
    llm: { asks: [], thinkWiths: [], embeds: [] },
    agents: [],
    fusion: [],
    fusionTriad: null,
    next: null,
    liminal: null,
    noeonStack: null
  };
}

function parseGeneralAgentFile(source, options = {}) {
  const lines = source.split(/\r?\n/);
  const ast = createGeneralAgentAstShell();
  const variables = {};
  const keywordAliases = { ...DEFAULT_KEYWORD_ALIASES, ...(options.keywordAliases || {}) };

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
      if (fuseResult.fusionTriad) {
        ast.fusionTriad = fuseResult.fusionTriad;
      }
      ast.fusion.push(...fuseResult.fusionEntries);
      i = fuseResult.nextIndex;
      continue;
    }

    if (rawKeyword === 'AGENT') {
      const name = parseQuoted(rawValue, lineNo);
      const parentIndent = lineIndent(rawLine);
      const { blockLines, nextIndex } = collectIndentedLines(lines, i + 1, parentIndent);
      const body = parseAgentBlockBody(blockLines, variables, keywordAliases);
      promoteAgentToAst(ast, { name, ...body });
      i = nextIndex - 1;
      continue;
    }

    const value = interpolate(rawValue, variables, lineNo);
    switch (rawKeyword) {
      case 'PROFILE':
        ast.profile = parseQuoted(value, lineNo).toLowerCase();
        ast.languageProfile = ast.profile;
        break;
      case 'VERSION':
        ast.version = parseQuoted(value, lineNo);
        break;
      case 'MODULE':
        ast.module = parseQuoted(value, lineNo);
        break;
      case 'GOAL':
        ast.cognition.goal = parseQuoted(value, lineNo);
        if (!ast.next) ast.next = {};
        ast.next.goal = { text: ast.cognition.goal };
        break;
      default:
        break;
    }
  }

  ast.detectedSurface = 'general';
  ast.noeonStack = buildStackManifest(ast);
  return ast;
}

module.exports = {
  DEFAULT_KEYWORD_ALIASES,
  parseToolsList,
  parseAgentBlockBody,
  promoteAgentToAst,
  parseGeneralAgentFile,
  createGeneralAgentAstShell,
  lineIndent,
  isSkippableLine,
  collectIndentedLines,
  parseCognitiveFlowStep,
  parseCognitiveFlowSteps
};
