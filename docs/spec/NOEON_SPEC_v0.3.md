> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# Noeon Specification v0.3 (Draft)

Status: Draft

Version: 0.3.0-draft

Last Updated: 2026-06-07

## 1. Scope

This specification defines the normative behavior of Noeon as a cognition protocol language for distributed AI execution.

Noeon v0.3 standardizes three layers:

1. Language layer (syntax, semantics, errors)
2. Execution layer (plan/action runtime, receipts)
3. Governance layer (compatibility, upgrade, conformance)

## 2. Terminology

1. MUST, MUST NOT, SHOULD, SHOULD NOT, MAY: interpreted as RFC 2119 terms.
2. Contract: a source file expressed in Noeon language.
3. Artifact: compiled machine-readable JSON output.
4. Step Receipt: per-step execution evidence object.
5. Compatible Implementation: implementation passing the Noeon conformance suite.

## 3. Language Core

### 3.1 Required Statements

An implementation MUST support the following statements:

1. VERSION
2. NETWORK
3. TASK
4. BUDGET
5. DEADLINE
6. VERIFY
7. SOLVER_COLLATERAL
8. VERIFIER_COLLATERAL
9. ON_SUCCESS
10. ON_SLASH

### 3.2 Cognition Statements

An implementation MUST support:

1. GOAL
2. CONSTRAINT
3. RISK
4. MEMORY
5. LEARN
6. COGNITION
7. SELF_CHECK
8. INFER
9. CRITIC
10. PLAN
11. ACTION
12. HYPOTHESIS
13. EVIDENCE
14. COUNTEREXAMPLE
15. TRACE
16. DEBATE
17. ARBITRATE
18. JUROR

### 3.3 Alias Statements

An implementation SHOULD support alias forms for human-friendly authoring:

1. THINK -> SET
2. BRAIN -> NETWORK
3. INTENT -> TASK
4. CONTEXT -> TAGS
5. ENERGY -> BUDGET
6. MEMORY_UNTIL -> DEADLINE
7. TRUST -> VERIFY
8. DRIVE -> GOAL
9. RULES -> CONSTRAINT
10. THREAT -> RISK
11. HIPPOCAMPUS -> MEMORY
12. PLASTICITY -> LEARN
13. CIRCUIT -> PLAN
14. ROUTE -> ACTION
15. REWARD -> ON_SUCCESS
16. PENALTY -> ON_SLASH
17. SYNAPSE -> FLOW
18. CONSCIOUSNESS -> COGNITION
19. METACOG -> SELF_CHECK
20. REASONER -> INFER
21. JUDGE -> CRITIC
22. THEOREM -> HYPOTHESIS
23. PROOF -> EVIDENCE
24. FALSIFY -> COUNTEREXAMPLE
25. CHAIN -> TRACE
26. FORUM -> DEBATE
27. COURT -> ARBITRATE
28. PANEL -> JUROR

### 3.4 ACTION Binding Requirements

ACTION step binding MUST contain:

1. plugin

ACTION binding MAY include:

1. version
2. signature
3. plugin-specific key=value fields

When runtime policy requires version lock or signature verification, missing required fields MUST fail with a policy error.

## 4. Compiler Artifact Contract

The compiled artifact MUST contain:

1. spec.name
2. spec.version
3. contract.network
4. contract.task
5. contract.cognition
6. contract.verify
7. contract.collateral
8. contract.settlement
9. runtime.transitions
10. runtime.neuralLoops

The compiler MUST produce deterministic output for identical input and environment.

## 5. Runtime Execution Model

### 5.1 Plan Execution

1. PLAN edges define directed reasoning graph.
2. Runtime MUST execute from entry nodes (in-degree 0).
3. Runtime MUST emit per-step status (done or failed).
4. Runtime MAY halt early due to depth limit policy.

### 5.2 Step Receipt

Each executed step MUST emit a receipt with:

1. actionType
2. stepName
3. task
4. network
5. evidenceHash
6. plugin (nullable)
7. pluginVersion (nullable)
8. signatureVerified (boolean)
9. expectedSignature (nullable)
10. errorCode (nullable)

### 5.3 Failure Categories

Runtime MUST classify failed steps into one of:

1. timeout
2. policy_block
3. validation_error
4. execution_error
5. unknown_failure

## 6. Plugin Model

### 6.1 Plugin Manifest Minimum

A plugin implementation MUST provide:

1. name
2. version
3. execute(input)

### 6.2 Policy Enforcement

Runtime MUST support plugin policy controls:

1. allowed plugin list
2. allowed action type list
3. optional requireVersion toggle
4. optional requireSignature toggle

Policy deny MUST return error code PLUGIN_POLICY_DENY.

### 6.3 Integrity Enforcement

Version mismatch MUST return PLUGIN_VERSION_MISMATCH.

Missing required signature MUST return PLUGIN_SIGNATURE_REQUIRED.

Invalid signature MUST return PLUGIN_SIGNATURE_INVALID.

## 7. Learning and Adaptation

1. Runtime MUST support LEARN-driven policy updates.
2. Runtime SHOULD record diagnostics delta and effective policy per round.
3. Runtime MUST support rollback of persisted policy history.

## 8. Audit and Traceability

1. Runtime MUST support JSONL audit append mode.
2. Each audit record MUST include timestamp, task, step, status, reason, category, and receipt.
3. Audit records MUST be append-only in normal operation.

## 9. Compatibility and Versioning

### 9.1 Language Compatibility

Noeon v0.3 language core is backward compatible with v0.2 required statements.

### 9.2 Breaking Changes

A change is breaking if it modifies:

1. parser acceptance of valid v0.3 core files
2. artifact required fields
3. receipt required fields
4. runtime status model

Breaking changes MUST target next major specification version.

## 10. Conformance Requirements

A compatible implementation MUST pass:

1. Parser conformance suite
2. Compiler conformance suite
3. Runtime conformance suite
4. Plugin policy and integrity suite

## 11. Security Considerations

Implementations SHOULD:

1. Use strict plugin allowlists in production.
2. Require plugin signatures in untrusted environments.
3. Isolate external action execution with explicit timeouts and retries.
4. Preserve audit trails for incident response.

## 12. Governance

Specification changes MUST be proposed through the Noeon RFC process.

Noeon Spec versions are approved only after:

1. Reference implementation pass
2. Conformance suite update
3. Migration note publication
