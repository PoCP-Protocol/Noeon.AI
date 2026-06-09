'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

function parseJson(text) {
  try {
    return JSON.parse(String(text || '').trim());
  } catch {
    return null;
  }
}

console.log('\n\x1b[36m═══ CLI Run Action Trace ═══\x1b[0m\n');

const cli = path.join(__dirname, '..', 'src', 'cli.js');
const sample = path.join(__dirname, '..', 'examples', 'web_fetch.noeon');

const jsonRun = spawnSync(process.execPath, [cli, 'run', sample, '--json'], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_LLM_MODE: 'off' }
});
assert(jsonRun.status === 0, 'noeon run --json exits 0');
const payload = parseJson(jsonRun.stdout);
assert(payload?.success === true, 'run succeeds for web_fetch');
assert(payload?.actionTrace?.count >= 1, 'json includes actionTrace.count');
assert(typeof payload?.actionTrace?.lastFetch === 'string', 'json includes actionTrace.lastFetch');
assert(payload?.executionSummary?.schema === 'noeon.execution.summary/v1', 'json includes executionSummary schema');
assert(payload?.executionSummary?.strategy === 'tool-snapshot-primary', 'json executionSummary strategy');
assert(payload?.executionSummary?.path === 'snapshot-act', 'json executionSummary path label');

const canonicalRun = spawnSync(process.execPath, [cli, 'run', sample, '--json', '--canonical'], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_LLM_MODE: 'off' }
});
assert(canonicalRun.status === 0, 'noeon run --json --canonical exits 0');
const canonicalPayload = parseJson(canonicalRun.stdout);
assert(canonicalPayload?.compileMode === 'canonical-primary', '--canonical adds compileMode');
assert(canonicalPayload?.primaryIr === 'canonical', '--canonical adds primaryIr');
assert(canonicalPayload?.executionDriver === 'snapshot-primary', '--canonical adds executionDriver');
assert(canonicalPayload?.actDriver === 'canonical.execution.acts', '--canonical adds actDriver');
assert(canonicalPayload?.snapshotActExecution === true, '--canonical uses direct canonical acts');
assert(canonicalPayload?.phases?.includes('canonical-act'), '--canonical records canonical-act phase');
assert(Boolean(canonicalPayload?.canonicalIr?.intent), '--canonical adds canonicalIr');

const plainRun = spawnSync(process.execPath, [cli, 'run', sample], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_LLM_MODE: 'off' }
});
assert(plainRun.status === 0, 'plain noeon run exits 0');
assert(plainRun.stdout.includes('Path:'), 'plain run prints Path section');
assert(plainRun.stdout.includes('strategy: tool-snapshot-primary'), 'plain run prints execution strategy');
assert(plainRun.stdout.includes('snapshot-act'), 'plain run prints snapshot-act path');
assert(plainRun.stdout.includes('ACT:'), 'plain run prints ACT section');
assert(plainRun.stdout.includes('fetch:'), 'plain run prints last_fetch preview');

const agentSample = path.join(__dirname, '..', 'examples', 'agent_research.noeon');
const agentRun = spawnSync(process.execPath, [cli, 'run', agentSample], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_LLM_MODE: 'off' }
});
assert(agentRun.status === 0, 'noeon run agent_research exits 0');
assert(agentRun.stdout.includes('hybrid-canonical-acts'), 'agent run prints hybrid strategy');
assert(agentRun.stdout.includes('hybrid:'), 'agent run prints hybrid path note');
assert(agentRun.stdout.includes('Plugin ACTs:'), 'agent run prints plugin act status');
assert(agentRun.stdout.includes('unsigned'), 'agent run notes unsigned plugin act');

const signedSample = path.join(__dirname, '..', 'examples', 'signed_act_demo.noeon');
const signedRun = spawnSync(process.execPath, [cli, 'run', signedSample], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_LLM_MODE: 'off' }
});
assert(signedRun.status === 0, 'noeon run signed_act_demo exits 0');
assert(signedRun.stdout.includes('signed'), 'signed_act_demo run notes signed plugin act');

const agentJsonRun = spawnSync(process.execPath, [cli, 'run', agentSample, '--json', '--canonical'], {
  encoding: 'utf8',
  env: { ...process.env, NOEON_LLM_MODE: 'off' }
});
assert(agentJsonRun.status === 0, 'noeon run agent_research --json --canonical exits 0');
const agentPayload = parseJson(agentJsonRun.stdout);
assert(agentPayload?.pluginActs?.unsigned === 1, 'agent_research run json includes unsigned pluginActs');

console.log(`\n\x1b[${failed ? '31' : '32'}m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
