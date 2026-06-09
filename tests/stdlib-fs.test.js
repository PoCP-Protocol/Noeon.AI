'use strict';

const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { createKernel } = require('../src/runtime/unified-runtime');
const { getPlugin } = require('../src/runtime/plugins/registry');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ std.fs + ACT Plugin Tests ═══\x1b[0m\n');

assert(getPlugin('fs_call')?.name === 'fs_call', 'registry exposes fs_call plugin');

const src = `
profile "general"
version "1.0.0-alpha.1"
module fs_act_demo
import std.fs

@effect(external)
fn main() {
  read("examples/hello.noeon", mock=true)
  act action=load channel=fs path="examples/hello.noeon" mock=true
}
`;

const ast = parseAel(src);
assert(ast.cognition.acts.length === 2, 'lowers std.fs read + ACT fs');
assert(ast.cognition.actions.fs_read_1?.plugin === 'fs_call', 'stdlib read registers fs_call binding');
assert(ast.cognition.actions.load?.plugin === 'fs_call', 'ACT channel=fs registers plugin binding');

const valid = validateAel(ast);
assert(valid.valid === true, 'validates fs demo ast');

(async () => {
  const kernel = createKernel({ enable_llm: false });
  const result = await kernel.execute(ast, { verbose: false });
  const last = result.workspace?.last_action;
  assert(last?.status === 'done', 'kernel ACT executes fs_call plugin (mock)');
  assert(last?.plugin === 'fs_call', 'last_action records fs_call plugin');
  assert(last?.pluginMeta?.mocked === true, 'mock FS sets mocked audit flag');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
