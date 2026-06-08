> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# Noeon Specification v0.8

Status: Draft  
Version: 0.8.0  
Last Updated: 2026-06-07

## 1. Scope

Noeon v0.8 unifies:

1. **Language layer** — AEL syntax + 50+ cognitive primitives
2. **Cognitive IR** — 14 node types (single compilation target)
3. **Unified Cognitive Kernel** — primary execution engine
4. **Protocol runtime** — simulate / train / META governance / compute kernel
5. **Developer tooling** — CLI, LSP, web playground, npm package
6. **LLM integration** — optional live or mock reasoning via OpenAI-compatible APIs

Implementations MUST pass the conformance suite and unified v0.8 tests.

## 2. Unified Architecture

All programs compile to **Cognitive IR** and MAY execute via:

| Path | Entry | Use case |
|------|-------|----------|
| Cognitive | `noeon run` | Kernel cycle, observability, LLM |
| Protocol | `noeon simulate` / `train` | Governance, audit, adaptation |
| IR inspect | `noeon compile` | Tooling, debugging |

Legacy npm scripts (`npm run simulate`) delegate to the same unified runtime facade.

## 3. Cognitive IR (normative)

IR node types MUST include:

`intent`, `constraint`, `process`, `validate`, `learn`, `perceive`, `decide`, `commit`, `collaborate`, `evolve`, `remember`, `attend`, `predict`, `meta`

AEL primitives MUST map deterministically to IR (see v0.7 mapping table in README).

## 4. Kernel Execution Cycle

The Unified Cognitive Kernel MUST execute phases in order:

1. Perceive → 2. Attend → 3. Predict → 4. Process → 5. Decide →  
6. Validate → 7. Learn → 8. Remember → 9. Evolve → 10. Meta

Governance preflight MUST run before `noeon run` when validation fails unless explicitly overridden.

## 5. Protocol Runtime (v0.3 compatible)

v0.8 retains full v0.3 protocol semantics:

- Required statements: VERSION, NETWORK, TASK, BUDGET, DEADLINE, VERIFY, collateral, ON_SUCCESS, ON_SLASH
- Cognition block: GOAL, RISK, MEMORY, LEARN, PLAN, ACTION, etc.
- META rules and profiles
- Compute kernel with CALL receipts
- Step receipts and failure categories

Compiled AEL artifacts MUST contain fields defined in NOEON_SPEC_v0.3 §4.

## 6. LLM Integration

| Env var | Values | Behavior |
|---------|--------|----------|
| `NOEON_LLM_MODE` | `auto`, `live`, `mock`, `off` | Controls LLM bridge |
| `OPENAI_API_KEY` / `NOEON_API_KEY` | secret | Enables live API calls |
| `OPENAI_API_BASE` | URL | OpenAI-compatible endpoint |
| `NOEON_LLM_MODEL` | model id | Default chat model |

When no API key is configured, implementations MUST use deterministic mock responses (no network).

PROCESS nodes (`INTUIT`, `REASON`) SHOULD invoke LLM bridge when enabled.

## 7. CLI (v0.8)

Single entry: `noeon` (bin) / `node src/cli.js`

| Command | Description |
|---------|-------------|
| `run` | Kernel execution |
| `compile` | IR (default) or `--format ael` |
| `simulate` | Protocol cycle + audit artifacts |
| `train` | Multi-round adaptation |
| `rollback` | State rollback |
| `playground` | Web UI + REST API |
| `lsp` | Language server (stdio) |
| `validate`, `parse`, `explain`, `inspect`, `repl`, `init`, `status` | DX |

## 8. Language Server

Implementations SHOULD provide LSP over stdio with:

- `textDocument/publishDiagnostics` (parse + validate)
- `textDocument/completion` (keyword list)

Server location: `language-server/server.js`

## 9. Web Playground API

When `noeon playground` is running:

| Endpoint | Method | Body |
|----------|--------|------|
| `/api/status` | GET | — |
| `/api/validate` | POST | `{ "source": "..." }` |
| `/api/compile` | POST | `{ "source", "format": "ir"|"ael" }` |
| `/api/run` | POST | `{ "source", "trace"?: bool }` |
| `/api/explain` | POST | `{ "source" }` |
| `/api/examples` | GET | — |

## 10. npm Distribution

Package name: `noeon-ael`  
Bin: `noeon`  
Node: `>=18`  
`prepublishOnly` MUST run full test suite.

## 11. Conformance

Implementations MUST pass:

1. `tests/conformance/run.js` (32 checks)
2. Kernel + cognitive + unified v0.8 tests
3. `npm run gate:strict` for hardened governance scenarios

## 12. Migration from v0.7

1. Use `noeon simulate` instead of only `npm run simulate` (both work)
2. Set LLM env vars for production reasoning
3. Install VS Code extension v0.8 for LSP + Run command
4. Refer to this spec instead of v0.3 for tooling; v0.3 remains valid for protocol semantics
