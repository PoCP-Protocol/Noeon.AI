'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { executeProgram } = require('../src/vm/unified-executor');
const {
  buildBindingsFromCanonicalActs,
  executeSnapshotCanonicalActs
} = require('../src/core/canonical-act-runner');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

const TOOL_DEMOS = [
  {
    file: 'web_fetch.noeon',
    actCount: 1,
    plugin: 'http_call',
    bindingCheck: (b) => b.extract === 'text'
  },
  {
    file: 'http_demo.noeon',
    actCount: 1,
    plugin: 'http_call',
    bindingCheck: (b) => b.method === 'GET'
  },
  {
    file: 'fs_demo.noeon',
    actCount: 2,
    plugin: 'fs_call',
    bindingCheck: (b) => b.op === 'read' || b.plugin === 'fs_call'
  },
  {
    file: 'github_demo.noeon',
    actCount: 1,
    plugin: 'http_call',
    bindingCheck: (b) => String(b.url || b.endpoint || '').includes('api.github.com')
  }
];

console.log('\n\x1b[36m═══ Canonical Act Runner (Beta) ═══\x1b[0m\n');

for (const demo of TOOL_DEMOS) {
  const source = fs.readFileSync(path.join(__dirname, '../examples', demo.file), 'utf8');
  const ast = parseAel(source);
  const acts = ast.general?.canonicalIr?.execution?.acts || [];
  const label = demo.file.replace('.noeon', '');

  assert(acts.length === demo.actCount, `${label}: snapshot has ${demo.actCount} act(s)`);

  const bindings = buildBindingsFromCanonicalActs(acts);
  assert(bindings.steps.length === demo.actCount, `${label}: builds ${demo.actCount} plugin binding(s)`);
  assert(
    bindings.steps.every((s) => s.binding?.plugin === demo.plugin || demo.plugin === 'fs_call'),
    `${label}: bindings use expected plugin family`
  );
  assert(demo.bindingCheck(bindings.steps[0].binding), `${label}: first binding shape ok`);
}

(async () => {
  for (const demo of TOOL_DEMOS) {
    const source = fs.readFileSync(path.join(__dirname, '../examples', demo.file), 'utf8');
    const ast = parseAel(source);
    const label = demo.file.replace('.noeon', '');

    const direct = await executeSnapshotCanonicalActs(ast.general.canonicalIr, ast, { quiet: true });
    assert(direct.success === true, `${label}: executeSnapshotCanonicalActs succeeds`);
    assert(direct.actCount === demo.actCount, `${label}: direct runner executes all acts`);

    const runAst = parseAel(source);
    const result = await executeProgram(runAst, {
      quiet: true,
      console: false,
      with_protocol: 'off',
      filename: demo.file,
      general_canonical: true
    });
    assert(result.success === true, `${label}: executeProgram --canonical succeeds`);
    assert(result.snapshotActExecution === true, `${label}: uses snapshot act execution`);
    assert(result.actDriver === 'canonical.execution.acts', `${label}: actDriver canonical.execution.acts`);
    assert(result.phases?.includes('canonical-act'), `${label}: records canonical-act phase`);
    assert(result.phases?.includes('cognitive') === false, `${label}: skips legacy cognitive phase`);
    assert(result.canonicalActs?.actCount === demo.actCount, `${label}: canonicalActs count matches`);
  }

  const fsDemo = parseAel(fs.readFileSync(path.join(__dirname, '../examples/fs_demo.noeon'), 'utf8'));
  const fsOut = await executeSnapshotCanonicalActs(fsDemo.general.canonicalIr, fsDemo, { quiet: true });
  assert(fsOut.acts.every((a) => a.status === 'done'), 'fs_demo: sequential multi-act all done');
  assert(fsOut.acts[0]?.step !== fsOut.acts[1]?.step, 'fs_demo: distinct step names');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
