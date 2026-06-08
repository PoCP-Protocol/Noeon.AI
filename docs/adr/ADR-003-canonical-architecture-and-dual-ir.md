# ADR-003: Canonical Architecture, Frozen Surfaces, and Dual IR

Status: Accepted  
Date: 2026-06-07  
Supersedes: ADR-002 §2 (pipeline section only — General/Next duality expanded to five capability modes)

## Context

Noeon reached a **single-language system with multiple capability entry modes**, but documentation and code still implied parallel language branches. Concept count (consciousness, evolution, fusion, canonical, reflection, …) risked unmaintainable sprawl without a frozen core pipeline.

Consolidation phase requires:

1. One normative architecture stack
2. Frozen syntax entry extensions during v1.0
3. Explicit Dual IR model (Canonical Semantic IR + Cognitive IR)

## Decision

### 1. Canonical pipeline (normative)

```text
Surface Syntax → Parse AST → Canonical Semantic IR → Governance & Route
    → Cognitive IR → Runtime Phases → Trace / Memory / Feedback
```

Code: `src/core/canonical-architecture.js`  
Spec: `docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md`

### 2. One language — capability entry modes

| Extension | Bucket | Role |
|-----------|--------|------|
| `.noeon` | general | Primary authoring |
| `.next` | governance | Field, memory, evolution, constitution |
| `.ael` | contract | Budget, verify, protocol |
| `.lim` | alignment | Covenant, resonance, approve/veto |

**Freeze:** No new `.xxx` syntax families without ADR. Sidecars (`FUSE liminal { file }`) are not new languages.

Metaphors (documentation only): hand / will / contract / conscience / neural-structure.

### 3. Dual IR

| IR | Role |
|----|------|
| **Canonical Semantic IR** | Intent, governance, alignment, plan, reports, audit |
| **Cognitive IR** | Kernel execution program (PERCEIVE, DECIDE, ACT, …) |

Both originate from the same AST. Canonical IR does not replace Cognitive IR — it governs and annotates execution.

Bridge: `src/core/canonical-cognitive-bridge.js` attaches `_cognitiveBridge` during `prepareCanonicalExecution` and injects governance/alignment nodes at compile time.

### 4. Golden proof set

Three programs in `examples/golden/manifest.json` must pass `npm run test:golden` before release.

### 5. Artifact hygiene

Test/runtime outputs under `artifacts/*-test-*` and similar paths are gitignored — not source.

## Consequences

- ADR-002 remains valid for General Syntax phases and consciousness scheduler; pipeline wording updated in README.
- New features must declare capability bucket before implementation.
- `routePhaseLabel` and `vm/phases.js` share phase vocabulary.
- Superseded narrative docs listed in `docs/archive/INDEX.md`.

## References

- ADR-002 — AI-native GP language
- `NOEON_CANONICAL_ARCHITECTURE_v1.0.md`
- `NOEON_UNIFIED_LANGUAGE_FUSION_PLAN_v1.0.md` (Phase A–C implementation detail)
