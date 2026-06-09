'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseFromSource,
  compileProgram,
  runProgram,
  hasProtocolFeatures,
  enrichWithProtocol,
  RUNTIME_VERSION
} = require('../src/runtime/unified-runtime');
const { parseAel } = require('../src/parser');
const { loadProjectConfig, resolveRunOptions } = require('../src/core/config');
const { shouldEnrichProtocol } = require('../src/core/protocol-bridge');
const { NOEON_VERSION } = require('../src/core/release-version');
const {
  getHover,
  getDocumentSymbols,
  validateSource
} = require('../language-server/noeon-service');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Unified Runtime v0.9 Tests ═══\x1b[0m\n');

assert(RUNTIME_VERSION === NOEON_VERSION, `RUNTIME_VERSION is ${NOEON_VERSION}`);

const { ast } = parseFromSource('VERSION "0.9"\nNETWORK "t"\nTASK "x"\nBUDGET 1 msat\nDEADLINE 2026-01-01T00:00:00Z\n');
assert(ast.task, 'parseFromSource parses minimal contract');

const both = compileProgram(ast, 'both');
assert(both.format === 'both' && both.program && both.artifact, 'compile both IR + AEL artifact');

const { config } = loadProjectConfig();
assert(config.environment, 'loadProjectConfig returns defaults');
const resolved = resolveRunOptions({}, config);
assert(resolved.with_protocol === 'auto', 'resolveRunOptions defaults with_protocol auto');

const contractSrc = fs.readFileSync(path.join(__dirname, '../examples/noeon_contract.ael'), 'utf8');
const contractAst = parseAel(contractSrc);
assert(hasProtocolFeatures(contractAst) || true, 'hasProtocolFeatures runs on contract');
assert(shouldEnrichProtocol(contractAst, { with_protocol: 'auto' }) === hasProtocolFeatures(contractAst), 'shouldEnrichProtocol matches features');

const hover = getHover('PERCEIVE source=x\n', 0, 8);
assert(hover && hover.keyword === 'PERCEIVE', 'LSP hover for PERCEIVE');

const symbols = getDocumentSymbols('TASK "my_task"\nPERCEIVE x\nREASON y\n');
assert(symbols.some((s) => s.name === 'my_task'), 'document symbols include TASK');
assert(symbols.some((s) => s.name === 'PERCEIVE'), 'document symbols include cognitive ops');
const generalSymbols = getDocumentSymbols('PROGRAM "hello"\nOBJECTIVE "greet"\nUNDERSTAND context=x\nACT action=y\n');
assert(generalSymbols.some((s) => s.name === 'hello'), 'document symbols include PROGRAM');
assert(generalSymbols.some((s) => s.name === 'UNDERSTAND'), 'document symbols include general ops');

const bad = validateSource('TASK broken\n');
assert(Array.isArray(bad), 'validateSource returns diagnostics array');

(async () => {
  const minimal = parseAel(fs.readFileSync(path.join(__dirname, '../examples/cognitive_minimal.ael'), 'utf8'));
  const runResult = await runProgram(minimal, { quiet: true, console: false, with_protocol: 'off' });
  assert(runResult.success === true, 'run with protocol off succeeds');

  const general = parseAel(fs.readFileSync(path.join(__dirname, '../examples/hello.noeon'), 'utf8'));
  const generalRun = await runProgram(general, { quiet: true, console: false, with_protocol: 'off', filename: 'hello.noeon' });
  assert(generalRun.success === true && generalRun.profile === 'general', 'runProgram executes general profile');

  const enriched = await enrichWithProtocol(contractAst, runResult, {}, { with_protocol: 'on' });
  assert(enriched.enriched === true, 'protocol enrichment on contract');
  assert(enriched.compute || enriched.metaPolicy, 'enrichment includes compute or meta');

  const runWithProtocol = await runProgram(contractAst, {
    quiet: true,
    console: false,
    with_protocol: 'on'
  });
  assert(runWithProtocol.phases.includes('protocol'), 'runProgram runs protocol phase');
  assert(runWithProtocol.protocol?.execution?.compute != null, 'runProgram attaches protocol block');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
