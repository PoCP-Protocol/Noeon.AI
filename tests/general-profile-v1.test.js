'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { AELtoIRCompiler } = require('../src/core/cognitive-ir');
const { compileProgram, runProgram } = require('../src/runtime/unified-runtime');
const { detectProfile } = require('../src/core/profile');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ General Profile v1 Tests ═══\x1b[0m\n');

const agentSource = `PROFILE "general"
VERSION "1.0.0-alpha"

AGENT "ResearchAnalyst"
  GOAL "Complete industry research report"
  MEMORY type=episodic+semantic
  TOOLS ["web_search", "file_reader"]
  POLICY require_citation=true
  FLOW
    PERCEIVE source=market_data
    REASON strategy=comparative
    ACT action=write_report
    REFLECT
`;

const agentAst = parseAel(agentSource);
assert(agentAst.profile === 'general', 'parses PROFILE general');
assert(agentAst.version === '1.0.0-alpha', 'parses VERSION');
assert(agentAst.agents.length === 1, 'parses one AGENT block');
assert(agentAst.agents[0].name === 'ResearchAnalyst', 'agent name parsed');
assert(agentAst.agents[0].goal === 'Complete industry research report', 'agent GOAL parsed');
assert(agentAst.agents[0].memory.type === 'episodic+semantic', 'agent MEMORY type parsed');
assert(
  JSON.stringify(agentAst.agents[0].tools) === JSON.stringify(['web_search', 'file_reader']),
  'agent TOOLS JSON array parsed'
);
assert(agentAst.agents[0].policy.require_citation === 'true', 'agent POLICY key=value parsed');
assert(agentAst.agents[0].flow.length === 4, 'agent FLOW has four steps');
assert(agentAst.agents[0].flow[0].kind === 'perceive', 'FLOW step 1 is perceive');
assert(agentAst.agents[0].flow[3].kind === 'reflect', 'FLOW step 4 is reflect');
assert(agentAst.task === 'ResearchAnalyst', 'agent promotes task name');
assert(agentAst.cognition.goal === 'Complete industry research report', 'agent promotes cognition goal');
assert(agentAst.cognitive.perceptions.length === 1, 'agent flow promotes PERCEIVE to cognitive');
assert(agentAst.cognitive.reasonings.length === 1, 'agent flow promotes REASON to cognitive');
assert(agentAst.cognition.acts.length === 1, 'agent flow promotes ACT to cognition.acts');

const agentValidation = validateAel(agentAst);
assert(agentValidation.valid === true, 'valid AGENT program passes validation');
assert(
  !agentValidation.warnings.some((w) => w.includes('FLOW is not defined')),
  'agent FLOW suppresses stateFlow warning'
);

const toolsQuotedAst = parseAel(`PROFILE "general"
VERSION "1.0.0-alpha"
AGENT "ToolTester"
  GOAL "Test tools"
  TOOLS "web_search" "file_reader"
  FLOW
    REFLECT
`);
assert(
  JSON.stringify(toolsQuotedAst.agents[0].tools) === JSON.stringify(['web_search', 'file_reader']),
  'TOOLS quoted list parsed'
);

const helloSource = fs.readFileSync(path.join(__dirname, '../examples/hello.noeon'), 'utf8');
const helloAst = parseAel(helloSource);
assert(helloAst.task === 'hello_world', 'PROGRAM alias maps to task (hello.noeon)');
assert(helloAst.cognition.goal === 'Demonstrate general profile execution through unified VM', 'OBJECTIVE alias maps to GOAL');
assert(helloAst.cognition.understandings.length === 1, 'UNDERSTAND parsed in PROGRAM style');
assert(helloAst.cognitive.perceptions.length === 1, 'OBSERVE alias maps to PERCEIVE');
assert(helloAst.agents.length === 0, 'hello.noeon has no AGENT blocks');

const helloValidation = validateAel(helloAst);
assert(helloValidation.valid === true, 'hello.noeon validates');

const missingGoalAst = parseAel(`PROFILE "general"
VERSION "1.0.0-alpha"
AGENT "NoGoalAgent"
  FLOW
    REFLECT
`);
const missingGoalValidation = validateAel(missingGoalAst);
assert(missingGoalValidation.valid === false, 'AGENT without GOAL fails validation');
assert(
  missingGoalValidation.errors.some((e) => e.includes('requires GOAL')),
  'missing GOAL produces explicit error'
);

const exampleAst = parseAel(fs.readFileSync(path.join(__dirname, '../examples/agent_research.noeon'), 'utf8'));
assert(exampleAst.agents[0].name === 'ResearchAnalyst', 'agent_research.noeon parses');

const compiler = new AELtoIRCompiler();
const { program: irProgram } = compiler.compile(agentAst);
assert(irProgram.intents.some((n) => n.params.type === 'agent'), 'IR includes agent intent node');
assert(irProgram.perceivers.length >= 1, 'IR includes agent flow perceive nodes');
assert(irProgram.processes.length >= 1, 'IR includes agent flow reason nodes');
assert(irProgram.validators.length >= 1, 'IR includes agent flow reflect nodes');

const compiled = compileProgram(agentAst, 'both');
assert(compiled.format === 'both', 'compileProgram handles AGENT AST');

assert(detectProfile(agentAst, { filename: 'agent.noeon' }) === 'general', 'detectProfile general for agent');

(async () => {
  const runResult = await runProgram(exampleAst, {
    quiet: true,
    console: false,
    with_protocol: 'off',
    filename: 'agent_research.noeon'
  });
  assert(runResult.success === true, 'runProgram executes agent_research.noeon');
  assert(runResult.profile === 'general', 'runProgram profile is general');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
