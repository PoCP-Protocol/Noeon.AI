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
  { name: 'hello.noeon', title: 'Hello World', description: '最简认知循环示例', category: 'getting-started' },
  { name: 'http_demo.noeon', title: 'HTTP 请求', description: '模拟 HTTP 调用 · 工具快照路径', category: 'tools' },
  {
    name: 'signed_act_demo.noeon',
    title: '签名行动演示',
    description: '带版本与 HMAC 签名的 http_call · 生产插件策略',
    category: 'production'
  },
  { name: 'fs_demo.noeon', title: '文件读取', description: '模拟文件系统读取 · 工具快照路径', category: 'tools' },
  { name: 'github_demo.noeon', title: 'GitHub 查询', description: '模拟仓库信息查询 · 工具快照路径', category: 'tools' },
  { name: 'web_fetch.noeon', title: '网页抓取', description: '模拟网页文本提取 · 工具快照路径', category: 'tools' },
  { name: 'hybrid_tool_agent.noeon', title: '混合工具智能体', description: '插件行动 + 认知内核（混合路径）', category: 'agents' },
  { name: 'agent_research.noeon', title: '研究分析师', description: '带引用的研究任务 · 混合执行路径', category: 'agents' },
  { name: 'agent_risk_review.noeon', title: '风险审查', description: '支付审批场景 · 混合执行路径', category: 'agents' },
  { name: 'agent_customer_service.noeon', title: '客服智能体', description: '客户问题解决 · 混合执行路径', category: 'agents' },
  { name: 'fusion_triad.noeon', title: '三元融合', description: 'FUSE triad 循环', category: 'fusion' },
  { name: 'semantic_fusion.noeon', title: '语义融合', description: 'FUSE 连贯性与中继', category: 'fusion' },
  { name: 'agent_field.noeon', title: '场域分析师', description: 'AGENT + Next 场 + Liminal 层', category: 'fusion' },
  { name: 'universal/research_synth.noeon', title: '通用研究合成', description: '六维综合智能体', category: 'universal', profile: 'universal' },
  { name: 'universal/code_agent.noeon', title: '通用代码智能体', description: '带门控的代码编织', category: 'universal', profile: 'universal' },
  { name: 'universal/orchestrator.noeon', title: '通用编排器', description: '多智能体协作网格', category: 'universal', profile: 'universal' },
  { name: 'universal/inline_fn.noeon', title: '通用内联函数', description: 'std.universal 内联展开', category: 'universal', profile: 'general' },
  { name: 'universal/hybrid_weave.noeon', title: '混合网格编织', description: 'General + Universal 协作', category: 'universal', profile: 'general' }
];

function resolveExamplesDir(root) {
  if (root) return path.join(root, 'examples');
  return path.join(__dirname, '..', '..', 'examples');
}

function detectSignedAct(source) {
  return /\bsignature\s*=\s*hmac-sha256:[0-9a-f]{64}/i.test(String(source || ''));
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
    const signedAct = detectSignedAct(source);
    return {
      executionStrategy: strategy,
      executionPath: describeExecutionPath(strategy),
      autoCanonical: autoCanonical && strategy !== 'cognitive-primary',
      signedAct
    };
  } catch {
    return {
      executionStrategy: 'cognitive-primary',
      executionPath: 'cognitive',
      autoCanonical: false,
      signedAct: detectSignedAct(source)
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
  resolveExamplesDir,
  describeExecutionPath,
  loadCuratedExamples,
  loadAllExamples
};
