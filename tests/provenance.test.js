'use strict';

/**
 * Decision Provenance — verifies the accountability chain is real:
 * assembled from genuine run signals, sealed, tamper-evident, and that it
 * exposes (not hides) governance gaps.
 */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const path = require('path');
const { parseProgram, runProgram } = require('../src/runtime/unified-runtime');
const { buildProvenance, verifyProvenance, SCHEMA } = require('../src/runtime/provenance');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

async function run(file, opts = {}) {
  const { ast, resolved } = parseProgram(path.join(__dirname, '..', file));
  return runProgram(ast, { general_canonical: true, filename: resolved, source_path: resolved, ...opts });
}

(async () => {
  console.log('\n\x1b[36m═══ Decision Provenance ═══\x1b[0m\n');

  // 1) An agent that fetches a real source: provenance has evidence, executes,
  //    and the seal verifies.
  const research = await run('examples/agent_research.noeon');
  const rp = research.provenance;
  assert(rp && rp.schema === SCHEMA, 'research run produces a provenance record');
  assert(rp.evidence.length >= 1, 'research provenance has real source evidence');
  assert(rp.evidence.every((e) => e.source), 'every evidence item has a source');
  assert(rp.verdict === 'executed', 'research verdict is executed');
  assert(rp.integrity.cited_when_required === true, 'research satisfies citation requirement');
  assert(verifyProvenance(rp).valid === true, 'research provenance seal verifies');

  // 2) Tamper-evidence: altering any field breaks the seal.
  const tampered = JSON.parse(JSON.stringify(rp));
  tampered.acts.push({ id: 'act_x', action: 'wire_money', plugin: null, signed: true, status: 'done' });
  assert(verifyProvenance(tampered).valid === false, 'tampered provenance fails verification');

  // 3) A high-stakes agent with no source + human approval: blocked, evidence
  //    empty, and the chain EXPOSES the gap rather than hiding it.
  const pay = await run('examples/risk_gate_demo.noeon', { human_gate_dir: path.join(__dirname, '..', 'artifacts', 'test-gates') });
  const pp = pay.provenance;
  assert(pp.verdict === 'blocked_awaiting_human', 'unfunded high-stakes run is blocked awaiting human');
  assert(pp.evidence.length === 0, 'no fabricated evidence when none was obtained');
  assert(pp.integrity.cited_when_required === false, 'integrity flags the missing citation');
  assert(pp.approval.required === true && pp.approval.status === 'pending', 'approval recorded as pending');
  assert(verifyProvenance(pp).valid === true, 'blocked-run provenance seal verifies');

  // 4) Determinism: same run, same seal.
  const research2 = await run('examples/agent_research.noeon');
  assert(research2.provenance.contentHash === rp.contentHash, 'provenance seal is deterministic across runs');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
