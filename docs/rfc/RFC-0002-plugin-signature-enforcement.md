# RFC-0002: Plugin Signature Enforcement Profiles

Status: Accepted

Author: Noeon Core Team

Created: 2026-06-07

Related Spec Version: 0.3

## 1. Summary

Define standard enforcement profiles for plugin version and signature validation in ACTION execution.

## 2. Motivation

Noeon runtime supports plugin integrity checks, but ecosystem operators need a consistent policy baseline to avoid incompatible deployments.

## 3. Goals

1. Standardize policy profile names and behavior.
2. Make strict mode deterministic across implementations.
3. Provide explicit migration path from permissive mode.

## 4. Non-Goals

1. This RFC does not define a remote key distribution protocol.
2. This RFC does not define timestamped signatures or key rotation metadata.

## 5. Detailed Design

### 5.1 Policy Profiles

Implementations SHOULD expose one of these profiles:

1. permissive
2. balanced
3. strict

Profile semantics:

1. permissive: requireVersion=false, requireSignature=false
2. balanced: requireVersion=true, requireSignature=false
3. strict: requireVersion=true, requireSignature=true

### 5.2 Error Behavior

When policy denies execution due to integrity checks, runtime MUST fail the step and set failureCategory=policy_block.

Standard error codes:

1. PLUGIN_VERSION_REQUIRED
2. PLUGIN_VERSION_MISMATCH
3. PLUGIN_SIGNATURE_REQUIRED
4. PLUGIN_SIGNATURE_INVALID

### 5.3 Audit Surface

Step receipt SHOULD include:

1. plugin
2. pluginVersion
3. signatureVerified
4. expectedSignature

### 5.4 Signature Algorithm

Strict signature verification MUST use HMAC-SHA256 over:

```text
<plugin_name>:<plugin_version>
```

The emitted signature format is:

```text
hmac-sha256:<hex_digest>
```

The signing key is provided by runtime policy (`pluginPolicy.signingKey`) or `NOEON_PLUGIN_SIGNING_KEY`. Implementations MAY use a development default for local examples, but production deployments SHOULD provide an explicit key.

## 6. Backward Compatibility

This RFC is backward compatible when default profile remains permissive.

Operationally breaking change occurs only when operators switch to balanced or strict profile.

## 7. Security and Governance Impact

Balanced and strict profiles reduce supply-chain risk in untrusted plugin environments.

## 8. Test Plan

Conformance test suite MUST include:

1. Version required policy test
2. Version mismatch test
3. Signature required policy test
4. Signature mismatch test
5. Signature success test

## 9. Rollout Plan

1. Publish profiles and defaults in documentation.
2. Add conformance tests for integrity behavior.
3. Recommend strict profile for production networks.

## 10. Open Questions

1. Should strict profile require timestamped signatures?
2. Should Noeon introduce per-plugin key rotation metadata?

## 11. Alternatives Considered

1. Single strict-only policy: rejected due to migration friction.
2. No standardized profiles: rejected due to interoperability risk.
