'use strict';

const fs = require('fs');
const path = require('path');
const { parseNoeonInput } = require('../src/core/pipeline');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { runPostRunSelfImprove } = require('../src/core/self-improve');
const { buildPatchPreview, applyPatchesToSource, PATCH_PREVIEW_SCHEMA } = require('../src/core/patch-preview');
const { buildPrCommentMarkdown } = require('../scripts/golden-gate-pr-comment');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Epoch 3 — Patch Preview & PR Feedback ═══\x1b[0m\n');

const helloPath = path.join(__dirname, '../examples/hello.noeon');
const helloSource = fs.readFileSync(helloPath, 'utf8');
const { ast } = parseNoeonInput(helloPath, { filename: helloPath });
const prep = prepareCanonicalExecution(ast, { filename: helloPath });

const improve = runPostRunSelfImprove(ast, prep, { success: true, cognitive: { context: { confidence: 0.5 } } }, {
  source: helloSource,
  filename: helloPath
});

assert(improve.patchPreview?.schema === PATCH_PREVIEW_SCHEMA, 'selfImprove embeds patchPreview');
assert(Array.isArray(improve.patchPreview?.applied) || improve.patchPreview?.changed === false, 'patchPreview applied array');

const preview = buildPatchPreview(helloSource, improve, { filename: helloPath });
assert(preview.schema === PATCH_PREVIEW_SCHEMA, 'buildPatchPreview schema');

const minimal = 'PROFILE "general"\nVERSION "1.0"\n\nAGENT "X"\n  GOAL "test"\n';
const patches = [
  { id: 'p1', priority: 'high', action: 'add policy', snippet: '  POLICY require_citation=true audit=true' },
  { id: 'p2', priority: 'medium', action: 'add fuse', snippet: 'FUSE relay {\n  human_must_approve: [external_send]\n}' }
];
const merged = applyPatchesToSource(minimal, patches);
assert(merged.changed, 'applyPatchesToSource changes minimal agent');
assert(merged.text.includes('require_citation'), 'policy merged');
assert(preview.diff === undefined || typeof preview.diff === 'string', 'diff is string when present');

const failPayload = {
  ok: false,
  summary: { passed: 0, total: 1 },
  conform: { allValid: true },
  programs: [{
    ok: false,
    file: 'examples/hello.noeon',
    grade: 'D',
    minGrade: 'B',
    verdict: 'needs_improvement',
    errors: ['grade D below min B'],
    brief: improve.brief,
    patchPreview: preview
  }]
};
const md = buildPrCommentMarkdown(failPayload);
assert(md.includes('Golden Gate'), 'PR comment title');
assert(md.includes('SELF-Improve brief'), 'PR comment has brief section');
assert(md.includes('Suggested patch diff') || md.includes('hello.noeon'), 'PR comment references failure');

(async () => {
  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: helloPath,
    source: helloSource
  });
  assert(run.report?.patchPreview != null || run.selfImprove?.patchPreview != null, 'run report patchPreview');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
