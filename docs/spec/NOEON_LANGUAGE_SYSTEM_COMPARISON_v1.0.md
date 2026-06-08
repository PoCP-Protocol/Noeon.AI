# NOEON_LANGUAGE_SYSTEM_COMPARISON_v1.0

Status: Draft
Version: 1.0
Scope: Compare existing Noeon language families and define role boundaries for unification.

## 1. Purpose

Noeon currently has multiple language surfaces: `general`, `next`, `ael/protocol`, and `liminal`.
This document establishes a common comparison model so all surfaces can be evaluated with the same criteria.

## 2. Unified Evaluation Model

Weights are guidance for roadmap decisions and can be tuned per release.

| Dimension | Focus | Weight |
|---|---|---:|
| Expressiveness | Can it model complex governance and autonomy? | 20% |
| Verifiability | Can it be validated statically and audited? | 20% |
| Determinism | Is runtime behavior stable with same inputs? | 15% |
| Learning | Can it adapt across rounds with memory? | 15% |
| Observability | Are decisions, conflicts, and mutations inspectable? | 15% |
| Usability | Human readability and maintenance cost | 15% |

## 3. Family Strength Matrix

| Family | Strengths | Typical Weakness | Best Role in Unified System |
|---|---|---|---|
| General (`.noeon`) | High readability, clear business contracts, broad DX | Governance expressiveness is moderate | Authoring and business orchestration surface |
| Next (`.next` / profile next) | Strong governance semantics (`constitution/vow/ritual`), adaptive runtime | Higher semantic complexity | Governance and autonomous decision kernel |
| AEL / Protocol (`.ael`) | Strong task constraints, predictable workflow execution | Less native autonomy modeling | Contract and protocol execution layer |
| Liminal (`.lim`) | Alignment and gate semantics (`approve/veto/resonance`) | Not ideal as primary app authoring language | Safety/alignment gate layer |

## 4. Role Boundary (Recommended)

- `general`: primary user-facing programming surface.
- `next`: governance semantics provider and adaptive logic engine.
- `ael/protocol`: contract and execution policy layer.
- `liminal`: high-risk alignment gate before execution.

## 5. Anti-Pattern to Avoid

Do not merge by syntax first.

Incorrect path:
- Merge all keywords into one parser grammar.
- Keep multiple runtime semantics behind profile branches.

Correct path:
- Keep surface syntax if needed.
- Merge semantics into a single canonical execution model.

## 6. Decision Output Requirements

Every family comparison cycle must output:

1. Weighted score summary by dimension.
2. Role recommendation by family.
3. Migration impact notes (parser, validator, runtime, report, audit).
4. Test impact notes (new parity tests and regression scope).

## 7. Success Criteria

Unification is considered successful when:

1. Different language surfaces with equivalent intent compile to equivalent canonical semantics.
2. Runtime governance winner/block reason is consistent across surfaces.
3. Report and audit artifacts are comparable across all surfaces.
4. No duplicate semantic engines remain in runtime.
