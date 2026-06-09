'use strict';

const path = require('path');
const {
  isGeneralCanonicalEnabled,
  isToolCanonicalCandidate,
  isHybridCanonicalCandidate,
  resolveGeneralCanonical,
  resolveCompilePresentation
} = require('../src/core/general-canonical-mode');
const { runProgram, parseProgram } = require('../src/runtime/unified-runtime');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ General Canonical Mode ═══\x1b[0m\n');

(async () => {
  const prevEnv = process.env.NOEON_GENERAL_CANONICAL;
  const prevToolsEnv = process.env.NOEON_GENERAL_CANONICAL_TOOLS;
  delete process.env.NOEON_GENERAL_CANONICAL;
  delete process.env.NOEON_GENERAL_CANONICAL_TOOLS;

  process.env.NOEON_GENERAL_CANONICAL = '1';
  assert(isGeneralCanonicalEnabled() === true, 'NOEON_GENERAL_CANONICAL=1 enables mode');
  assert(isGeneralCanonicalEnabled({ general_canonical: false }) === false, 'option overrides env');
  delete process.env.NOEON_GENERAL_CANONICAL;

  const { ast: httpAst } = parseProgram(path.join(__dirname, '../examples/http_demo.noeon'));
  const { ast: agentAst } = parseProgram(path.join(__dirname, '../examples/agent_research.noeon'));
  const { ast: helloAst } = parseProgram(path.join(__dirname, '../examples/hello.noeon'));

  assert(isToolCanonicalCandidate(httpAst) === true, 'http_demo is tool canonical candidate');
  assert(isToolCanonicalCandidate(helloAst) === false, 'hello.noeon is not tool canonical candidate');

  assert(
    resolveGeneralCanonical(httpAst, { projectConfig: { cognition: { general_canonical_tools: true } } }) === true,
    'project general_canonical_tools auto-enables tool programs'
  );
  assert(
    resolveGeneralCanonical(helloAst, { projectConfig: { cognition: { general_canonical_tools: true } } }) === false,
    'general_canonical_tools does not enable non-tool programs'
  );
  assert(
    resolveGeneralCanonical(httpAst, { general_canonical: false, projectConfig: { cognition: { general_canonical_tools: true } } }) === false,
    'explicit general_canonical=false overrides tool auto'
  );

  assert(isHybridCanonicalCandidate(agentAst) === true, 'agent_research is hybrid candidate');
  assert(
    resolveGeneralCanonical(agentAst, { projectConfig: { cognition: { general_canonical_agents: true } } }) === true,
    'project general_canonical_agents auto-enables hybrid agent programs'
  );
  assert(
    resolveGeneralCanonical(helloAst, { projectConfig: { cognition: { general_canonical_agents: true } } }) === false,
    'general_canonical_agents does not enable non-hybrid programs'
  );

  const ast = { general: { canonicalIr: { intent: { name: 'demo' } } } };
  const cognitiveProgram = { toJSON: () => ({ nodes: [] }) };

  const off = resolveCompilePresentation(ast, cognitiveProgram, { general_canonical: false });
  assert(off.compileMode === 'cognitive-primary', 'default compileMode is cognitive-primary');
  assert(off.primaryIr === 'cognitive', 'default primaryIr is cognitive');

  const on = resolveCompilePresentation(ast, cognitiveProgram, { general_canonical: true });
  assert(on.compileMode === 'canonical-primary', 'enabled compileMode is canonical-primary');
  assert(on.primaryIr === 'canonical', 'enabled primaryIr is canonical');
  assert(on.canonicalIr?.intent?.name === 'demo', 'presentation preserves canonicalIr');

  const missing = resolveCompilePresentation({}, cognitiveProgram, { general_canonical: true });
  assert(missing.compileMode === 'cognitive-primary', 'no canonicalIr keeps cognitive-primary');

  const autoRun = await runProgram(httpAst, {
    quiet: true,
    console: false,
    with_protocol: 'off',
    filename: 'http_demo.noeon'
  });
  assert(autoRun.snapshotActExecution === true, 'runProgram auto-enables tool canonical act path');
  assert(autoRun.actDriver === 'canonical.execution.acts', 'auto run uses canonical act driver');

  const agentRun = await runProgram(agentAst, {
    quiet: true,
    console: false,
    with_protocol: 'off',
    filename: 'agent_research.noeon'
  });
  assert(agentRun.hybridActExecution === true, 'runProgram auto-enables agent hybrid canonical path');

  process.env.NOEON_GENERAL_CANONICAL_TOOLS = '1';
  assert(resolveGeneralCanonical(httpAst, {}) === true, 'NOEON_GENERAL_CANONICAL_TOOLS=1 enables tool auto');

  if (prevEnv === undefined) delete process.env.NOEON_GENERAL_CANONICAL;
  else process.env.NOEON_GENERAL_CANONICAL = prevEnv;
  if (prevToolsEnv === undefined) delete process.env.NOEON_GENERAL_CANONICAL_TOOLS;
  else process.env.NOEON_GENERAL_CANONICAL_TOOLS = prevToolsEnv;

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
