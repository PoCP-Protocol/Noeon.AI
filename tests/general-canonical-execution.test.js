'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { executeProgram } = require('../src/vm/unified-executor');
const { NOEON_ERA } = require('../src/core/release-version');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ General Canonical Execution (New Era) ═══\x1b[0m\n');

assert(NOEON_ERA === 'canonical-primary-era', 'release era marks canonical-primary-era');

const source = fs.readFileSync(path.join(__dirname, '../examples/web_fetch.noeon'), 'utf8');
const ast = parseAel(source);
assert(Boolean(ast.general?.canonicalIr?.intent), 'parse attaches general canonicalIr snapshot');

const prepDefault = prepareCanonicalExecution(ast, { general_canonical: false });
assert(prepDefault.canonicalPrimary !== true, 'default prep is not canonical-primary');

const astPrimary = parseAel(source);
const prepPrimary = prepareCanonicalExecution(astPrimary, { general_canonical: true });
assert(prepPrimary.canonicalPrimary === true, 'general_canonical prep marks canonicalPrimary');
assert(prepPrimary.executionDriver === 'snapshot-primary', 'prep uses snapshot-primary driver');
assert((prepPrimary.snapshotActCount ?? 0) >= 1, 'prep reports snapshot act count');
assert(prepPrimary.canonicalSource === 'general.lower.snapshot', 'canonical source is parse-time snapshot');
assert(astPrimary.cognition?.context?._canonicalPrimary === true, 'context flags _canonicalPrimary');
assert(
  prepPrimary.canonical?.intent?.goal != null || prepPrimary.canonical?.task != null,
  'snapshot canonical retains intent/task'
);

const astNoLower = parseAel(source);
const canonicalLower = require('../src/core/canonical-lower');
const origLower = canonicalLower.lowerToCanonical;
let lowerInvoked = false;
canonicalLower.lowerToCanonical = (...args) => {
  lowerInvoked = true;
  return origLower(...args);
};
prepareCanonicalExecution(astNoLower, { general_canonical: true });
canonicalLower.lowerToCanonical = origLower;
assert(lowerInvoked === false, 'snapshot-primary skips runtime lowerToCanonical');

(async () => {
  const runAst = parseAel(source);
  const result = await executeProgram(runAst, {
    quiet: true,
    console: false,
    with_protocol: 'off',
    filename: 'web_fetch.noeon',
    general_canonical: true
  });
  assert(result.success === true, 'executeProgram succeeds with general_canonical');
  assert(result.canonicalPrimary === true, 'result marks canonicalPrimary');
  assert(result.executionDriver === 'snapshot-primary', 'result uses snapshot-primary driver');
  assert((result.snapshotActCount ?? 0) >= 1, 'result reports snapshot act count');
  assert(result.compileMode === 'canonical-primary', 'result compileMode canonical-primary');
  assert(result.primaryIr === 'canonical', 'result primaryIr canonical');
  assert(result.executor === 'canonical', 'result uses canonical executor');
  assert(result.irFirst === true, 'result is IR-first');
  assert(result.snapshotActExecution === true, 'result uses snapshot act execution');
  assert(result.actDriver === 'canonical.execution.acts', 'result actDriver is canonical.execution.acts');
  assert(result.phases?.includes('canonical-act'), 'result records canonical-act phase');
  assert(result.phases?.includes('cognitive') === false, 'snapshot path skips legacy cognitive phase');

  const { extractActionTrace } = require('../src/core/action-trace');
  const trace = extractActionTrace(result);
  assert(trace.count >= 1, 'action trace includes canonical acts');
  assert(trace.actions[0]?.source === 'canonical.execution.acts', 'action trace marks canonical source');
  assert(typeof trace.lastFetch === 'string' && trace.lastFetch.length > 0, 'action trace includes last_fetch');

  console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
