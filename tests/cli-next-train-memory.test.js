'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

function parseJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

console.log('\n\x1b[36m═══ CLI Next Train Memory Tests ═══\x1b[0m\n');

(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-cli-next-train-'));
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  try {
    const sourcePath = path.join(tmp, 'train_memory_shift.noeon');
    const batchPath = path.join(tmp, 'batch.json');
    const trainingPath = path.join(tmp, 'training.json');
    const statePath = path.join(tmp, 'state.json');
    const convergencePath = path.join(tmp, 'convergence.json');
    const auditPath = path.join(tmp, 'audit.jsonl');
    const memoryPath = path.join(tmp, 'next-memory.json');

    const source = [
      'PROFILE "next"',
      'VERSION "0.2.0"',
      'PROGRAM "cli_train_memory_shift"',
      'GOAL "optimize adaptive training" priority=0.95',
      'MODEL name=market source=tick confidence=0.9',
      'STRATEGY name=alpha objective=growth risk=medium',
      'STRATEGY name=beta objective=balance risk=medium',
      'STRATEGY name=gamma objective=safety risk=medium',
      'GUARANTEE name=risk_guard expr="portfolio_risk <= policy.max_risk"',
      'ACT action=rebalance capability=engine.portfolio budget_ms=500',
      'REFLECT target=rebalance method=counterfactual',
      'EVOLVE scope=strategy guard=risk_guard mutation=shift-to-low-risk'
    ].join('\n');

    const batch = [
      { portfolio_risk: 0.8, policy: { max_risk: 0.4 } },
      { portfolio_risk: 0.2, policy: { max_risk: 0.4 } },
      { portfolio_risk: 0.25, policy: { max_risk: 0.4 } }
    ];

    fs.writeFileSync(sourcePath, source, 'utf8');
    fs.writeFileSync(batchPath, JSON.stringify(batch, null, 2), 'utf8');

    const run = spawnSync(process.execPath, [
      cliPath,
      'train',
      sourcePath,
      batchPath,
      trainingPath,
      statePath,
      convergencePath,
      auditPath,
      '--auto-evolve',
      '--next-memory-out',
      memoryPath
    ], {
      cwd: tmp,
      encoding: 'utf8'
    });

    const training = parseJsonFile(trainingPath);
    const state = parseJsonFile(statePath);
    const convergence = parseJsonFile(convergencePath);
    const memory = parseJsonFile(memoryPath);

    assert(run.status === 0, 'train exits successfully for next profile');
    assert(training && training.profile === 'next', 'training artifact is next profile');
    assert(training && Array.isArray(training.rounds) && training.rounds.length === 3, 'training artifact includes all rounds');
    assert(training && training.rounds[0].next && training.rounds[0].next.selectedStrategy === 'alpha', 'round1 starts with alpha strategy');
    assert(training && training.rounds[1].next && training.rounds[1].next.selectedStrategy === 'beta', 'round2 shifts strategy due to memory');
    assert(state && state.currentNextMemory && state.currentNextMemory.runCount >= 3, 'state stores accumulated next memory after training');
    assert(convergence && convergence.totalRounds === 3, 'convergence artifact includes total rounds');
    assert(memory && memory.runCount >= 3, 'next-memory-out file is generated and accumulated');
    assert(fs.existsSync(auditPath), 'train audit file is generated');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
