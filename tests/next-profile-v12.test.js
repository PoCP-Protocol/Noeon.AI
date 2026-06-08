'use strict';

const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ Next Profile v12 Myth Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.2.0"',
    'PROGRAM "mythic_coder"',
    'GOAL "create adaptive systems with poetic rigor" priority=0.9',
    'MYTH "Code is a living story of constraints and emergence" tone=visionary directive=co_create',
    'MODEL name=context source=workspace confidence=0.87',
    'STRATEGY name=craft objective=innovation risk=medium',
    'GUARANTEE name=safety_guard expr="portfolio_risk <= policy.max_risk"',
    'ACT action=emit_language capability=runtime.design budget_ms=500',
    'REFLECT target=emit_language method=causal',
    'EVOLVE scope=strategy guard=safety_guard mutation=mythic-shift'
  ].join('\n');

  const ast = parseAel(source, { filename: 'mythic_coder.noeon' });
  assert(Array.isArray(ast.next?.myths) && ast.next.myths.length === 1, 'parser captures MYTH');

  const validation = validateAel(ast);
  assert(validation.valid === true, 'program with MYTH passes validation');

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    auto_evolve: true,
    feedback: {
      portfolio_risk: 0.2,
      policy: { max_risk: 0.4 }
    }
  });

  assert(run.success === true, 'execution succeeds');
  assert(Array.isArray(run.next?.myths) && run.next.myths.length === 1, 'execution exposes myths');
  assert((run.next?.reflection?.insights || []).some((x) => x.type === 'mythic-core'), 'reflection includes mythic-core insight');
  assert((run.next?.evolution?.proposals || []).some((x) => x.kind === 'mythic-alignment'), 'evolution includes mythic-alignment proposal');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
