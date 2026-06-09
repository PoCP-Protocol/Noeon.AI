'use strict';

const fs = require('fs');
const path = require('path');
const { detectSurface, SURFACES, hasUniversalSyntax } = require('../src/grammar/detect');
const { dispatchParseSurface } = require('../src/grammar/parse-dispatch');
const { parseUniversalSource } = require('../src/grammar/universal-lower');
const {
  UNIVERSAL_FORMULA,
  UNIVERSAL_SCHEMA,
  validateUniversalProgram,
  buildUniversalBrief
} = require('../src/core/universal-kernel');
const { evaluateAiNative } = require('../src/core/ai-native-lens');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
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

console.log('\n\x1b[36m═══ Epoch 9 — Noeon Universal Native Language ═══\x1b[0m\n');

(async () => {
  const root = path.join(__dirname, '..');
  const research = path.join(root, 'examples/universal/research_synth.noeon');
  const codeAgent = path.join(root, 'examples/universal/code_agent.noeon');
  const orchestrator = path.join(root, 'examples/universal/orchestrator.noeon');

  const source = fs.readFileSync(research, 'utf8');
  assert(hasUniversalSyntax(source), 'detects UNIVERSAL syntax');
  assert(detectSurface(source, { filename: research }) === SURFACES.UNIVERSAL, 'surface is universal');

  const ast = parseUniversalSource(source, { filename: research });
  assert(ast.profile === 'universal', 'AST profile universal');
  assert(ast.detectedSurface === 'universal', 'detectedSurface universal');
  assert(ast.universal?.name === 'ResearchSynth', 'universal name parsed');
  assert(ast.agents?.[0]?.flow?.length >= 4, 'cognitive flow lowered');
  assert(ast.agents?.[0]?.policy?.require_citation === true, 'epistemic policy merged');

  const validation = validateUniversalProgram(ast.universal);
  assert(validation.schema === UNIVERSAL_SCHEMA, 'validation schema');
  assert(validation.score >= 0.83, 'research_synth six dimensions complete');
  assert(validation.ready === true, 'research_synth ready');
  assert(UNIVERSAL_FORMULA.includes('INTENT'), 'formula constant');

  const brief = buildUniversalBrief(ast.universal, validation);
  assert(brief.includes('ResearchSynth'), 'brief includes name');

  const prep = prepareCanonicalExecution(ast, { filename: research, source });
  const lens = evaluateAiNative(ast, prep);
  assert(lens.universal?.ready === true, 'lens universal meta');
  assert(['A', 'B', 'C'].includes(lens.grade), `lens grade acceptable (${lens.grade})`);

  const dispatched = dispatchParseSurface(source, { filename: research });
  assert(dispatched?.detectedSurface === SURFACES.UNIVERSAL, 'dispatchParseSurface universal');

  const codeAst = parseUniversalSource(fs.readFileSync(codeAgent, 'utf8'), { filename: codeAgent });
  assert(codeAst.universal?.dimensions?.capability?.compute != null, 'code agent compute capability');

  const orchAst = parseUniversalSource(fs.readFileSync(orchestrator, 'utf8'), { filename: orchestrator });
  assert(orchAst.universal?.dimensions?.cognition?.flow?.length >= 5, 'orchestrator extended flow');

  const apiMock = mockRes();
  await handlePlaygroundApi(
    mockReq('POST', '/api/universal/evaluate', { source, filename: 'research_synth.noeon' }),
    apiMock.res,
    '/api/universal/evaluate'
  );
  assert(apiMock.get().status === 200, 'POST /api/universal/evaluate 200');
  assert(apiMock.get().payload.validation?.ready === true, 'API validation ready');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
