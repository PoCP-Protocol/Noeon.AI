'use strict';

const fs = require('fs');
const path = require('path');
const {
  APPLY_SCHEMA,
  applySourceToWorktree,
  applyRemediatedPrograms
} = require('../src/core/golden-gate-apply');
const { handlePlaygroundApi } = require('../src/playground-api');
const { runGoldenGateRemediate } = require('../scripts/golden-gate-remediate');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

function mockRes() {
  let status = 0;
  let body = '';
  return {
    res: {
      writeHead(code) { status = code; },
      end(payload) { body = payload; }
    },
    get() {
      return { status, payload: body ? JSON.parse(body) : null };
    }
  };
}

function mockReq(method, url, jsonBody) {
  const chunks = jsonBody != null ? [Buffer.from(JSON.stringify(jsonBody))] : [];
  return {
    method,
    url,
    on(event, handler) {
      if (event === 'data') chunks.forEach(handler);
      if (event === 'end') handler();
    }
  };
}

console.log('\n\x1b[36m═══ Epoch 8 — Golden Gate Apply ═══\x1b[0m\n');

(async () => {
  const root = path.join(__dirname, '..');
  const hello = 'examples/hello.noeon';
  const sandbox = path.join(root, 'artifacts/golden-gate/apply-test');
  fs.mkdirSync(sandbox, { recursive: true });

  const testFile = 'artifacts/golden-gate/apply-test/sample.noeon';
  const testPath = path.join(root, testFile);
  const original = fs.readFileSync(path.join(root, hello), 'utf8');
  fs.writeFileSync(testPath, original, 'utf8');

  await runGoldenGateRemediate({
    root,
    forceFiles: [testFile],
    max_rounds: 1,
    applyToWorktree: false
  });

  assert(APPLY_SCHEMA === 'noeon.golden.apply/v1', 'apply schema');

  const single = applySourceToWorktree({ root, file: testFile });
  assert(single.ok === true, 'apply single file');
  assert(fs.existsSync(`${testPath}.golden.bak`), 'backup created');
  assert(fs.readFileSync(testPath, 'utf8') !== original, 'worktree updated');

  const again = applySourceToWorktree({ root, file: testFile });
  assert(again.skipped === true, 'skip double apply without force');

  const forced = applySourceToWorktree({ root, file: testFile, force: true });
  assert(forced.ok === true, 'force re-apply');

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/golden-gate/remediate.manifest.json'), 'utf8'));
  const row = manifest.programs.find((p) => p.file === testFile);
  assert(row?.appliedToWorktree === true, 'manifest marks applied');

  const applyMock = mockRes();
  await handlePlaygroundApi(
    mockReq('POST', '/api/golden-gate/apply', { file: testFile, force: true }),
    applyMock.res,
    '/api/golden-gate/apply'
  );
  assert(applyMock.get().status === 200, 'POST apply API 200');
  assert(applyMock.get().payload.apply?.applied?.[0]?.ok === true, 'apply API success');
  assert(applyMock.get().payload.studio?.schema === 'noeon.studio.golden-gate/v1', 'apply returns studio status');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
