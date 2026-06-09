'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { runNoeonPipeline } = require('../src/core/pipeline');
const { applyRelayPolicy } = require('../src/runtime/fusion/fusion-relay-policy');
const { finalizeSemanticRelay } = require('../src/runtime/fusion/fusion-relay-finalize');
const {
  listPendingGates,
  consumeApprovalToken,
  pendingFile
} = require('../src/runtime/human-gate-store');

const gateDir = path.join(__dirname, '../artifacts/playground-human-gate');
const semanticPath = path.join(__dirname, '../examples/semantic_fusion.noeon');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Playground — Human Gate Pipeline Round-Trip ═══\x1b[0m\n');

if (fs.existsSync(pendingFile({ human_gate_dir: gateDir }))) {
  fs.unlinkSync(pendingFile({ human_gate_dir: gateDir }));
}

(async () => {
  const source = fs.readFileSync(semanticPath, 'utf8');

  const pipelineRun = await runNoeonPipeline(source, {
    filename: semanticPath,
    quiet: true,
    with_protocol: 'off',
    triad: false,
    human_gate_dir: gateDir
  });

  assert(pipelineRun.report?.schema === 'noeon.canonical.report/v1', 'pipeline run emits canonical report');
  assert(pipelineRun.result?.phases?.includes('relay'), 'pipeline run includes relay phase');
  assert(pipelineRun.result?.relayPolicy?.enabled === true, 'pipeline exposes relay policy');

  const ast = parseAel(source, { filename: semanticPath });
  const relay = {
    schema: 'noeon.semantic.relay/v1',
    action: 'dominant_shift',
    composite: 0.82,
    message: 'Playground gate test'
  };
  const policy = {
    enabled: true,
    enforce: true,
    human_must_approve: ['dominant_shift'],
    threshold: 0.6
  };
  const policyOutcome = applyRelayPolicy(relay, policy);
  assert(policyOutcome.humanGate === true, 'relay policy requires human gate');

  const blocked = { semanticRelay: relay, profile: 'general', relayPolicy: policy };
  const gateResult = finalizeSemanticRelay(blocked, ast, {
    human_gate_dir: gateDir,
    filename: semanticPath
  });
  assert(gateResult.awaitingHuman === true, 'finalize creates awaiting human state');
  assert(blocked.pendingApproval?.token, 'blocked run exposes approval token');

  const pending = listPendingGates({ human_gate_dir: gateDir });
  assert(pending.some((g) => g.id === blocked.pendingApproval.id), 'gate appears in pending list');

  const approvedRun = await runNoeonPipeline(source, {
    filename: semanticPath,
    quiet: true,
    with_protocol: 'off',
    triad: false,
    human_gate_dir: gateDir,
    approval_token: blocked.pendingApproval.token
  });

  assert(approvedRun.result?.humanGateApproval?.status === 'approved', 'pipeline re-run records approval');
  assert(approvedRun.result?.success !== false, 'approved pipeline run succeeds');

  const consumed = consumeApprovalToken(blocked.pendingApproval.token, { human_gate_dir: gateDir });
  assert(consumed == null, 'approval token is single-use');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
