# Noeon v1.0-alpha Scope (Frozen)

**Version:** 1.0.0-alpha.1  
**Status:** Normative for consolidation phase

## Stage definition

> **Noeon v1.0-alpha** — AI-native general programming language with unified runtime prototype: language positioning, Dual IR, Unified VM, General Profile, LLM Bridge, Playground/API, and package registry **in alpha**; production hardening in progress.

## Public vocabulary (5 terms)

Use these in README, Studio, and onboarding. Everything else is advanced documentation.

| Term | Meaning |
|------|---------|
| **Noeon Program** | Any `.noeon` / capability entry file lowered to one pipeline |
| **Cognitive IR** | Execution-layer IR (perceive, decide, act, …) |
| **Unified VM** | Single executor: governance → fusion → cognitive → protocol |
| **Policy / Governance** | Constraints, approval, constitution-tier rules |
| **Trace / Memory** | Reports, audit, field memory, reflections |

Advanced concepts (fusion, triad, mycelium, canonical IR internals) belong in `docs/spec/` — not first-run docs. **Do not** lead with neuroscience/brain-region metaphor in user-facing UX; use workflow vocabulary (感知 · 推理 · 行动 · 证据).

## Surface tiers (authoring)

| Tier | Surfaces | When |
|------|----------|------|
| **Primary** | General `.noeon` — AGENT / program | Default onboarding, Playground, README quick start |
| **Advanced** | `.ael`, `.next`, `.lim`, Universal mesh | Protocol, field, alignment, six-dimension programs — see capability specs |

Playground `/api/examples` returns **primary** examples by default; `?all=1` or advanced panel loads the full library.

Schema: `noeon.surface.catalog/v1` via `noeon status` → `surfaceCatalog`.

## Runtime mode (mock / live)

Every run embeds `report.runtimeMode` (`noeon.runtime.mode/v1`). See [RUNTIME_MODE_v1.0.md](./RUNTIME_MODE_v1.0.md).

- **mock** — default without API key; same schemas, deterministic replay
- **live** — real LLM when key + `NOEON_LLM_MODE=live|auto` and evidence `provenance: live`
- **deterministic** — `NOEON_LLM_MODE=off`, rule handlers only

## Frozen language core

Do not add new top-level syntax families during v1.0-alpha. Extend only within:

`PROGRAM`, `AGENT`, `GOAL`, `OBJECTIVE`, `CONTEXT`, `PERCEIVE`, `OBSERVE`, `UNDERSTAND`, `REASON`, `DECIDE`, `ACT`, `FEEDBACK`, `REFLECT`, `LEARN`, `MEMORY`, `POLICY`, `TRACE`

Capability entry modes remain: `.noeon`, `.next`, `.lim`, `.ael`.

## Golden proof set

- 3 vertical demos: `examples/hello.noeon`, `agent_research`, `agent_risk_review`, `agent_customer_service`
- Tool demos: `http_demo`, `fs_demo`, `github_demo`, `web_fetch` (stdlib + ACT plugins, mock mode)
- 4-surface parity: `examples/parity/risk_assess.*`
- Gate: `npm run gate:alpha` (**42 tests** — see `src/core/engineering-status.js`), `npm run gate:doctor`, `npm run gate:production`, `npm run test:golden`, `npm run gate:golden` (when configured)

## Alpha engineering surface (shipped)

| Area | Status |
|------|--------|
| `std.http` / `std.fs` / `std.github` / `std.web` | ACT → `http_call` / `fs_call`; `--canonical` direct `canonical.execution.acts` |
| General `canonicalIr` snapshot | Parallel attach at lower time |
| `NOEON_GENERAL_CANONICAL=1` / `--canonical` | Compile/run canonical-primary presentation + snapshot-driven prep |
| `cognition.general_canonical_tools` (default **true**) | Auto canonical act path for tool-only General programs |
| Era | `canonical-primary-era` (`NOEON_ERA` in release manifest) |
| Playground + Workbench | Code · IR · Trace · Architecture (`/workbench.html`) |
| `noeon doctor` | stdlib, canonical mode, tool demos, **execution_path_probes**, **plugin_policy_defaults**, engineering gate |
| Plugin allowlist + audit export | `plugins.allowedPlugins` in `.noeonrc.json`; `noeon report export` / `noeon audit export`; signed General ACT demo: `examples/signed_act_demo.noeon` |
| CI | `alpha-gate.yml` badge (**42 tests**) · `gate:doctor` · `gate:production` via `gate:strict` |
| LSP / VS Code | stdlib hover, execution path CodeLens/symbols, `generalCanonicalPrimary`, compile command |
| Cognitive proof stack | `cognitiveEvidence`, `worldModel`, `dualView`, `agentSurface`, replay, checkpoint, effects |
| Runtime mode | `report.runtimeMode` on every run; CLI + Playground + `noeon status` |

## Execution summary (`noeon.execution.summary/v1`)

Runtime, CLI (`--json`), Playground `/api/run`, LSP, Golden Gate, and Studio/Gate surfaces emit a compact execution summary:

| Field | Meaning |
|-------|---------|
| `strategy` | `tool-snapshot-primary` · `hybrid-canonical-acts` · `cognitive-primary` |
| `path` | UI label: `snapshot-act` · `hybrid` · `cognitive` · `canonical` |
| `hybrid` / `snapshotAct` | Canonical act path flags |
| `actDriver` | e.g. `canonical.execution.acts` or `canonical.execution.acts+kernel` |
| `phases` | Executed pipeline phases (when run) |

Static file analysis (Workbench `/api/brain`, LSP document symbols) uses the same schema without `phases` until run.

## Next engineering priorities (alpha → beta)

1. ~~Real `ACT` → plugins~~ — **done (alpha)**
2. ~~General `.noeon` parallel `canonicalIr` snapshot~~ — **done (alpha)**
3. General AST → Canonical IR without permanent legacy-only execution path — **tool snapshot-primary + hybrid canonical-act + kernel (beta-in-alpha)**
4. ~~VS Code / LSP: canonical hover + compile/run parity~~ — **done (alpha)**
5. ~~Production hardening: allowlists, audit export, plugin policy defaults~~ — **done (beta slice)**
6. Production profile defaults (`environment=production` → `requireVersion` + `requireSignature`) + signed plugin probe + canonical audit rotation
