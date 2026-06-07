# Noeon Language System v1.0 (Draft)

Status: Draft
Audience: language designers, runtime engineers, governance maintainers
Scope: normative skeleton aligned to current implementation

## 1. Vision and Scope

Noeon is a protocol-first language system for distributed intelligence execution.

This draft defines Noeon as a five-layer system:

1. L1 Contract Layer: task, budget, verification, settlement
2. L2 Cognition Layer: reasoning policy, uncertainty control, debate and arbitration
3. L3 Governance Layer: meta rules, policy profiles, inheritance and conflict resolution
4. L4 Execution Layer: plan execution, plugin policy, audit, learning, reporting
5. L5 Compute Layer: deterministic expressions, governed effects, auditable compute receipts

Out of scope for this draft:

1. Full decentralized consensus protocol
2. Cryptographic settlement finality
3. LLM/model runtime specification

## 2. Core Terms

1. Contract: a machine-checkable Noeon program that declares task and policy constraints.
2. Cycle: one runtime execution round produced by simulate.
3. Learning update: policy delta inferred from feedback.
4. Meta rule: governance constraint evaluated on contract, feedback, or runtime context.
5. Meta profile: namespaced rule package with execution mode and optional inheritance.
6. Hardened mode: runtime safety posture activated by blocking governance violations.

## 3. Layered Architecture

### 3.1 L1 Contract Layer

Required concern set:

1. Identity: NETWORK, TASK
2. Economics: BUDGET, collateral, ON_SUCCESS, ON_SLASH
3. Verification: VERIFY quorum/challenge/mode
4. Lifecycle: FLOW transitions

### 3.2 L2 Cognition Layer

Cognition primitives:

1. GOAL, CONSTRAINT, RISK, MEMORY, LEARN
2. COGNITION, SELF_CHECK, INFER, CRITIC
3. HYPOTHESIS, EVIDENCE, COUNTEREXAMPLE, TRACE
4. DEBATE, ARBITRATE, JUROR

Runtime expectation:

1. Produce nativeMind diagnostics
2. Produce recommendation and controlDecision
3. Keep explainable linkage between plan and evidence objects

### 3.3 L3 Governance Layer

Meta directives:

1. META_REQUIRE
2. META_RANGE
3. META_ENUM
4. META_RELATION
5. META_PROFILE

Meta profile fields:

1. name
2. namespace
3. version
4. mode: enforce or advisory
5. extends: parent profile names

Normative behavior:

1. advisory mode downgrades all meta violations to warning severity.
2. conflict resolution uses deterministic last-win for same rule identity.
3. overridden rules emit audit warnings.
4. inheritance cycles must emit warnings.

### 3.4 L4 Execution Layer

Execution flow:

1. parse -> validate -> compile
2. evaluate meta policy (pre-plan)
3. execute plan/actions
4. apply learning update
5. evaluate meta policy (post-learning)
6. emit cycle + report + optional audit log

Safety behavior:

1. if blocking meta violations exist, runtime enters hardened mode.
2. hardened mode enforces safer verification posture and stricter learning bounds.

### 3.5 L5 Compute Layer

Compute kernel responsibility:

1. provide deterministic expression evaluation as language-native compute capability.
2. isolate side effects behind explicit capability-scoped calls.
3. emit machine-verifiable receipts for every effectful compute step.
4. expose compute outputs/receipts to governance checks.

Reference draft:

1. docs/NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md

## 4. Grammar Surface (Normative Skeleton)

The exact grammar is implementation-defined, but the following directives are normative for v1.0 profile:

1. VERSION, NETWORK, TASK, TAGS
2. BUDGET, DEADLINE, VERIFY
3. SOLVER_COLLATERAL, VERIFIER_COLLATERAL
4. ON_SUCCESS, ON_SLASH, FLOW
5. Cognition directives from Section 3.2
6. Governance directives from Section 3.3

Alias policy:

1. Cognitive aliases are allowed if they map deterministically to canonical directives.
2. Canonical form is the source of truth for validation and compilation.

## 5. Semantic Invariants (Normative)

### 5.1 Contract Invariants

1. required fields must exist: network, task, version, budget, deadline, verify, collateral, settlement.
2. verify.quorum must satisfy 0 < numerator <= denominator.
3. ON_SUCCESS distribution must sum to 100.
4. percentage fields in slashing/settlement must be in [0, 100].

### 5.2 Cognition Invariants

1. self_check.threshold in [0, 1].
2. infer.depth and infer.diversity must be bounded by implementation limits.
3. hypothesis/evidence/counterexample fields must preserve type constraints.
4. arbitration thresholds must be in [0, 1].

### 5.3 Governance Invariants

1. rule kinds must be supported by the active runtime.
2. profile mode must be enforce or advisory.
3. same-identity rules must resolve via last-win.
4. inheritance resolution must be deterministic and cycle-safe.

## 6. Conformance Levels

### 6.1 CL-1 Syntax Conformance

A runtime is CL-1 conformant if it:

1. parses canonical directives
2. validates required contract invariants
3. emits machine-readable parse/validation artifacts

### 6.2 CL-2 Cognitive Conformance

A runtime is CL-2 conformant if it additionally:

1. accepts cognition directives
2. emits nativeMind diagnostics
3. supports training/simulation loop semantics

### 6.3 CL-3 Governance Conformance

A runtime is CL-3 conformant if it additionally:

1. supports all meta directives
2. supports profile mode semantics
3. supports conflict last-win semantics
4. supports profile inheritance with cycle warnings

### 6.4 CL-4 Compute Conformance

A runtime is CL-4 conformant if it additionally:

1. supports compute directives and deterministic pure evaluation.
2. supports auditable effectful calls with receipts.
3. supports governance checks on compute outputs and receipts.

## 7. Compatibility and Versioning

1. VERSION in contract identifies language profile intent.
2. unknown directives must fail fast unless explicitly declared experimental.
3. additive directives are backward-compatible if default semantics are defined.
4. breaking semantic changes require major profile increment.

## 8. Security Baseline

1. plugin version and signature checks should be enforceable via runtime policy.
2. governance file loading must fail safely and surface warnings.
3. audit entries should include governance violation traces.
4. production profile should avoid permissive defaults for high-risk tasks.

## 9. Current Implementation Mapping

Current codebase mapping to layers:

1. L1/L2 parsing: src/parser.js
2. invariant validation: src/validator.js
3. compilation: src/compiler.js
4. runtime cycle and native mind: src/runtime/simulator.js
5. learning updates: src/runtime/learn-updater.js
6. governance engine: src/runtime/meta-rule-engine.js
7. conformance checks: tests/conformance/run.js

## 10. Known Gaps to Reach Strong v1.0

1. formal small-step semantics document is not finalized.
2. error code registry is not standardized.
3. policy registry trust model/signature chain is not yet specified.
4. distributed settlement and consensus semantics remain external.
5. benchmark-driven evaluation suite for cognitive quality is incomplete.
6. compute kernel directives and runtime are draft-level and not fully implemented.

## 11. Recommended Next Artifacts

1. NOEON_SEMANTICS_v1.0.md
2. NOEON_ERROR_CODES_v1.0.md
3. NOEON_PROFILE_REGISTRY_v1.0.md
4. NOEON_CONFORMANCE_SUITE_v1.0.md
5. NOEON_SECURITY_BASELINE_v1.0.md
6. NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md
