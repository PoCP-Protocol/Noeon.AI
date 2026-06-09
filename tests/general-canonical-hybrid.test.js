'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { attachGeneralCanonicalSnapshot } = require('../src/core/general-canonical-snapshot');
const {
  isHybridCanonicalCandidate,
  resolveExecutionStrategy
} = require('../src/core/general-canonical-mode');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ General Canonical Hybrid Path ═══\x1b[0m\n');

const agentResearch = parseAel(fs.readFileSync(path.join(__dirname, '../examples/agent_research.noeon'), 'utf8'));
assert(Boolean(agentResearch.general?.canonicalIr), 'AGENT programs attach canonicalIr snapshot');
assert(Array.isArray(agentResearch.general?.canonicalIr?.execution?.acts), 'AGENT canonicalIr includes execution.acts');

for (const name of ['agent_risk_review.noeon', 'agent_customer_service.noeon']) {
  const ast = parseAel(fs.readFileSync(path.join(__dirname, '../examples', name), 'utf8'));
  assert(isHybridCanonicalCandidate(ast) === true, `${name} is hybrid candidate`);
}

const hybridAst = parseAel(fs.readFileSync(path.join(__dirname, '../examples/hybrid_tool_agent.noeon'), 'utf8'));
assert(isHybridCanonicalCandidate(hybridAst) === true, 'hybrid_tool_agent is hybrid candidate');
assert(
  resolveExecutionStrategy(hybridAst, { general_canonical: true }) === 'hybrid-canonical-acts',
  'hybrid strategy resolves correctly'
);

const shell = { cognition: { acts: [{ plugin: 'http_call', url: 'https://x', mock: true }] }, agents: [{ name: 'x' }] };
attachGeneralCanonicalSnapshot(shell);
assert(Boolean(shell.general?.canonicalIr), 'attachGeneralCanonicalSnapshot works on shell AST');

(async () => {
  const result = await executeProgram(hybridAst, {
    quiet: true,
    console: false,
    with_protocol: 'off',
    filename: 'hybrid_tool_agent.noeon',
    general_canonical: true
  });
  assert(result.success === true, 'hybrid executeProgram succeeds');
  assert(result.hybridActExecution === true, 'hybridActExecution flagged');
  assert(result.executionStrategy === 'hybrid-canonical-acts', 'executionStrategy hybrid');
  assert(result.phases?.includes('canonical-act'), 'hybrid records canonical-act phase');
  assert(result.phases?.includes('cognitive'), 'hybrid continues into cognitive phase');
  assert((result.canonicalActs?.actCount ?? 0) >= 1, 'hybrid runs plugin acts first');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
