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

function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

console.log('\n\x1b[36m═══ CLI Next Simulate Memory Tests ═══\x1b[0m\n');

(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-cli-next-sim-'));
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  try {
    const sourcePath = path.join(tmp, 'sim_memory_shift.noeon');
    const feedback1Path = path.join(tmp, 'feedback-fail.json');
    const feedback2Path = path.join(tmp, 'feedback-pass.json');

    const cycle1Path = path.join(tmp, 'cycle-1.json');
    const statePath = path.join(tmp, 'state.json');
    const report1Path = path.join(tmp, 'report-1.json');
    const auditPath = path.join(tmp, 'audit.jsonl');
    const memory1Path = path.join(tmp, 'next-memory-1.json');

    const cycle2Path = path.join(tmp, 'cycle-2.json');
    const report2Path = path.join(tmp, 'report-2.json');
    const memory2Path = path.join(tmp, 'next-memory-2.json');
    const cycle3Path = path.join(tmp, 'cycle-3.json');

    const source = [
      'PROFILE "next"',
      'VERSION "0.2.0"',
      'PROGRAM "cli_sim_memory_shift"',
      'GOAL "optimize adaptive simulation" priority=0.95',
      'MODEL name=market source=tick confidence=0.9',
      'STRATEGY name=alpha objective=growth risk=medium',
      'STRATEGY name=beta objective=balance risk=medium',
      'STRATEGY name=gamma objective=safety risk=medium',
      'GUARANTEE name=risk_guard expr="portfolio_risk <= policy.max_risk"',
      'ACT action=rebalance capability=engine.portfolio budget_ms=500',
      'REFLECT target=rebalance method=counterfactual',
      'EVOLVE scope=strategy guard=risk_guard mutation=shift-to-low-risk'
    ].join('\n');

    fs.writeFileSync(sourcePath, source, 'utf8');
    fs.writeFileSync(feedback1Path, JSON.stringify({ portfolio_risk: 0.8, policy: { max_risk: 0.4 } }, null, 2), 'utf8');
    fs.writeFileSync(feedback2Path, JSON.stringify({ portfolio_risk: 0.2, policy: { max_risk: 0.4 } }, null, 2), 'utf8');

    const run1 = spawnSync(process.execPath, [
      cliPath,
      'simulate',
      sourcePath,
      feedback1Path,
      cycle1Path,
      statePath,
      report1Path,
      auditPath,
      '--auto-evolve',
      '--strict-next',
      '--next-memory-out',
      memory1Path
    ], {
      cwd: tmp,
      encoding: 'utf8'
    });

    const cycle1 = parseJsonFile(cycle1Path);
    const state1 = parseJsonFile(statePath);
    const report1 = parseJsonFile(report1Path);
    const memory1 = parseJsonFile(memory1Path);

    assert(run1.status === 2, 'simulate run1 exits blocked on strict guarantee failure');
    assert(cycle1 && cycle1.profile === 'next', 'simulate run1 writes next cycle artifact');
    assert(cycle1 && cycle1.blocked === true, 'simulate run1 cycle records blocked status');
    assert(cycle1 && cycle1.next && cycle1.next.memorySource === 'fresh', 'simulate run1 marks memory source as fresh');
    assert(state1 && Array.isArray(state1.rounds) && state1.rounds.length >= 1, 'simulate run1 appends state round');
    assert(state1 && state1.currentNextMemory && state1.currentNextMemory.runCount >= 1, 'simulate run1 persists next memory to state');
    assert(report1 && report1.kpis && typeof report1.kpis.failedSteps === 'number', 'simulate run1 writes report');
    assert(memory1 && memory1.runCount >= 1, 'simulate run1 writes next memory file');

    const run2 = spawnSync(process.execPath, [
      cliPath,
      'simulate',
      sourcePath,
      feedback2Path,
      cycle2Path,
      statePath,
      report2Path,
      auditPath,
      '--auto-evolve',
      '--next-memory-in',
      memory1Path,
      '--next-memory-out',
      memory2Path
    ], {
      cwd: tmp,
      encoding: 'utf8'
    });

    const cycle2 = parseJsonFile(cycle2Path);
    const state2 = parseJsonFile(statePath);
    const report2 = parseJsonFile(report2Path);
    const memory2 = parseJsonFile(memory2Path);
    const auditRecords = parseJsonl(auditPath);

    assert(run2.status === 0, 'simulate run2 exits success with safe feedback');
    assert(cycle2 && cycle2.next && cycle2.next.selectedStrategy && cycle2.next.selectedStrategy.name === 'beta', 'simulate run2 shifts strategy based on memory');
    assert(cycle2 && cycle2.next && cycle2.next.memorySource === 'explicit', 'simulate run2 marks memory source as explicit');
    assert(state2 && Array.isArray(state2.rounds) && state2.rounds.length >= 2, 'simulate run2 appends second state round');
    assert(report2 && report2.metaPolicy && typeof report2.metaPolicy.enabled === 'boolean', 'simulate run2 writes report');
    assert(report2 && report2.next && report2.next.selectedStrategy && report2.next.selectedStrategy.name === 'beta', 'simulate report includes next selected strategy');
    assert(report2 && report2.next && report2.next.memory && report2.next.memory.runCount >= 2, 'simulate report includes next memory telemetry');
    assert(memory2 && memory2.runCount >= 2, 'simulate run2 writes updated next memory file');
    assert(state2 && state2.currentNextMemory && state2.currentNextMemory.runCount >= 2, 'simulate run2 updates next memory in state');
    assert(fs.existsSync(auditPath), 'simulate audit file is generated');
    assert(auditRecords.some((r) => r.step === 'next:reflection'), 'simulate audit includes next reflection record');
    assert(auditRecords.some((r) => r.step === 'next:evolution'), 'simulate audit includes next evolution record');
    assert(auditRecords.some((r) => r.step === 'next:memory'), 'simulate audit includes next memory record');

    const run3 = spawnSync(process.execPath, [
      cliPath,
      'simulate',
      sourcePath,
      feedback2Path,
      cycle3Path,
      statePath,
      report2Path,
      auditPath,
      '--auto-evolve'
    ], {
      cwd: tmp,
      encoding: 'utf8'
    });

    const cycle3 = parseJsonFile(cycle3Path);
    assert(run3.status === 0, 'simulate run3 exits success using state-inherited next memory');
    assert(cycle3 && cycle3.next && cycle3.next.selectedStrategy && cycle3.next.selectedStrategy.name === 'beta', 'simulate run3 reuses state next memory without explicit next-memory-in');
    assert(cycle3 && cycle3.next && cycle3.next.memorySource === 'state', 'simulate run3 marks memory source as state');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
