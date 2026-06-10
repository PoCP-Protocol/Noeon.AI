# Runtime Mode v1.0

**Schema:** `noeon.runtime.mode/v1`  
**Status:** Normative for alpha+

## Purpose

Every governed run MUST expose whether cognition and plugins executed in **mock**, **live**, or **deterministic** mode. This removes ambiguity between offline demos and production LLM/API usage.

## Fields

| Field | Values | Meaning |
|-------|--------|---------|
| `cognition.effective` | `mock` · `live` · `deterministic` | What actually ran |
| `llm.mode` | `auto` · `live` · `mock` · `off` | `NOEON_LLM_MODE` / config |
| `llm.configured` | boolean | `OPENAI_API_KEY` or `NOEON_API_KEY` present |
| `plugins.default` | `mock` · `policy-governed` | Dev vs `NOEON_ENV=production` |
| `plugins.allMocked` | boolean | All plugin acts simulated |

## Resolution rules

1. `NOEON_LLM_MODE=off` → `deterministic`
2. `NOEON_LLM_MODE=mock` → `mock`
3. `NOEON_LLM_MODE=live` without API key → `mock` (reason: `live_requested_but_no_api_key`)
4. `NOEON_LLM_MODE=auto` without API key → `mock` (default reproducible alpha)
5. `live` / `auto` with key → `live` only when evidence artifacts carry `provenance: live`

## Surfaces

- `report.runtimeMode` on every canonical run
- `noeon status` / `/api/status`
- CLI `noeon run` stdout line: `运行时 mock · LLM=auto · key=no · plugins=mock`
- Playground evidence chain: **运行时模式**

## Environment

| Variable | Effect |
|----------|--------|
| `NOEON_LLM_MODE` | `auto` (default), `mock`, `live`, `off` |
| `OPENAI_API_KEY` / `NOEON_API_KEY` | Required for live cognition |
| `NOEON_ENV=production` | Plugin policy governed; still report mode |

## Disclaimer (embedded in report)

Alpha runs are reproducible by default. Mock uses the same evidence schemas as live; fingerprints and replay remain valid in mock mode.
