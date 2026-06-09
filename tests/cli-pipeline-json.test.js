'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ CLI Pipeline JSON ═══\x1b[0m\n');

const cli = path.join(__dirname, '..', 'src', 'cli.js');
const agent = path.join(__dirname, '..', 'examples', 'agent_research.noeon');
const signed = path.join(__dirname, '..', 'examples', 'signed_act_demo.noeon');

const agentRun = spawnSync(process.execPath, [cli, 'pipeline', agent, '--json'], { encoding: 'utf8' });
assert(agentRun.status === 0, 'pipeline agent_research exits 0');
const agentPayload = agentRun.stdout ? JSON.parse(agentRun.stdout) : null;
assert(agentPayload?.pluginActs?.total === 1, 'agent_research pluginActs total');
assert(agentPayload?.pluginActs?.unsigned === 1, 'agent_research unsigned plugin act');
assert(agentPayload?.executionSummary?.schema === 'noeon.execution.summary/v1', 'agent_research executionSummary schema');

const signedRun = spawnSync(process.execPath, [cli, 'pipeline', signed, '--json'], { encoding: 'utf8' });
assert(signedRun.status === 0, 'pipeline signed_act_demo exits 0');
const signedPayload = signedRun.stdout ? JSON.parse(signedRun.stdout) : null;
assert(signedPayload?.pluginActs?.signed === 1, 'signed_act_demo signed plugin act');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
