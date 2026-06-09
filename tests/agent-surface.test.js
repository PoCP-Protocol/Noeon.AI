'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { runNoeonPipeline } = require('../src/core/pipeline');
const { buildAgentSurfaceReport } = require('../src/core/agent-surface');
const { buildDualView } = require('../src/core/dual-view');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Agent Surface Report ═══\x1b[0m\n');

(async () => {
  const file = path.join(__dirname, '../examples/agent_risk_review.noeon');
  const out = await runNoeonPipeline(file, {
    filename: file,
    with_protocol: 'off',
    quiet: true
  });

  const surface = out.report?.agentSurface
    || buildAgentSurfaceReport(out.ast, out.result || {}, out.report, out.report?.dualView);

  assert(surface?.schema === 'noeon.agent.surface/v1', 'agent surface schema');
  assert(surface?.primary === 'RiskReviewer', 'primary agent name');
  assert(surface?.cards?.[0]?.tools?.length >= 2, 'agent tools listed');
  assert(surface?.cards?.[0]?.flow?.length >= 4, 'agent flow steps');
  assert(surface?.summary?.flow_steps >= 4, 'flow step count');

  const dual = out.report?.dualView || buildDualView(out.ast, out.result || {}, out.report);
  assert(dual.declaredCount >= 4, 'dual view picks up agent flow declarations');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
