'use strict';

const path = require('path');
const fs = require('fs');
const {
  GOLDEN_DIFF_SCHEMA,
  buildGoldenGateDiff,
  listGoldenGateDiffs,
  countDiffLines
} = require('../src/core/golden-gate-diff');
const { formatUnifiedDiff } = require('../src/core/patch-preview');
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

console.log('\n\x1b[36m═══ Epoch 7 — Golden Gate Diff ═══\x1b[0m\n');

(async () => {
  const root = path.join(__dirname, '..');
  const hello = 'examples/hello.noeon';

  await runGoldenGateRemediate({
    root,
    forceFiles: [hello],
    max_rounds: 1,
    applyToWorktree: false
  });

  const diff = buildGoldenGateDiff({ root, file: hello });
  assert(diff.schema === GOLDEN_DIFF_SCHEMA, 'diff schema');
  assert(diff.ok === true, 'hello diff ok');
  assert(diff.diff.includes('+++'), 'unified diff format');
  assert(diff.stats.added >= 0, 'diff stats');

  const stats = countDiffLines(diff.diff);
  assert(stats.added === diff.stats.added, 'countDiffLines matches');

  const index = listGoldenGateDiffs({ root });
  assert(index.some((e) => e.file === hello && e.hasDiff), 'diff index lists hello');

  const inline = formatUnifiedDiff('line1\n', 'line1\nline2\n', 'x.noeon');
  assert(inline.includes('+line2'), 'formatUnifiedDiff baseline');

  const listMock = mockRes();
  await handlePlaygroundApi(mockReq('GET', '/api/golden-gate/diff'), listMock.res, '/api/golden-gate/diff');
  assert(listMock.get().status === 200, 'GET diff index 200');
  assert(Array.isArray(listMock.get().payload.files), 'diff index files array');

  const fileMock = mockRes();
  await handlePlaygroundApi(
    mockReq('GET', `/api/golden-gate/diff?file=${encodeURIComponent(hello)}`),
    fileMock.res,
    '/api/golden-gate/diff'
  );
  assert(fileMock.get().status === 200, 'GET diff file 200');
  assert(fileMock.get().payload.ok === true, 'GET diff file ok');

  const previewMock = mockRes();
  await handlePlaygroundApi(
    mockReq('POST', '/api/diff/preview', { before: 'a\n', after: 'a\nb\n', filename: 't.noeon' }),
    previewMock.res,
    '/api/diff/preview'
  );
  assert(previewMock.get().status === 200, 'POST diff preview 200');
  assert(previewMock.get().payload.diff.includes('+b'), 'POST diff preview content');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
