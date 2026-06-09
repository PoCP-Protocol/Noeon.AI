'use strict';

const path = require('path');
const { runNoeonPipeline } = require('../src/core/pipeline');
const {
  EVIDENCE_SCHEMA,
  buildCognitiveEvidence,
  validateCognitiveEvidence,
  assertCognitiveEvidence
} = require('../src/core/cognitive-evidence');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Cognitive Evidence ═══\x1b[0m\n');

(async () => {
  const helloFile = path.join(__dirname, '../examples/hello.noeon');
  const hello = await runNoeonPipeline(helloFile, {
    filename: helloFile,
    with_protocol: 'off',
    quiet: true
  });

  const evidence = hello.report?.cognitiveEvidence || buildCognitiveEvidence(hello, hello.ast);
  const check = validateCognitiveEvidence(evidence);

  assert(evidence.schema === EVIDENCE_SCHEMA, 'evidence schema version');
  assert(check.valid === true, 'hello evidence validates');
  assert(hello.report?.cognitiveEvidenceValid === true, 'report flags valid evidence');
  assert(evidence.artifacts.length >= 4, 'hello produces multiple artifacts');
  assert(
    evidence.artifacts.every((a) => Array.isArray(a.evidence) && a.evidence.length > 0 && a.confidence != null),
    'every artifact has evidence[] and confidence'
  );
  assert(
    evidence.artifacts.some((a) => a.phase === 'reason' && a.hypothesis),
    'reason phase carries hypothesis (not bare string only)'
  );
  assert(
    evidence.artifacts.some((a) => a.phase === 'decide' && a.decision?.chosen),
    'decide phase carries structured decision'
  );
  assert(
    evidence.artifacts.some((a) => a.phase === 'reflect'),
    'reflect phase present from validate/reflection'
  );

  const riskFile = path.join(__dirname, '../examples/agent_risk_review.noeon');
  const risk = await runNoeonPipeline(riskFile, {
    filename: riskFile,
    with_protocol: 'off',
    quiet: true
  });
  const riskEvidence = risk.report?.cognitiveEvidence;
  assert(riskEvidence?.goal, 'risk review evidence includes goal');
  assertCognitiveEvidence(riskEvidence);

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  failed += 1;
  console.error(error);
  process.exit(1);
});
