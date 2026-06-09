'use strict';

const path = require('path');
const { parseProgram } = require('../src/runtime/unified-runtime');
const { runNoeonPipeline } = require('../src/core/pipeline');
const {
  extractDeclaredSteps,
  buildDualView,
  formatDualViewLines
} = require('../src/core/dual-view');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Dual View (declaration ↔ runtime) ═══\x1b[0m\n');

(async () => {
  const helloFile = path.join(__dirname, '../examples/hello.noeon');
  const { ast } = parseProgram(helloFile);
  const declared = extractDeclaredSteps(ast);

  assert(declared.length >= 5, 'hello declares cognitive steps');
  assert(declared.some((s) => s.phase === 'perceive'), 'includes perceive declaration');
  assert(declared.some((s) => s.phase === 'act'), 'includes act declaration');

  const out = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true
  });

  const dual = buildDualView(out.ast, out.result || {}, out.report);
  assert(dual.schema === 'noeon.dual.view/v1', 'dual view schema');
  assert(dual.declaredCount >= 5, 'dual view declared count');
  assert(dual.runtimeCount >= 4, 'dual view runtime steps');
  assert(dual.matched >= 4, 'most declared steps matched at runtime');
  assert(dual.alignment >= 0.6, 'alignment ratio reasonable');
  assert(dual.rows.some((r) => r.status === 'matched'), 'has matched rows');

  const lines = formatDualViewLines(dual);
  assert(lines[0].includes('对齐'), 'format lines include alignment header');
  assert(lines.some((l) => l.includes('✓')), 'format lines include match marker');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
