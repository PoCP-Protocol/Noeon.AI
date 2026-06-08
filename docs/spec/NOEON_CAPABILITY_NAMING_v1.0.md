# NOEON_CAPABILITY_NAMING_v1.0

Status: Draft
Version: 1.0
Purpose: Establish official naming and copy conventions for presenting Noeon as one unified language.

## 1. Canonical Positioning

Noeon is one language system with multiple capability layers.

Canonical sentence:

```text
Noeon is a single AI-native language with unified semantics and multiple capability entry layers.
```

## 2. Official Capability Names

| Canonical Name | Legacy Alias (allowed in technical context) | Role |
|---|---|---|
| General Capability | general profile | Primary authoring surface |
| Governance Capability | next profile | Governance and autonomous semantics |
| Contract Capability | ael/protocol profile | Contract and execution policy |
| Alignment Capability | liminal profile | Safety/alignment gating |
| Cognitive Kernel Vocabulary | cognitive profile/primitives | Shared semantic core across all capabilities |

## 3. Copy Rules

### 3.1 Preferred Wording

Use:
- "Noeon language system"
- "capability layer"
- "capability entry mode"
- "single semantic kernel"
- "unified runtime"

### 3.2 Avoid Wording

Avoid in external-facing copy:
- "separate languages"
- "language branches"
- "four languages"
- "independent runtimes"

### 3.3 Transitional Wording

When migration context is necessary, use:

```text
Historically called profiles (general/next/ael/liminal), now standardized as capability layers under one Noeon language system.
```

## 4. CLI and UX Terminology

- Keep existing `--profile` flag for compatibility.
- In docs/help text, explain `--profile` as capability entry selector.
- New UX labels should prefer "capability" over "profile" when possible.

Example:

```text
--profile general|ael|liminal   # capability entry selector (compatibility name)
```

## 5. Documentation Requirements

All top-level docs should follow these rules:

1. Introduce Noeon as one language system.
2. Present general/next/ael/liminal as capabilities.
3. Mention one semantic kernel and one runtime path.
4. Link to unification plan and comparison matrix.

## 6. Review Checklist

Before publishing any doc/announcement:

1. Does it call Noeon a single language system?
2. Does it avoid labeling capabilities as separate languages?
3. Does it preserve compatibility wording for existing CLI/API terms?
4. Does it align with governance precedence and unified observability model?

## 7. Acceptance Criteria

The naming migration is complete when:

1. README and core docs consistently use capability terminology.
2. New docs and release notes follow this naming standard.
3. External messaging no longer markets Noeon as multiple language branches.
