# Noeon Compute Kernel v0.1 (Draft)

Status: Draft
Date: 2026-06-07
Audience: language/runtime/compiler engineers

## 1. Purpose

This document defines the minimal compute layer for Noeon so that Noeon is not only a governance and cognition language, but also an executable AI programming language.

Design principle:

1. Governance-first compute, not unrestricted general scripting.
2. Deterministic by default, effectful by explicit declaration.
3. Every compute step is auditable and policy-checkable.

## 2. Non-Goals (v0.1)

1. Full Turing-complete general-purpose language.
2. Native tensor runtime and model training framework.
3. JIT optimizer and advanced parallel scheduler.

## 3. Compute Model

### 3.1 Core Abstractions

1. Value: number, boolean, string, map, list, null
2. Symbol: named binding in current compute scope
3. Expression: side-effect-free computation
4. Effect: explicit external operation (plugin/model/io/net)
5. Receipt: machine-verifiable step output metadata

### 3.2 Execution Domains

1. Pure domain: deterministic expressions, no external side effects
2. Effect domain: explicit CALL to capability-scoped plugins

## 4. Proposed Syntax Surface (v0.1)

These directives are proposed and not fully implemented yet.

1. LET <name> = <expr>
2. COMPUTE <name> = <expr>
3. IF <expr> THEN <name> = <expr> ELSE <name> = <expr>
4. ASSERT <expr> message="..."
5. CALL "<step>" plugin=<name> input=<expr> budget_ms=<int> timeout_ms=<int>
6. RETURN <expr>

Example sketch:

```txt
LET base_score = 0.72
LET risk_penalty = 0.15
COMPUTE confidence = base_score - risk_penalty
ASSERT confidence >= 0.0 message="confidence must be non-negative"
CALL "evidence_enrich" plugin=http_call input=confidence budget_ms=200 timeout_ms=3000
RETURN confidence
```

## 5. Static Semantics

### 5.1 Typing Rules (Minimal)

1. Arithmetic ops require numeric operands.
2. Boolean ops require boolean operands.
3. Comparison ops require comparable primitive types.
4. CALL input must be serializable.

### 5.2 Binding Rules

1. LET introduces immutable binding in current scope.
2. Rebinding same symbol in same scope is invalid in v0.1.
3. Undefined symbol reference is validation error.

## 6. Dynamic Semantics (Minimal Step)

State tuple:

1. env: symbol map
2. budget: remaining compute budget
3. effects: emitted effect receipts
4. diagnostics: warnings/errors

Step relation:

1. Pure expression evaluation updates env and budget.
2. CALL emits effect receipt and updates diagnostics.
3. ASSERT failure emits blocking error unless governance downgrades by policy mode.
4. RETURN finalizes compute result for downstream plan/explain/report.

## 7. Determinism and Reproducibility

1. Pure domain must be deterministic for same input context.
2. Non-deterministic sources must be wrapped as explicit effects.
3. Every CALL must produce receipt with plugin/version/signature/hash fields when available.

## 8. Governance Integration

Compute layer is governed by existing meta policy:

1. META_RANGE can constrain computed outputs.
2. META_REQUIRE can require compute receipts or output fields.
3. META_RELATION can enforce cross-field conditions between risk and compute thresholds.
4. META_PROFILE mode=advisory/enforce applies to compute violations too.

Recommended path conventions:

1. runtime.compute.env.<symbol>
2. runtime.compute.receipts.<index>.*
3. runtime.compute.result

## 9. Security and Capability Model

1. CALL must use allowlisted plugins/capabilities.
2. Plugin version and signature checks should be enforceable.
3. Compute budget and timeout are mandatory for effectful calls in strict profiles.
4. Side effects without receipt are invalid.

## 10. Interop with Python and Other Languages

Noeon compute kernel does not replace Python.

Interop contract:

1. Python implements heavy operators/models.
2. Noeon declares orchestration, constraints, and acceptance conditions.
3. Runtime adapter maps CALL to Python entrypoints and returns normalized receipts.

## 11. Conformance Targets (Compute)

### CK-1 (Core)

1. Parse and validate LET/COMPUTE/ASSERT/RETURN.
2. Deterministic pure expression evaluation.

### CK-2 (Effects)

1. CALL with budget/timeout and receipt output.
2. Capability allowlist enforcement.

### CK-3 (Governed Compute)

1. Meta policy checks over compute outputs/receipts.
2. Hardened mode interaction with compute execution.

## 12. Implementation Plan

1. Phase A: parser/validator extension for compute directives.
2. Phase B: compute evaluator integrated into simulator cycle.
3. Phase C: receipt schema + audit integration.
4. Phase D: conformance suite for CK-1/2/3.

## 13. Open Questions

1. Should v0.1 allow loop constructs or remain expression-only?
2. Should ASSERT be affected by advisory mode or always hard-fail in strict profile?
3. Which receipt fields are mandatory across all plugins?
4. How to normalize numeric precision for deterministic replay?
