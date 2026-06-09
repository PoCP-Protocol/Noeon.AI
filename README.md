# Noeon — Cognitive Workflow Language

**An AI-native general programming language for expressing software through goals, cognition, evidence, decisions, actions, feedback, and learning.**

> *"Program by the way humans solve problems; let AI and runtime turn thought into executable systems."*

[![Version](https://img.shields.io/badge/version-1.0.0--alpha.1-blue)]()
[![CI](https://github.com/PoCP-Protocol/Noeon.AI/actions/workflows/quality-gate.yml/badge.svg)](https://github.com/PoCP-Protocol/Noeon.AI/actions/workflows/quality-gate.yml)
[![Alpha Gate](https://github.com/PoCP-Protocol/Noeon.AI/actions/workflows/alpha-gate.yml/badge.svg)](https://github.com/PoCP-Protocol/Noeon.AI/actions/workflows/alpha-gate.yml)
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## What Is Noeon?

Noeon is an **AI-native general programming language** — a **Cognitive Workflow Language** that lets you describe *what* a system should understand and achieve, not just *which instructions* to run next.

Traditional languages center machine execution primitives: variables, functions, branches, loops, classes, and threads. Noeon keeps the ability to compute, but raises AI-era concepts to first-class language objects: **Goal, Context, Perception, Understanding, Hypothesis, Evidence, Confidence, Decision, Action, Memory, Policy, Trace, Reflection, and Evolution**.

Every program — whether authored with General, Governance (Next), Contract (AEL), or Alignment (Liminal) capabilities — lowers into the same **Cognitive Intermediate Representation (IR)** shape and executes through the unified runtime.

**Core formula:**

```text
Program = Goal + Context + Cognition + Action + Feedback + Evolution
```

This does **not** claim that software is conscious. Noeon **models cognitive workflows** — the repeatable patterns humans use to perceive, reason, decide, act, measure outcomes, and adapt — and makes them **executable, testable, auditable, and governable**.

---

## Quick Start (30 seconds)

From a local clone:

```bash
git clone https://github.com/PoCP-Protocol/Noeon.AI.git
cd Noeon.AI && npm install

# Hello world
node src/cli.js run examples/hello.noeon --trace

# Research agent (AGENT block + cognitive cycle)
node src/cli.js run examples/agent_research.noeon --trace

# Real ACT → HTTP / FS / GitHub / Web plugins (mock mode, no network)
node src/cli.js run examples/http_demo.noeon --trace
node src/cli.js run examples/fs_demo.noeon --trace
node src/cli.js run examples/github_demo.noeon --trace
node src/cli.js run examples/web_fetch.noeon --trace

# Canonical IR primary (General profile dual-IR presentation)
node src/cli.js compile examples/web_fetch.noeon --canonical --json
node src/cli.js run examples/web_fetch.noeon --json --canonical

# Playground + Workbench (Code · IR · Trace · Architecture)
node src/cli.js playground
# → http://localhost:5177/playground.html
# → http://localhost:5177/workbench.html  (toggle Canonical IR primary in toolbar)

# Engineering health check
node src/cli.js doctor
npm run gate:alpha
npm run gate:doctor   # explicit execution_path_probes validation
npm run gate:production  # NOEON_ENV=production plugin policy simulation

# Signed ACT demo (production plugin policy)
node src/cli.js run examples/signed_act_demo.noeon --trace
```

Published package (when available):

```bash
npm install -g noeon-ael
noeon init my-agent --profile general
cd my-agent && noeon run main.noeon --trace
```

---

## Write Your First Agent

The primary surface in v1.0 is the **AGENT** block — a declarative cognitive workflow with goal, memory, tools, policy, and flow:

```noeon
PROFILE "general"
VERSION "1.0.0-alpha.1"

AGENT "ResearchAnalyst"
  GOAL "Complete industry research report"
  MEMORY type=episodic+semantic
  TOOLS ["web_search", "file_reader"]
  POLICY require_citation=true
  FLOW
    PERCEIVE source=market_data
    REASON strategy=comparative
    ACT action=write_report
    REFLECT
```

General-profile programs can also use structured `program` blocks with the full cognitive cycle:

```noeon
profile "general"
version "1.0.0-alpha.1"

program hello_world {
  objective "Demonstrate general profile execution"
  context domain=general audience=developer mode=cognitive

  observe input modality=text source="user"
  understand context=developer_intent method=semantic_summary confidence=0.72
  reason strategy=deductive depth=2
  decide action=greet threshold=0.6
  act action=greet channel=console safety=low
  feedback source=user signal=acceptance window=1
  reflect "execution quality" depth=standard
}
```

**Imperative vs cognitive:**

```text
# Traditional: execute instructions
if (data > threshold) { alert(); }

# Noeon: model a cognitive workflow
PERCEIVE source=sensor modality=numerical
PREDICT "threshold breach" confidence=0.7
REASON strategy=abductive depth=3
DECIDE action=alert threshold=0.8
REFLECT "Was my reasoning sound?" depth=deep
```

---

## Vertical Examples

Ready-to-run examples for common agent patterns:

| Example | Description |
|---|---|
| [examples/hello.noeon](examples/hello.noeon) | Minimal cognitive cycle — observe → understand → decide → act |
| [examples/agent_research.noeon](examples/agent_research.noeon) | Research analyst with tools, policy, and FLOW |
| [examples/agent_risk_review.noeon](examples/agent_risk_review.noeon) | Payment and risk approval with confidence thresholds |
| [examples/agent_customer_service.noeon](examples/agent_customer_service.noeon) | Customer support decisions with escalation policy |

```bash
noeon run examples/hello.noeon --trace
noeon run examples/agent_research.noeon --trace
```

For contract-oriented execution policies, use the AEL capability entry:

```bash
noeon init my-contract --profile ael
noeon run my-contract/main.ael --with-protocol auto --trace
```

For human-AI alignment gates, use the Liminal capability sparingly. It is not the primary authoring surface; it captures covenant, belief, resonance, approval, veto, and dialogue checks that can gate a cognitive program before execution:

```bash
noeon init review-gate --profile liminal
noeon run review-gate/main.lim --trace
```

---

## Why Noeon

| Capability | What it means |
|---|---|
| **Intent as program** | Describe *what* to achieve; runtime resolves *how* within constraints |
| **Uncertainty-native** | Confidence and evidence are structural, not afterthoughts |
| **Observable cognition** | Traces, receipts, and reflection are inspectable artifacts |
| **Governed execution** | META rules, policies, and human approval gates are language-level |
| **Capability unity** | One language, one IR, one kernel — all capabilities share the same runtime semantics |
| **Offline-first** | Deterministic mock reasoning when no LLM key is configured |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  L5  Developer Experience — CLI, REPL, Playground, LSP          │
├─────────────────────────────────────────────────────────────────┤
│  L4  Execution & Tools — plugins, HTTP, MCP, LLM bridge         │
├─────────────────────────────────────────────────────────────────┤
│  L3  Governance & Alignment — META rules, Liminal gates         │
├─────────────────────────────────────────────────────────────────┤
│  L2  Unified Cognitive Kernel — perceive → decide → act → learn │
├─────────────────────────────────────────────────────────────────┤
│  L1  Cognitive IR — 14 node types, single compilation target      │
├─────────────────────────────────────────────────────────────────┤
│  L0  Parser & Compiler — general, next, cognitive, liminal, AEL   │
└─────────────────────────────────────────────────────────────────┘
```

**Cognitive IR node types:** INTENT, CONSTRAINT, PROCESS, VALIDATE, LEARN, PERCEIVE, DECIDE, COMMIT, COLLABORATE, EVOLVE, REMEMBER, ATTEND, PREDICT, META

**Noeon Capability Layers (Single Language System):**

| Capability | Entry Surface | Role |
|---|---|---|
| `general` | `.noeon` — AGENT, program, functions | Primary authoring surface for applications and agents |
| `governance` (next) | `.next` / `profile "next"` | Governance and autonomous decision semantics (`constitution/vow/ritual`) |
| `contract` (ael/protocol) | `.ael` and protocol clauses | Contract constraints, verification, and execution policy |
| `alignment` (liminal) | `.lim` — covenant/belief/resonance/approve/veto | Alignment gate before execution in sensitive scenarios |
| `cognitive kernel` | PERCEIVE/REASON/DECIDE/ACT/... | Shared semantic vocabulary used by all capabilities |

Rule of thumb: Noeon is one language. `general/next/ael/liminal` are capability entry modes, not separate language branches.

**Canonical pipeline (v1.0):**

```text
Surface Syntax → Parse AST → Canonical Semantic IR → Governance & Route
    → Cognitive IR → Runtime Phases → Trace / Memory / Feedback
```

Full spec: [`docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md`](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md)  
ADR: [`docs/adr/ADR-003-canonical-architecture-and-dual-ir.md`](docs/adr/ADR-003-canonical-architecture-and-dual-ir.md)  
Golden proof set: [`examples/golden/`](examples/golden/) — run `npm run test:golden`  
Inspect stack: `noeon architecture --json`  
Conformance: `noeon conform parity` · Fusion: `noeon converge parity --graph` · Audit: `noeon report`  
MCP: set `NOEON_MCP_MODE=live|stub|auto` and configure `mcp.servers` in `.noeonrc.json` (see NOEON_SPEC §14.3)

---

## Install

```bash
npm install -g noeon-ael
noeon --version    # 1.0.0-alpha.1
noeon doctor       # check environment and dependencies
```

Or from source:

```bash
git clone https://github.com/PoCP-Protocol/Noeon.AI.git
cd Noeon.AI && npm install
node src/cli.js --help
```

---

## CLI Commands

| Command | Description |
|---|---|
| `noeon run <file>` | Execute through unified cognitive kernel |
| `noeon compile <file>` | Compile to Cognitive IR (`--format ir\|ael\|both`, `--canonical`, `--json`) |
| `noeon inspect <file>` | Execute with full tracing |
| `noeon validate <file>` | Validate syntax and semantics |
| `noeon parse <file>` | Show AST structure |
| `noeon explain <file>` | Natural language explanation |
| `noeon repl` | Interactive cognitive session |
| `noeon init <name>` | Create project (`--profile general\|ael\|liminal`) |
| `noeon doctor` | Environment, stdlib, canonical mode, and tool-demo checks |
| `noeon status` | Show kernel status |
| `noeon playground` | Start web playground + API (port 5177) |
| VS Code extension | `noeon.generalCanonicalPrimary` · **Noeon: Compile Current File** · Architecture panel with ACT trace |
| `noeon studio` | Open canonical semantic dashboard (via playground server) |
| `noeon lsp` | Start language server (stdio) |
| `noeon conform parity` | Verify all parity surfaces emit canonical reports |
| `noeon converge parity` | Cross-surface semantic coherence matrix |
| `noeon report` | Canonical audit history |
| `noeon gate list` | Human approval gates (relay policy) |
| `noeon ai creator` | Generate the AI/human creator blueprint for the next Noeon workstreams |
| `noeon simulate` | Protocol simulation + audit artifacts |
| `noeon train` | Multi-round policy training |
| `noeon rollback` | Roll back persisted state |

**Common flags:** `--trace`, `--verbose`, `--json`, `--canonical` (General dual-IR primary), `--with-protocol auto|on|off`, `--profile general|ael|liminal` (capability entry selector)

Set `NOEON_GENERAL_CANONICAL=1` to default compile/run presentation to canonical-primary (Playground/Workbench checkbox overrides per request).

With `--canonical`, tool demos execute ACT plugins directly from `canonical.execution.acts` (phase `canonical-act`) without the legacy cognitive kernel path. Tool-only General programs auto-enable this path by default (`cognition.general_canonical_tools: true` in `.noeonrc.json` / runtime defaults). Override with `--canonical` off via `general_canonical: false` in API/CLI options, or set `general_canonical_tools: false` in project config.

**Execution summary** (`noeon.execution.summary/v1`): `noeon run --json`, Playground, Workbench, LSP, and Golden Gate report `strategy`, `path` (`snapshot-act` / `hybrid` / `cognitive`), and phase tags. Workbench and VS Code show the static path before run via `/api/brain` and file-level LSP analysis.

`noeon ai creator` emits the shared creator blueprint: readiness signals, the brain-inspired cognitive design contract, the creator charter, workstreams, and priority actions for human/AI co-development.

---

## LLM Configuration

```bash
export OPENAI_API_KEY=sk-...
export NOEON_LLM_MODE=auto    # auto | live | mock | off
export NOEON_LLM_MODEL=gpt-4o-mini
noeon run examples/agent_research.noeon --trace
```

Project-level settings live in `.noeonrc.json` (LLM mode, observability, protocol enrichment). Without an API key, the kernel uses deterministic mock reasoning — tests and CI stay offline.

---

## Language Primitives

Noeon provides 50+ cognitive keywords organized by phase:

| Phase | Keywords |
|---|---|
| Perception & attention | `PERCEIVE`, `ATTEND`, `SENSE`, `OBSERVE` |
| Reasoning & decision | `INTUIT`, `REASON`, `PREDICT`, `DECIDE`, `DEBATE` |
| Memory & knowledge | `KNOW`, `RECALL`, `RELATE`, `CAUSE`, `EMBED` |
| Action & feedback | `ACT`, `FEEDBACK`, `VALIDATE` |
| Metacognition & evolution | `REFLECT`, `MONITOR`, `EVOLVE`, `META` |
| Flow control | `STREAM`, `THINK_UNTIL`, `WHEN_CONFIDENT`, `ON_SURPRISE` |

**Cognitive types:** `Belief`, `Uncertain`, `Temporal`, `Emotion`, `Intention`, `Percept`, `MemoryTrace` — each carries confidence or temporal semantics.

---

## Documentation

| Document | Description |
|---|---|
| [NOEON_CAPABILITY_NAMING_v1.0.md](docs/spec/NOEON_CAPABILITY_NAMING_v1.0.md) | Official naming and copy rules for presenting Noeon as one language with capability layers |
| [NOEON_LANGUAGE_SYSTEM_COMPARISON_v1.0.md](docs/spec/NOEON_LANGUAGE_SYSTEM_COMPARISON_v1.0.md) | Unified comparison matrix across general/next/ael/liminal families |
| [NOEON_UNIFIED_LANGUAGE_FUSION_PLAN_v1.0.md](docs/spec/NOEON_UNIFIED_LANGUAGE_FUSION_PLAN_v1.0.md) | Single semantic-kernel fusion plan for all Noeon language surfaces |
| [NOEON_SPEC_v1.0.md](docs/spec/NOEON_SPEC_v1.0.md) | Normative language specification (v1.0.0-alpha) |
| [NOEON_GENERAL_SYNTAX_v1.0.md](docs/spec/NOEON_GENERAL_SYNTAX_v1.0.md) | General Profile block syntax (`fn`, `program {}`, `@effect`) |
| [NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md](docs/NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md) | System architecture and cognitive programming paradigm |
| [NOEON_SPEC_v0.9.md](docs/spec/NOEON_SPEC_v0.9.md) | Protocol bridge, config loader, deep LLM handlers |
| [NOEON_SPEC_v0.8.md](docs/spec/NOEON_SPEC_v0.8.md) | Unified architecture, LSP, playground baseline |

---

## Standard Library (alpha)

General-profile programs can import typed stdlib modules; ACT steps bind to runtime plugins:

| Module | Exports | Plugin |
|--------|---------|--------|
| `std.http` | `get`, `post`, `fetch` | `http_call` |
| `std.fs` | `read`, `write`, `list` | `fs_call` |
| `std.github` | `repo`, `get`, `post` | `http_call` (api.github.com) |
| `std.web` | `fetch`, `text`, `title` | `http_call` + content extract |

Mock mode (default in demos): `mock=true` or `NOEON_HTTP_MOCK=1`. Run output includes an **ACT** trace with `last_fetch` for web extraction demos.

---

## Test Results

```
Alpha gate (CI):       npm run gate:alpha     # 31 checks — hybrid + golden gate + LSP execution
Doctor gate:           npm run gate:doctor    # execution_path_probes + plugin policy
Production gate:       npm run gate:production # NOEON_ENV=production profile simulation
Strict gate:           npm run gate:strict    # conformance + production + signed plugin simulate
Doctor gate (CI):      npm run gate:doctor    # noeon doctor + execution_path_probes
Product suite:         npm run test:product
Core runtime:          npm run test:core
Canonical pipeline:    npm run test:canonical
Fusion/alignment:      npm run test:fusion
Surface policy:        npm run test:surface-freeze
Creator blueprint:     npm run test:creator
Cognitive loop:        npm run test:cognitive-loop
Protocol conformance:  npm run conformance
Doctor:                node src/cli.js doctor   # stdlib + canonical + tool demos
```

Run locally: `npm test`

---

## Philosophy

> "The limits of my language mean the limits of my world." — Wittgenstein

If our programming languages can only express *computation*, our AI systems can only *compute*.

Noeon expresses **cognitive workflows** — perception, reasoning, evidence, decision, action, feedback, and learning — as first-class program structure. The language borrows cognitive vocabulary as a design metaphor for building reliable, observable agent systems. It is a tool for modeling how software *should think through problems*, not a claim that software *is conscious*.

---

## Release History

<details>
<summary><strong>v0.9 — Protocol Bridge + Deep LLM + Config</strong></summary>

Closes the gap between cognitive run and protocol simulate:

| Feature | Description |
|---|---|
| **Protocol bridge** | `noeon run` auto-enriches with compute + META when detected |
| **Deep LLM** | PREDICT, REFLECT, DEBATE, dialectical PROCESS use LLM bridge |
| **Project config** | `.noeonrc.json` controls LLM, observability, `with_protocol` |
| **Smarter DECIDE** | Confidence-threshold decisions with fallback/escalate |
| **LSP v0.9** | Hover docs + document outline symbols |
| **Playground v0.9** | Ctrl+Enter run, status bar, error line jump |

See [NOEON_SPEC_v0.9.md](docs/spec/NOEON_SPEC_v0.9.md).

</details>

<details>
<summary><strong>v0.8 — Production Developer Experience</strong></summary>

Converges dual execution paths and adds production-ready tooling:

| Capability | Command |
|---|---|
| Unified CLI (cognitive + protocol) | `noeon run` / `noeon simulate` / `noeon train` |
| Web Playground | `noeon playground` → http://localhost:5177/playground.html |
| Language Server | `noeon lsp` |
| LLM integration | Set `OPENAI_API_KEY` or `NOEON_API_KEY` (`NOEON_LLM_MODE=auto`) |
| npm publish | `npm install -g noeon-ael` → `noeon` command |

See [NOEON_SPEC_v0.8.md](docs/spec/NOEON_SPEC_v0.8.md).

</details>

<details>
<summary><strong>v0.7 — Unified Cognitive Kernel</strong></summary>

The key insight: **A contract IS a thought** — AEL contracts and cognitive flows compile to the same IR.

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOEON UNIFIED ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│   .noeon / .ael Source  →  Parser  →  Cognitive IR  →  Kernel   │
│                                         Perceive → Decide → Learn │
└─────────────────────────────────────────────────────────────────┘
```

| AEL Primitive | Cognitive Operation |
|---|---|
| `TASK` | `INTENT` (goal) |
| `BUDGET` | `CONSTRAINT` (resource limits) |
| `VERIFY` | `VALIDATE` (self-checking) |
| `COMPUTE` | `PROCESS` (reasoning) |
| `FLOW` | `DECIDE` (state transitions) |
| `PLUGIN` | `PERCEIVE` (external modality) |
| `META_RULE` | `META` (self-governance) |

Earlier releases (v0.1–v0.6): AEL foundation → cognitive primitives → LLM integration → type system → stdlib → REPL.

</details>

---

## License

MIT

## Created By

Humans & AI, together.
