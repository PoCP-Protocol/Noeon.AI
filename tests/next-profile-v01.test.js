'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { detectProfile, PROFILES } = require('../src/core/profile');
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

console.log('\n\x1b[36m═══ Next Profile v0.1 Tests ═══\x1b[0m\n');

(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../examples/next_gen_world_model.noeon'), 'utf8');
  const ast = parseAel(source, { filename: 'next_gen_world_model.noeon' });

  assert(ast.profile === 'next', 'parser lowers profile as next');
  assert(ast.next && ast.next.models.length >= 1, 'parser captures MODEL blocks');
  assert(ast.next && ast.next.guarantees.length >= 1, 'parser captures GUARANTEE blocks');
  assert(detectProfile(ast, { filename: 'next_gen_world_model.noeon' }) === PROFILES.NEXT, 'detectProfile returns NEXT');

  const validation = validateAel(ast);
  assert(validation.valid === true, 'next example passes validation');

  const run = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    filename: 'next_gen_world_model.noeon',
    feedback: {
      projected_spend: 100,
      approved_budget: 120,
      portfolio_risk: 0.2,
      policy: { max_risk: 0.4 },
      warehouse_utilization: 0.8
    }
  });

  assert(run.success === true, 'next execution succeeds when guarantees are satisfied');
  assert(run.phases.includes('next'), 'next phase executed');
  assert(run.next?.selectedStrategy != null, 'next phase chooses strategy');
  assert(run.next?.reflection?.verdict === 'stable', 'next reflection marks stable verdict when guarantees pass');
  assert(Array.isArray(run.next?.evolution?.proposals), 'next evolution proposals are generated');

  const blocked = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    strict_next: true,
    filename: 'next_gen_world_model.noeon',
    feedback: {
      projected_spend: 130,
      approved_budget: 120,
      portfolio_risk: 0.6,
      policy: { max_risk: 0.4 },
      warehouse_utilization: 0.95
    }
  });

  assert(blocked.success === false && blocked.blocked === true, 'next execution blocks on guarantee failure');
  assert(blocked.next?.blockReason === 'guarantee-failed', 'next block reason is guarantee-failed');
  assert(blocked.next?.reflection?.verdict === 'needs-correction', 'next reflection marks correction needed on failures');
  assert(blocked.next?.evolution?.count > 0, 'next evolution suggests corrective proposals on failures');

  const blockedAuto = await executeProgram(ast, {
    quiet: true,
    with_protocol: 'off',
    auto_evolve: true,
    strict_next: true,
    filename: 'next_gen_world_model.noeon',
    feedback: {
      projected_spend: 130,
      approved_budget: 120,
      portfolio_risk: 0.6,
      policy: { max_risk: 0.4 },
      warehouse_utilization: 0.95
    }
  });

  assert(blockedAuto.next?.evolution?.applied?.enabled === true, 'auto_evolve enables runtime evolution application');
  assert(typeof blockedAuto.next?.evolution?.applied?.changed === 'boolean', 'auto_evolve returns applied mutation status');

  const livingSource = [
    'PROFILE "next"',
    'VERSION "0.2.0"',
    'PROGRAM "living_market_field"',
    'GOAL "maintain adaptive market coherence" priority=0.88',
    '',
    'FIELD market_signal {',
    '  ingest: ["order_flow", "latency"]',
    '  decay: 0.02',
    '}',
    '',
    'CELL alpha {',
    '  energy: 0.91',
    '  claim: "price momentum"',
    '  when energy >= 0.8 { emit alpha_stream }',
    '}',
    '',
    'WEAVE alpha* INTO alpha_mesh {',
    '  strategy: competitive',
    '  max: 8',
    '}',
    '',
    'DREAM brancher {',
    '  branches: 3',
    '  depth: 2',
    '}',
    '',
    'FLUX breaker {',
    '  when friction("latency") >= 0.8 {',
    '    crystallize alpha_mesh',
    '    mutate alpha->beta',
    '  }',
    '}',
    '',
    'REFLECT target=alpha method=causal',
    'EVOLVE scope=cell guard=alpha mutation=amplify'
  ].join('\n');

  const livingAst = parseAel(livingSource, { filename: 'living_market_field.noeon' });
  const livingValidation = validateAel(livingAst);
  assert(livingValidation.valid === true, 'living-field next program passes validation');

  const livingRun = await executeProgram(livingAst, {
    quiet: true,
    with_protocol: 'off',
    auto_evolve: true,
    feedback: {
      signals: ['price momentum'],
      friction: { latency: 0.85 }
    }
  });

  assert(livingRun.success === true, 'living-field next program executes successfully');
  assert(livingRun.next?.autonomous === true, 'living-field mode is marked autonomous');
  assert(Array.isArray(livingRun.next?.emissions) && livingRun.next.emissions.length >= 1, 'living-field emits from cell dynamics');
  assert(Array.isArray(livingRun.next?.flux) && livingRun.next.flux.length >= 1, 'living-field flux crystallization is triggered');
  assert(livingRun.next?.evolution?.count >= 1, 'living-field phase produces evolution proposals');
  assert(livingRun.next?.evolution?.applied?.enabled === true, 'living-field auto_evolve is enabled');
  assert(Array.isArray(livingRun.next?.runtimeNext?.spawns), 'living-field returns runtimeNext state');

  const memorySource = [
    'PROFILE "next"',
    'VERSION "0.2.0"',
    'PROGRAM "memory_strategy_shift"',
    'GOAL "maximize output under risk control" priority=0.95',
    'MODEL name=market source=tick confidence=0.9',
    'STRATEGY name=alpha objective=growth risk=high',
    'STRATEGY name=beta objective=balance risk=medium',
    'STRATEGY name=gamma objective=safety risk=low',
    'GUARANTEE name=risk_guard expr="portfolio_risk <= policy.max_risk"',
    'ACT action=rebalance capability=engine.portfolio budget_ms=500',
    'REFLECT target=rebalance method=counterfactual',
    'EVOLVE scope=strategy guard=risk_guard mutation=shift-to-low-risk'
  ].join('\n');

  const memoryAst = parseAel(memorySource, { filename: 'memory_strategy_shift.noeon' });
  const run1 = await executeProgram(memoryAst, {
    quiet: true,
    with_protocol: 'off',
    auto_evolve: true,
    strict_next: true,
    feedback: {
      portfolio_risk: 0.8,
      policy: { max_risk: 0.4 }
    }
  });

  const memoryAfterRun1 = run1.next?.nextMemory;
  assert(memoryAfterRun1 && memoryAfterRun1.runCount >= 1, 'next memory records first run');

  const run2 = await executeProgram(memoryAst, {
    quiet: true,
    with_protocol: 'off',
    auto_evolve: true,
    strict_next: false,
    next_memory: memoryAfterRun1,
    feedback: {
      portfolio_risk: 0.2,
      policy: { max_risk: 0.4 }
    }
  });

  assert(run2.next?.nextMemory?.runCount >= 2, 'next memory accumulates across runs');
  assert(run2.next?.selectedStrategy?.name !== 'alpha', 'second run avoids previously failed high-risk strategy');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
