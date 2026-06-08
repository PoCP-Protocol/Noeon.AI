> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# Noeon Specification v0.9

Status: Draft  
Version: 0.9.0  
Last Updated: 2026-06-07

## 1. Changes from v0.8

1. **Protocol bridge** — `noeon run` MAY auto-attach compute execution + META policy evaluation
2. **Project config** — `.noeonrc.json` in project tree (walk-up discovery)
3. **Deep LLM handlers** — PREDICT, REFLECT (validate), COLLABORATE (debate), dialectical PROCESS
4. **Smarter DECIDE** — threshold + fallback based on workspace confidence
5. **LSP** — hover + documentSymbol in addition to diagnostics/completion
6. **Playground** — Ctrl+Enter, status bar, error line navigation
7. **Compile `--format both`** — single invocation emits IR + AEL artifact

v0.3–v0.8 protocol semantics remain normative; v0.9 adds integration layers only.

## 2. Protocol Bridge

When `with_protocol` is `auto` (default), implementations MUST enrich kernel results if the AST contains:

- COMPUTE blocks (functions, bindings, calls, branches), OR
- META_RULE declarations, OR
- PLAN graph nodes

Enrichment MUST include:

1. `compute.result`, `compute.env`, `compute.diagnostics`, `compute.receipts`
2. `metaPolicy.violations`, `metaPolicy.hardened`

`protocolSuccess` is true when no blocking META violations and no compute error diagnostics.

Flags:

| Flag / config | Effect |
|---------------|--------|
| `--with-protocol` | Force enrichment |
| `--with-protocol off` | Skip enrichment |
| `.noeonrc.json` → `cognition.with_protocol` | `auto` \| `on` \| `off` |
| `--strict-protocol` | Fail run when `protocolSuccess` is false |

## 3. Project Configuration

File: `.noeonrc.json` (optional, discovered from cwd upward)

```json
{
  "environment": "development",
  "cognition": {
    "enable_llm": true,
    "with_protocol": "auto"
  },
  "observability": { "log_level": "info" },
  "llm": { "mode": "auto", "model": null }
}
```

Environment variables override at runtime: `NOEON_LLM_MODE`, `OPENAI_API_KEY`, `NOEON_API_KEY`.

## 4. Kernel LLM Handlers (v0.9)

| IR phase | LLM method when bridge active |
|----------|----------------------------|
| PROCESS intuitive | `intuit()` |
| PROCESS analytical | `reason()` |
| PROCESS dialectical | `debate()` |
| PREDICT | `predict()` |
| VALIDATE reflection | `reflect()` when criteria present |
| COLLABORATE debate | `debate()` |

Mock mode MUST remain deterministic when no API key is configured.

## 5. Language Server (v0.9)

Capabilities:

- `textDocument/publishDiagnostics`
- `textDocument/completion`
- `textDocument/hover` — keyword documentation
- `textDocument/documentSymbol` — TASK, GOAL, cognitive ops outline

## 6. Playground API (v0.9)

POST `/api/run` body MAY include:

- `with_protocol`: `auto` | `on` | `off`
- `strict_protocol`: boolean
- `feedback`: object for compute/META context

## 7. Conformance

All v0.8 tests PLUS `tests/unified-v09.test.js` MUST pass.

CI MUST run `npm test` (full suite) before `gate:strict`.
