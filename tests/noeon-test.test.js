'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { testFile, runDefaultSuite } = require('../src/test-runner');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ noeon test harness ═══\x1b[0m\n');

(async () => {
  const researchPath = path.join(__dirname, '..', 'examples', 'agent_research.noeon');
  const result = await testFile(researchPath);
  assert(result.ok === true, 'testFile(agent_research.noeon) passes');
  assert(result.run && result.run.success === true, 'agent_research run.success');
  assert(result.run && result.run.blocked !== true, 'agent_research not blocked');

  const suite = await runDefaultSuite();
  assert(suite.failed === 0, 'runDefaultSuite has no failures');
  assert(suite.passed >= 1, 'runDefaultSuite passes at least one file');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-test-invalid-'));
  try {
    const invalidPath = path.join(tmp, 'invalid.noeon');
    fs.writeFileSync(invalidPath, 'PROFILE "general"\nNOT VALID SYNTAX {{{\n', 'utf8');
    const invalidResult = await testFile(invalidPath);
    assert(invalidResult.ok === false, 'invalid file fails testFile');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');
  const cliRun = spawnSync(process.execPath, [cliPath, 'test', researchPath], {
    encoding: 'utf8'
  });
  assert(cliRun.status === 0, 'noeon test <file> CLI exits 0');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
