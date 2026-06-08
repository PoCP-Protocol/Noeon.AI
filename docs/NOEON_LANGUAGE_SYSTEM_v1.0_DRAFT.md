> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# Noeon Language System v1.0 (Draft)

**Status:** Draft  
**Audience:** language designers, runtime engineers, product architects, governance maintainers  
**Scope:** system architecture and cognitive programming paradigm — not normative grammar  
**Normative spec:** see `docs/spec/NOEON_SPEC_v1.0.md` (when published); interim reference: `docs/spec/NOEON_SPEC_v0.9.md`

---

## 1. Executive Summary

Noeon is an **AI-native general programming language** built around the **Cognitive Programming** paradigm. Humans express programs through goals, context, cognition, evidence, decisions, actions, feedback, and learning; the Noeon compiler and unified runtime convert those cognitive programs into executable, observable systems. Every surface — `.noeon` general programs, AEL task contracts (`.ael`), and cognitive-only flows — compiles to the same **Cognitive Intermediate Representation (IR)** and executes through a single kernel.

The core formula is:

```text
Program = Goal + Context + Cognition + Action + Feedback + Evolution
```

This document describes *how* that formula is realized in layers, pipelines, and tooling. It does **not** claim that software is conscious or sentient. Noeon **models cognitive workflows** — the repeatable patterns humans use to perceive, reason, decide, act, measure outcomes, and adapt — and makes them **executable, testable, auditable, and governable**. The language borrows cognitive vocabulary as a design metaphor, not as a claim about machine phenomenology.

---

## 2. Paradigm: Cognitive Programming

### 2.1 Intent-driven vs command-driven

| Paradigm | Unit of thought | Primary question | Typical artifact |
|---|---|---|---|
| **Imperative** | Statement | What step runs next? | `if`, `for`, assignment |
| **Object-oriented** | Object + method | Who owns this behavior? | classes, interfaces |
| **Functional** | Expression + function | What value is produced? | pure functions, pipelines |
| **Cognitive (Noeon)** | Goal + evidence + decision | What should the system understand and achieve? | `PERCEIVE`, `REASON`, `DECIDE`, `LEARN` |

Traditional languages center machine execution primitives: variables, functions, branches, loops, classes, threads. Noeon retains computation but elevates AI-era concepts to first-class language objects: **Goal, Context, Perception, Understanding, Hypothesis, Evidence, Confidence, Decision, Action, Memory, Policy, Trace, Reflection, and Evolution**.

### 2.2 Design principles

1. **Intent as program** — describe *what* to achieve; the runtime resolves *how* within constraints.
2. **Uncertainty-native** — confidence and evidence are structural, not afterthoughts.
3. **Observable cognition** — reasoning traces, decisions, and policy checks are first-class outputs.
4. **Governed execution** — META rules, POLICY profiles, and human-in-the-loop gates bound autonomous behavior.
5. **Unified compilation** — one IR, one kernel; protocol contracts and cognitive flows are views of the same model.

Example contrast:

```text
# Imperative: execute instructions
if (data > threshold) { alert(); }

# Noeon: model a cognitive workflow
PERCEIVE source=sensor modality=numerical
PREDICT "threshold breach" confidence=0.7
REASON strategy=abductive depth=3
DECIDE action=alert threshold=0.8
REFLECT "Was my reasoning sound?" depth=deep
```

Reference implementation of the cognitive cycle: `src/core/kernel.js` (Perceive → Attend → Predict → Process → Decide → Validate → Learn → Remember → Evolve).

---

## 3. System Architecture

Noeon is organized as a six-layer stack (L0–L5). Layers are conceptual boundaries; many modules span adjacent layers.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  L5  Developer Experience                                                │
│      CLI, LSP, Playground, Studio (roadmap)                              │
├──────────────────────────────────────────────────────────────────────────┤
│  L4  Execution & Tools                                                   │
│      Plugins, HTTP, MCP, compute kernel, protocol simulate/train         │
├──────────────────────────────────────────────────────────────────────────┤
│  L3  Governance & Security                                               │
│      META rules, POLICY profiles, human-in-the-loop, plugin integrity    │
├──────────────────────────────────────────────────────────────────────────┤
│  L2  Unified Cognitive Kernel                                            │
│      perceive → decide → act → learn cycle                               │
├──────────────────────────────────────────────────────────────────────────┤
│  L1  Cognitive IR & Type System                                          │
│      14 IR node types, belief/uncertainty/temporal types                 │
├──────────────────────────────────────────────────────────────────────────┤
│  L0  Language Surface                                                    │
│      general (.noeon) · cognitive · protocol/AEL (.ael) profiles         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.1 L0 — Language Surface

Three **language profiles** share parsers and compile to the same IR (see Section 4):

| Profile | Typical extension | Role |
|---|---|---|
| **General** | `.noeon` | AI-era general programs: goals, observe/understand/reason/decide/act/feedback |
| **Cognitive** | `.ael` (cognitive-only) | Reasoning flows without full contract headers |
| **Protocol / AEL** | `.ael` | Task contracts: budget, verify, settlement, FLOW, governance hooks |

**Key modules:** `src/parser.js`, `src/cognitive-parser.js`, `src/core/profile.js`, `examples/hello.noeon`

The surface accepts 50+ cognitive keywords plus AEL contract directives. Cognitive aliases map deterministically to canonical forms for validation and compilation.

### 3.2 L1 — Cognitive IR & Type System

All programs lower to **Cognitive IR** — the unification layer where “a contract is a thought.” AEL primitives map to cognitive operations (e.g., `TASK` → `INTENT`, `BUDGET` → `CONSTRAINT`, `VERIFY` → `VALIDATE`, `PLUGIN` → `PERCEIVE`).

**IR node types (14):** `INTENT`, `CONSTRAINT`, `PROCESS`, `VALIDATE`, `LEARN`, `PERCEIVE`, `DECIDE`, `COMMIT`, `COLLABORATE`, `EVOLVE`, `REMEMBER`, `ATTEND`, `PREDICT`, `META`

**Cognitive types (7):** `Belief`, `Uncertain`, `Temporal`, `Emotion`, `Intention`, `Percept`, `MemoryTrace`

**Key modules:** `src/core/cognitive-ir.js`, `src/compiler.js`, `src/validator.js`

### 3.3 L2 — Unified Cognitive Kernel

The kernel is the single execution engine for all profiles. It orchestrates subsystems (workspace, dual-process reasoning, memory, prediction, metacognition, fault tolerance, lifecycle, observability) and implements the full cycle:

```text
Perceive → Attend → Predict → Process → Decide → Act → Validate → Learn → Remember → Evolve
```

Kernel states (`KernelState` in `src/core/kernel.js`) track phase transitions for tracing and debugging.

**Key modules:** `src/core/kernel.js`, `src/vm/unified-executor.js`, `src/core/observability.js`

### 3.4 L3 — Governance & Security

Governance constrains *what* the kernel may do regardless of cognitive output:

- **META directives** — `META_REQUIRE`, `META_RANGE`, `META_ENUM`, `META_RELATION`, `META_PROFILE`
- **Policy profiles** — namespaced rule packages with `enforce` or `advisory` mode and optional inheritance
- **Human-in-the-loop** — escalation paths when confidence, policy, or risk thresholds are breached
- **Hardened mode** — activated on blocking governance violations; stricter verification and learning bounds

Preflight governance runs before plan execution; post-learning checks run after policy updates. Audit entries capture violation traces.

**Key modules:** `src/core/governance.js`, `src/runtime/meta-rule-engine.js`, `src/runtime/audit-logger.js`, `src/runtime/plugins/integrity.js`, `docs/rfc/RFC-0002-plugin-signature-enforcement.md`

### 3.5 L4 — Execution & Tools

The execution layer bridges cognitive plans to the outside world:

| Capability | Purpose | Reference |
|---|---|---|
| **Plugins** | External modalities and effectful capabilities | `src/runtime/plugins/` |
| **HTTP / API** | Playground and service endpoints | `src/playground-api.js`, `src/serve-site.js` |
| **MCP** | Model Context Protocol tool integration (roadmap / bridge) | protocol-bridge enrichment |
| **Compute kernel** | Deterministic expressions, governed effects, receipts | `docs/NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md` |
| **Protocol phase** | Simulate/train cycles, settlement artifacts | `src/vm/protocol-phase.js`, `src/runtime/simulator.js`, `src/core/protocol-bridge.js` |

Project configuration (`.noeonrc.json`) controls LLM mode, observability, and `with_protocol` behavior via `src/core/config.js`.

### 3.6 L5 — Developer Experience

| Tool | Command / entry | Status |
|---|---|---|
| **Unified CLI** | `src/cli.js` — `run`, `compile`, `validate`, `inspect`, `repl`, `simulate`, `train` | ✅ v0.9 |
| **Language Server** | `language-server/noeon-service.js` — hover, symbols, diagnostics | ✅ v0.9 |
| **Web Playground** | `npm run playground` → `src/playground-api.js` | ✅ v0.9 |
| **VS Code extension** | `vscode-extension/` — `.ael`, `.noeon` syntax | ✅ v0.9 |
| **Noeon Studio** | Visual cognitive IDE | 🔲 roadmap (Phase 4) |
| **Doctor / diagnostics** | `src/doctor.js` | ✅ partial |

Conformance harness: `tests/conformance/run.js`, `tests/unified-v08.test.js`, `tests/unified-v09.test.js`, `tests/unified-vm.test.js`

---

## 4. Language Profiles

Profile detection and execution mode resolution live in `src/core/profile.js`.

| Profile | When to use | Required surface | Default execution |
|---|---|---|---|
| **General (`.noeon`)** | New AI-native apps, tutorials, general cognitive programs | `PROFILE "general"`, `PROGRAM`, `OBJECTIVE`, observe/understand/reason/decide/act | `full` (cognitive + optional protocol enrichment) |
| **Protocol / AEL (`.ael`)** | Task contracts, budgets, verification, settlement, distributed-intelligence protocols | `TASK`, `BUDGET`, `VERIFY`, collateral, `FLOW`, settlement hooks | `full` or `protocol` (simulate/train) |
| **Cognitive-only (`.ael`)** | Experiments, REPL sessions, pure reasoning pipelines without contract economics | Cognitive directives only (no contract core) | `cognitive` unless `--with-protocol` |

**Choosing a profile:**

- Use **`.noeon`** when the program is primarily about goals, understanding, and actions in a general software context.
- Use **`.ael` (protocol)** when machine-checkable task economics, verification quorum, or settlement semantics matter.
- Use **cognitive-only** when iterating on reasoning structure before adding governance or protocol headers.

Example general profile: `examples/hello.noeon`. Protocol bridge auto-enriches cognitive runs when protocol features are detected: `src/core/protocol-bridge.js`.

---

## 5. Primitive Categories

Noeon organizes language primitives into **ten categories**. Canonical keyword lists and grammar live in `docs/spec/NOEON_SPEC_v1.0.md` (draft in progress); this table is the architectural taxonomy.

| # | Category | Purpose | Representative keywords / IR | Maps to IR |
|---|---|---|---|---|
| 1 | **Goal & Intent** | Declare objectives and drives | `OBJECTIVE`, `PROGRAM`, `TASK`, `DRIVE`, `GOAL` | `INTENT` |
| 2 | **Context & Constraints** | Scope, resources, limits | `CONTEXT`, `BUDGET`, `CONSTRAINT`, `ATTEND` | `CONSTRAINT`, `ATTEND` |
| 3 | **Perception & Input** | Sense external state | `PERCEIVE`, `OBSERVE`, `SENSE`, `READ`, `PLUGIN` | `PERCEIVE` |
| 4 | **Understanding & Reasoning** | Infer, predict, process | `UNDERSTAND`, `REASON`, `INTUIT`, `PREDICT`, `COMPUTE` | `PROCESS`, `PREDICT` |
| 5 | **Evidence & Hypothesis** | Structured beliefs under uncertainty | `HYPOTHESIS`, `EVIDENCE`, `COUNTEREXAMPLE`, `TRACE` | `PROCESS`, `VALIDATE` |
| 6 | **Decision & Action** | Choose and execute | `DECIDE`, `ACT`, `FLOW`, `WHEN_CONFIDENT` | `DECIDE` |
| 7 | **Memory & Knowledge** | Store, recall, relate | `KNOW`, `RECALL`, `RELATE`, `CAUSE`, `REMEMBER` | `REMEMBER` |
| 8 | **Collaboration & Social** | Multi-agent coordination | `DEBATE`, `CONSULT`, `DELEGATE`, `VOTE`, `SPAWN` | `COLLABORATE` |
| 9 | **Feedback & Learning** | Measure outcomes and adapt | `FEEDBACK`, `LEARN`, `REFLECT`, `REWARD`, `CONSOLIDATE` | `LEARN`, `VALIDATE` |
| 10 | **Governance & Evolution** | Policy, meta-rules, self-modification | `META_*`, `META_PROFILE`, `EVOLVE`, `MUTATE`, `POLICY` | `META`, `EVOLVE` |

Categories 1–6 correspond to the core formula (Goal → Context → Cognition → Action); categories 7–10 cover persistence, coordination, adaptation, and bounds.

---

## 6. Compilation & Runtime Pipeline

End-to-end flow (implemented in `src/runtime/unified-runtime.js`):

```
 Source (.noeon | .ael)
        │
        ▼
   ┌─────────┐     load .noeonrc.json (optional)
   │  Parse  │──── src/parser.js / src/cognitive-parser.js
   └────┬────┘
        ▼
   ┌───────────┐
   │ Validate  │──── src/validator.js (profile + invariants)
   └────┬──────┘
        ▼
   ┌───────────┐
   │  Compile  │──── src/compiler.js → AELtoIRCompiler (src/core/cognitive-ir.js)
   └────┬──────┘     emits Cognitive IR program + warnings
        ▼
   ┌──────────────────┐
   │ Profile detect   │──── src/core/profile.js
   └────┬─────────────┘
        ▼
   ┌──────────────────┐
   │ Governance       │──── src/core/governance.js (preflight META/POLICY)
   │ preflight        │
   └────┬─────────────┘
        ▼
   ┌──────────────────┐
   │ Unified executor │──── src/vm/unified-executor.js
   │ + Kernel         │     src/core/kernel.js
   └────┬─────────────┘
        │
        ├── cognitive phase ──► observability trace, nativeMind diagnostics
        │
        └── protocol phase (optional) ──► src/vm/protocol-phase.js
                    simulate / train / audit artifacts
        ▼
   ┌──────────────────┐
   │ Feedback & learn │──── learning updates, post-governance checks
   └────┬─────────────┘
        ▼
   Report + optional audit log (src/runtime/report.js, src/runtime/audit-logger.js)
```

**CLI entry points:**

```bash
noeon run examples/hello.noeon --trace
noeon compile examples/cognitive_minimal.ael --format both --out out.json
noeon simulate <contract.ael> <feedback.json> ...
noeon validate examples/noeon_contract.ael
```

**Execution modes** (`resolveExecutionMode` in `src/core/profile.js`): `cognitive`, `full`, `protocol`.

---

## 7. Comparison Matrix

High-level positioning — not a benchmark claim.

| Dimension | Noeon | Python | LangChain | Prompt-only |
|---|---|---|---|---|
| **Primary abstraction** | Cognitive workflow (goal → learn) | General computation | LLM orchestration chains | Natural language instructions |
| **Uncertainty** | Native (confidence, evidence types) | Library-dependent | Ad hoc in prompts | Implicit in model output |
| **Governance** | First-class META/POLICY, hardened mode | Application-level | Limited framework hooks | None in language |
| **Observability** | Thought traces, kernel phases, audit | Logging as you build it | Callback/tracing plugins | Opaque unless instrumented |
| **Execution model** | Unified kernel + IR | Interpreter/VM | Python runtime + APIs | Remote model call |
| **Protocol / contracts** | AEL profile built-in | Custom schemas | Rare | Not applicable |
| **Learning loop** | `LEARN`, `REFLECT`, train/simulate | ML libraries external | Memory modules optional | Fine-tuning external |
| **Deterministic testing** | Mock LLM mode, conformance suite | Full | Partial | Difficult |
| **Best fit** | AI-native agents, governed cognitive systems | General software | Quick LLM pipelines | Prototypes, one-offs |

Noeon complements Python (implementation host) and can orchestrate LLMs without reducing the program to a single prompt string.

---

## 8. Maturity Roadmap

| Phase | Focus | Deliverables | Status |
|---|---|---|---|
| **Phase 1 — Unified foundation** | Single IR + kernel, dual-profile VM, CLI | `cognitive-ir.js`, `kernel.js`, `unified-runtime.js`, profile detection | ✅ **Current (v0.7–v0.9)** |
| **Phase 2 — General language surface** | Full `.noeon` syntax, expanded stdlib, type checker | General grammar beyond AEL-compatible surface, `hello.noeon` pattern | 🔄 **In progress** |
| **Phase 3 — Production hardening** | v1.0 spec, error registry, plugin signatures, compute kernel | `NOEON_SPEC_v1.0.md`, RFC-0002 enforcement, conformance CL-1–CL-4 | 🔄 **Partial** |
| **Phase 4 — Ecosystem & Studio** | Package registry, MCP-first tools, Noeon Studio IDE | Visual debugger, marketplace, distributed settlement (external) | 🔲 **Planned** |

**Version markers (repository):**

- v0.9 — protocol bridge, deep LLM handlers, `.noeonrc.json`, LSP hover/symbols, playground run API
- v1.0 target — complete AI-native programming language with normative spec and hardened governance defaults

**Known gaps toward strong v1.0:**

1. Formal small-step semantics document not finalized
2. Standardized error code registry incomplete
3. Policy registry trust model / signature chain in draft (`RFC-0002`)
4. Compute kernel directives draft-level (`docs/NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md`)
5. Benchmark-driven cognitive quality evaluation suite incomplete
6. Full `.noeon` grammar distinct from AEL-compatible subset

---

## 9. Key Challenges

### 9.1 Uncertainty and non-determinism

LLM-backed `PREDICT`, `REFLECT`, and `DEBATE` steps introduce variance. Mitigations: confidence thresholds, `DECIDE` fallback/escalate paths, mock/offline LLM mode for tests, and explicit `VALIDATE` / `VERIFY` gates.

### 9.2 Security and governance

Autonomous cognitive programs can invoke plugins and external tools. Risks: prompt injection via `PERCEIVE`, over-privileged plugins, policy bypass. Mitigations: META preflight/postflight, plugin integrity checks (`src/runtime/plugins/integrity.js`), hardened mode, human-in-the-loop escalation, advisory vs enforce profiles.

### 9.3 Ecosystem and interoperability

Developers expect packages, debugging, and IDE integration. Current stack covers CLI, LSP, and playground; Phase 4 targets Studio, MCP-native tooling, and a module registry. Interop with existing Python/JS stacks remains via plugins and HTTP, not syntax compatibility.

### 9.4 Over-anthropomorphization

Cognitive vocabulary aids intent expression but can mislead stakeholders into attributing human-like awareness to deterministic or LLM-stochastic pipelines. Documentation and APIs should emphasize **workflow modeling**, traceability, and governance — not consciousness claims. Prefer “cognitive cycle phase” over “the system believes” in operational docs.

### 9.5 Dual-path complexity

Cognitive and protocol execution paths must stay converged on one IR (`src/core/protocol-bridge.js`). Divergence creates duplicate semantics and conformance drift; the architecture treats protocol features as enrichments, not a separate language.

---

## 10. Glossary

| Term | Definition |
|---|---|
| **AEL** | Agent Execution Language — protocol-oriented profile for task contracts (`.ael`) |
| **Cognitive IR** | Intermediate representation; 14 node types unified from all surface profiles |
| **Cognitive Programming** | Paradigm where programs express goals, reasoning, and learning loops rather than instruction sequences |
| **Cognitive cycle** | Kernel execution loop: perceive through evolve (`src/core/kernel.js`) |
| **Confidence** | Numeric belief strength attached to predictions, decisions, and evidence |
| **Contract** | Machine-checkable AEL program declaring task, budget, verification, and settlement |
| **Cycle** | One protocol simulation round (`simulate`) or one kernel execution with optional protocol phase |
| **General profile** | `.noeon` programs using AI-native surface syntax |
| **Governance profile** | Namespaced META rule package with mode and inheritance |
| **Hardened mode** | Safety posture after blocking governance violations |
| **Human-in-the-loop** | Required human approval on escalation paths |
| **Kernel** | `CognitiveKernel` — sole execution engine for Cognitive IR |
| **Learning update** | Policy or weight delta inferred from feedback |
| **META rule** | Declarative governance constraint on contract or runtime context |
| **nativeMind** | Runtime diagnostic bundle linking plan, evidence, and recommendations |
| **Plugin** | Externally supplied capability exposed as a perception or effect channel |
| **Profile** | Language surface selection: `general`, `cognitive`, or `ael` |
| **Protocol bridge** | Auto-enrichment of cognitive runs with compute + META when protocol features detected |
| **Unified runtime** | `src/runtime/unified-runtime.js` — parse/validate/compile/execute orchestration |

---

## Appendix A — Implementation Map

| Layer | Primary modules |
|---|---|
| L0 Surface | `src/parser.js`, `src/cognitive-parser.js`, `src/core/profile.js` |
| L1 IR & types | `src/core/cognitive-ir.js`, `src/compiler.js`, `src/validator.js` |
| L2 Kernel | `src/core/kernel.js`, `src/vm/unified-executor.js`, `src/core/observability.js` |
| L3 Governance | `src/core/governance.js`, `src/runtime/meta-rule-engine.js`, `src/runtime/plugins/integrity.js` |
| L4 Execution | `src/runtime/unified-runtime.js`, `src/vm/protocol-phase.js`, `src/core/protocol-bridge.js`, `src/playground-api.js` |
| L5 DX | `src/cli.js`, `language-server/noeon-service.js`, `src/doctor.js`, `vscode-extension/` |

---

## Appendix B — Related Documents

| Document | Role |
|---|---|
| `docs/spec/NOEON_SPEC_v1.0.md` | Normative grammar and semantics (in progress) |
| `docs/spec/NOEON_SPEC_v0.9.md` | Current interim normative reference |
| `docs/NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md` | Compute layer draft |
| `docs/rfc/RFC-0002-plugin-signature-enforcement.md` | Plugin integrity RFC |
| `README.md` | Project positioning and quick start |

---

*Draft v1.0 — aligned to Noeon v0.9 codebase. Subject to revision as `NOEON_SPEC_v1.0.md` lands.*
