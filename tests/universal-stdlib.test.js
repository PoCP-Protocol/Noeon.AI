'use strict';

const { STDLIB_MODULES, resolveImport, buildImportContext } = require('../src/stdlib/registry');
const { buildUniversalTemplate, buildMinimalUniversal } = require('../src/core/universal-scaffold');
const { validateImports } = require('../src/stdlib/registry');
const { parseUniversalSource } = require('../src/grammar/universal-lower');
const { runGoldenGate } = require('../scripts/golden-gate');
const { handlePlaygroundApi } = require('../src/playground-api');

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

console.log('\n\x1b[36m═══ Epoch 10 — Universal Stdlib & Gate ═══\x1b[0m\n');

(async () => {
  assert(STDLIB_MODULES['std.universal']?.module === 'std.universal', 'std.universal registered');
  assert(resolveImport('std.universal')?.exports?.scaffold, 'scaffold export');

  const ctx = buildImportContext(['std.universal', 'std.ai']);
  assert(ctx.stdUniversal != null, 'import context stdUniversal');
  assert(ctx.stdAi != null, 'import context stdAi');

  const errors = [];
  validateImports(['std.universal'], errors);
  assert(errors.length === 0, 'validateImports accepts std.universal');

  const tpl = buildUniversalTemplate({ name: 'TestBot', intent: 'Test intent' });
  assert(tpl.includes('UNIVERSAL "TestBot"'), 'template has UNIVERSAL block');
  assert(tpl.includes('import std.universal'), 'template imports std.universal');
  assert(tpl.includes('EPISTEMIC'), 'template has EPISTEMIC');

  const ast = parseUniversalSource(buildMinimalUniversal('Mini', 'Quick test'), { filename: 'mini.noeon' });
  assert(ast.universal?.dimensions?.intent?.goal === 'Quick test', 'scaffold parses back');

  const scaffoldMock = mockRes();
  await handlePlaygroundApi(
    mockReq('POST', '/api/universal/scaffold', { name: 'ApiBot', intent: 'API test' }),
    scaffoldMock.res,
    '/api/universal/scaffold'
  );
  assert(scaffoldMock.get().status === 200, 'scaffold API 200');
  assert(scaffoldMock.get().payload.source.includes('ApiBot'), 'scaffold API source');

  const gate = await runGoldenGate({ root: require('path').join(__dirname, '..') });
  const uniPrograms = (gate.programs || []).filter((p) => p.file.includes('universal/'));
  assert(uniPrograms.length >= 2, 'golden gate includes universal programs');
  assert(uniPrograms.every((p) => p.ok), 'universal golden gate programs pass');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
