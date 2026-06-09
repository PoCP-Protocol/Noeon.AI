'use strict';

const path = require('path');
const {
  STUDIO_GOLDEN_SCHEMA,
  buildGoldenGateStudioStatus,
  refreshGoldenGateArtifacts
} = require('../src/core/golden-gate-status');
const { handlePlaygroundApi } = require('../src/playground-api');
const { postRemediateVerify, buildPostVerifyComment } = require('../scripts/golden-gate-remediate');

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

console.log('\n\x1b[36m═══ Epoch 6 — Studio Golden Gate ═══\x1b[0m\n');

(async () => {
  const root = path.join(__dirname, '..');

  const status = buildGoldenGateStudioStatus({ root });
  assert(status.schema === STUDIO_GOLDEN_SCHEMA, 'studio golden schema');
  assert(status.era === 'canonical-primary-era', 'studio status includes release era');
  assert(status.canonicalPath != null, 'studio status includes canonicalPath summary');
  assert(Array.isArray(status.canonicalProbePrograms), 'studio status includes canonicalProbePrograms');
  assert(Array.isArray(status.programs), 'programs array');
  assert(Array.isArray(status.hints), 'hints array');

  const gate = await refreshGoldenGateArtifacts({ root });
  assert(typeof gate.ok === 'boolean', 'refreshGoldenGateArtifacts returns gate');
  const afterRefresh = buildGoldenGateStudioStatus({ root });
  assert(afterRefresh.gate != null, 'gate populated after refresh');
  assert(afterRefresh.goldenGateExecution != null, 'goldenGateExecution on studio status after refresh');
  assert(afterRefresh.canonicalPath?.probes?.total === 5, 'five canonical probes tracked');
  const withExecution = (afterRefresh.programs || []).filter((p) => p.execution?.strategy);
  assert(withExecution.length > 0, 'AI path programs include execution strategy after refresh');

  const verify = await postRemediateVerify(root);
  assert(typeof verify.ok === 'boolean', 'postRemediateVerify ok boolean');
  assert(Array.isArray(verify.programs), 'postRemediateVerify programs');
  const withPost = buildGoldenGateStudioStatus({ root });
  assert(withPost.postRemediateGate != null, 'postRemediateGate on studio status');

  const comment = buildPostVerifyComment(verify, 'https://example.com/pr/1');
  assert(comment.includes('Re-Verify'), 'post verify comment template');

  const statusMock = mockRes();
  await handlePlaygroundApi(
    mockReq('GET', '/api/golden-gate/status'),
    statusMock.res,
    '/api/golden-gate/status'
  );
  const statusPayload = statusMock.get().payload;
  assert(statusMock.get().status === 200, 'GET /api/golden-gate/status 200');
  assert(statusPayload.schema === STUDIO_GOLDEN_SCHEMA, 'API status schema');
  assert(statusPayload.canonicalProbePrograms?.length === 5, 'API exposes five probe programs');
  assert(statusPayload.goldenGateExecution != null, 'studio status includes goldenGateExecution');

  const remediateMock = mockRes();
  await handlePlaygroundApi(
    mockReq('POST', '/api/golden-gate/remediate', {
      apply: false,
      force_files: ['examples/hello.noeon'],
      verify: false,
      max_rounds: 1
    }),
    remediateMock.res,
    '/api/golden-gate/remediate'
  );
  const remediatePayload = remediateMock.get().payload;
  assert(remediateMock.get().status === 200, 'POST /api/golden-gate/remediate 200');
  assert(remediatePayload.remediate?.summary != null, 'remediate summary in API');
  assert(remediatePayload.studio?.schema === STUDIO_GOLDEN_SCHEMA, 'studio block in remediate API');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
