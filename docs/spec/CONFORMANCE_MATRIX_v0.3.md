# Noeon Conformance Matrix v0.3

Status: Draft

Version: 0.3.0-draft

## 1. Target

This matrix defines the minimum behavior an implementation must pass to claim Noeon v0.3 compatibility.

## 2. Test Suites

1. Parser Core
2. Validator Core
3. Compiler Artifact Contract
4. Runtime Action Receipts
5. Plugin Policy and Integrity

## 3. Required Cases

### 3.1 Parser Core

1. Accept required statements in valid contract.
2. Accept cognition statements and aliases.
3. Reject malformed ACTION binding.

### 3.2 Validator Core

1. Accept valid quorum and distributions.
2. Reject invalid ON_SUCCESS sum.
3. Emit risk policy warnings for high-risk weak settings.

### 3.3 Compiler Artifact Contract

1. Emit required top-level fields.
2. Emit runtime.neuralLoops.
3. Preserve cognition plan/actions mapping.

### 3.4 Runtime Action Receipts

1. Receipt includes actionType, evidenceHash, plugin metadata.
2. Failed step includes failureCategory.

### 3.5 Plugin Policy and Integrity

1. Deny plugin not in whitelist.
2. Deny when requireVersion=true and ACTION version missing.
3. Deny version mismatch.
4. Deny when requireSignature=true and signature missing.
5. Deny invalid signature.
6. Accept valid signature and emit signatureVerified=true.

## 4. Compatibility Claim

An implementation can claim Noeon v0.3 compatibility only if all required cases pass.

## 5. Reference Runner

Reference conformance entry command:

1. npm run conformance
