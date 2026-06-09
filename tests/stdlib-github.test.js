'use strict';

const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { createKernel } = require('../src/runtime/unified-runtime');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ std.github + ACT Plugin Tests ═══\x1b[0m\n');

const src = `
profile "general"
version "1.0.0-alpha.1"
module github_act_demo
import std.github

@effect(external)
fn main() {
  repo("PoCP-Protocol/Noeon.AI", mock=true)
  act action=fetch_repo channel=http url="https://api.github.com/repos/PoCP-Protocol/Noeon.AI" mock=true allow_hosts=api.github.com
}
`;

const ast = parseAel(src);
assert(ast.cognition.acts.length === 2, 'lowers std.github repo + ACT http');
assert(ast.cognition.actions.github_repo_1?.plugin === 'http_call', 'stdlib repo registers http_call binding');
assert(String(ast.cognition.actions.github_repo_1?.url).includes('api.github.com'), 'github URL targets api.github.com');
assert(ast.cognition.actions.fetch_repo?.allow_hosts === 'api.github.com', 'ACT http allowlist set');

const valid = validateAel(ast);
assert(valid.valid === true, 'validates github demo ast');
assert(Boolean(ast.general?.canonicalIr?.intent), 'general lower attaches canonicalIr snapshot');

(async () => {
  const kernel = createKernel({ enable_llm: false });
  const result = await kernel.execute(ast, { verbose: false });
  const last = result.workspace?.last_action;
  assert(last?.status === 'done', 'kernel ACT executes http_call plugin (mock)');
  assert(last?.plugin === 'http_call', 'last_action records http_call plugin');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
