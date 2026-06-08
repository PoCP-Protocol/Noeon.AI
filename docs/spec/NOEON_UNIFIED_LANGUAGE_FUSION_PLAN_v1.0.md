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

### Phase C - Convergence (4 to 6 weeks) — **IN PROGRESS**

1. Remove duplicate semantic branches in runtime. 🔄 `deriveExecutionRoute` canonical-first routing
2. Keep parser adapters only. ✅ surfaces → `lowerToCanonical`
3. Promote canonical schema as normative reference. 🔄 convergence matrix + semantic pulse

Innovation (v1.1-alpha):
- `src/core/canonical-convergence.js` — cross-surface semantic coherence matrix
- `src/core/canonical-pulse.js` — semantic lock / align / drift signals
- `src/core/canonical-route.js` — canonical-first phase routing
- `noeon converge parity` — CLI convergence inspector
- `noeon report` — canonical audit history
- `/api/convergence/matrix` — fusion dashboard integration

Exit criteria:
- Single semantic engine in runtime.
- Comparable audit/report across all families.

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
