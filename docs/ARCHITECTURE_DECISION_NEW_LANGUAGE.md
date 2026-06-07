# ADR-001: Should We Create a New AI-Era Language?

## Status

Accepted

## Context

The project vision of Noeon is to build an AI-era "new species" inspired by Bitcoin principles: open participation, verifiable execution, and market-based coordination.

We must decide whether to build:

1. A full general-purpose programming language.
2. A protocol-focused domain-specific language.

## Decision

We start with a **protocol DSL** (AEL), not a full general-purpose language.

## Rationale

1. The immediate bottleneck is not developer syntax; it is contract standardization for task, verification, and settlement.
2. A DSL maps directly to the protocol state machine and can be validated deterministically.
3. Full language/runtime design would delay market validation and increase risk.
4. Noeon needs fast protocol iteration with strong interoperability across early ecosystem participants.

## Consequences

### Positive

1. Faster delivery and iteration.
2. Strong contract interoperability across nodes.
3. Lower consensus risk for early protocol governance.

### Negative

1. Limited expressiveness in early versions.
2. Some advanced workflows still require host-language glue code.

## Phased Plan

1. Phase A: AEL v0.x (declarative contract DSL).
2. Phase B: AEL v1.x (modules, imports, typed schemas, reusable policies).
3. Phase C: Optional VM/runtime only if real demand proves need.

## Exit Criteria to Consider VM

1. At least 3 production use-cases need dynamic contract logic that cannot be encoded declaratively.
2. Deterministic execution constraints are formally specified.
3. Governance and upgrade path for runtime changes are established.
