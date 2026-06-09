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

console.log('\n\x1b[36m═══ std.http + ACT Plugin Tests ═══\x1b[0m\n');

const src = `
profile "general"
version "1.0.0-alpha.1"
module http_act_demo
import std.http

@effect(external)
fn main() {
  get("https://httpbin.org/get", mock=true)
  act action=notify channel=http url="https://httpbin.org/post" mock=true method=POST
}
`;

const ast = parseAel(src);
assert(ast.cognition.acts.length === 2, 'lowers std.http get + ACT http');
assert(ast.cognition.actions.http_get_1?.plugin === 'http_call', 'stdlib get registers http_call binding');
assert(ast.cognition.actions.notify?.plugin === 'http_call', 'ACT channel=http registers plugin binding');

const valid = validateAel(ast);
assert(valid.valid === true, 'validates http demo ast');

(async () => {
  const kernel = createKernel({ enable_llm: false });
  const result = await kernel.execute(ast, { verbose: false });
  const last = result.workspace?.last_action;
  assert(last?.status === 'done', 'kernel ACT executes http_call plugin (mock)');
  assert(last?.plugin === 'http_call', 'last_action records http_call plugin');
  assert(last?.pluginMeta?.mocked === true, 'mock HTTP sets mocked audit flag');

  const traceAction = (result.trace || []).find((t) => t.phase === 'collaborate');
  assert(Boolean(traceAction), 'trace records collaborate/act phase');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
