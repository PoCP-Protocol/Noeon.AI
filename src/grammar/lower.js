'use strict';

const { syncAgentsToUnifiedStack, buildStackManifest } = require('../core/noeon-unified');
const { NOEON_VERSION } = require('../core/release-version');

/**
 * Lower General Profile AST → legacy AEL AST (for Unified VM / Cognitive IR).
 */

function createLegacyAstShell(general) {
  return {
    language: 'Noeon General Language',
    version: general.version || NOEON_VERSION,
    profile: general.profile || 'general',
    languageProfile: general.profile || 'general',
    module: general.module,
    network: general.module ? `${general.module}-net` : 'noeon-local',
    task: general.entry || general.programBlock?.name || 'main',
    tags: {},
    budget: null,
    deadline: null,
    verify: null,
    cognition: {
      goal: general.objective || null,
      constraints: {},
      context: {},
      understandings: [],
      risk: { level: 'medium', profile: 'balanced', impact: 'standard' },
      memory: { shortSeconds: 300, longDays: 30, mode: 'balanced' },
      learn: { signal: 'reward', rate: 0.1, windowTasks: 100 },
      nativeAI: { mode: 'hybrid', autonomy: 'native', reflection: 'adaptive', selfCheck: true },
      selfCheck: { metric: 'uncertainty', threshold: 0.35, action: 'escalate' },
      infer: { strategy: 'hybrid', depth: 4, diversity: 3 },
      critic: { mode: 'self', strictness: 3, veto: false },
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
      drives: [],
      attentions: [],
      workspace: null,
      predictions: [],
      perceptions: [],
      intuitions: [],
      reasonings: [],
      reflections: [],
      consolidations: [],
      decisions: [],
      emotions: [],
      monitors: [],
      focuses: [],
      adaptations: []
    },
    cognitiveFlow: {
      whenSalient: [], ruminations: [], perceiveAll: [], competitions: [],
      habits: [], surpriseHandlers: [], dreams: [], primes: [], inhibitions: []
    },
    social: { spawns: [], delegations: [], debates: [], votes: [], shares: [], dismissals: [] },
    evolution: { evolves: [], mutations: [], syntheses: [], freezes: [] },
    llm: { asks: [], thinkWiths: [], embeds: [] },
    agents: [],
    general: {
      imports: general.imports || [],
      declarations: general.declarations || null,
      functions: general.functions || [],
      exports: general.exports || [],
      effects: general.effects || {},
      importContext: general.importContext || null,
      assertions: [],
      fusion: general.fusion || []
    }
  };
}

const { evalExprSource } = require('./expr');

const { expandUniversalStdlibCall } = require('./universal-stdlib-inline');

function extractStdCallParams(args = [], paramBindings = {}) {
  const positional = [];
  const params = {};
  for (const raw of args) {
    const arg = substValue(raw, paramBindings);
    if (typeof arg === 'string') {
      const m = arg.match(/^([a-zA-Z_][\w]*)=(.+)$/);
      if (m) {
        const val = m[2];
        params[m[1]] = val === 'true' ? true : val === 'false' ? false : val.replace(/^"|"$/g, '');
        continue;
      }
    }
    positional.push(arg);
  }
  return { positional, params };
}

function applyStdHttpStatement(ast, stmt, paramBindings = {}) {
  const { positional, params: argParams } = extractStdCallParams(stmt.args || [], paramBindings);
  const p = { ...argParams, ...substParams(stmt.params || {}, paramBindings) };
  const url = positional[0] || p.url || p.endpoint;
  const step = p.step || `http_${stmt.exportName}_${(ast.cognition.acts.length || 0) + 1}`;
  const method = stmt.exportName === 'post'
    ? 'POST'
    : stmt.exportName === 'fetch'
      ? String(p.method || 'GET').toUpperCase()
      : String(p.method || 'GET').toUpperCase();

  ast.cognition.acts.push({
    action: stmt.exportName,
    channel: 'http',
    plugin: 'http_call',
    step,
    url,
    method,
    body: p.body || null,
    mock: p.mock,
    timeout_ms: p.timeout_ms,
    allow_hosts: p.allow_hosts,
    allow_private: p.allow_private
  });

  ast.cognition.actions[step] = {
    plugin: 'http_call',
    endpoint: url,
    url,
    method,
    body: p.body || null,
    mock: p.mock === true || String(p.mock).toLowerCase() === 'true',
    timeout_ms: p.timeout_ms != null ? Number(p.timeout_ms) : 5000,
    allow_hosts: p.allow_hosts,
    allow_private: p.allow_private
  };
}

function resolveGithubUrl(rawPath) {
  const pathValue = String(rawPath || '');
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  const normalized = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  return `https://api.github.com${normalized}`;
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.NOEON_GITHUB_TOKEN;
  if (!token) return 'Accept=application/vnd.github+json';
  return `Accept=application/vnd.github+json,Authorization=Bearer ${token}`;
}

function applyStdGithubStatement(ast, stmt, paramBindings = {}) {
  const { positional, params: argParams } = extractStdCallParams(stmt.args || [], paramBindings);
  const p = { ...argParams, ...substParams(stmt.params || {}, paramBindings) };
  const rawPath = positional[0] || p.path || p.repo;
  const repoPath = stmt.exportName === 'repo' && rawPath && !String(rawPath).startsWith('/')
    ? `/repos/${rawPath}`
    : rawPath;
  const url = resolveGithubUrl(repoPath);
  const step = p.step || `github_${stmt.exportName}_${(ast.cognition.acts.length || 0) + 1}`;
  const method = stmt.exportName === 'post' ? 'POST' : 'GET';
  const body = positional[1] || p.body || null;

  ast.cognition.acts.push({
    action: stmt.exportName,
    channel: 'http',
    plugin: 'http_call',
    step,
    url,
    method,
    body,
    mock: p.mock,
    allow_hosts: 'api.github.com',
    timeout_ms: p.timeout_ms
  });

  ast.cognition.actions[step] = {
    plugin: 'http_call',
    endpoint: url,
    url,
    method,
    body,
    headers: githubHeaders(),
    mock: p.mock === true || String(p.mock).toLowerCase() === 'true',
    timeout_ms: p.timeout_ms != null ? Number(p.timeout_ms) : 8000,
    allow_hosts: 'api.github.com'
  };
}

function applyStdWebStatement(ast, stmt, paramBindings = {}) {
  const { positional, params: argParams } = extractStdCallParams(stmt.args || [], paramBindings);
  const p = { ...argParams, ...substParams(stmt.params || {}, paramBindings) };
  const url = positional[0] || p.url;
  const step = p.step || `web_${stmt.exportName}_${(ast.cognition.acts.length || 0) + 1}`;
  const extract = stmt.exportName === 'title'
    ? 'title'
    : stmt.exportName === 'text'
      ? 'text'
      : null;

  ast.cognition.acts.push({
    action: stmt.exportName,
    channel: 'web',
    plugin: 'http_call',
    step,
    url,
    method: 'GET',
    extract,
    mock: p.mock,
    timeout_ms: p.timeout_ms,
    allow_hosts: p.allow_hosts,
    allow_private: p.allow_private
  });

  ast.cognition.actions[step] = {
    plugin: 'http_call',
    endpoint: url,
    url,
    method: 'GET',
    extract,
    mock: p.mock === true || String(p.mock).toLowerCase() === 'true',
    timeout_ms: p.timeout_ms != null ? Number(p.timeout_ms) : 8000,
    allow_hosts: p.allow_hosts,
    allow_private: p.allow_private
  };
}

function applyStdFsStatement(ast, stmt, paramBindings = {}) {
  const { positional, params: argParams } = extractStdCallParams(stmt.args || [], paramBindings);
  const p = { ...argParams, ...substParams(stmt.params || {}, paramBindings) };
  const filePath = positional[0] || p.path || p.file;
  const step = p.step || `fs_${stmt.exportName}_${(ast.cognition.acts.length || 0) + 1}`;
  const op = stmt.exportName === 'write' ? 'write' : stmt.exportName === 'list' ? 'list' : 'read';
  const content = positional[1] || p.content || p.body || null;

  ast.cognition.acts.push({
    action: stmt.exportName,
    channel: 'fs',
    plugin: 'fs_call',
    step,
    path: filePath,
    op,
    content,
    mock: p.mock,
    allow_paths: p.allow_paths,
    allow_write: p.allow_write,
    root: p.root
  });

  ast.cognition.actions[step] = {
    plugin: 'fs_call',
    op,
    path: filePath,
    content,
    mock: p.mock === true || String(p.mock).toLowerCase() === 'true',
    allow_paths: p.allow_paths,
    allow_write: p.allow_write,
    root: p.root
  };
}

function applyStdlibStatement(ast, stmt, paramBindings = {}) {
  if (stmt.module === 'std.universal') {
    applyStdUniversalStatement(ast, stmt, paramBindings);
    return;
  }
  if (stmt.module === 'std.http') {
    applyStdHttpStatement(ast, stmt, paramBindings);
    return;
  }
  if (stmt.module === 'std.fs') {
    applyStdFsStatement(ast, stmt, paramBindings);
    return;
  }
  if (stmt.module === 'std.github') {
    applyStdGithubStatement(ast, stmt, paramBindings);
    return;
  }
  if (stmt.module === 'std.web') {
    applyStdWebStatement(ast, stmt, paramBindings);
    return;
  }

  const p = substParams(stmt.params || {}, paramBindings);
  const arg0 = stmt.args?.[0] != null ? substValue(stmt.args[0], paramBindings) : null;

  switch (stmt.exportName) {
    case 'ask':
      ast.llm.asks.push({
        query: arg0 || p.query || 'unknown',
        model: p.model || 'default',
        temperature: p.temperature !== undefined ? Number(p.temperature) : 0.7,
        max_tokens: p.max_tokens !== undefined ? Number(p.max_tokens) : 2048,
        context: p.context || 'workspace'
      });
      break;
    case 'embed':
      ast.llm.embeds.push({
        text: arg0 || p.text || 'unknown',
        store_as: p.store_as || null,
        tags: p.tags ? String(p.tags).split(',').map((t) => t.trim()) : []
      });
      break;
    case 'think_with':
      ast.llm.thinkWiths.push({
        query: arg0 || p.query || 'unknown',
        model: p.model || 'gpt-5-nano',
        strategy: p.strategy || 'analytical',
        depth: p.depth !== undefined ? Number(p.depth) : 3
      });
      break;
    default:
      break;
  }
}

function applyStdUniversalStatement(ast, stmt, paramBindings = {}) {
  const expanded = expandUniversalStdlibCall(
    stmt.exportName,
    (stmt.args || []).map((a) => substValue(a, paramBindings)),
    substParams(stmt.params || {}, paramBindings)
  );

  ast.general = ast.general || {};
  ast.general.universalInline = ast.general.universalInline || [];
  ast.general.universalInline.push(...(expanded.fragments || []));

  for (const inner of expanded.statements || []) {
    applyCognitiveStatement(ast, inner, paramBindings);
  }
}

function applyCognitiveStatement(ast, stmt, paramBindings = {}) {
  if (!stmt) return;
  if (stmt.kind === 'objective') {
    ast.cognition.goal = stmt.value;
    return;
  }
  if (stmt.kind === 'context') {
    ast.cognition.context = { ...ast.cognition.context, ...substParams(stmt.params || {}, paramBindings) };
    return;
  }
  if (stmt.kind === 'let') {
    if (stmt.exprSource) {
      const env = { ...paramBindings, ...ast.cognition.context };
      ast.cognition.context[stmt.name] = evalExprSource(stmt.exprSource, env);
    } else {
      ast.cognition.context[stmt.name] = substValue(stmt.value, paramBindings);
    }
    return;
  }
  if (stmt.kind === 'assert') {
    ast.general.assertions.push({ expr: stmt.exprSource });
    return;
  }
  if (stmt.kind === 'stdlib') {
    applyStdlibStatement(ast, stmt, paramBindings);
    return;
  }
  if (stmt.kind === 'call') {
    ast.compute.calls.push({
      fn: stmt.callee,
      args: stmt.args.map((a) => substValue(a, paramBindings))
    });
    return;
  }
  if (stmt.kind !== 'cognitive') return;

  const p = substParams(stmt.params || {}, paramBindings);
  switch (stmt.keyword) {
    case 'PERCEIVE':
      ast.cognitive.perceptions.push({
        source: p.source || stmt.subject || 'input',
        modality: p.modality || 'text',
        filter: p.filter || null
      });
      break;
    case 'PREDICT':
      ast.cognitive.predictions.push({
        target: stmt.subject || p.target || 'prediction',
        model: p.model || 'bayesian',
        confidence: p.confidence ? Number(p.confidence) : 0.6
      });
      break;
    case 'INTUIT':
      ast.cognitive.intuitions.push({
        pattern: stmt.subject || p.pattern || 'general',
        confidence: p.threshold ? Number(p.threshold) : 0.6,
        heuristic: p.using || p.heuristic || 'default'
      });
      break;
    case 'REASON':
      ast.cognitive.reasonings.push({
        strategy: p.strategy || 'deductive',
        depth: p.depth ? Number(p.depth) : 3,
        premises: stmt.subject ? [stmt.subject] : []
      });
      break;
    case 'UNDERSTAND':
      ast.cognition.understandings.push(p);
      break;
    case 'DECIDE':
      ast.cognitive.decisions.push({
        action: p.action || stmt.subject || 'proceed',
        threshold: p.threshold ? Number(p.threshold) : 0.6,
        strategy: p.mode || p.strategy || 'satisfice',
        options: p.action ? [p.action] : []
      });
      break;
    case 'REFLECT':
      ast.cognitive.reflections.push({
        target: stmt.subject || p.target || 'self',
        criteria: p.depth || p.criteria || 'coherence'
      });
      break;
    case 'ACT': {
      const step = p.step || p.action || p.name || `act_${ast.cognition.acts.length + 1}`;
      const actEntry = { ...p, step };
      ast.cognition.acts.push(actEntry);
      if (p.channel === 'http' || p.channel === 'web' || p.plugin === 'http_call') {
        ast.cognition.actions[step] = {
          plugin: p.plugin || 'http_call',
          endpoint: p.url || p.endpoint,
          url: p.url || p.endpoint,
          method: p.method || (p.action === 'post' ? 'POST' : 'GET'),
          body: p.body || null,
          extract: p.extract || (p.channel === 'web' ? 'text' : null),
          mock: p.mock === true || String(p.mock).toLowerCase() === 'true',
          timeout_ms: p.timeout_ms != null ? Number(p.timeout_ms) : 5000,
          allow_hosts: p.allow_hosts,
          allow_private: p.allow_private
        };
      } else if (p.channel === 'fs' || p.plugin === 'fs_call') {
        ast.cognition.actions[step] = {
          plugin: p.plugin || 'fs_call',
          op: p.op || p.operation || (p.action === 'write' ? 'write' : p.action === 'list' ? 'list' : 'read'),
          path: p.path || p.file,
          content: p.content ?? p.body ?? null,
          mock: p.mock === true || String(p.mock).toLowerCase() === 'true',
          allow_paths: p.allow_paths,
          allow_write: p.allow_write,
          root: p.root
        };
      }
      break;
    }
    case 'FEEDBACK':
      ast.cognition.feedback.push(p);
      break;
    case 'CONSOLIDATE':
      ast.cognitive.consolidations.push({
        target: p.to || p.target || 'recent',
        strength: p.strength ? Number(p.strength) : 0.7
      });
      break;
    case 'ATTEND':
      ast.cognitive.attentions.push(p);
      break;
    case 'MONITOR':
      ast.cognitive.monitors.push(p);
      break;
    case 'FOCUS':
      ast.cognitive.focuses.push(p);
      break;
    case 'ADAPT':
      ast.cognitive.adaptations.push(p);
      break;
    case 'EMOTION':
      ast.cognitive.emotions.push(p);
      break;
    case 'SPAWN':
      ast.social.spawns.push(p);
      break;
    case 'DELEGATE':
      ast.social.delegations.push(p);
      break;
    case 'DEBATE':
      ast.social.debates.push(p);
      break;
    case 'EVOLVE':
      ast.evolution.evolves.push(p);
      break;
    default:
      break;
  }
}

function substValue(value, bindings) {
  if (typeof value !== 'string') return value;
  if (value in bindings) return bindings[value];
  return value;
}

function substParams(params, bindings) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = substValue(v, bindings);
  }
  return out;
}

function cloneStmtWithBindings(stmt, bindings) {
  if (stmt.kind === 'let') {
    if (stmt.exprSource) return { ...stmt };
    return { ...stmt, value: substValue(stmt.value, bindings) };
  }
  if (stmt.kind === 'stdlib' || stmt.kind === 'assert') {
    return { ...stmt, args: (stmt.args || []).map((a) => substValue(a, bindings)) };
  }
  if (stmt.kind === 'cognitive') {
    return {
      ...stmt,
      subject: stmt.subject ? substValue(stmt.subject, bindings) : undefined,
      params: substParams(stmt.params || {}, bindings)
    };
  }
  return stmt;
}

function expandBody(general, body) {
  const expanded = [];
  for (const stmt of body) {
    if (stmt.kind === 'call') {
      const fn = general.functions.find((f) => f.name === stmt.callee);
      if (!fn) {
        expanded.push(stmt);
        continue;
      }
      const bindings = {};
      fn.params.forEach((p, idx) => { bindings[p.name] = stmt.args[idx]; });
      for (const inner of fn.body) {
        expanded.push(cloneStmtWithBindings(inner, bindings));
      }
      continue;
    }
    expanded.push(stmt);
  }
  return expanded;
}

function lowerGeneralProgram(general) {
  const ast = createLegacyAstShell(general);

  if (general.objective) ast.cognition.goal = general.objective;
  if (general.context) ast.cognition.context = { ...ast.cognition.context, ...general.context };

  for (const stmt of general.topLevel) {
    applyCognitiveStatement(ast, stmt);
  }

  if (general.programBlock) {
    ast.task = general.programBlock.name;
    for (const stmt of expandBody(general, general.programBlock.body)) {
      if (stmt?.kind === 'objective') {
        ast.cognition.goal = stmt.value;
        continue;
      }
      if (stmt?.kind === 'context') {
        ast.cognition.context = { ...ast.cognition.context, ...stmt.params };
        continue;
      }
      applyCognitiveStatement(ast, stmt);
    }
  }

  const entryFn = general.functions.find((f) => f.name === general.entry) ||
    general.functions.find((f) => f.exported);

  if (entryFn) {
    ast.task = entryFn.name;
    for (const stmt of expandBody(general, entryFn.body)) {
      applyCognitiveStatement(ast, stmt);
    }
  }

  if (general.fusion?.length) {
    ast.fusion = general.fusion;
  }
  if (general.fusionTriad?.enabled) {
    ast.fusionTriad = general.fusionTriad;
  }

  if (general.declarations) {
    ast.general.declarations = general.declarations;
    ast.cognition.context._declarations = {
      models: general.declarations.models?.map((m) => m.name) || [],
      tools: general.declarations.tools?.map((t) => t.name) || [],
      data: general.declarations.data?.map((d) => d.name) || []
    };
  }

  syncAgentsToUnifiedStack(ast);
  ast.noeonStack = buildStackManifest(ast);

  try {
    const { attachGeneralCanonicalSnapshot } = require('../core/general-canonical-snapshot');
    attachGeneralCanonicalSnapshot(ast);
  } catch {
    // non-fatal during alpha — legacy AST remains execution path
  }

  return ast;
}

module.exports = {
  lowerGeneralProgram,
  createLegacyAstShell
};
