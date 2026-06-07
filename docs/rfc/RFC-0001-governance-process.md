# RFC-0001: Noeon RFC Governance Process

Status: Accepted

Author: Noeon Core Team

Created: 2026-06-07

Related Spec Version: 0.3

## 1. Summary

Define a formal RFC process for all Noeon language, runtime, plugin, and governance changes.

## 2. Motivation

Noeon needs predictable evolution to become a durable standard. Ad hoc changes increase ecosystem risk.

## 3. Goals

1. Make changes transparent and reviewable.
2. Preserve compatibility guarantees.
3. Tie spec updates to tests and migration notes.

## 4. Non-Goals

1. This RFC does not define detailed technical features.
2. This RFC does not replace implementation-level design docs.

## 5. Detailed Design

### 5.1 RFC States

1. Draft: initial proposal.
2. Review: under active technical review.
3. Accepted: approved for implementation.
4. Implemented: shipped with tests and docs.
5. Rejected: closed without adoption.

### 5.2 Required Sections

All RFCs MUST follow docs/rfc/RFC_TEMPLATE.md.

### 5.3 Review Window

1. Minimum review period: 7 days.
2. Breaking changes review period: 14 days.

### 5.4 Approval Rules

An RFC is Accepted only when:

1. At least one language/runtime maintainer approves.
2. Backward compatibility impact is documented.
3. Test plan is complete.

### 5.5 Implementation Gate

An Accepted RFC can be marked Implemented only when:

1. Code is merged.
2. Conformance tests are updated and passing.
3. Migration notes are published.

## 6. Backward Compatibility

This RFC is backward compatible. It introduces process only.

## 7. Security and Governance Impact

Formal review reduces accidental policy regressions in plugin and audit controls.

## 8. Test Plan

1. Lint check that new RFC files include required sections.
2. Conformance checklist review in pull requests.

## 9. Rollout Plan

1. Adopt RFC template immediately.
2. Require RFC links in feature pull requests.
3. Tag spec releases with implemented RFC references.

## 10. Open Questions

1. Should Noeon introduce voting weights for external maintainers?
2. Should breaking RFCs require two independent implementation proofs?

## 11. Alternatives Considered

1. Lightweight issue-only process: rejected due to weak traceability.
2. Maintainer-only private process: rejected due to low ecosystem trust.
