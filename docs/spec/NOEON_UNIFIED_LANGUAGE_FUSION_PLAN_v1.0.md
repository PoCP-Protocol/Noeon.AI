# NOEON_UNIFIED_LANGUAGE_FUSION_PLAN_v1.0

Status: Draft
Version: 1.0
Owner: Noeon Language Architecture

## 1. Objective

Unify multiple Noeon language systems into one semantic core while preserving surface-level authoring flexibility.

Core principle:

```text
One Semantic Kernel, Multiple Syntax Surfaces
```

## 2. Target Architecture

### 2.1 Canonical Pipeline

1. Parse surface language (`general` / `next` / `ael` / `liminal`).
2. Lower to Canonical Semantic IR (single model).
3. Run unified governance arbitration.
4. Execute unified runtime pipeline.
5. Emit unified report and audit schemas.

### 2.2 Governance Precedence

The unified arbitration precedence must remain:

```text
constitution > vow > ritual > strategy
```

All surfaces must resolve to this same precedence model.

## 3. Canonical Semantic Domains

The canonical IR should expose these domains (minimum):

- Intent: goal, objective, constraints
- Governance: constitution, vow, ritual, strategy
- Execution: acts, resources, budget, deadlines
- Alignment: approvals, veto, resonance gates
- Learning: memory, evolution history, conflict traces
- Observability: reflection insights, audit receipts

## 4. Field Mapping Contract

All language families must provide deterministic mappings into canonical fields.

| Canonical Field | General | Next | AEL/Protocol | Liminal |
|---|---|---|---|---|
| `intent.goal` | `GOAL/objective` | `GOAL` | `TASK` | covenant objective |
| `governance.constitutions[]` | policy/meta rules | `CONSTITUTION` | verify constraints | approve/veto policy |
| `governance.vows[]` | strong commitments | `VOW` | strict checks | oath-like constraints |
| `governance.rituals[]` | schedule patterns | `RITUAL` | flow cadence | dialogue cadence |
| `execution.acts[]` | `ACT` | `ACT` | `FLOW` actions | gated actions |
| `learning.memory` | context/memory | next_memory | state store | gate history |
| `observability.audit` | traces/receipts | reflection/evolution | protocol receipts | alignment transcript |

## 5. Delivery Plan

### Phase A - Alignment (1 to 2 weeks)

1. Freeze canonical schema draft.
2. Build full field mapping table for all families.
3. Add semantic parity fixture set (same intent, different surface syntax).

**Status (in progress):**
- `src/core/canonical-ir.js` — canonical schema v1.0
- `src/core/canonical-lower.js` — AST → canonical for all capability layers
- `src/core/canonical-governance.js` — unified precedence arbitration
- `src/core/canonical-runtime.js` — executor integration (`canonical` phase)
- `examples/parity/` — cross-surface parity fixtures
- `tests/canonical-parity.test.js` — parity + executor attachment tests

Exit criteria:
- Mapping table approved.
- Parity fixtures compile successfully.

### Phase B - Dual-Track Runtime (2 to 4 weeks) — **IN PROGRESS**

1. Runtime executes canonical semantic model first. ✅ `prepareCanonicalExecution` + canonical phase
2. Legacy profile paths remain for fallback only. ✅ profile paths + `executionPlan` hints
3. Report/audit dual-write old + canonical shape. ✅ `buildCanonicalReport` + `audit.jsonl`

Implementation (v1.0-alpha):
- `src/core/canonical-plan.js` — phase planner from canonical IR
- `src/core/canonical-hydrate.js` — AST hydration from canonical semantics
- `src/core/canonical-report.js` — unified report + audit trail
- `src/vm/unified-executor.js` — `finalizeCanonicalResult` on all exit paths
- `tests/canonical-phase-b.test.js` — dual-track runtime verification

Exit criteria:
- Governance results match on parity fixtures.
- Regression suite remains green.

### Phase C - Convergence (4 to 6 weeks) — **NEAR COMPLETE**

1. Remove duplicate semantic branches in runtime. ✅ `deriveExecutionRoute` canonical-first (default)
2. Keep parser adapters only. ✅ surfaces → `lowerToCanonical`
3. Promote canonical schema as normative reference. ✅ convergence + relay + audit

Innovation (v1.1-alpha):
- `src/core/canonical-convergence.js` — cross-surface semantic coherence matrix
- `src/core/canonical-pulse.js` — semantic lock / align / drift signals
- `src/core/canonical-route.js` — canonical-first phase routing
- `src/runtime/fusion/fusion-coherence.js` — **FUSE coherence** block runtime
- `src/runtime/fusion/semantic-relay.js` — unified triad + convergence relay
- `noeon converge parity` — CLI convergence inspector
- `noeon relay <file.noeon>` — semantic relay orchestrator
- `FUSE relay { threshold, enforce, on_drift, human_must_approve }` — declarative relay policy
- `/api/convergence/stream` — SSE live convergence drift feed
- `NOEON_LEGACY_PROFILE=1` — opt-out of canonical-first routing (Phase C default)
- `noeon report` — canonical audit history
- `/api/convergence/matrix` — fusion dashboard integration
- `examples/semantic_fusion.noeon` — triad + coherence showcase

### Phase D - IR-First Execution (complete)

1. Single phase resolver from canonical IR (`resolveCanonicalPhases`).
2. Executor sets `irFirst: true` when route active; profile is hint only.
3. Human gate store + approval UI for `human_must_approve` relay actions.

Implementation:
- `src/vm/canonical-phase-resolver.js` — Phase D phase flags
- `src/vm/canonical-executor.js` — pure IR-first pipeline (`executeCanonicalProgram`)
- `src/runtime/human-gate-store.js` — pending approvals + tokens
- `noeon gate list|approve|reject` — CLI
- `site/gate.html` + `site/playground.html` — approval dashboard + playground panel
- `/api/human-gate/*` — REST approval API
- `tests/canonical-executor.test.js` — parity surfaces via canonical executor

Exit criteria (met):
- All parity fixtures run via IR-first path without profile branching.
- Human gate round-trip (pending → approve → re-run with token).

### Phase E - Observability & Conformance (complete)

1. Canonical report contract validation across all surfaces.
2. Governance fingerprint determinism on parity fixtures.
3. Playground pipeline human-gate round-trip (approve + re-run with token).

Implementation:
- `src/core/canonical-contract.js` — required report keys + `validateCanonicalReport`
- `tests/canonical-observability.test.js` — report/audit parity for all four surfaces
- `tests/playground-human-gate.test.js` — pipeline + human gate integration
- `noeon conform parity` — CLI parity conformance inspector

Exit criteria (met):
- All parity surfaces emit valid `noeon.canonical.report/v1` with shared intent.goal.
- Governance fingerprints stable across repeated lowers.
- Playground pipeline accepts `approval_token` and clears human gate block.

### Phase F - Definition of Done (complete)

1. Conformance harness validates canonical parity surfaces.
2. LSP exposes canonical semantic summary (surface, goal, governance tier, route).
3. CLI help and README reference one semantic kernel with multiple authoring surfaces.

Implementation:
- `tests/conformance/run.js` — canonical parity conformance check
- `language-server/noeon-service.js` — `buildCanonicalPlanSummary`, LSP canonical field
- `tests/lsp-canonical.test.js` — LSP canonical summary tests

Exit criteria (met):
- Conformance suite includes canonical report contract for all parity surfaces.
- LSP architecture/brain API includes `canonical` summary block.
- Documentation describes unified semantic model.

### Phase G - Ecosystem & Studio (complete)

1. MCP tool descriptor bridge (stub plugin for offline tests).
2. Legacy path deprecation warnings + doctor canonical checks.
3. Studio dashboard — parity conformance + audit trail.

Implementation:
- `src/runtime/mcp-bridge.js` — MCP → Noeon Tool mapping + `mcp_call` plugin
- `src/core/canonical-conform.js` — shared parity conformance runner
- `GET /api/conform/parity` — Studio API
- `site/studio.html` — canonical semantic dashboard
- `noeon doctor` — `canonical_route` + `mcp` checks
- `noeon studio` — canonical semantic dashboard (playground server)

Exit criteria (met):
- MCP tools load from `.noeonrc.json` and register as `mcp_call` plugin.
- Legacy opt-out surfaces deprecation warning and doctor recommendation.
- Studio displays live parity conformance and audit history.

### Phase H - Live MCP & Legacy Sunset (complete)

1. JSON-RPC stdio MCP client (`tools/list`, `tools/call`).
2. `mcp_call` plugin v0.2 — live mode with stub/auto fallback.
3. Legacy profile sunset ADR (v1.2 removal target).

Implementation:
- `src/runtime/mcp-client.js` — stdio session + discovery
- `tests/fixtures/mcp-echo-server.js` — offline MCP test server
- `GET /api/mcp/status` — Studio MCP panel
- `docs/adr/ADR-004-legacy-profile-sunset.md` — deprecation timeline

Exit criteria (met):
- Live MCP round-trip via echo fixture in CI.
- `NOEON_MCP_MODE=live|stub|auto` controls execution path.
- Legacy sunset documented with migration table.

### Phase I - Ecosystem & Legacy Extract (complete)

1. Canonical report embeds ecosystem snapshot (packages, MCP, registry, executor).
2. Legacy executor extracted to `legacy-executor.js` (v1.2 removal prep).
3. Studio ecosystem dashboard + MCP examples.

Implementation:
- `src/core/canonical-ecosystem.js` — ecosystem snapshot + status API
- `src/vm/legacy-executor.js` — deprecated legacy pipeline
- `examples/mcp_agent.noeon`, `examples/mcp_echo.ael`, `examples/noeonrc.mcp.example.json`
- `GET /api/ecosystem/status` — Studio ecosystem panel
- `tests/canonical-ecosystem.test.js`

Exit criteria (met):
- Reports include `ecosystem` block with MCP and package metadata.
- Legacy path isolated; canonical default unchanged.
- MCP plugin callable from protocol ACTION bindings.

## 6. Risks and Controls

| Risk | Impact | Control |
|---|---|---|
| Surface syntax drift | Mapping breaks silently | Contract tests per family |
| Hidden runtime divergence | Inconsistent governance decisions | Parity fixtures + arbitration snapshots |
| Observability mismatch | Hard to compare behavior | Unified report/audit schemas |
| Migration fatigue | Slow adoption | Phase-based fallback and compatibility window |

## 7. Required Test Additions

1. Semantic parity tests:
- same intent encoded in `general` / `next` / `ael` should produce equivalent governance winner and block reason.

2. Governance determinism tests:
- precedence, conflict count, and winner must be stable across runs with same memory.

3. Observability parity tests:
- report and audit canonical keys must exist for all families.

## 8. Definition of Done

Unification is done when:

1. Every supported language surface lowers to the canonical semantic model.
2. Unified runtime path is the default and only semantic executor.
3. Governance behavior is consistent across surfaces.
4. Report and audit are normalized and comparable.
5. Documentation and CLI help reference one semantic system with multiple authoring surfaces.
