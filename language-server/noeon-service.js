'use strict';

const { parseNoeonInput, planNoeonProgram } = require('../src/core/pipeline');
const { validateProgram } = require('../src/runtime/unified-runtime');
const { loadProjectConfig } = require('../src/core/config');
const {
  resolveExecutionStrategy,
  resolveGeneralCanonical
} = require('../src/core/general-canonical-mode');
const { describeExecutionPath } = require('../src/core/playground-examples');
const { regionForPrimitive, BRAIN_REGIONS, buildArchitectureMermaid } = require('../src/core/cognitive-architecture');
const { buildExecutionSummary } = require('../src/core/action-trace');
const {
  summarizePluginActsFromCanonical,
  attachPluginActsToPayload
} = require('../src/core/act-binding-status');

const KEYWORDS = [
  'PROFILE', 'MODULE', 'VERSION', 'NETWORK', 'PROGRAM', 'TASK', 'OBJECTIVE', 'GOAL',
  'AGENT', 'FUSE', 'CONTRACT', 'ALIGN', 'GOVERNANCE', 'CONSTITUTION', 'VOW', 'RITUAL', 'STRATEGY', 'TOOLS', 'POLICY',
  'CONTEXT', 'BUDGET', 'DEADLINE', 'VERIFY',
  'PERCEIVE', 'ATTEND', 'PREDICT', 'INTUIT', 'REASON', 'DECIDE', 'REFLECT',
  'OBSERVE', 'UNDERSTAND', 'ACT', 'FEEDBACK',
  'CONSOLIDATE', 'KNOW', 'MONITOR', 'ADAPT', 'DRIVE_CMD', 'WORKSPACE', 'EMOTION',
  'FOCUS', 'META_RULE', 'META_PROFILE', 'COMPUTE', 'FLOW', 'PLUGIN', 'ON_SUCCESS', 'ON_SLASH',
  'SOLVER_COLLATERAL', 'VERIFIER_COLLATERAL', 'PLAN', 'ACTION', 'LEARN', 'MEMORY', 'RISK',
  'STREAM', 'THINK_UNTIL', 'WHEN_CONFIDENT', 'DEBATE', 'EVOLVE', 'MUTATE', 'SYNTHESIZE'
];

const HOVER_DOCS = {
  PERCEIVE: 'Gather sensory input from a source/modality.',
  REASON: 'System 2 analytical processing (strategy, depth).',
  INTUIT: 'System 1 fast pattern matching.',
  PREDICT: 'Generate anticipatory model before perception.',
  DECIDE: 'Choose action based on confidence threshold.',
  REFLECT: 'Metacognitive self-check on reasoning quality.',
  VERIFY: 'Contract verification criteria (protocol layer).',
  META_RULE: 'Governance rule enforced at runtime.',
  COMPUTE: 'Deterministic compute block with CALL receipts.',
  TASK: 'Primary intent / goal identifier for the program.',
  PROGRAM: 'General-profile program identity.',
  AGENT: 'Unified agent block — syncs goal and FLOW to Next-centric stack.',
  OBJECTIVE: 'Human-level goal the program is trying to satisfy.',
  CONTEXT: 'Structured situation or domain context.',
  UNDERSTAND: 'Semantic/contextual understanding step before reasoning.',
  ACT: 'Action boundary for tool, runtime, or human-visible effects. Plugin ACTs (`plugin=http_call`, etc.) lower into `canonical.execution.acts` and may run on the hybrid or snapshot-act path before the cognitive kernel.',
  FEEDBACK: 'Measured result signal used for learning.',
  FUSE: 'Cross-surface fusion bridge (corpus callosum integration layer).',
  MEMORY: 'Episodic/semantic memory binding (hippocampus).',
  PROFILE: 'Authoring surface — general | next | liminal | ael. All surfaces lower to Canonical Semantic IR.',
  CONSTITUTION: 'Next governance tier — highest precedence rule (constitution > vow > ritual > strategy).',
  VOW: 'Strong commitment tier — enforced after constitution, before ritual/strategy.'
};

const GENERAL_KEYWORDS = [
  'fn', 'export', 'import', 'program', 'module', 'profile', 'version',
  'let', 'assert', 'observe', 'understand', 'reason', 'decide', 'act', 'reflect', 'ask', 'embed', 'think_with'
];

const GENERAL_HOVER = {
  '@effect': 'Effect annotation: pure | io | ai | external. Body must not exceed declared effect.',
  import: 'Import std library module. Registered: std.ai, std.http, std.fs, std.github, std.web, std.universal, std.cognition.',
  profile: 'General capability entry. Lowers to Canonical Semantic IR snapshot (`ast.general.canonicalIr`). Use `--canonical` or NOEON_GENERAL_CANONICAL=1 for canonical-primary compile presentation.',
  fn: 'General-profile cognitive function with optional type annotations.',
  ask: 'std.ai: LLM query → lowered to ast.llm.asks (requires @effect(ai)).',
  embed: 'std.ai: embedding call → ast.llm.embeds.',
  think_with: 'std.ai: deep reasoning call → ast.llm.thinkWiths.',
  assert: 'Compile-time boolean assertion on expression.',
  let: 'Bind expression value into cognition context.'
};

const STDLIB_HOVER = {
  'std.ai': 'LLM bindings (ask, embed, think_with) → ast.llm.*. Requires @effect(ai).',
  'std.http': 'HTTP ACT bindings → http_call plugin (get, post, fetch). Use mock=true in demos.',
  'std.fs': 'Filesystem ACT bindings → fs_call plugin (read, write, list). Typically @effect(io|external).',
  'std.github': 'GitHub REST via http_call to api.github.com. Set GITHUB_TOKEN for live calls.',
  'std.web': 'Web fetch with extract modes (fetch, text, title) → http_call + content preview / last_fetch.',
  'std.universal': 'Six-dimension universal inline expansion at lower time.',
  'std.cognition': 'Cognitive stdlib helpers bound into IR.'
};

const STDLIB_EXPORT_HOVER = {
  get: 'std.http GET → http_call (mock=true for offline demos).',
  post: 'std.http POST → http_call with body.',
  fetch: 'std.http fetch → http_call; std.web fetch → raw body extract.',
  read: 'std.fs read → fs_call plugin.',
  write: 'std.fs write → fs_call plugin.',
  list: 'std.fs list directory → fs_call plugin.',
  repo: 'std.github repo lookup → GET api.github.com/repos/{owner}/{repo}.',
  text: 'std.web text → GET + plain-text extraction (research preview).',
  title: 'std.web title → GET + HTML title extraction.'
};

const STD_AI_EXPORTS = ['ask', 'embed', 'think_with'];

function isGeneralSource(source, filename = '') {
  return filename.endsWith('.noeon') ||
    /\bfn\s+[a-zA-Z_][\w]*\s*\(/.test(source) ||
    /^\s*import\s+std\./m.test(source) ||
    /^\s*@effect\s*\(/m.test(source);
}

const COGNITIVE_KEYWORDS = new Set([
  'PERCEIVE', 'OBSERVE', 'UNDERSTAND', 'REASON', 'INTUIT', 'PREDICT',
  'DECIDE', 'ACT', 'FEEDBACK', 'REFLECT', 'CONSOLIDATE', 'MEMORY', 'FOCUS', 'ATTEND'
]);

const STRUCTURAL_REGION = {
  AGENT: 'prefrontal_cortex',
  GOAL: 'prefrontal_cortex',
  OBJECTIVE: 'prefrontal_cortex',
  TASK: 'prefrontal_cortex',
  PROGRAM: 'prefrontal_cortex',
  CONSTITUTION: 'prefrontal_cortex',
  VOW: 'prefrontal_cortex',
  POLICY: 'prefrontal_cortex',
  RITUAL: 'thalamus',
  STRATEGY: 'basal_ganglia',
  FUSE: 'corpus_callosum',
  FLOW: 'thalamus'
};

const BRAIN_REGION_COLORS = {
  prefrontal_cortex: '#9c7bd8',
  sensory_cortex: '#5dade2',
  association_cortex: '#48c9b0',
  motor_cortex: '#f5b041',
  hippocampus: '#58d68d',
  amygdala: '#ec7063',
  basal_ganglia: '#af7ac5',
  cerebellum: '#76d7c4',
  thalamus: '#85c1e9',
  corpus_callosum: '#bb8fce',
  default_mode_network: '#7fb3d5',
  neuromodulatory: '#f1948a'
};

function brainRegionDoc(keyword) {
  const regionId = regionForPrimitive(keyword);
  const region = BRAIN_REGIONS[regionId];
  if (!region) return '';
  return `\n\n**Brain region:** \`${regionId}\` — ${region.function}`;
}

function validateSource(source) {
  const diagnostics = [];
  try {
    const { ast } = parseNoeonInput(source, { filename: 'buffer.noeon' });
    const result = validateProgram(ast);
    for (const err of result.errors || []) {
      const lineMatch = String(err).match(/Line (\d+)/i);
      diagnostics.push({
        line: lineMatch ? Number(lineMatch[1]) : 1,
        message: String(err),
        severity: 'error'
      });
    }
    for (const warn of result.warnings || []) {
      diagnostics.push({ line: 1, message: String(warn), severity: 'warning' });
    }
  } catch (e) {
    const lineMatch = e.message.match(/Line (\d+)/i);
    diagnostics.push({
      line: lineMatch ? Number(lineMatch[1]) : 1,
      message: e.message,
      severity: 'error'
    });
  }
  return diagnostics;
}

function getCompletions(source, line, character, filename = '') {
  const lines = source.split('\n');
  const current = lines[line] || '';
  const before = current.slice(0, character);
  const trimmed = before.trim();

  if (isGeneralSource(source, filename)) {
    if (trimmed.endsWith('@') || trimmed.match(/@effect\s*\(\s*$/i)) {
      return ['pure', 'io', 'ai', 'external', 'trace'];
    }
    if (/^\s*import\s+$/i.test(before) || trimmed === 'import') {
      return ['std.ai', 'std.cognition'];
    }
    if (/import\s+std\.ai\s*$/.test(before) || /^\s*ask\s*$/.test(trimmed)) {
      return STD_AI_EXPORTS;
    }
    const prefix = trimmed.split(/\s+/).pop() || '';
    return GENERAL_KEYWORDS
      .filter((k) => k.startsWith(prefix.toLowerCase()) || prefix === '')
      .slice(0, 40);
  }

  const prefix = trimmed.split(/\s+/).pop() || '';
  return KEYWORDS
    .filter((k) => k.startsWith(prefix.toUpperCase()) || prefix === '')
    .slice(0, 40);
}

function resolveGeneralImports(source) {
  const imports = new Set();
  for (const line of source.split('\n')) {
    const match = line.match(/^import\s+(std\.[\w]+)/);
    if (match) imports.add(match[1]);
  }
  return imports;
}

function buildFileExecutionSummary(source, filename = '') {
  const execPath = buildExecutionPathDoc(source, filename);
  if (!execPath?.strategy) return null;
  return buildExecutionSummary({
    executionStrategy: execPath.strategy,
    hybridActExecution: execPath.strategy === 'hybrid-canonical-acts',
    snapshotActExecution: execPath.strategy === 'tool-snapshot-primary'
  });
}

function getFileExecutionSummary(source, filename = '') {
  return buildFileExecutionSummary(source, filename);
}

function resolveFilePluginActs(source, filename = '') {
  try {
    const { ast } = parseNoeonInput(source, { filename: filename || 'buffer.noeon' });
    return summarizePluginActsFromCanonical(ast?.general?.canonicalIr);
  } catch {
    return null;
  }
}

function appendPluginActSigningDoc(baseDoc, currentLine = '') {
  const signed = /signature\s*=/.test(currentLine);
  const version = currentLine.match(/version\s*=\s*([\d.]+)/i)?.[1];
  if (signed) {
    const versionTxt = version ? ` · version \`${version}\`` : '';
    return `${baseDoc}\n\n**Signed ACT** — production plugin policy satisfied${versionTxt}.`;
  }
  return `${baseDoc}\n\n**Production signing:** append \`version=0.9.0 signature=hmac-sha256:...\` to the ACT line (see \`signed_act_demo.noeon\`).`;
}

function buildExecutionPathDoc(source, filename = '') {
  try {
    const { ast } = parseNoeonInput(source, { filename: filename || 'buffer.noeon' });
    const { config } = loadProjectConfig({ cwd: process.cwd() });
    const strategy = resolveExecutionStrategy(ast, { projectConfig: config });
    const auto = resolveGeneralCanonical(ast, { projectConfig: config });
    const acts = ast?.general?.canonicalIr?.execution?.acts?.length || 0;
    return {
      strategy,
      path: describeExecutionPath(strategy),
      auto,
      acts
    };
  } catch {
    return null;
  }
}

function appendExecutionPathDoc(baseDoc, execPath) {
  if (!execPath) return baseDoc;
  const autoTxt = execPath.auto ? ' (auto canonical)' : '';
  const actsTxt = execPath.acts ? ` · ${execPath.acts} plugin ACT(s) in snapshot` : '';
  return `${baseDoc}\n\n**Execution path:** \`${execPath.strategy}\`${autoTxt} · label \`${execPath.path}\`${actsTxt}.`;
}

function getHover(source, line, character, filename = '') {
  const lines = source.split('\n');
  const current = lines[line] || '';
  const trimmed = current.trimStart();
  const before = current.slice(0, character);
  const imports = resolveGeneralImports(source);

  if (isGeneralSource(source, filename)) {
    const importLine = trimmed.match(/^import\s+(std\.[\w]+)/);
    if (importLine && STDLIB_HOVER[importLine[1]]) {
      return { keyword: importLine[1], doc: STDLIB_HOVER[importLine[1]] };
    }

    const profileLine = trimmed.match(/^profile\s+"([^"]+)"/i);
    if (profileLine) {
      return { keyword: 'profile', doc: `${GENERAL_HOVER.profile} Current: "${profileLine[1]}".` };
    }

    const dottedStd = before.match(/std\.(http|fs|github|web)\.([a-zA-Z_][\w]*)$/);
    if (dottedStd) {
      const exportName = dottedStd[2];
      const mod = `std.${dottedStd[1]}`;
      const exportDoc = STDLIB_EXPORT_HOVER[exportName];
      if (exportDoc) return { keyword: `${mod}.${exportName}`, doc: exportDoc };
    }

    const effect = before.match(/@effect\s*\(\s*(\w+)\s*\)?$/i);
    if (effect) {
      return { keyword: '@effect', doc: GENERAL_HOVER['@effect'] };
    }
    const wordMatch = before.match(/([a-zA-Z_@][\w]*)\s*$/);
    if (wordMatch) {
      const word = wordMatch[1].toLowerCase();
      if (imports.has('std.web') && ['fetch', 'text', 'title'].includes(word) && STDLIB_EXPORT_HOVER[word]) {
        return { keyword: `std.web.${word}`, doc: STDLIB_EXPORT_HOVER[word] };
      }
      if (imports.has('std.http') && ['get', 'post', 'fetch'].includes(word) && STDLIB_EXPORT_HOVER[word]) {
        return { keyword: `std.http.${word}`, doc: STDLIB_EXPORT_HOVER[word] };
      }
      if (imports.has('std.fs') && ['read', 'write', 'list'].includes(word) && STDLIB_EXPORT_HOVER[word]) {
        return { keyword: `std.fs.${word}`, doc: STDLIB_EXPORT_HOVER[word] };
      }
      if (imports.has('std.github') && ['repo', 'get', 'post'].includes(word) && STDLIB_EXPORT_HOVER[word]) {
        return { keyword: `std.github.${word}`, doc: STDLIB_EXPORT_HOVER[word] };
      }
      if (GENERAL_HOVER[word]) return { keyword: word, doc: GENERAL_HOVER[word] };
      if (STD_AI_EXPORTS.includes(word)) return { keyword: word, doc: GENERAL_HOVER[word] || GENERAL_HOVER.ask };
      if (STDLIB_EXPORT_HOVER[word]) return { keyword: word, doc: STDLIB_EXPORT_HOVER[word] };
    }
    const fnMatch = before.match(/\bfn\s+([a-zA-Z_][\w]*)/);
    if (fnMatch) return { keyword: 'fn', doc: `${GENERAL_HOVER.fn} (${fnMatch[1]})` };
  }

  const match = before.match(/([A-Z_]{3,})\s*$/);
  if (!match) return null;
  const word = match[1];
  const execPath = buildExecutionPathDoc(source, filename);
  if (word === 'ACT' && /plugin\s*=/.test(current)) {
    const plugin = current.match(/plugin\s*=\s*(\w+)/i)?.[1];
    let doc = appendExecutionPathDoc(HOVER_DOCS.ACT, execPath);
    if (plugin) doc += `\n\n**Plugin:** \`${plugin}\` via \`canonical.execution.acts\`.`;
    doc = appendPluginActSigningDoc(doc, current);
    const region = brainRegionDoc('ACT');
    return { keyword: 'ACT', doc: `${doc}${region}` };
  }
  if (word === 'AGENT') {
    const doc = appendExecutionPathDoc(HOVER_DOCS.AGENT, execPath);
    return { keyword: 'AGENT', doc };
  }
  if (word === 'PROFILE') {
    const doc = appendExecutionPathDoc(HOVER_DOCS.PROFILE, execPath);
    return { keyword: 'PROFILE', doc };
  }
  const doc = HOVER_DOCS[word];
  const base = doc || `Noeon primitive: ${word}`;
  const region = COGNITIVE_KEYWORDS.has(word) ? brainRegionDoc(word) : '';
  return { keyword: word, doc: `${base}${region}` };
}

function getDocumentSymbols(source, filename = '') {
  const symbols = [];
  const execPath = buildExecutionPathDoc(source, filename);
  if (execPath?.path) {
    symbols.push({
      name: `exec: ${execPath.path} · ${execPath.strategy}`,
      kind: 'execution',
      line: 1
    });
  }
  const pluginActs = resolveFilePluginActs(source, filename);
  if (pluginActs?.acts?.length) {
    for (const act of pluginActs.acts) {
      symbols.push({
        name: `${act.plugin} (${act.signed ? 'signed' : 'unsigned'})`,
        kind: 'plugin-act',
        line: 1
      });
    }
  }
  const lines = source.split('\n');
  lines.forEach((line, idx) => {
    const fn = line.match(/^(?:export\s+)?fn\s+([a-zA-Z_][\w]*)/);
    if (fn) symbols.push({ name: fn[1], kind: 'function', line: idx + 1 });
    const imp = line.match(/^import\s+([\w.]+)/);
    if (imp) symbols.push({ name: imp[1], kind: 'import', line: idx + 1 });
    const task = line.match(/^(?:TASK|PROGRAM)\s+"([^"]+)"/i);
    if (task) symbols.push({ name: task[1], kind: 'intent', line: idx + 1 });
    const agent = line.match(/^AGENT\s+"([^"]+)"/i);
    if (agent) symbols.push({ name: agent[1], kind: 'agent', line: idx + 1 });
    const goal = line.match(/^(?:GOAL|OBJECTIVE)\s+"([^"]+)"/i);
    if (goal) symbols.push({ name: goal[1], kind: 'goal', line: idx + 1 });
    for (const kw of COGNITIVE_KEYWORDS) {
      if (line.trimStart().toUpperCase().startsWith(kw)) {
        const regionId = regionForPrimitive(kw);
        symbols.push({
          name: `${kw} → ${regionId.replace(/_/g, ' ')}`,
          kind: 'cognitive',
          line: idx + 1
        });
      }
    }
    if (isGeneralSource(source, filename)) {
      for (const kw of ['observe', 'understand', 'reason', 'decide', 'act', 'reflect', 'ask']) {
        if (line.trimStart().toLowerCase().startsWith(`${kw} `)) {
          symbols.push({ name: kw, kind: 'cognitive', line: idx + 1 });
        }
      }
    }
  });
  return symbols;
}

function buildCanonicalPlanSummary(plan) {
  if (!plan || plan.error) return null;
  const route = plan.route;
  const canonical = plan.canonical;
  const gov = plan.governance;
  return {
    schema: 'noeon.canonical.summary/v1',
    surface: canonical?.surface || plan.profile || null,
    coreSurface: plan.coreSurface || null,
    goal: canonical?.intent?.goal || null,
    task: canonical?.task || null,
    engine: route?.engine || (route ? 'canonical' : 'legacy'),
    ir_first: route?.ir_first === true,
    governance: {
      winner_tier: gov?.winner?.tier || null,
      rule_count: gov?.rule_count ?? null,
      precedence: gov?.precedence || []
    },
    capabilities: canonical?.capabilities || {},
    routeLabel: plan.routeLabel || null
  };
}

function getArchitectureSummary(source, filename = 'buffer.noeon') {
  try {
    const { ast } = parseNoeonInput(source, { filename });
    const plan = planNoeonProgram(ast, { filename, with_protocol: 'off' });
    return {
      active_regions: plan.architecture?.active_regions || [],
      agent_flows: plan.architecture?.agent_flows || [],
      stack: plan.stack,
      routeLabel: plan.routeLabel,
      architecture: plan.architecture,
      canonical: buildCanonicalPlanSummary(plan)
    };
  } catch (e) {
    return { error: e.message };
  }
}

function getBrainLineDecorations(source) {
  const lines = source.split('\n');
  const decorations = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trimStart();
    const kwMatch = trimmed.match(/^([A-Z_]+)\b/i);
    if (!kwMatch) return;

    const kw = kwMatch[1].toUpperCase();
    let region = STRUCTURAL_REGION[kw];
    if (!region && COGNITIVE_KEYWORDS.has(kw)) {
      region = regionForPrimitive(kw);
    }
    if (!region) return;

    const info = BRAIN_REGIONS[region];
    decorations.push({
      line: idx + 1,
      character: line.length - trimmed.length,
      length: kw.length,
      keyword: kw,
      region,
      role: info?.role || region,
      color: BRAIN_REGION_COLORS[region] || '#888888'
    });
  });

  return decorations;
}

function getCodeLenses(source, filename = 'buffer.noeon') {
  const lenses = [];
  const lines = source.split('\n');
  const summary = getArchitectureSummary(source, filename);
  const decorations = getBrainLineDecorations(source);
  const execPath = buildExecutionPathDoc(source, filename);
  const skipRegionLens = new Set(['AGENT', 'GOAL', 'OBJECTIVE', 'FLOW', 'FUSE', 'PROFILE', 'VERSION', 'MODULE', 'TASK', 'PROGRAM']);

  if (execPath?.path) {
    lenses.push({
      line: 1,
      title: `▸ exec: ${execPath.path} · ${execPath.strategy}`,
      command: null
    });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trimStart();
    if (/^ACT\b/i.test(trimmed) && /plugin\s*=/.test(trimmed)) {
      const signed = /signature\s*=/.test(trimmed);
      lenses.push({
        line: i + 1,
        title: signed ? '🔐 signed ACT' : '⚠ unsigned ACT',
        command: null
      });
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trimStart();
    if (/^AGENT\s+"/i.test(trimmed)) {
      const regionCount = summary.error ? '?' : String((summary.active_regions || []).length);
      const route = summary.error ? 'unavailable' : (summary.routeLabel || 'plan');
      const surface = summary.canonical?.surface ? ` | ${summary.canonical.surface}` : '';
      lenses.push({
        line: i + 1,
        title: `▸ route: ${route}${surface} | ${regionCount} regions`,
        command: 'noeon.brainMap'
      });
      break;
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trimStart();
    if (/^FUSE\b/i.test(trimmed)) {
      lenses.push({
        line: i + 1,
        title: '◎ integration: corpus callosum',
        command: 'noeon.brainMap'
      });
    }
    if (/^FLOW\b/i.test(trimmed) && !summary.error) {
      const flow = summary.agent_flows?.[0];
      if (flow?.steps?.length) {
        const chain = flow.steps.map((s) => String(s.kind || '?').toUpperCase()).join('→');
        lenses.push({
          line: i + 1,
          title: `◎ cycle: ${chain}`,
          command: 'noeon.brainMap'
        });
      }
    }
  }

  for (const deco of decorations) {
    if (skipRegionLens.has(deco.keyword)) continue;
    lenses.push({
      line: deco.line,
      title: `◎ ${deco.role} (${deco.region.replace(/_/g, ' ')})`,
      command: null
    });
  }

  return lenses;
}

function buildArchitectureViewModel(source, filename = 'buffer.noeon') {
  const summary = getArchitectureSummary(source, filename);
  const decorations = getBrainLineDecorations(source);
  const code_lenses = getCodeLenses(source, filename);

  if (summary.error) {
    return {
      error: summary.error,
      decorations,
      code_lenses
    };
  }

  const arch = summary.architecture || {};
  const architecture = {
    ...arch,
    active_regions: summary.active_regions || arch.active_regions || [],
    agent_flows: summary.agent_flows || arch.agent_flows || []
  };
  const executionSummary = buildFileExecutionSummary(source, filename);
  const pluginActsSummary = resolveFilePluginActs(source, filename);
  const pluginActs = pluginActsSummary?.total ? pluginActsSummary : null;

  return {
    routeLabel: summary.routeLabel,
    active_regions: architecture.active_regions,
    agent_flows: architecture.agent_flows,
    stack: summary.stack,
    canonical: summary.canonical || null,
    executionSummary,
    pluginActs,
    architecture,
    cognitive_cycle: arch.cognitive_cycle || [],
    pipeline_phases: arch.pipeline_phases || null,
    phase_regions: arch.phase_regions || null,
    core_field: arch.core_field || 'default_mode_network',
    executive: 'prefrontal_cortex',
    decorations,
    code_lenses,
    architectureMermaid: buildArchitectureMermaid(architecture)
  };
}

function mergeRuntimeIntoViewModel(model, execution = {}) {
  if (!model || model.error) return model;

  const runtimeArch = execution.architecture || null;
  const hasRuntime = Boolean(
    runtimeArch?.pipeline_phases?.length ||
      execution.phases?.length ||
      runtimeArch?.phase_regions?.length ||
      execution.compileMode ||
      execution.actionTrace
  );
  if (!hasRuntime && execution.success == null) return model;

  const architecture = {
    ...(model.architecture || {}),
    ...(runtimeArch || {}),
    active_regions: runtimeArch?.active_regions || model.active_regions,
    agent_flows: runtimeArch?.agent_flows || model.agent_flows,
    pipeline_phases: runtimeArch?.pipeline_phases || model.pipeline_phases,
    phase_regions: runtimeArch?.phase_regions || model.phase_regions
  };

  return {
    ...model,
    architecture,
    active_regions: architecture.active_regions || model.active_regions,
    pipeline_phases: architecture.pipeline_phases || null,
    phase_regions: architecture.phase_regions || null,
    compileMode: execution.compileMode || model.compileMode || null,
    primaryIr: execution.primaryIr || model.primaryIr || null,
    canonicalPrimary: execution.canonicalPrimary ?? model.canonicalPrimary ?? null,
    canonicalSource: execution.canonicalSource || model.canonicalSource || null,
    executionDriver: execution.executionDriver || model.executionDriver || null,
    snapshotActCount: execution.snapshotActCount ?? model.snapshotActCount ?? null,
    actDriver: execution.actDriver || model.actDriver || null,
    snapshotActExecution: execution.snapshotActExecution ?? model.snapshotActExecution ?? null,
    era: execution.era || model.era || null,
    actionTrace: execution.actionTrace || model.actionTrace || null,
    architectureMermaid: buildArchitectureMermaid(architecture),
    runtime: {
      success: execution.success !== false,
      blocked: execution.blocked === true,
      phases: execution.phases || (architecture.pipeline_phases || []).map((p) => p.phase),
      scheduler: execution.scheduler || null
    }
  };
}

function resolveArchitectureRequest(source, filename = 'buffer.noeon', mode = 'summary') {
  if (mode === 'view') return buildArchitectureViewModel(source, filename);
  return getArchitectureSummary(source, filename);
}

function buildBrainApiPayload(source, filename = 'buffer.noeon', options = {}) {
  const viewModel = resolveArchitectureRequest(source, filename, 'view');
  if (viewModel.error) return viewModel;

  let model = viewModel;
  if (options.runtime) {
    model = mergeRuntimeIntoViewModel(model, options.runtime);
  }

  const arch = model.architecture || {};
  return {
    ...model,
    model: arch.model || 'functional-cognitive-map',
    disclaimer: arch.disclaimer || 'Organizational metaphor — not biological simulation',
    canonical: model.canonical || null,
    architecture: options.runtime?.architecture || arch,
    stack: model.stack?.architecture || model.stack,
    regions: (model.active_regions || []).map((id) => ({
      id,
      ...(arch.regions?.[id] || BRAIN_REGIONS[id] || {})
    }))
  };
}

function formatPipelineJson(out) {
  const result = out.result || {};
  const executionSummary = buildExecutionSummary(result);
  const payload = {
    success: result.success,
    blocked: result.blocked,
    profile: out.profile,
    coreSurface: out.coreSurface,
    routeLabel: out.routeLabel,
    canonical: out.canonical
      ? buildCanonicalPlanSummary({
          canonical: out.canonical,
          governance: out.governance,
          route: out.route,
          routeLabel: out.routeLabel,
          coreSurface: out.coreSurface,
          profile: out.profile
        })
      : null,
    stack: out.stack,
    plan: out.plan,
    architecture: out.architecture,
    phases: result.phases,
    scheduler: result.scheduler,
    actionTrace: out.actionTrace || null,
    executionSummary,
    canonicalPrimary: result.canonicalPrimary ?? out.prep?.canonicalPrimary ?? false,
    canonicalSource: result.canonicalSource || out.prep?.canonicalSource || null,
    executionDriver: result.executionDriver || out.prep?.executionDriver || null,
    snapshotActCount: result.snapshotActCount ?? out.prep?.snapshotActCount ?? null,
    actDriver: result.actDriver || null,
    snapshotActExecution: result.snapshotActExecution === true,
    era: require('../src/core/release-version').NOEON_ERA,
    report: out.report,
    error: result.error || null
  };
  attachPluginActsToPayload(payload, out.ast?.general?.canonicalIr);
  return payload;
}

async function runPipelineRequest(source, filename = 'buffer.noeon', options = {}) {
  const { runNoeonPipeline } = require('../src/core/pipeline');
  const { compileProgram } = require('../src/runtime/unified-runtime');
  const { resolveCompilePresentation } = require('../src/core/general-canonical-mode');
  const compileOpts = {
    general_canonical: options.general_canonical ?? options.generalCanonical
  };

  const out = await runNoeonPipeline(source, {
    filename,
    quiet: true,
    console: false,
    with_protocol: options.with_protocol ?? 'off',
    trace: options.trace === true,
    canonical_audit: options.canonical_audit !== false,
    ...options
  });

  const json = formatPipelineJson(out);
  if (!out.ast) return json;

  const compiled = compileProgram(out.ast, 'ir', compileOpts);
  const presentation = resolveCompilePresentation(out.ast, compiled.program, compileOpts);
  const exec = out.result || {};

  return {
    ...json,
    compileMode: exec.compileMode || presentation.compileMode,
    primaryIr: exec.primaryIr || presentation.primaryIr,
    canonicalPrimary: exec.canonicalPrimary ?? json.canonicalPrimary ?? false,
    canonicalSource: exec.canonicalSource || json.canonicalSource || null,
    executionDriver: exec.executionDriver || json.executionDriver || null,
    snapshotActCount: exec.snapshotActCount ?? json.snapshotActCount ?? null,
    actDriver: exec.actDriver || json.actDriver || null,
    snapshotActExecution: exec.snapshotActExecution ?? json.snapshotActExecution ?? false,
    era: json.era,
    cognitiveIr: compiled.program?.toJSON?.() || null,
    canonicalIr: presentation.canonicalIr || out.ast?.general?.canonicalIr || null
  };
}

function mergePipelineBrainView(source, filename, pipelineJson) {
  if (!source) return null;
  const base = resolveArchitectureRequest(source, filename, 'view');
  if (base.error) return null;
  return mergeRuntimeIntoViewModel(base, {
    success: pipelineJson.success,
    blocked: pipelineJson.blocked,
    phases: pipelineJson.phases,
    scheduler: pipelineJson.scheduler,
    architecture: pipelineJson.architecture,
    compileMode: pipelineJson.compileMode,
    primaryIr: pipelineJson.primaryIr,
    canonicalPrimary: pipelineJson.canonicalPrimary,
    canonicalSource: pipelineJson.canonicalSource,
    executionDriver: pipelineJson.executionDriver,
    snapshotActCount: pipelineJson.snapshotActCount,
    actDriver: pipelineJson.actDriver,
    snapshotActExecution: pipelineJson.snapshotActExecution,
    era: pipelineJson.era,
    actionTrace: pipelineJson.actionTrace
  });
}

module.exports = {
  validateSource,
  getCompletions,
  getHover,
  getDocumentSymbols,
  STDLIB_HOVER,
  STDLIB_EXPORT_HOVER,
  GENERAL_HOVER,
  getArchitectureSummary,
  resolveArchitectureRequest,
  buildBrainApiPayload,
  formatPipelineJson,
  runPipelineRequest,
  mergePipelineBrainView,
  getBrainLineDecorations,
  getCodeLenses,
  buildArchitectureViewModel,
  mergeRuntimeIntoViewModel,
  buildCanonicalPlanSummary,
  buildExecutionPathDoc,
  appendExecutionPathDoc,
  getFileExecutionSummary,
  buildFileExecutionSummary,
  BRAIN_REGION_COLORS,
  KEYWORDS,
  HOVER_DOCS,
  GENERAL_KEYWORDS,
  GENERAL_HOVER,
  isGeneralSource
};
