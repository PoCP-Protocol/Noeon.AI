'use strict';

const { parseNoeonInput, planNoeonProgram } = require('../src/core/pipeline');
const { validateProgram } = require('../src/runtime/unified-runtime');
const { regionForPrimitive, BRAIN_REGIONS, buildArchitectureMermaid } = require('../src/core/cognitive-architecture');

const KEYWORDS = [
  'PROFILE', 'MODULE', 'VERSION', 'NETWORK', 'PROGRAM', 'TASK', 'OBJECTIVE', 'GOAL',
  'AGENT', 'FUSE', 'CONSTITUTION', 'VOW', 'RITUAL', 'STRATEGY', 'TOOLS', 'POLICY',
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
  ACT: 'Action boundary for tool, runtime, or human-visible effects.',
  FEEDBACK: 'Measured result signal used for learning.',
  FUSE: 'Cross-surface fusion bridge (corpus callosum integration layer).',
  MEMORY: 'Episodic/semantic memory binding (hippocampus).'
};

const GENERAL_KEYWORDS = [
  'fn', 'export', 'import', 'program', 'module', 'profile', 'version',
  'let', 'assert', 'observe', 'understand', 'reason', 'decide', 'act', 'reflect', 'ask', 'embed', 'think_with'
];

const GENERAL_HOVER = {
  '@effect': 'Effect annotation: pure | io | ai | external. Body must not exceed declared effect.',
  import: 'Import std library module (std.ai, std.cognition). Requires noeon.json dependency.',
  fn: 'General-profile cognitive function with optional type annotations.',
  ask: 'std.ai: LLM query → lowered to ast.llm.asks (requires @effect(ai)).',
  embed: 'std.ai: embedding call → ast.llm.embeds.',
  think_with: 'std.ai: deep reasoning call → ast.llm.thinkWiths.',
  assert: 'Compile-time boolean assertion on expression.',
  let: 'Bind expression value into cognition context.'
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

function getHover(source, line, character, filename = '') {
  const lines = source.split('\n');
  const current = lines[line] || '';
  const before = current.slice(0, character);

  if (isGeneralSource(source, filename)) {
    const effect = before.match(/@effect\s*\(\s*(\w+)\s*\)?$/i);
    if (effect) {
      return { keyword: '@effect', doc: GENERAL_HOVER['@effect'] };
    }
    const wordMatch = before.match(/([a-zA-Z_@][\w]*)\s*$/);
    if (wordMatch) {
      const word = wordMatch[1].toLowerCase();
      if (GENERAL_HOVER[word]) return { keyword: word, doc: GENERAL_HOVER[word] };
      if (STD_AI_EXPORTS.includes(word)) return { keyword: word, doc: GENERAL_HOVER[word] || GENERAL_HOVER.ask };
    }
    const fnMatch = before.match(/\bfn\s+([a-zA-Z_][\w]*)/);
    if (fnMatch) return { keyword: 'fn', doc: `${GENERAL_HOVER.fn} (${fnMatch[1]})` };
  }

  const match = before.match(/([A-Z_]{3,})\s*$/);
  if (!match) return null;
  const word = match[1];
  const doc = HOVER_DOCS[word];
  const base = doc || `Noeon primitive: ${word}`;
  const region = COGNITIVE_KEYWORDS.has(word) ? brainRegionDoc(word) : '';
  return { keyword: word, doc: `${base}${region}` };
}

function getDocumentSymbols(source, filename = '') {
  const symbols = [];
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

function getArchitectureSummary(source, filename = 'buffer.noeon') {
  try {
    const { ast } = parseNoeonInput(source, { filename });
    const plan = planNoeonProgram(ast, { filename, with_protocol: 'off' });
    return {
      active_regions: plan.architecture?.active_regions || [],
      agent_flows: plan.architecture?.agent_flows || [],
      stack: plan.stack,
      routeLabel: plan.routeLabel,
      architecture: plan.architecture
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
  const skipRegionLens = new Set(['AGENT', 'GOAL', 'OBJECTIVE', 'FLOW', 'FUSE', 'PROFILE', 'VERSION', 'MODULE', 'TASK', 'PROGRAM']);

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trimStart();
    if (/^AGENT\s+"/i.test(trimmed)) {
      const regionCount = summary.error ? '?' : String((summary.active_regions || []).length);
      const route = summary.error ? 'unavailable' : (summary.routeLabel || 'plan');
      lenses.push({
        line: i + 1,
        title: `▸ route: ${route} | ${regionCount} regions`,
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

  return {
    routeLabel: summary.routeLabel,
    active_regions: architecture.active_regions,
    agent_flows: architecture.agent_flows,
    stack: summary.stack,
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
      runtimeArch?.phase_regions?.length
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
  return {
    success: result.success,
    blocked: result.blocked,
    profile: out.profile,
    coreSurface: out.coreSurface,
    routeLabel: out.routeLabel,
    stack: out.stack,
    plan: out.plan,
    architecture: out.architecture,
    phases: result.phases,
    scheduler: result.scheduler,
    report: out.report,
    error: result.error || null
  };
}

async function runPipelineRequest(source, filename = 'buffer.noeon', options = {}) {
  const { runNoeonPipeline } = require('../src/core/pipeline');
  const out = await runNoeonPipeline(source, {
    filename,
    quiet: true,
    console: false,
    with_protocol: options.with_protocol ?? 'off',
    trace: options.trace === true,
    canonical_audit: options.canonical_audit !== false,
    ...options
  });
  return formatPipelineJson(out);
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
    architecture: pipelineJson.architecture
  });
}

module.exports = {
  validateSource,
  getCompletions,
  getHover,
  getDocumentSymbols,
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
  BRAIN_REGION_COLORS,
  KEYWORDS,
  HOVER_DOCS,
  GENERAL_KEYWORDS,
  GENERAL_HOVER,
  isGeneralSource
};
