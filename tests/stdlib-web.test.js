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

console.log('\n\x1b[36m═══ std.web + ACT Plugin Tests ═══\x1b[0m\n');

const src = `
profile "general"
version "1.0.0-alpha.1"
module web_act_demo
import std.web

@effect(external)
fn main() {
  text("https://example.com/page", mock=true)
  act action=fetch_page channel=web url="https://example.com/page" mock=true allow_hosts=example.com
}
`;

const ast = parseAel(src);
assert(ast.cognition.acts.length === 2, 'lowers std.web text + ACT web');
assert(ast.cognition.actions.web_text_1?.plugin === 'http_call', 'stdlib text registers http_call binding');
assert(ast.cognition.actions.web_text_1?.extract === 'text', 'stdlib text sets extract=text');
assert(ast.cognition.actions.fetch_page?.extract === 'text', 'ACT web sets extract=text');

const valid = validateAel(ast);
assert(valid.valid === true, 'validates web demo ast');
assert(Boolean(ast.general?.canonicalIr?.intent), 'general lower attaches canonicalIr snapshot');

(async () => {
  const kernel = createKernel({ enable_llm: false });
  const result = await kernel.execute(ast, { verbose: false });
  const last = result.workspace?.last_action;
  assert(last?.status === 'done', 'kernel ACT executes http_call plugin (mock)');
  assert(last?.plugin === 'http_call', 'last_action records http_call plugin');
  assert(typeof result.workspace?.last_fetch === 'string' && result.workspace.last_fetch.length > 0, 'last_fetch stores extracted content');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
