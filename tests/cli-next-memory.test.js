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

function parseJson(text) {
  try {
    return JSON.parse(String(text || '').trim() || '{}');
  } catch (e) {
    return null;
  }
}

console.log('\n\x1b[36m═══ CLI Next Memory Tests ═══\x1b[0m\n');

(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-cli-next-memory-'));
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  try {
    const sourcePath = path.join(tmp, 'memory_shift.noeon');
    const feedback1Path = path.join(tmp, 'feedback-fail.json');
    const feedback2Path = path.join(tmp, 'feedback-pass.json');
    const memory1Path = path.join(tmp, 'next-memory-1.json');
    const memory2Path = path.join(tmp, 'next-memory-2.json');

    const source = [
      'PROFILE "next"',
      'VERSION "0.2.0"',
      'PROGRAM "cli_memory_shift"',
      'GOAL "optimize adaptive decisions" priority=0.95',
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
      'run',
      sourcePath,
      '--json',
      '--with-protocol',
      'off',
      '--auto-evolve',
      '--feedback',
      feedback1Path,
      '--next-memory-out',
      memory1Path
    ], {
      cwd: tmp,
      encoding: 'utf8'
    });

    const out1 = parseJson(run1.stdout);
    assert(run1.status === 1, 'run1 exits blocked on failed guarantee');
    assert(out1 && out1.next && out1.next.selectedStrategy && out1.next.selectedStrategy.name === 'alpha', 'run1 selects alpha before memory penalty');
    assert(fs.existsSync(memory1Path), 'run1 writes next memory file');

    const run2 = spawnSync(process.execPath, [
      cliPath,
      'run',
      sourcePath,
      '--json',
      '--with-protocol',
      'off',
      '--auto-evolve',
      '--feedback',
      feedback2Path,
      '--next-memory-in',
      memory1Path,
      '--next-memory-out',
      memory2Path
    ], {
      cwd: tmp,
      encoding: 'utf8'
    });

    const out2 = parseJson(run2.stdout);
    const memory2 = parseJson(fs.readFileSync(memory2Path, 'utf8'));

    assert(run2.status === 0, 'run2 exits success with safe feedback');
    assert(out2 && out2.next && out2.next.selectedStrategy && out2.next.selectedStrategy.name === 'beta', 'run2 shifts selection due to memory bias');
    assert(fs.existsSync(memory2Path), 'run2 writes updated next memory file');
    assert(memory2 && memory2.runCount >= 2, 'memory runCount accumulates across cli runs');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
