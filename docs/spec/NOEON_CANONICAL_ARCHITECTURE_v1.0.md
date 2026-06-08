# Noeon Canonical Architecture v1.0

**Status:** Normative (consolidation phase)  
**Version:** 1.0.0  
**Supersedes:** fragmented per-surface pipeline descriptions in README-only form

---

## Thesis

Noeon is **one AI-native general language**, not General / Next / AEL / Liminal as four parallel languages.

Those names denote **capability entry modes**. Every mode lowers to the same semantic stack:

```text
Surface Syntax
    → Parse AST
    → Canonical Semantic IR
    → Governance & Route
    → Cognitive IR
    → Runtime Phases
    → Trace / Memory / Feedback
```

---

## Capability Entry Modes (Frozen)

| Extension | Capability bucket | Role | Metaphor |
|-----------|-------------------|------|----------|
| `.noeon` | general | Primary authoring — AGENT, program, FLOW | hand |
| `.next` | governance | Field, memory, evolution, constitution/vow/ritual | will |
| `.ael` | contract | Budget, verify, protocol settlement | contract |
| `.lim` | alignment | Covenant, belief, resonance, approve/veto | conscience |

**Freeze policy:** No new `.xxx` syntax families during v1.0 consolidation. New ideas must map to one of: `general`, `governance`, `contract`, `alignment`, or `runtime-kernel`.

Sidecars (e.g. `FUSE liminal { file: "x.lim" }`) are allowed; they are not new languages.

---

## Pipeline Stages

### 1. Surface Syntax

Human-authored programs in a capability entry mode. Parser dispatch via `grammar/detect`.

### 2. Parse AST

Single AST boundary. Block syntax (general) and profile syntax (next/lim/ael) converge here.

### 3. Canonical Semantic IR

`lowerToCanonical(ast)` → unified model:

- `intent`, `governance`, `execution`, `alignment`, `learning`, `observability`, `capabilities`

This is the **semantic contract** for planning, governance arbitration, and reports.

### 4. Governance & Route

- `arbitrateGovernance(canonical)`
- `planExecutionPhases(canonical)`
- `deriveExecutionRoute(canonical, profile, mode)`

### 5. Cognitive IR

Execution kernel program compiled from AST via `AELtoIRCompiler`. Canonical IR informs governance and routing; kernel still executes cognitive nodes (PERCEIVE, DECIDE, ACT, …).

### 6. Runtime Phases

Unified VM (`vm/unified-executor`, `vm/phases`):

`canonical` → fusion/triad → alignment → consciousness → cognitive → protocol

### 7. Trace / Memory / Feedback

- `buildCanonicalReport` / audit JSONL
- Field memory, reflections, fusion history
- Brain-region architecture map (observability metaphor)

---

## Dual IR Model (Explicit)

| IR | Purpose |
|----|---------|
| **Canonical Semantic IR** | Governance, planning, routing, unified reports |
| **Cognitive IR** | Kernel execution program |

Both originate from the same AST. This is intentional — not a fork.

---

## Golden Proof Set

See `examples/golden/manifest.json`:

1. **general** — `hello.noeon`
2. **governance** — `genesis.next`
3. **alignment** — `agent_field.noeon` + `agent_field.lim`

If these three fail pipeline + canonical lowering, Noeon is not release-ready.

---

## What Not To Do (Consolidation Phase)

1. Do not add new surface names or file extensions without ADR.
2. Do not bypass Canonical IR for “quick” execution paths in product surfaces.
3. Do not treat Liminal as a primary authoring language — it is an alignment layer.
4. Do not commit test artifacts under `artifacts/*-test-*` — use `.gitignore`.

---

## Code Reference

- `src/core/canonical-architecture.js` — frozen extensions, pipeline stages, manifest
- `src/core/canonical-cognitive-bridge.js` — Canonical IR → Cognitive IR injection
- `src/core/surfaces.js` — surface roles
- `src/core/pipeline.js` — `runNoeonPipeline`
- `src/core/canonical-ir.js` — Canonical Semantic IR schema
- `docs/adr/ADR-003-canonical-architecture-and-dual-ir.md` — accepted ADR
