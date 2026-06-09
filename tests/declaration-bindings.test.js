'use strict';

const fs = require('fs');
const path = require('path');
const { parseGeneralProgram, parseGeneralSource } = require('../src/grammar');
const { validateAel } = require('../src/validator');
const { lowerToCanonical } = require('../src/core/canonical-lower');
const { executeProgram } = require('../src/vm/unified-executor');
const { buildDeclarationBrief } = require('../src/core/declaration-ir');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Sprint A — MODEL/TOOL/CAPABILITY/EFFECT Declarations ═══\x1b[0m\n');

const goodSrc = fs.readFileSync(
  path.join(__dirname, '../examples/declarations/agent_with_tools.noeon'),
  'utf8'
);

const gp = parseGeneralProgram(goodSrc);
assert(gp.declarations.models.length === 1, 'parses MODEL');
assert(gp.declarations.tools.length === 1, 'parses TOOL');
assert(gp.declarations.capabilities.length === 1, 'parses CAPABILITY');
assert(gp.declarations.effects.length === 1, 'parses EFFECT');
assert(gp.declarations.tools[0].params.capability === 'web_search', 'TOOL capability param');
assert(Array.isArray(gp.declarations.capabilities[0].params.effects), 'CAPABILITY effects array');

const ast = parseGeneralSource(goodSrc, { filename: 'agent_with_tools.noeon' });
const valid = validateAel(ast);
assert(valid.valid === true, 'declared agent validates');

const canonical = lowerToCanonical(ast);
assert(canonical.declarations.models[0].name === 'planner', 'canonical MODEL');
assert(canonical.declarations.tools[0].name === 'search', 'canonical TOOL');
assert(buildDeclarationBrief(canonical.declarations).counts.tools === 1, 'declaration brief');

const badToolSrc = `
profile "general"
TOOL search type=mcp capability=missing_cap
export fn main() {}
`;
const badAst = parseGeneralSource(badToolSrc);
const badValid = validateAel(badAst);
assert(badValid.valid === false, 'undeclared CAPABILITY fails');
assert(badValid.errors.some((e) => e.includes('undeclared CAPABILITY')), 'capability error message');

const badCallSrc = `
profile "general"
TOOL search type=mcp capability=web_search
CAPABILITY web_search effects=[io]
export fn main() {
  unknown_tool()
}
`;
const badCallAst = parseGeneralSource(badCallSrc);
const badCallValid = validateAel(badCallAst);
assert(badCallValid.valid === false, 'undeclared tool call fails');
assert(badCallValid.errors.some((e) => e.includes('without declared TOOL')), 'tool call error');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: 'agent_with_tools.noeon'
  });
  assert(run.success === true, 'declared agent executes');
  assert(run.report?.declarations?.tools?.includes('search'), 'report includes declarations');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
