# Noeon — Cognitive Workflow Language

**An AI-native general programming language for expressing software through goals, cognition, evidence, decisions, actions, feedback, and learning.**

> *"Program by the way humans solve problems; let AI and runtime turn thought into executable systems."*

[![Version](https://img.shields.io/badge/version-1.0.0--alpha-blue)]()
[![Tests](https://img.shields.io/badge/tests-578%2B%20passed-green)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## What Is Noeon?

Noeon is an **AI-native general programming language** — a **Cognitive Workflow Language** that lets you describe *what* a system should understand and achieve, not just *which instructions* to run next.

Traditional languages center machine execution primitives: variables, functions, branches, loops, classes, and threads. Noeon keeps the ability to compute, but raises AI-era concepts to first-class language objects: **Goal, Context, Perception, Understanding, Hypothesis, Evidence, Confidence, Decision, Action, Memory, Policy, Trace, Reflection, and Evolution**.

Every program — whether a `.noeon` general program, a cognitive flow, or an AEL task contract — compiles to **Cognitive Intermediate Representation (IR)** and executes through the unified runtime.

**Core formula:**

```text
Program = Goal + Context + Cognition + Action + Feedback + Evolution
```

This does **not** claim that software is conscious. Noeon **models cognitive workflows** — the repeatable patterns humans use to perceive, reason, decide, act, measure outcomes, and adapt — and makes them **executable, testable, auditable, and governable**.

---

## Quick Start (30 seconds)

```bash
npm install -g noeon-ael
noeon init my-agent --profile general
cd my-agent && noeon run main.noeon --trace
npm run playground   # from repo clone
```

From a local clone:

```bash
git clone https://github.com/PoCP-Protocol/Noeon.AI.git
cd Noeon.AI && npm install
node src/cli.js run examples/hello.noeon --trace
```

---

## Write Your First Agent

The primary surface in v1.0 is the **AGENT** block — a declarative cognitive workflow with goal, memory, tools, policy, and flow:

```noeon
PROFILE "general"
VERSION "1.0.0-alpha"

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
version "1.0.0-alpha"

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

For governance and protocol contracts, use the AEL profile:

```bash
noeon init my-contract --profile ael
noeon run my-contract/main.ael --with-protocol auto --trace
```

---

## Why Noeon

| Capability | What it means |
|---|---|
| **Intent as program** | Describe *what* to achieve; runtime resolves *how* within constraints |
| **Uncertainty-native** | Confidence and evidence are structural, not afterthoughts |
| **Observable cognition** | Traces, receipts, and reflection are inspectable artifacts |
| **Governed execution** | META rules, policies, and human approval gates are language-level |
| **Profile unity** | One IR, one kernel — general, cognitive, and protocol surfaces share the same runtime |
| **Offline-first** | Deterministic mock reasoning when no LLM key is configured |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  L5  Developer Experience — CLI, REPL, Playground, LSP          │
├─────────────────────────────────────────────────────────────────┤
│  L4  Execution & Tools — plugins, HTTP, MCP, LLM bridge         │
├─────────────────────────────────────────────────────────────────┤
│  L3  Governance — META rules, POLICY profiles, human gates      │
├─────────────────────────────────────────────────────────────────┤
│  L2  Unified Cognitive Kernel — perceive → decide → act → learn │
├─────────────────────────────────────────────────────────────────┤
│  L1  Cognitive IR — 14 node types, single compilation target      │
├─────────────────────────────────────────────────────────────────┤
│  L0  Parser & Compiler — general, cognitive, and AEL profiles     │
└─────────────────────────────────────────────────────────────────┘
```

**Cognitive IR node types:** INTENT, CONSTRAINT, PROCESS, VALIDATE, LEARN, PERCEIVE, DECIDE, COMMIT, COLLABORATE, EVOLVE, REMEMBER, ATTEND, PREDICT, META

**Profiles:**

| Profile | Surface | Use case |
|---|---|---|
| `general` | `.noeon` — AGENT, program, functions | AI-native applications and agents |
| `cognitive` | Cognitive primitives (PERCEIVE, REASON, …) | Workflow scripts and research |
| `ael` / `protocol` | TASK, BUDGET, VERIFY, FLOW, … | Governed task contracts |

---

## Install

```bash
npm install -g noeon-ael
noeon --version    # 1.0.0-alpha
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
| `noeon compile <file>` | Compile to Cognitive IR (`--format ir\|ael\|both`) |
| `noeon inspect <file>` | Execute with full tracing |
| `noeon validate <file>` | Validate syntax and semantics |
| `noeon parse <file>` | Show AST structure |
| `noeon explain <file>` | Natural language explanation |
| `noeon repl` | Interactive cognitive session |
| `noeon init <name>` | Create project (`--profile general\|ael`) |
| `noeon doctor` | Environment and dependency check |
| `noeon status` | Show kernel status |
| `noeon playground` | Start web playground + API (port 5177) |
| `noeon lsp` | Start language server (stdio) |
| `noeon simulate` | Protocol simulation + audit artifacts |
| `noeon train` | Multi-round policy training |
| `noeon rollback` | Roll back persisted state |

**Common flags:** `--trace`, `--verbose`, `--json`, `--with-protocol auto|on|off`, `--profile general|ael`

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
| [NOEON_SPEC_v1.0.md](docs/spec/NOEON_SPEC_v1.0.md) | Normative language specification (v1.0.0-alpha) |
| [NOEON_GENERAL_SYNTAX_v1.0.md](docs/spec/NOEON_GENERAL_SYNTAX_v1.0.md) | General Profile block syntax (`fn`, `program {}`, `@effect`) |
| [NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md](docs/NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md) | System architecture and cognitive programming paradigm |
| [NOEON_SPEC_v0.9.md](docs/spec/NOEON_SPEC_v0.9.md) | Protocol bridge, config loader, deep LLM handlers |
| [NOEON_SPEC_v0.8.md](docs/spec/NOEON_SPEC_v0.8.md) | Unified architecture, LSP, playground baseline |

---

## Test Results

```
General Profile v1:    ✓ passed
Grammar & CLI:         ✓ passed
Unified Kernel:        ✓ passed
Protocol conformance:  ✓ passed
─────────────────────────────────────────────
Total:                 578+ tests, 0 failures
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
| Web Playground | `npm run playground` → http://localhost:5177/playground.html |
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
