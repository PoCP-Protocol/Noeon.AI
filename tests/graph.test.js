'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { parseProgram } = require('../src/runtime/unified-runtime');
const { buildCognitiveGraph, formatMermaidGraph } = require('../src/graph');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

function hasNode(graph, kind, text) {
  return graph.nodes.some((node) => node.kind === kind && node.label.includes(text));
}

console.log('\n\x1b[36m═══ Cognitive Graph Tests ═══\x1b[0m\n');

const helloPath = path.join(__dirname, '..', 'examples', 'hello.noeon');
const helloAst = parseProgram(helloPath).ast;
const helloGraph = buildCognitiveGraph(helloAst);
const helloMermaid = formatMermaidGraph(helloGraph);

assert(helloGraph.profile === 'general', 'graph records general profile');
assert(hasNode(helloGraph, 'goal', 'Demonstrate general profile'), 'graph includes program goal');
assert(hasNode(helloGraph, 'perceive', 'Perceive'), 'graph includes perception phase');
assert(hasNode(helloGraph, 'understand', 'Understand'), 'graph includes understanding phase');
assert(hasNode(helloGraph, 'act', 'Act'), 'graph includes action phase');
assert(hasNode(helloGraph, 'feedback', 'Feedback'), 'graph includes feedback phase');
assert(helloMermaid.startsWith('flowchart TD'), 'Mermaid output starts with flowchart');
assert(helloMermaid.includes('-->|observes|'), 'Mermaid output includes labeled cognitive edge');

const agentPath = path.join(__dirname, '..', 'examples', 'agent_research.noeon');
const agentAst = parseProgram(agentPath).ast;
const agentGraph = buildCognitiveGraph(agentAst);

assert(agentGraph.agents.length === 1, 'graph records agent node');
assert(hasNode(agentGraph, 'agent', 'ResearchAnalyst'), 'graph includes ResearchAnalyst agent');
assert(agentGraph.nodes.some((node) => node.id.includes('flow_1') && node.label.includes('Perceive')), 'graph includes agent flow step');
assert(agentGraph.edges.some((edge) => edge.label === 'embodied by'), 'graph connects goal to agent');

const cliPath = path.join(__dirname, '..', 'src', 'cli.js');
const cli = spawnSync(process.execPath, [cliPath, 'graph', helloPath], {
  cwd: path.join(__dirname, '..'),
  encoding: 'utf8'
});

assert(cli.status === 0, 'CLI graph exits successfully');
assert(cli.stdout.includes('flowchart TD'), 'CLI graph prints Mermaid');
assert(cli.stdout.includes('Goal:'), 'CLI graph prints goal node');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
