'use strict';

const fs = require('fs');
const path = require('path');

const CURATED_EXAMPLES = [
  { name: 'hello.noeon', title: 'Hello World', description: 'Minimal cognitive cycle', category: 'getting-started' },
  { name: 'http_demo.noeon', title: 'HTTP Demo', description: 'std.http mock fetch', category: 'tools' },
  { name: 'fs_demo.noeon', title: 'FS Demo', description: 'std.fs mock read', category: 'tools' },
  { name: 'github_demo.noeon', title: 'GitHub Demo', description: 'std.github repo lookup (mock)', category: 'tools' },
  { name: 'web_fetch.noeon', title: 'Web Fetch', description: 'std.web text extraction (mock)', category: 'tools' },
  { name: 'agent_research.noeon', title: 'Research Analyst', description: 'Industry research with citations', category: 'agents' },
  { name: 'agent_risk_review.noeon', title: 'Risk Reviewer', description: 'Payment approval with escalation', category: 'agents' },
  { name: 'agent_customer_service.noeon', title: 'Support Agent', description: 'Customer issue resolution', category: 'agents' },
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

function loadCuratedExamples(options = {}) {
  const examplesDir = options.examplesDir || resolveExamplesDir(options.root);
  const examples = [];

  for (const entry of CURATED_EXAMPLES) {
    const filePath = path.join(examplesDir, entry.name);
    if (!fs.existsSync(filePath)) continue;
    examples.push({
      name: entry.name,
      title: entry.title,
      description: entry.description,
      category: entry.category,
      profile: entry.profile || (entry.name.startsWith('universal/') ? 'universal' : 'general'),
      source: fs.readFileSync(filePath, 'utf8')
    });
  }

  return examples;
}

function loadAllExamples(options = {}) {
  const examplesDir = options.examplesDir || resolveExamplesDir(options.root);
  return fs.readdirSync(examplesDir)
    .filter((f) => f.endsWith('.noeon') || f.endsWith('.ael'))
    .sort()
    .map((name) => ({
      name,
      title: name,
      description: '',
      category: name.endsWith('.noeon') ? 'noeon' : 'ael',
      profile: name.endsWith('.noeon') ? 'general' : 'ael',
      source: fs.readFileSync(path.join(examplesDir, name), 'utf8')
    }));
}

module.exports = {
  CURATED_EXAMPLES,
  loadCuratedExamples,
  loadAllExamples,
  resolveExamplesDir
};
