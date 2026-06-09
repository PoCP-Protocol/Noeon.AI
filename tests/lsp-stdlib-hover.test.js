'use strict';

const fs = require('fs');
const path = require('path');
const { getHover, STDLIB_HOVER, runPipelineRequest } = require('../language-server/noeon-service');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ LSP Stdlib + Canonical Hover ═══\x1b[0m\n');

const webDemo = fs.readFileSync(path.join(__dirname, '../examples/web_fetch.noeon'), 'utf8');

const importHover = getHover(webDemo, 4, 10, 'web_fetch.noeon');
assert(importHover?.keyword === 'std.web', 'hover on import std.web');
assert(importHover?.doc?.includes('http_call'), 'std.web hover mentions plugin path');

const textLine = webDemo.split('\n').findIndex((l) => l.includes('text('));
const textHover = getHover(webDemo, textLine, 6, 'web_fetch.noeon');
assert(textHover?.keyword === 'std.web.text', 'hover on text() call');
assert(textHover?.doc?.includes('plain-text'), 'text export hover describes extraction');

const profileHover = getHover(webDemo, 0, 8, 'web_fetch.noeon');
assert(profileHover?.keyword === 'profile', 'hover on profile line');
assert(profileHover?.doc?.includes('canonicalIr'), 'profile hover mentions canonicalIr snapshot');

assert(Boolean(STDLIB_HOVER['std.github']), 'STDLIB_HOVER includes std.github');

(async () => {
  const run = await runPipelineRequest(webDemo, 'web_fetch.noeon', {
    with_protocol: 'off',
    trace: true,
    general_canonical: true
  });
  assert(run.compileMode === 'canonical-primary', 'LSP pipeline run returns canonical-primary');
  assert(run.primaryIr === 'canonical', 'LSP pipeline run returns primaryIr canonical');
  assert(run.canonicalPrimary === true, 'LSP pipeline run marks canonicalPrimary');
  assert(run.executionDriver === 'snapshot-primary', 'LSP pipeline run uses snapshot-primary');
  assert((run.snapshotActCount ?? 0) >= 1, 'LSP pipeline run reports snapshot acts');
  assert(run.snapshotActExecution === true, 'LSP pipeline run uses direct canonical acts');
  assert(run.actDriver === 'canonical.execution.acts', 'LSP pipeline run actDriver');
  assert(run.phases?.includes('canonical-act'), 'LSP pipeline run canonical-act phase');
  assert(run.canonicalSource === 'general.lower.snapshot', 'LSP pipeline run uses snapshot source');
  assert(run.era === 'canonical-primary-era', 'LSP pipeline run exposes release era');
  assert(Boolean(run.canonicalIr?.intent), 'LSP pipeline run includes canonicalIr');
  assert(run.actionTrace?.count >= 1, 'LSP pipeline run includes actionTrace');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
