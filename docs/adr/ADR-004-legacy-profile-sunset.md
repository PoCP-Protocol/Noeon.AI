# ADR-004: Legacy Profile Executor Sunset

Status: Accepted  
Date: 2026-06-08  
Owner: Noeon Language Architecture

## Context

Noeon unified multiple authoring surfaces (general / next / ael / liminal) under one **Canonical Semantic IR** and **IR-first executor** (`executeCanonicalProgram`). The legacy profile branch in `unified-executor.js` remains for backward compatibility via:

- `NOEON_LEGACY_PROFILE=1`
- `legacy_profile: true` run option

## Decision

1. **v1.0 (current):** Canonical IR-first is the default. Legacy is opt-out only.
2. **v1.0-alpha → v1.1:** Legacy path emits runtime deprecation warning and `legacyDeprecation` metadata on results.
3. **v1.1:** `noeon doctor` treats `NOEON_LEGACY_PROFILE=1` as a failing check (`canonical_route`).
4. **v1.2 (planned):** Legacy branch removed; opt-out flag becomes a no-op with error message pointing to migration guide.

## Migration

| Before (legacy) | After (canonical) |
|---|---|
| Profile-specific phase branching | `deriveExecutionRoute` + `resolveCanonicalPhases` |
| `NOEON_LEGACY_PROFILE=1` | Remove env var; use default run |
| Custom profile-only tests | Use `examples/parity/` fixtures |

## Verification

- `noeon conform parity` — all four surfaces via canonical executor
- `tests/canonical-executor.test.js` — legacy opt-out still tested until removal
- `npm run test:canonical` — full canonical suite

## Consequences

- Single semantic execution path reduces drift and governance inconsistency.
- One release cycle of deprecation warnings before hard removal.
- External integrations must not depend on legacy phase ordering.
