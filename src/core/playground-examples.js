'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../parser');
const { loadProjectConfig } = require('./config');
const {
  resolveExecutionStrategy,
  resolveGeneralCanonical
} = require('./general-canonical-mode');

const CURATED_EXAMPLES = [
  { name: 'hello.noeon', title: 'Hello World', description: 'Minimal cognitive cycle', category: 'getting-started' },
  { name: 'http_demo.noeon', title: 'HTTP Demo', description: 'std.http mock fetch · snapshot-act path', category: 'tools' },
  { name: 'fs_demo.noeon', title: 'FS Demo', description: 'std.fs mock read · snapshot-act path', category: 'tools' },
  { name: 'github_demo.noeon', title: 'GitHub Demo', description: 'std.github repo lookup (mock) · snapshot-act', category: 'tools' },
  { name: 'web_fetch.noeon', title: 'Web Fetch', description: 'std.web text extraction (mock) · snapshot-act', category: 'tools' },
  { name: 'hybrid_tool_agent.noeon', title: 'Hybrid Tool Agent', description: 'Plugin ACT + cognitive kernel (hybrid path)', category: 'agents' },
  { name: 'agent_research.noeon', title: 'Research Analyst', description: 'Research with citations · hybrid canonical path', category: 'agents' },
  { name: 'agent_risk_review.noeon', title: 'Risk Reviewer', description: 'Payment approval · hybrid canonical path', category: 'agents' },
  { name: 'agent_customer_service.noeon', title: 'Support Agent', description: 'Customer resolution · hybrid canonical path', category: 'agents' },
  { name: 'fusion_triad.noeon', title: 'Triad Fusion', description: 'FUSE triad loop', category: 'fusion' },
  { name: 'semantic_fusion.noeon', title: 'Semantic Fusion', description: 'FUSE coherence + relay', category: 'fusion' },
  { name: 'agent_field.noeon', title: 'Field Analyst', description: 'AGENT + Next field + Liminal', category: 'fusion' },
  { name: 'universal/research_synth.noeon', title: 'Universal Research', description: 'Six-dimension synthesizer', category: 'universal', profile: 'universal' },
  { name: 'universal/code_agent.noeon', title: 'Universal Code Agent', description: 'Code weave with gates', category: 'universal', profile: 'universal' },
  { name: 'universal/orchestrator.noeon', title: 'Universal Orchestrator', description: 'Multi-agent mesh', category: 'universal', profile: 'universal' },
  { name: 'universal/inline_fn.noeon', title: 'Universal Inline fn', description: 'std.universal inline expansion', category: 'universal', profile: 'general' },
  { name: 'universal/hybrid_weave.noeon', title: 'Hybrid Mesh Weave', description: 'General+Universal mesh', category: 'universal', profile: 'general' }
];

function resolveExamplesDir(root) {
  if (root) return path.join(root, 'examples');
  return path.join(__dirname, '..', '..', 'examples');
}

function describeExecutionPath(strategy) {
  switch (strategy) {
    case 'tool-snapshot-primary': return 'snapshot-act';
    case 'hybrid-canonical-acts': return 'hybrid';
    case 'snapshot-primary': return 'canonical';
    default: return 'cognitive';
  }
}

function enrichExampleExecution(entry, source, options = {}) {
  try {
    const root = options.root || process.cwd();
    const { config } = loadProjectConfig({ root, cwd: root });
    const ast = parseAel(source, { filename: entry.name });
    const strategy = resolveExecutionStrategy(ast, { projectConfig: config });
    const autoCanonical = resolveGeneralCanonical(ast, { projectConfig: config });
    return {
      executionStrategy: strategy,
      executionPath: describeExecutionPath(strategy),
      autoCanonical: autoCanonical && strategy !== 'cognitive-primary'
    };
  } catch {
    return {
      executionStrategy: 'cognitive-primary',
      executionPath: 'cognitive',
      autoCanonical: false
    };
  }
}

function loadCuratedExamples(options = {}) {
  const examplesDir = options.examplesDir || resolveExamplesDir(options.root);
  const examples = [];

  for (const entry of CURATED_EXAMPLES) {
    const filePath = path.join(examplesDir, entry.name);
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    examples.push({
      name: entry.name,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      profile: entry.profile || (entry.name.startsWith('universal/') ? 'universal' : 'general'),
      source,
      ...enrichExampleExecution(entry, source, options)
    });
  }

  return examples;
}

function loadAllExamples(options = {}) {
  const examplesDir = options.examplesDir || resolveExamplesDir(options.root);
  return fs.readdirSync(examplesDir)
    .filter((f) => f.endsWith('.noeon') || f.endsWith('.ael'))
    .sort()
    .map((name) => {
      const source = fs.readFileSync(path.join(examplesDir, name), 'utf8');
      const entry = {
        name,
        title: name,
        description: '',
        category: name.endsWith('.noeon') ? 'noeon' : 'ael',
        profile: name.endsWith('.noeon') ? 'general' : 'ael',
        source
      };
      return { ...entry, ...enrichExampleExecution(entry, source, options) };
    });
}

module.exports = {
  CURATED_EXAMPLES,
  describeExecutionPath,
  enrichExampleExecution,
  loadCuratedExamples,
  loadAllExamples,
  resolveExamplesDir
};
