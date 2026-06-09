'use strict';

const fs = require('fs');
const path = require('path');
const {
  createPendingGate,
  listPendingGates,
  approveGate,
  rejectGate,
  consumeApprovalToken,
  GATE_SCHEMA,
  pendingFile
} = require('../src/runtime/human-gate-store');
const { applyRelayPolicy } = require('../src/runtime/fusion/fusion-relay-policy');
const { finalizeSemanticRelay } = require('../src/runtime/fusion/fusion-relay-finalize');
const { parseAel } = require('../src/parser');

const gateDir = path.join(__dirname, '../artifacts/human-gate-test');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Human Gate — Approval Store ═══\x1b[0m\n');

if (fs.existsSync(pendingFile({ human_gate_dir: gateDir }))) {
  fs.unlinkSync(pendingFile({ human_gate_dir: gateDir }));
}

const pending = createPendingGate({
  action: 'dominant_shift',
  message: 'Test gate',
  file: 'test.noeon'
}, { human_gate_dir: gateDir });

assert(pending.schema === GATE_SCHEMA, 'pending gate schema');
assert(pending.id?.length === 16, 'pending gate id');
assert(pending.token?.length === 32, 'pending gate token');

const list = listPendingGates({ human_gate_dir: gateDir });
assert(list.length === 1, 'list pending gates');
assert(list[0].id === pending.id, 'list returns created gate');

const approved = approveGate(pending.id, { human_gate_dir: gateDir, resolver: 'test' });
assert(approved?.status === 'approved', 'approve gate');

const listAfter = listPendingGates({ human_gate_dir: gateDir });
assert(listAfter.length === 0, 'approved gate removed from pending list');

const pending2 = createPendingGate({ action: 'external_send' }, { human_gate_dir: gateDir });
const consumed = consumeApprovalToken(pending2.token, { human_gate_dir: gateDir });
assert(consumed?.status === 'approved', 'consume token approves gate');

const pending3 = createPendingGate({ action: 'x' }, { human_gate_dir: gateDir });
const rejected = rejectGate(pending3.id, { human_gate_dir: gateDir });
assert(rejected?.status === 'rejected', 'reject gate');

const semanticPath = path.join(__dirname, '../examples/semantic_fusion.noeon');
const ast = parseAel(fs.readFileSync(semanticPath, 'utf8'), { filename: semanticPath });
const relay = { schema: 'noeon.semantic.relay/v1', action: 'dominant_shift', composite: 0.8, message: 'shift' };
const policy = { enabled: true, enforce: true, human_must_approve: ['dominant_shift'], threshold: 0.6 };
const outcome = applyRelayPolicy(relay, policy);
assert(outcome.humanGate === true, 'policy triggers human gate on dominant_shift');

const stub = { semanticRelay: relay, profile: 'general' };
const blocked = finalizeSemanticRelay(stub, ast, { human_gate_dir: gateDir, filename: semanticPath });
assert(blocked.awaitingHuman === true, 'finalize creates awaiting human state');
assert(stub.pendingApproval?.token, 'stub exposes approval token');

const rerun = { semanticRelay: relay, profile: 'general' };
const ok = finalizeSemanticRelay(rerun, ast, {
  human_gate_dir: gateDir,
  filename: semanticPath,
  approval_token: stub.pendingApproval.token
});
assert(!ok.blocked, 'approval token clears human gate block');
assert(rerun.humanGateApproval?.status === 'approved', 'records human gate approval');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
