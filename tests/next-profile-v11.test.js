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

console.log('\n\x1b[36m═══ Next Profile v11 SelfModel Tests ═══\x1b[0m\n');

(async () => {
  const source = [
    'PROFILE "next"',
    'VERSION "1.1.0"',
    'PROGRAM "self_authored_protocol"',
    'GOAL "co-create and self-evolve safely" priority=0.92',
    'SELFMODEL id=genesis identity=ai_author creator="AI Collective" paradigm=autopoiesis principle="creation-through-reflection"',
    'MODEL name=context source=workspace confidence=0.88',
    'STRATEGY name=co_create objective=innovation risk=medium',
    'GUARANTEE name=safety_guard expr="portfolio_risk <= policy.max_risk"',
    'ACT action=emit_design capability=runtime.design budget_ms=400',
    'REFLECT target=emit_design method=counterfactual',
    'EVOLVE scope=strategy guard=safety_guard mutation=identity-aligned-shift'
  ].join('\n');

  const ast = parseAel(source, { filename: 'self_authored_protocol.noeon' });
  assert(Array.isArray(ast.next?.selfModels) && ast.next.selfModels.length === 1, 'parser captures SELFMODEL');

  const validation = validateAel(ast);
  assert(validation.valid === true, 'program with SELFMODEL passes validation');

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
  assert(Array.isArray(run.next?.selfModels) && run.next.selfModels.length === 1, 'execution exposes selfModels');
  assert((run.next?.reflection?.insights || []).some((x) => x.type === 'self-model'), 'reflection includes self-model insight');
  assert((run.next?.evolution?.proposals || []).some((x) => x.kind === 'selfmodel-alignment'), 'evolution includes selfmodel alignment proposal');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
