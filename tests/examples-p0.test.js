'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { runProgram } = require('../src/runtime/unified-runtime');
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

const EXAMPLES = [
  'hello.noeon',
  'agent_research.noeon',
  'agent_risk_review.noeon',
  'agent_customer_service.noeon'
];

console.log('\n\x1b[36m═══ P0 Example Demos ═══\x1b[0m\n');

for (const filename of EXAMPLES) {
  const filepath = path.join(__dirname, '../examples', filename);
  const source = fs.readFileSync(filepath, 'utf8');
  const label = filename.replace('.noeon', '');

  console.log(`\x1b[33m▸ ${filename}\x1b[0m`);

  let ast;
  try {
    ast = parseAel(source);
    assert(Boolean(ast), `${label}: parseAel succeeds`);
  } catch (err) {
    assert(false, `${label}: parseAel succeeds (${err.message})`);
    continue;
  }

  const validation = validateAel(ast);
  assert(validation.valid === true, `${label}: validateAel valid===true`);

  const profile = detectProfile(ast, { filename });
  assert(profile === 'general', `${label}: detectProfile === 'general'`);
}

(async () => {
  for (const filename of EXAMPLES) {
    const filepath = path.join(__dirname, '../examples', filename);
    const source = fs.readFileSync(filepath, 'utf8');
    const label = filename.replace('.noeon', '');
    const ast = parseAel(source);

    try {
      const runResult = await runProgram(ast, {
        quiet: true,
        console: false,
        with_protocol: 'off',
        filename
      });
      assert(runResult.success === true, `${label}: runProgram succeeds`);
    } catch (err) {
      assert(false, `${label}: runProgram succeeds (${err.message})`);
    }
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
