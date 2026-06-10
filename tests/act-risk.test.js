'use strict';

/** ACT risk classification + tiered human-approval gate. */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { classifyActRisk, maxActRisk, rank } = require('../src/runtime/act-risk');
const { parseProgram, runProgram } = require('../src/runtime/unified-runtime');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-risk-'));
function write(name, src) { const p = path.join(tmp, name); fs.writeFileSync(p, src); return p; }
async function run(src, opts = {}) {
  const file = write(`${Math.abs(hash(src))}.noeon`, src);
  const { ast, resolved } = parseProgram(file);
  return runProgram(ast, { general_canonical: true, filename: resolved, source_path: resolved, human_gate_dir: path.join(tmp, 'gates'), ...opts });
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

(async () => {
  console.log('\n\x1b[36m═══ ACT Risk Gate ═══\x1b[0m\n');

  // Classification
  assert(classifyActRisk({ action: 'release_funds', channel: 'ledger' }) === 'critical', 'release_funds is critical');
  assert(classifyActRisk({ action: 'delete_user', method: 'DELETE' }) === 'critical', 'DELETE is critical');
  assert(classifyActRisk({ action: 'write_report', channel: 'document' }) === 'high', 'write_report is high');
  assert(classifyActRisk({ action: 'fetch_sources', plugin: 'http_call' }) === 'medium', 'fetch is medium');
  assert(classifyActRisk({ action: 'greet', channel: 'console' }) === 'low', 'greet is low');
  assert(classifyActRisk({ action: 'mystery' }) === 'high', 'unknown action is conservatively high');
  assert(rank('critical') > rank('low'), 'risk ordering');
  assert(maxActRisk([{ action: 'greet' }, { action: 'release_funds', channel: 'ledger' }]) === 'critical', 'maxActRisk picks highest');

  const critical = `PROFILE "general"\nVERSION "1.0.0-alpha.1"\nAGENT "P"\n  GOAL "pay"\n  POLICY require_human_approval=critical\n  FLOW\n    PERCEIVE channel=input modality=text\n    ACT action=release_funds channel=ledger\n`;
  const low = `PROFILE "general"\nVERSION "1.0.0-alpha.1"\nAGENT "G"\n  GOAL "greet"\n  POLICY require_human_approval=critical\n  FLOW\n    PERCEIVE channel=input modality=text\n    ACT action=greet channel=console\n`;

  // Tiered gate: critical policy blocks a critical act, lets a low act through.
  const r1 = await run(critical);
  assert(r1.blocked === true && r1.awaitingHuman === true, 'critical act under =critical policy is gated');
  assert(r1.provenance.integrity.max_act_risk === 'critical', 'provenance records max_act_risk=critical');
  assert(r1.provenance.acts.some((a) => a.risk === 'critical'), 'provenance tags the critical act');

  const r2 = await run(low);
  assert(!r2.blocked, 'low-risk act under =critical policy proceeds (no spurious gate)');
  assert(r2.provenance.integrity.max_act_risk === 'low', 'provenance records max_act_risk=low');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
