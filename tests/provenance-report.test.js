'use strict';

/** Decision report rendering — HTML/Markdown reflect the real chain + seal. */

process.env.NOEON_LLM_MODE = process.env.NOEON_LLM_MODE || 'mock';

const path = require('path');
const { parseProgram, runProgram } = require('../src/runtime/unified-runtime');
const { verifyProvenance } = require('../src/runtime/provenance');
const { renderHtml, renderMarkdown } = require('../src/runtime/provenance-report');

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${m}`); } else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${m}`); } }

async function run(file, opts = {}) {
  const { ast, resolved } = parseProgram(path.join(__dirname, '..', file));
  return runProgram(ast, { general_canonical: true, filename: resolved, source_path: resolved, ...opts });
}

(async () => {
  console.log('\n\x1b[36m═══ Decision Report ═══\x1b[0m\n');

  const research = await run('examples/agent_research.noeon');
  const rec = research.provenance;
  const html = renderHtml(rec, verifyProvenance(rec));
  const md = renderMarkdown(rec, verifyProvenance(rec));

  assert(/<!doctype html>/i.test(html), 'HTML report is a full document');
  assert(html.includes(rec.contentHash), 'HTML embeds the tamper-evident seal');
  assert(html.includes('Seal intact'), 'HTML shows seal verification status');
  assert(html.includes(rec.goal), 'HTML shows the goal');
  assert(/EXECUTED/.test(html), 'HTML shows the verdict');
  assert(md.startsWith('# Decision Provenance Report'), 'Markdown report has a title');
  assert(md.includes(rec.contentHash), 'Markdown embeds the seal');

  // Tampering the record flips the report's verification state.
  const tampered = JSON.parse(JSON.stringify(rec));
  tampered.acts.push({ id: 'act_x', action: 'wire_money', plugin: null, signed: true, status: 'done' });
  const tamperedHtml = renderHtml(tampered, verifyProvenance(tampered));
  assert(tamperedHtml.includes('TAMPERED'), 'tampered record renders a TAMPERED report');

  // A blocked high-stakes run renders its gap honestly.
  const pay = await run('examples/risk_gate_demo.noeon', { human_gate_dir: path.join(__dirname, '..', 'artifacts', 'test-gates') });
  const payMd = renderMarkdown(pay.provenance, verifyProvenance(pay.provenance));
  assert(/BLOCKED/.test(payMd), 'blocked run report shows BLOCKED verdict');
  assert(/❌ Cited when required/.test(payMd), 'report surfaces the missing-citation gap');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('ERR', e.stack); process.exit(1); });
