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

function parseJson(text) {
  try {
    return JSON.parse(String(text || '').trim() || '{}');
  } catch (_) {
    return null;
  }
}

console.log('\n\x1b[36m═══ CLI Next Rollback Memory Tests ═══\x1b[0m\n');

(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-cli-next-rollback-'));
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  try {
    const sourcePath = path.join(tmp, 'rollback_memory.noeon');
    const feedbackFailPath = path.join(tmp, 'feedback-fail.json');
    const feedbackPassPath = path.join(tmp, 'feedback-pass.json');
    const statePath = path.join(tmp, 'state.json');
    const cycle1Path = path.join(tmp, 'cycle-1.json');
    const cycle2Path = path.join(tmp, 'cycle-2.json');

    const source = [
      'PROFILE "next"',
      'VERSION "0.2.0"',
      'PROGRAM "cli_rollback_memory"',
      'GOAL "rollback-aware memory" priority=0.95',
      'MODEL name=market source=tick confidence=0.9',
      'STRATEGY name=alpha objective=growth risk=medium',
      'STRATEGY name=beta objective=balance risk=medium',
      'GUARANTEE name=risk_guard expr="portfolio_risk <= policy.max_risk"',
      'ACT action=rebalance capability=engine.portfolio budget_ms=500',
      'REFLECT target=rebalance method=counterfactual',
      'EVOLVE scope=strategy guard=risk_guard mutation=shift-to-low-risk'
    ].join('\n');

    fs.writeFileSync(sourcePath, source, 'utf8');
    fs.writeFileSync(feedbackFailPath, JSON.stringify({ portfolio_risk: 0.8, policy: { max_risk: 0.4 } }, null, 2), 'utf8');
    fs.writeFileSync(feedbackPassPath, JSON.stringify({ portfolio_risk: 0.2, policy: { max_risk: 0.4 } }, null, 2), 'utf8');

    const run1 = spawnSync(process.execPath, [
      cliPath,
      'simulate',
      sourcePath,
      feedbackFailPath,
      cycle1Path,
      statePath,
      path.join(tmp, 'report-1.json'),
      path.join(tmp, 'audit.jsonl'),
      '--auto-evolve',
      '--strict-next'
    ], { cwd: tmp, encoding: 'utf8' });

    const run2 = spawnSync(process.execPath, [
      cliPath,
      'simulate',
      sourcePath,
      feedbackPassPath,
      cycle2Path,
      statePath,
      path.join(tmp, 'report-2.json'),
      path.join(tmp, 'audit.jsonl'),
      '--auto-evolve'
    ], { cwd: tmp, encoding: 'utf8' });

    const stateAfterRun2 = parseJsonFile(statePath);
    assert(run1.status === 2, 'run1 blocked as expected');
    assert(run2.status === 0, 'run2 succeeds as expected');
    assert(stateAfterRun2 && stateAfterRun2.currentNextMemory && stateAfterRun2.currentNextMemory.runCount >= 2, 'state has accumulated currentNextMemory before rollback');
    assert(stateAfterRun2 && Array.isArray(stateAfterRun2.rounds) && stateAfterRun2.rounds.length >= 2, 'state has at least 2 rounds before rollback');

    const rollback = spawnSync(process.execPath, [
      cliPath,
      'rollback',
      statePath,
      '1'
    ], { cwd: tmp, encoding: 'utf8' });

    const rollbackJson = parseJson(rollback.stdout);
    const stateAfterRollback = parseJsonFile(statePath);

    assert(rollback.status === 0, 'rollback command exits successfully');
    assert(rollbackJson && rollbackJson.currentNextMemory && rollbackJson.currentNextMemory.runCount === 1, 'rollback output restores previous next memory snapshot');
    assert(stateAfterRollback && stateAfterRollback.currentNextMemory && stateAfterRollback.currentNextMemory.runCount === 1, 'state file restores previous next memory snapshot');
    assert(stateAfterRollback && Array.isArray(stateAfterRollback.rounds) && stateAfterRollback.rounds.length === 1, 'rollback trims rounds list');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
