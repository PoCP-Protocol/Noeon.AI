'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { executeProgram } = require('../src/vm/unified-executor');
const { executeCanonicalProgram } = require('../src/vm/canonical-executor');

const parityDir = path.join(__dirname, '../examples/parity');
const surfaces = ['risk_assess.noeon', 'risk_assess.next', 'risk_assess.ael', 'risk_assess.lim'];

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Canonical Executor — IR-First Engine ═══\x1b[0m\n');

assert(typeof executeCanonicalProgram === 'function', 'executeCanonicalProgram exported');

(async () => {
  const memDir = path.join(__dirname, '../artifacts/canonical-executor-mem');
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });

  for (const file of surfaces) {
    const filePath = path.join(parityDir, file);
    if (!fs.existsSync(filePath)) continue;
    const ast = parseAel(fs.readFileSync(filePath, 'utf8'), { filename: filePath });
    const run = await executeProgram(ast, {
      quiet: true,
      with_protocol: 'off',
      filename: filePath,
      field_memory_dir: memDir,
      triad: false
    });
    assert(run.success !== false, `${file} executes successfully (${run.error || 'ok'})`);
    assert(run.irFirst === true, `${file} runs IR-first`);
    assert(run.executor === 'canonical', `${file} uses canonical executor`);
    assert(Array.isArray(run.phases) && run.phases.includes('canonical'), `${file} includes canonical phase`);
  }

  const legacy = await executeProgram(
    parseAel(fs.readFileSync(path.join(parityDir, 'risk_assess.noeon'), 'utf8')),
    { quiet: true, with_protocol: 'off', legacy_profile: true, filename: path.join(parityDir, 'risk_assess.noeon') }
  );
  assert(legacy.executor === 'legacy', 'legacy_profile uses legacy executor path');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
