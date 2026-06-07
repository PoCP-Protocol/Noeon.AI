'use strict';

const { spawn } = require('child_process');
const { getPlugin } = require('../src/runtime/plugins/registry');
const httpCall = require('../src/runtime/plugins/http-call');

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

async function withEnv(overrides, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

console.log('\n\x1b[36m═══ HTTP Call Plugin Tests ═══\x1b[0m\n');

function startHttpServerChild() {
  const script = `
const http = require('http');
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ok-from-test-server');
});
server.listen(0, '127.0.0.1', () => {
  process.stdout.write(String(server.address().port) + '\\n');
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
`;

  const child = spawn(process.execPath, ['-e', script], {
    stdio: ['ignore', 'pipe', 'inherit']
  });

  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('test HTTP server did not start'));
    }, 5000);

    child.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.stdout.on('data', (chunk) => {
      output += chunk.toString('utf8');
      const line = output.split(/\r?\n/)[0].trim();
      if (!line) return;
      clearTimeout(timer);
      resolve({ child, port: Number(line) });
    });
  });
}

const plugin = getPlugin('http_call');
assert(plugin && plugin.name === 'http_call', 'registry exposes http_call plugin');

(async () => {
  await withEnv({ NOEON_HTTP_MOCK: undefined, NOEON_HTTP_ALLOWLIST: undefined }, async () => {
    const mockResult = await plugin.execute({
      stepName: 'value_settlement',
      binding: {
        endpoint: 'https://api.example.com/settle',
        latencyMs: 42,
        mock: true
      },
      feedback: {}
    });

    assert(mockResult.status === 'done', 'mock mode succeeds deterministically');
    assert(mockResult.reason === 'http call succeeded', 'mock mode uses legacy success reason');
    assert(mockResult.latencyMs === 42, 'mock mode respects latencyMs');
    assert(mockResult.pluginMeta.mocked === true, 'mock mode sets mocked audit flag');
    assert(mockResult.pluginMeta.url === 'https://api.example.com/settle', 'mock mode records url');
    assert(mockResult.pluginMeta.statusCode === 200, 'mock mode reports synthetic statusCode');
  });

  await withEnv({ NOEON_HTTP_MOCK: 'true', NOEON_HTTP_ALLOWLIST: undefined }, async () => {
    const envMock = await plugin.execute({
      stepName: 'release_gating',
      binding: { endpoint: 'https://api.example.com/gate', latencyMs: 77 },
      feedback: {}
    });

    assert(envMock.status === 'done', 'NOEON_HTTP_MOCK enables legacy mock behavior');
    assert(envMock.pluginMeta.mocked === true, 'NOEON_HTTP_MOCK sets mocked audit flag');
    assert(envMock.latencyMs === 77, 'NOEON_HTTP_MOCK mock respects latencyMs');
  });

  await withEnv({ NOEON_HTTP_MOCK: undefined, NOEON_HTTP_ALLOWLIST: 'api.example.com' }, async () => {
    const blocked = await plugin.execute({
      stepName: 'external_call',
      binding: {
        endpoint: 'https://evil.example.net/data',
        latencyMs: 100
      },
      feedback: {}
    });

    assert(blocked.status === 'failed', 'allowlist blocks unknown hosts');
    assert(blocked.errorCode === 'HTTP_BLOCKED', 'allowlist denial uses HTTP_BLOCKED');
    assert(blocked.failureCategory === 'policy_block', 'allowlist denial is policy_block');
    assert(
      String(blocked.reason).includes('allowlist'),
      'allowlist denial explains host restriction'
    );
    assert(blocked.pluginMeta.mocked === false, 'allowlist block is not mocked');
  });

  await withEnv({ NOEON_HTTP_MOCK: undefined, NOEON_HTTP_ALLOWLIST: undefined }, async () => {
    const blockedPrivate = await plugin.execute({
      stepName: 'local_probe',
      binding: {
        endpoint: 'http://127.0.0.1:9/probe',
        latencyMs: 100
      },
      feedback: {}
    });

    assert(blockedPrivate.status === 'failed', 'private loopback IP blocked by default');
    assert(blockedPrivate.errorCode === 'HTTP_BLOCKED', 'private IP denial uses HTTP_BLOCKED');
    assert(
      String(blockedPrivate.reason).includes('private') ||
        String(blockedPrivate.reason).includes('loopback'),
      'private IP denial explains restriction'
    );
  });

  await withEnv({ NOEON_HTTP_MOCK: 'true', NOEON_HTTP_ALLOWLIST: undefined }, async () => {
    const injected = await plugin.execute({
      stepName: 'commit_decision',
      binding: {
        endpoint: 'https://api.example.com/commit',
        latencyMs: 600
      },
      feedback: {
        actionResults: {
          commit_decision: {
            status: 'failed',
            reason: 'upstream rejected commit',
            errorCode: 'HTTP_CALL_FAILED',
            latencyMs: 321
          }
        }
      }
    });

    assert(injected.status === 'failed', 'feedback injection can force failure');
    assert(injected.reason === 'upstream rejected commit', 'feedback injection preserves reason');
    assert(injected.errorCode === 'HTTP_CALL_FAILED', 'feedback injection preserves errorCode');
    assert(injected.latencyMs === 321, 'feedback injection preserves latencyMs');
    assert(injected.pluginMeta.mocked === true, 'feedback injection failure stays mocked');
  });

  const server = await startHttpServerChild();
  const { port } = server;

  try {
    await withEnv({ NOEON_HTTP_MOCK: undefined, NOEON_HTTP_ALLOWLIST: undefined }, async () => {
      const blockedWithoutFlag = await plugin.execute({
        stepName: 'local_real_call',
        binding: {
          endpoint: `http://127.0.0.1:${port}/`,
          latencyMs: 1000
        },
        feedback: {}
      });
      assert(blockedWithoutFlag.status === 'failed', 'real mode still blocks loopback without allow_private');

      const allowedPrivate = await plugin.execute({
        stepName: 'local_real_call',
        binding: {
          endpoint: `http://127.0.0.1:${port}/`,
          allow_private: true,
          allow_hosts: '127.0.0.1',
          latencyMs: 1000
        },
        feedback: {}
      });

      assert(allowedPrivate.status === 'done', 'allow_private with allow_hosts can reach local test server');
      assert(allowedPrivate.pluginMeta.mocked === false, 'real HTTP marks mocked=false');
      assert(allowedPrivate.pluginMeta.statusCode === 200, 'real HTTP records statusCode');
      assert(allowedPrivate.pluginMeta.bytes >= 18, 'real HTTP records response bytes');
      assert(allowedPrivate.pluginMeta.durationMs >= 0, 'real HTTP records durationMs');
    });
  } finally {
    server.child.kill();
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
