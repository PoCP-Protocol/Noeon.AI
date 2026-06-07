# Noeon Language Specification v1.0

**Status:** Draft  
**Version:** 1.0.0-alpha  
**Last Updated:** 2026-06-08  
**Supersedes:** Narrative and developer-facing framing of [NOEON_SPEC_v0.9.md](./NOEON_SPEC_v0.9.md)  
**Compatibility:** v0.3–v0.9 protocol semantics remain normative and MUST NOT be broken by v1.0 implementations

---

## 1. Status, Version, Scope

### 1.1 Status

This document is the **normative language specification** for Noeon v1.0. It defines what conforming implementations MUST support, SHOULD support, and MAY extend.

Implementations labeled `1.0.0-alpha` MAY ship partial support for primitives marked **planned** in §5, but MUST NOT contradict normative semantics for primitives marked **normative**.

### 1.2 Version

| Field | Value |
|-------|-------|
| Language version | `1.0.0-alpha` |
| IR schema version | `0.7+` (14 node types, stable) |
| Protocol artifact schema | v0.3 (stable) |
| Package name | `noeon-ael` |
| CLI binary | `noeon` |

### 1.3 Scope

Noeon v1.0 specifies:

1. **Language surface** — three profiles (`general`, `cognitive`, `protocol/ael`) sharing one parser front-end
2. **Semantic model** — cognitive programming paradigm (Goal → Context → Cognition → Action → Feedback → Evolution)
3. **Type system** — first-class cognitive types with confidence and temporal semantics
4. **Cognitive IR** — single compilation target for all profiles
5. **Execution semantics** — unified kernel, protocol bridge, governance
6. **Module system** — cognitive units with registry, composition, and import/export
7. **Standard library** — reasoning, memory, decision, attention, pattern, policy
8. **Tool integration** — plugins (HTTP, MCP), LLM bridge, observability
9. **Developer tooling** — CLI, REPL, Playground, LSP, VS Code extension
10. **Conformance** — test suites and migration rules from v0.8/v0.9

Out of scope for v1.0:

- Remote plugin signature distribution (see RFC-0002)
- Full general-profile syntax beyond Phase 1 surface (see §16)
- Claims of machine consciousness or sentience

### 1.4 Relationship to Prior Specs

| Prior spec | v1.0 relationship |
|------------|-------------------|
| NOEON_SPEC_v0.3 | Protocol/AEL artifact fields, META rules, compute kernel — **retained** |
| NOEON_SPEC_v0.8 | Unified architecture, CLI, LSP baseline — **extended** |
| NOEON_SPEC_v0.9 | Protocol bridge, `.noeonrc.json`, deep LLM handlers — **extended** |
| README narrative | Repositioned from "brain simulation" to **cognitive workflow modeling** |

---

## 2. Vision & Non-Goals

### 2.1 Vision

Noeon is **not** an Agent DSL. It is an **AI-native general programming language** where humans program by **goals, cognition, evidence, decisions, actions, feedback, and learning** — not by machine instruction sequences alone.

Traditional languages center computation primitives (variables, functions, loops, classes). Noeon elevates AI-era concepts to first-class language objects while retaining the ability to compute when needed.

**Core formula:**

```text
Program = Goal + Context + Cognition + Action + Feedback + Evolution
```

**Positioning:**

> Noeon is an AI-native general programming language that lets humans program by goals, cognition, evidence, decisions, actions, and learning. It models cognitive workflows — it does **NOT** claim consciousness.

Every Noeon program — whether a `.noeon` general program, a cognitive script, or an AEL task contract — compiles to **Cognitive IR** and executes through the **unified runtime**.

### 2.2 Design Principles

Implementations MUST reflect these principles:

1. **Intent as program** — authors describe *what* to achieve; runtime resolves *how*
2. **Uncertainty-native** — values carry confidence; reasoning under uncertainty is first-class
3. **Observable cognition** — traces, receipts, and reflection are inspectable artifacts
4. **Governed execution** — META rules, policies, and human approval gates are language-level
5. **Profile unity** — one IR, one kernel; profile differences are surface syntax and enrichment, not separate runtimes
6. **Backward compatibility** — v0.3 protocol contracts MUST continue to parse, validate, simulate, and train

### 2.3 Non-Goals

Noeon v1.0 explicitly does **NOT** aim to:

| Non-goal | Rationale |
|----------|-----------|
| Simulate human consciousness | Cognitive workflow modeling ≠ sentience claims |
| Replace general-purpose languages for all workloads | Noeon complements imperative/functional code via COMPUTE blocks and plugins |
| Mandate LLM connectivity | Offline deterministic mock reasoning MUST remain available |
| Define a proprietary agent framework API | Agents are program units (§6), not a separate product layer |
| Require blockchain or token economics | AEL collateral/reward semantics are optional protocol features |

---

## 3. Language Profiles

Noeon defines three **language profiles**. All profiles share the same parser, compiler, Cognitive IR, and unified kernel. Profile selection affects validation rules, default execution mode, and file extension conventions.

### 3.1 Profile Summary

| Profile | Extension | Declared via | Primary use |
|---------|-----------|--------------|-------------|
| `general` | `.noeon` | `PROFILE "general"` or `.noeon` filename | AI-era general programs; goal-driven applications |
| `cognitive` | `.ael` (typical) | Absence of full contract header + cognitive directives | Cognitive scripts, experiments, kernel-only runs |
| `protocol/ael` | `.ael` | Full AEL contract header (TASK, BUDGET, DEADLINE, …) | Governed task contracts, simulation, training, audit |

### 3.2 Profile Detection

Implementations MUST detect profile using this order (see `src/core/profile.js`):

1. Explicit `options.profile` or CLI `--profile`
2. File extension `.noeon` → `general`
3. AST field `profile` / `languageProfile` = `"general"`
4. Presence of contract core (`task` AND (`budget` OR `deadline`)) → `protocol/ael`
5. Cognitive-only AST (perceptions, reasonings, drives, cognitive directives, no contract core) → `cognitive`
6. Default → `protocol/ael`

### 3.3 When to Use Each Profile

**`general`** — Use when:

- Building end-user or developer-facing AI applications
- Expressing programs as `PROGRAM` + `OBJECTIVE` + cognitive cycle (see `examples/hello.noeon`)
- You want protocol enrichment (`with_protocol`) but not full collateral/governance ceremony

**`cognitive`** — Use when:

- Prototyping perception → reasoning → decision loops
- Running kernel-only execution without simulate/train artifacts
- Teaching or debugging Cognitive IR compilation

**`protocol/ael`** — Use when:

- Defining verifiable task contracts with budget, deadline, verify, collateral
- Running `noeon simulate`, `noeon train`, or audit pipelines
- Requiring META rules, PLAN graphs, COMPUTE blocks with receipts

### 3.4 Execution Mode Resolution

| Profile | Default mode | `with_protocol=off` | `with_protocol=on` |
|---------|--------------|----------------------|---------------------|
| `cognitive` | `cognitive` | `cognitive` | `full` |
| `general` | `full` | `cognitive` | `full` |
| `protocol/ael` | `full` | `cognitive` | `full` |

Modes:

- **`cognitive`** — Unified kernel cycle only
- **`protocol`** — Protocol simulate/train path
- **`full`** — Kernel + protocol bridge enrichment (v0.9+)

---

## 4. Core Formula & Execution Cycle

### 4.1 Core Formula

A Noeon program is the composition of six semantic layers:

```text
Program = Goal + Context + Cognition + Action + Feedback + Evolution
```

| Layer | Meaning | Typical primitives |
|-------|---------|-------------------|
| **Goal** | Desired outcome, success criteria, constraints | GOAL, OBJECTIVE, INTENT, SUCCESS_CRITERIA, CONSTRAINT |
| **Context** | Domain, audience, mode, tags, memory scope | CONTEXT, MEMORY, RISK |
| **Cognition** | Perception, understanding, reasoning, knowledge | PERCEIVE, UNDERSTAND, REASON, KNOW, HYPOTHESIS, EVIDENCE |
| **Action** | External effects, tool calls, commits | ACT, CALL, EXECUTE, DELEGATE, COMMIT |
| **Feedback** | Evaluation of outcomes | FEEDBACK, EVALUATE, VERIFY, CHECK |
| **Evolution** | Learning and policy update | LEARN, ADAPT, EVOLVE, UPDATE_POLICY |

### 4.2 Normative Execution Cycle

The unified cognitive execution cycle MUST proceed through the following phases. Implementations MAY interleave or repeat phases within a cycle when driven by reactive or goal-driven schedulers (§9), but phase ordering MUST be preserved within a single cycle iteration.

```text
Goal → Context → Perception → Understanding → Reasoning → Decision → Action → Feedback → Reflection → Learning → Evolution
```

| Phase | IR mapping | Kernel phase (v0.8) |
|-------|------------|----------------------|
| Goal | `intent` | (pre-cycle) |
| Context | `constraint`, `attend` | Attend |
| Perception | `perceive` | Perceive |
| Understanding | `process` (operation=understand) | Process |
| Reasoning | `process`, `predict` | Predict, Process |
| Decision | `decide` | Decide |
| Action | `collaborate` (delegate), `commit` | Commit |
| Feedback | `validate` (type=feedback) | Validate |
| Reflection | `validate` (type=reflection) | Validate |
| Learning | `learn`, `remember` | Learn, Remember |
| Evolution | `evolve`, `meta` | Evolve, Meta |

### 4.3 Kernel Cycle (v0.8 baseline)

When executing via the unified kernel without profile-specific overrides, implementations MUST execute:

1. Perceive → 2. Attend → 3. Predict → 4. Process → 5. Decide →  
6. Validate → 7. Learn → 8. Remember → 9. Evolve → 10. Meta

Governance preflight MUST run before `noeon run` when validation fails unless explicitly overridden.

### 4.4 Example (general profile)

```noeon
PROFILE "general"
VERSION "1.0.0-alpha"

PROGRAM "hello_world"
OBJECTIVE "Demonstrate general profile execution through unified VM"
CONTEXT domain=general audience=developer mode=cognitive

OBSERVE input modality=text source="user"
UNDERSTAND context=developer_intent method=semantic_summary confidence=0.72
REASON strategy=deductive depth=2
DECIDE action=greet threshold=0.6
ACT action=greet channel=console safety=low
FEEDBACK source=user signal=acceptance window=1
REFLECT "execution quality" depth=standard
```

---

## 5. Primitive Taxonomy

Noeon organizes surface primitives into **10 normative categories**. Each opcode maps deterministically to one or more **Cognitive IR node types** (§10).

**Legend:**

| Marker | Meaning |
|--------|---------|
| **N** | Normative in v1.0 — MUST be supported |
| **A** | Alias — MUST normalize to canonical opcode |
| **P** | Planned — MAY be stubbed; semantics defined here for forward compatibility |

### 5.1 Goal

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `GOAL` | **N** | `intent` | Primary goal statement (quoted string) |
| `OBJECTIVE` | **A** → `GOAL` | `intent` | General-profile goal alias |
| `INTENT` | **A** → `TASK`/`GOAL` | `intent` | Context-dependent alias |
| `SUCCESS_CRITERIA` | **N** | `validate` | Criteria for goal satisfaction |
| `CONSTRAINT` | **N** | `constraint` | Resource/behavior limits |
| `DRIVE` | **A** → `GOAL` | `intent` | Cognitive-block motivation |
| `TASK` | **N** (protocol) | `intent` | Protocol contract primary task |

### 5.2 Perception

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `PERCEIVE` | **N** | `perceive` | Sensory/input acquisition |
| `OBSERVE` | **A** → `PERCEIVE` | `perceive` | General-profile alias |
| `READ` | **N** | `perceive` | Read structured/textual input |
| `FETCH` | **N** | `perceive` | Pull remote/local resource into workspace |
| `MONITOR` | **N** | `perceive` + `attend` | Continuous observation stream |
| `SENSE` | **A** → `PERCEIVE` | `perceive` | Cognitive alias |
| `PERCEIVE_ALL` | **N** | `perceive` | Multi-channel parallel perception |
| `ATTEND` | **N** | `attend` | Focus attention on source/target |
| `PLUGIN` | **N** (protocol) | `perceive` | External modality registration |

### 5.3 Understanding

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `UNDERSTAND` | **N** | `process` (operation=understand) | Semantic/contextual comprehension |
| `CLASSIFY` | **N** | `process` (operation=classify) | Label assignment with confidence |
| `EXTRACT` | **N** | `process` (operation=extract) | Structured field extraction |
| `SUMMARIZE` | **N** | `process` (operation=summarize) | Abstractive/extractive summary |
| `INTERPRET` | **A** → `UNDERSTAND` | `process` | Synonym |

### 5.4 Knowledge

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `KNOW` | **N** | `remember` (store) | Assert semantic knowledge |
| `BELIEVE` | **N** | `remember` + confidence | Proposition with belief strength |
| `REMEMBER` | **N** | `remember` (store) | Episodic/semantic store |
| `RECALL` | **N** | `remember` (recall) | Retrieve by cue/association |
| `CONSOLIDATE` | **N** | `remember` (consolidate) | Working → long-term transfer |
| `RELATE` | **P** | `remember` (associate) | Link concepts in knowledge graph |
| `CAUSE` | **P** | `process` | Causal edge assertion |
| `EMBED` | **N** | `remember` | Vector embedding storage |

### 5.5 Reasoning

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `REASON` | **N** | `process` (analytical) | Deliberate inference |
| `INFER` | **N** | `process` (analytical) | Protocol cognition infer block |
| `HYPOTHESIS` | **N** | `process` + metadata | Testable proposition |
| `EVIDENCE` | **N** | `process` + metadata | Supporting/refuting data |
| `WHAT_IF` | **P** | `predict` + `process` | Counterfactual simulation |
| `WHY` | **P** | `process` + `validate` | Explanation generation |
| `INTUIT` | **N** | `process` (intuitive) | Fast heuristic (System 1) |
| `PREDICT` | **N** | `predict` | Forward anticipation |
| `DEBATE` | **N** | `collaborate` (debate) | Dialectical argument |
| `COUNTEREXAMPLE` | **N** | `validate` | Falsification attempt |

### 5.6 Decision

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `DECIDE` | **N** | `decide` | Choose among options with threshold |
| `CHOOSE` | **A** → `DECIDE` | `decide` | Synonym |
| `RANK` | **N** | `decide` (strategy=rank) | Ordered preference output |
| `ESCALATE` | **N** | `decide` + `meta` | Human/agent escalation path |
| `APPROVE` | **N** | `decide` + governance | Affirmative authorization |
| `REJECT` | **N** | `decide` + governance | Deny with reason |
| `FLOW` | **N** (protocol) | `decide` | State transition / attention shift |

### 5.7 Action

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `ACT` | **N** | `collaborate` (delegate) | General-profile external action |
| `CALL` | **N** | `process` + plugin | Invoke compute function or plugin |
| `EXECUTE` | **A** → `ACT` | `collaborate` | Synonym |
| `DELEGATE` | **N** | `collaborate` (delegate) | Assign to agent/module |
| `COMMIT` | **N** | `commit` | Stake collateral / bind outcome |
| `ACTION` | **N** (protocol) | plugin step | PLAN step with `plugin=<name>` |

### 5.8 Feedback

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `FEEDBACK` | **N** | `validate` (type=feedback) | Outcome signal ingestion |
| `EVALUATE` | **A** → `FEEDBACK` | `validate` | Synonym |
| `VERIFY` | **N** | `validate` | Protocol self-check against criteria |
| `CHECK` | **N** | `validate` | Lightweight assertion |
| `SELF_CHECK` | **N** | `validate` | Metacognitive metric check |

### 5.9 Reflection

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `REFLECT` | **N** | `validate` (type=reflection) | Metacognitive review |
| `DEBUG` | **N** | `validate` + trace | Interactive inspection |
| `TRACE` | **N** | metadata on nodes | Reasoning step log |
| `EXPLAIN` | **N** | `process` + trace | Natural-language justification |
| `INSPECT` | **N** | runtime command | Full execution trace (CLI) |
| `INTROSPECT` | **A** → `REFLECT` | `validate` | Cognitive alias |

### 5.10 Evolution

| Opcode | Status | IR node | Description |
|--------|--------|---------|-------------|
| `LEARN` | **N** | `learn` | Policy/weight update from feedback |
| `ADAPT` | **N** | `learn` + `evolve` | Short-horizon adjustment |
| `EVOLVE` | **N** | `evolve` | Structural self-modification |
| `UPDATE_POLICY` | **N** | `meta` + `learn` | Governance/policy revision |
| `MUTATE` | **N** | `evolve` | Controlled variation |
| `META_RULE` | **N** (protocol) | `meta` | Declarative governance rule |

### 5.11 AEL → IR Mapping (protocol compatibility)

Implementations MUST preserve the v0.7+ deterministic mapping:

| AEL primitive | IR node |
|---------------|---------|
| `TASK` | `intent` |
| `BUDGET` | `constraint` |
| `COLLATERAL` | `commit` |
| `VERIFY` | `validate` |
| `REWARD` / `ON_SUCCESS` | `learn` |
| `COMPUTE` | `process` |
| `FLOW` | `decide` |
| `PLUGIN` | `perceive` |
| `META_RULE` | `meta` |

### 5.12 Cognitive IR Node Types (normative set)

All primitives MUST compile to one or more of these 14 IR node types:

`intent`, `constraint`, `process`, `validate`, `learn`, `perceive`, `decide`, `commit`, `collaborate`, `evolve`, `remember`, `attend`, `predict`, `meta`

---

## 6. Program Units

Noeon programs are organized into **program units** — named scopes that carry goals, context, and cognitive directives.

### 6.1 PROGRAM

The `PROGRAM` unit names a general-profile executable. It MAY appear once per source file.

```noeon
PROFILE "general"
VERSION "1.0.0-alpha"

PROGRAM "research_assistant"
OBJECTIVE "Synthesize weekly research brief from subscribed feeds"
CONTEXT domain=research audience=team freshness=7d
```

**Semantics:**

- `PROGRAM` sets the IR program name
- `OBJECTIVE` MUST compile to at least one `intent` node
- `CONTEXT` MUST compile to `constraint` and/or `attend` nodes

### 6.2 AGENT

An `AGENT` unit defines an autonomous or semi-autonomous actor within a system.

**Status:** **Normative in v1.0.0-alpha.**

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
    DECIDE action=approve threshold=0.75 fallback=escalate
    ACT action=write_report
    REFLECT
```

#### AGENT children (normative)

| Child | Required | Syntax | Description |
|-------|----------|--------|-------------|
| `GOAL` | **yes** | Quoted string | Primary objective; MUST compile to `intent` |
| `MEMORY` | no | `key=value` (e.g. `type=episodic+semantic`) | Memory scope for agent context |
| `TOOLS` | no | JSON array (`["a","b"]`) or quoted list | Tool names available to the agent |
| `POLICY` | no | `key=value` pairs | Governance flags (e.g. `require_citation=true`) |
| `FLOW` | SHOULD | Indented block | Cognitive cycle steps (see below) |

**FLOW steps** — Each line in the `FLOW` indented block MUST be one of:

`PERCEIVE` | `REASON` | `DECIDE` | `ACT` | `REFLECT` | `UNDERSTAND` | `FEEDBACK`

Steps MAY carry `key=value` parameters on the same line. `FLOW` MUST NOT use an inline value; it MUST be followed by an indented block.

**Semantics:**

- Agents MUST compile to scoped IR subgraphs with `collaborate` boundaries
- `GOAL` MUST be present; implementations MUST reject agents without `GOAL`
- `SPAWN` / `CREATE_AGENT` MUST instantiate agent units at runtime
- `DELEGATE` routes work to named agents

### 6.3 SYSTEM

A `SYSTEM` unit composes multiple programs and agents.

```noeon
SYSTEM "content_pipeline"
  IMPORT MODULE "ingest" FROM "./modules/ingest.noeon"
  IMPORT MODULE "review" FROM "./modules/review.noeon"

  AGENT "orchestrator" USES ingest, review
  PROGRAM "daily_run" SCHEDULE cron="0 8 * * *"
END SYSTEM
```

**Semantics:**

- SYSTEM MUST resolve imports before compilation
- Cross-unit dependencies MUST appear in IR `execution_order` topological sort

**Status:** SYSTEM block syntax is **planned**; v1.0-alpha composes via module registry pipelines.

### 6.4 Protocol Contract Header (AEL)

Protocol-profile files MUST include:

```noeon
VERSION "0.3.0"
NETWORK "NoeonNet"
TASK "macro.research.synthesis"
BUDGET 1000
DEADLINE 86400
VERIFY metric=accuracy threshold=0.85
```

Optional: collateral, ON_SUCCESS, ON_SLASH, COMPUTE, PLAN, META_RULE, PLUGIN declarations per NOEON_SPEC_v0.3.

---

## 7. Type System

Noeon defines **cognitive types** — values that carry semantic meaning beyond raw data.

### 7.1 Normative Types (v1.0)

| Type | Fields | Description |
|------|--------|-------------|
| `Goal` | `description`, `priority`, `deadline?`, `success_criteria?` | Intended outcome |
| `Context` | `domain`, `tags`, `mode`, `audience?`, `constraints?` | Situational frame |
| `Belief` | `proposition`, `confidence` | Held proposition with strength |
| `Evidence` | `claim`, `support`, `confidence`, `source?` | Justification artifact |
| `Hypothesis` | `statement`, `prior`, `testable`, `status` | Provisional explanation |
| `Decision` | `choice`, `alternatives`, `confidence`, `rationale` | Selected option |
| `Action` | `name`, `channel`, `params`, `safety`, `status` | External effect descriptor |
| `Memory` | `content`, `type`, `strength`, `associations?`, `timestamp` | Stored knowledge |
| `Tool` | `name`, `version`, `capabilities`, `policy` | Callable external capability |
| `Agent` | `name`, `role`, `capabilities`, `state` | Autonomous unit descriptor |
| `Risk` | `category`, `severity`, `mitigation?` | Threat assessment |
| `Confidence` | `value` (0..1), `source`, `calibration?` | Uncertainty scalar |
| `Plan` | `steps`, `graph`, `dependencies` | Ordered/graph execution |
| `Trace` | `steps[]`, `depth`, `timestamp` | Reasoning audit log |
| `Reflection` | `assessment`, `improvements`, `confidence` | Metacognitive output |
| `Policy` | `rules[]`, `profile`, `enforcement` | Governance configuration |

### 7.2 Legacy Cognitive Types (v0.6, retained)

Implementations SHOULD support interoperability with:

| Type | Description |
|------|-------------|
| `Uncertain` | Value + distribution |
| `Temporal` | Value + time + decay |
| `Emotion` | Valence + arousal |
| `Intention` | Goal + priority + deadline |
| `Percept` | Sensory data + modality |
| `MemoryTrace` | Content + strength + associations |

### 7.3 Type Rules

1. Every cognitive value SHOULD carry an explicit or inferred `Confidence`
2. Comparisons in `DECIDE` MUST use confidence-aware thresholds unless `strict=false`
3. `Belief` updates MUST use defined learning functions (stdlib.learning) or `LEARN` directives
4. Protocol types (`Risk`, `Plan`) MUST validate per NOEON_SPEC_v0.3 when in protocol profile

---

## 8. Module System

Noeon modules are **cognitive units** — reusable bundles of primitives, memory, and capabilities. Unlike traditional module systems (CommonJS, ESM), Noeon modules carry cognitive profile metadata.

Reference implementation: `src/runtime/cognitive/module-system.js`

### 8.1 Surface Syntax

```noeon
MODULE "quick_analyzer"
VERSION "1.0.0"
EXPORT capabilities=pattern_recognition, anomaly_detection
IMPORT stdlib.reasoning FROM "@noeon/stdlib"

ACCEPTS numerical, array
PRODUCES Belief
```

**Import/export (planned full syntax):**

```noeon
IMPORT { deductive, abductive } FROM stdlib.reasoning
IMPORT MODULE "deep_reasoner" FROM "./modules/deep_reasoner.js"
EXPORT MODULE "quick_analyzer"
```

v1.0-alpha: `MODULE "name"` declaration is **normative**; structured IMPORT/EXPORT blocks are **planned**.

### 8.2 CognitiveModule

A registered module MUST expose:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique identifier |
| `version` | yes | Semver string |
| `inputs` | yes | Accepted input types (`*` = any) |
| `outputs` | yes | Produced output types |
| `primitives` | no | Opcodes used internally |
| `capabilities` | no | Searchable capability tags |
| `execute(input, context)` | yes | Async execution entry |

### 8.3 ModuleRegistry

Implementations MUST provide:

- `register(module)` — add to global registry
- `get(name)` — resolve by name or alias
- `findByCapability(cap)` — discovery
- `recommend(task, capabilities)` — selection heuristic

Built-in modules (reference): `quick_analyzer`, `deep_reasoner`, `memory_consolidator`, `decision_maker`, `self_reflector`

### 8.4 ModuleComposer & Pipelines

`ModuleComposer.compose(name, steps)` MUST chain modules in order, passing output → input, producing an execution trace.

Auto-composition (`autoCompose`) SHOULD follow: perceive → reason → decide → reflect when applicable.

### 8.5 ModuleLoader

Modules MAY load from:

1. JavaScript definition files (`./modules/*.js`)
2. AEL cognitive blocks (`createFromAEL`)
3. Search paths: `./modules`, `./src/modules`, `./node_modules`

---

## 9. Execution Semantics

Noeon supports multiple **execution strategies**. All strategies compile to Cognitive IR first.

### 9.1 Sequential

Default for cognitive scripts. IR nodes execute in topological order within each kernel cycle.

### 9.2 Reactive

`MONITOR`, `ON_SURPRISE`, and stream handlers MAY trigger new cycles when salience/novelty thresholds are exceeded.

### 9.3 Goal-Driven

When multiple `intent` nodes exist, the scheduler MUST prioritize by:

1. Explicit `priority` / `importance` field
2. Constraint urgency (deadline proximity)
3. Confidence deficit (goals with low completion confidence)

### 9.4 Agent-Driven

`SPAWN`, `DELEGATE`, `VOTE`, and multi-agent `DEBATE` distribute work across agent scopes. Each agent maintains isolated state with optional shared workspace broadcast.

### 9.5 Human-in-the-Loop

`ESCALATE`, `APPROVE`, `REJECT`, and META rules MAY pause execution pending human input. Implementations MUST emit trace events for pending approvals.

Protocol profile: critic veto (`CRITIC veto=true`) MUST block action until resolved.

### 9.6 Continuous

Long-running programs MAY use `STREAM`, `MONITOR`, or consciousness-stream patterns (v0.5+) for background cycles. Implementations SHOULD support graceful shutdown and state persistence.

### 9.7 Protocol Bridge Enrichment (v0.9+)

When `with_protocol` is `auto` (default), implementations MUST enrich kernel results if AST contains COMPUTE blocks, META_RULE, or PLAN nodes:

1. `compute.result`, `compute.env`, `compute.diagnostics`, `compute.receipts`
2. `metaPolicy.violations`, `metaPolicy.hardened`
3. `protocolSuccess` = true when no blocking META violations and no compute error diagnostics

---

## 10. Compilation Pipeline

```text
Source (.noeon | .ael)
    │
    ▼
 Lexer / Parser ──► AST (profile-tagged)
    │
    ▼
 Validator ──► diagnostics (MUST pass for run/simulate)
    │
    ▼
 Compiler ──► Cognitive IR (IRProgram)
    │
    ▼
 Runtime Execution Plan ──► kernel cycle + optional protocol phase
    │
    ▼
 Observability artifacts (trace, receipts, metrics)
```

### 10.1 Parser

- Single parser front-end (`src/parser.js`) handles all profiles
- Keyword aliases MUST normalize before AST construction (§5)
- Cognitive block parser (`src/cognitive-parser.js`) handles extended brain-native directives

### 10.2 Validator

- Protocol profile: NOEON_SPEC_v0.3 validation rules
- General/cognitive: structural + semantic checks for declared opcodes
- Governance preflight for META hardening

### 10.3 Compiler

- `compileAel(ast)` → `{ program: IRProgram, warnings }`
- MUST emit all 14 IR node categories when source contains matching primitives
- MUST compute `execution_order` via dependency topological sort

### 10.4 Output Formats

| Command | Format | Description |
|---------|--------|-------------|
| `noeon compile <file>` | `ir` (default) | Cognitive IR JSON |
| `noeon compile --format ael` | `ael` | Protocol artifact |
| `noeon compile --format both` | both | IR + AEL (v0.9+) |

---

## 11. Runtime Model

### 11.1 Unified Kernel

The **Unified Cognitive Kernel** is the sole primary execution engine for `noeon run`. It executes the 10-phase cycle (§4.3) via a handler registry.

Components:

| Component | Path (reference) | Role |
|-----------|------------------|------|
| Unified runtime | `src/runtime/unified-runtime.js` | Orchestration facade |
| Unified executor | `src/vm/unified-executor.js` | Phase dispatch |
| Cognitive IR | `src/core/cognitive-ir.js` | IR types and builder |
| Protocol bridge | `src/core/protocol-bridge.js` | Kernel + protocol enrichment |
| Protocol phase | `src/vm/protocol-phase.js` | COMPUTE + META execution |
| Simulator | `src/runtime/simulator.js` | Full protocol cycles |

### 11.2 Protocol Bridge

When enrichment applies, kernel results MUST be merged with protocol phase output without mutating kernel trace ordering.

### 11.3 LLM Bridge

| Env var | Values | Behavior |
|---------|--------|----------|
| `NOEON_LLM_MODE` | `auto`, `live`, `mock`, `off` | Controls LLM bridge |
| `OPENAI_API_KEY` / `NOEON_API_KEY` | secret | Enables live API |
| `NOEON_LLM_MODEL` | model id | Default chat model |

LLM handlers (v0.9+):

| IR phase | LLM method |
|----------|------------|
| PROCESS intuitive | `intuit()` |
| PROCESS analytical | `reason()` |
| PROCESS dialectical | `debate()` |
| PREDICT | `predict()` |
| VALIDATE reflection | `reflect()` |
| COLLABORATE debate | `debate()` |

Mock mode MUST remain deterministic when no API key is configured.

### 11.4 Project Configuration

File: `.noeonrc.json` (optional, walk-up discovery)

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

Environment variables override at runtime.

### 11.5 Governance

META evaluation runs in kernel Meta phase and protocol enrichment. Violations MUST be surfaced in `metaPolicy.violations`.

---

## 12. Security & Governance

### 12.1 POLICY

Runtime plugin policy MUST support profiles (RFC-0002):

| Profile | requireVersion | requireSignature |
|---------|----------------|------------------|
| `permissive` | false | false |
| `balanced` | true | false |
| `strict` | true | true |

Default allowed plugins (reference): `echo`, `policy_guard`, `http_call`

### 12.2 META_* Rules

`META_RULE` declarations MUST compile to `meta` IR nodes. When `strict-protocol` or hardened META is active:

- Blocking violations MUST fail the run
- `failureCategory` MUST be `policy_block`
- Step receipts MUST include audit fields per NOEON_SPEC_v0.3

Standard error codes: `PLUGIN_VERSION_REQUIRED`, `PLUGIN_VERSION_MISMATCH`, `PLUGIN_SIGNATURE_REQUIRED`, `PLUGIN_SIGNATURE_INVALID`, `POLICY_BLOCK_GUARD`

### 12.3 Human Approval

The following MUST require explicit approval when configured:

- `ESCALATE` with `approval_required=true`
- `CRITIC veto=true`
- `policy_guard` deny in strict mode
- META rules with `action=block` or `action=escalate`

### 12.4 Action Safety

`ACT` and `ACTION` steps MUST declare `safety` level (`low`, `standard`, `high`). High-safety actions SHOULD require human approval or policy_guard pass.

---

## 13. Standard Library

Reference: `src/stdlib/index.js`

Implementations MUST expose the following namespaces:

### 13.1 stdlib.reasoning

| Function | Description |
|----------|-------------|
| `deductive(premises, rule)` | Min-confidence conclusion |
| `inductive(observations, threshold)` | Generalization |
| `abductive(observation, hypotheses)` | Best explanation |
| `analogical(source, target, threshold)` | Cross-domain transfer |
| `dialectical(thesis, antithesis)` | Synthesis |

### 13.2 stdlib.decision

| Function | Description |
|----------|-------------|
| `multiCriteria(options, weights)` | Weighted sum ranking |
| `satisfice(options, thresholds)` | Threshold-first selection |
| `expectedValue(options)` | Probability × payoff |
| `minimax(options)` | Worst-case optimization |

### 13.3 stdlib.learning

| Function | Description |
|----------|-------------|
| `reinforcementUpdate(q, reward, α, γ, next)` | Q-learning step |
| `hebbianUpdate(weight, pre, post, rate)` | Hebbian plasticity |
| `bayesianUpdate(prior, likelihood, evidence)` | Posterior |
| `exponentialMovingAverage(est, obs, α)` | Online smoothing |
| `spacedRepetition(ease, interval, quality)` | Review scheduling |

### 13.4 stdlib.memory

Memory algorithms (via module system + REMEMBER/RECALL):

- Spaced repetition
- Spreading activation (planned)
- Forgetting curve (planned)

### 13.5 stdlib.attention

| Function | Description |
|----------|-------------|
| `saliencyMap(items, weights)` | Attention weights |
| `noveltyScore(item, history)` | Novelty 0..1 |
| `changeDetection(series, sensitivity)` | Change point |
| `inhibitionOfReturn(items, recent)` | Attention suppression |

### 13.6 stdlib.tool

Tool discovery and invocation helpers wrapping plugin registry.

### 13.7 stdlib.policy

Policy evaluation helpers aligned with RFC-0002 profiles.

### 13.8 stdlib.pattern & stdlib.probability

Pattern detection, anomaly scoring, similarity, softmax, entropy, KL divergence.

---

## 14. Tool Integration

### 14.1 Plugin Model

Plugins are external capabilities invoked via protocol `ACTION` steps or general `ACT`/`CALL` directives.

```noeon
ACTION "fetch_data" plugin=http_call endpoint="https://api.example.com/data" method=GET
```

Plugin definition MUST include: `name`, `version`, `execute({ stepName, actionType, binding, feedback })`

### 14.2 HTTP (`http_call`)

**v1.0 change:** `http_call` transitions from mock/stub to **real HTTP execution** in conforming v1.0 implementations.

| Field | Required | Description |
|-------|----------|-------------|
| `endpoint` | yes | URL |
| `method` | no | HTTP method (default GET) |
| `headers` | no | Request headers |
| `body` | no | Request body |
| `timeout` | no | Milliseconds |

Implementations MUST:

- Respect plugin policy profile
- Emit step receipts with latency and status
- Support test injection via `feedback.actionResults[stepName]` for offline tests

### 14.3 MCP (Model Context Protocol)

Implementations MAY integrate MCP servers as `perceive` modalities and `collaborate` delegates. MCP tool descriptors SHOULD map to `Tool` type (§7.1).

Configuration via `.noeonrc.json` or environment (planned):

```json
{
  "mcp": {
    "servers": [{ "name": "notion", "command": "..." }]
  }
}
```

### 14.4 Plugin Integrity

Implementations MUST support integrity checks per `src/runtime/plugins/integrity.js` and RFC-0002.

---

## 15. Developer Tools

### 15.1 CLI

Single entry: `noeon` / `node src/cli.js`

| Command | Description |
|---------|-------------|
| `run <file>` | Kernel execution |
| `compile <file>` | Cognitive IR or AEL artifact |
| `simulate` | Protocol cycle + audit |
| `train` | Multi-round adaptation |
| `rollback` | State rollback |
| `validate`, `parse`, `explain`, `inspect` | Analysis |
| `repl` | Interactive session |
| `init <name>` | Project scaffold |
| `status` | Kernel status |
| `playground` | Web UI + REST API |
| `lsp` | Language server (stdio) |
| `doctor` | Environment diagnostics (v1.0) |
| `test <file>` | Parse → validate → run (see §15.1.1) |

#### 15.1.1 `noeon test`

The `noeon test <file>` command MUST execute a deterministic smoke pipeline for a single source file:

1. **Parse** — source MUST parse without error
2. **Validate** — AST MUST pass profile validation (`validateAel`)
3. **Run** — execute via unified runtime with:
   - `NOEON_LLM_MODE=mock` (deterministic, no live API)
   - `with_protocol=off` when profile is `general`

Implementations MUST exit non-zero if any step fails. This command is intended for CI and local smoke checks of `.noeon` agent programs.

### 15.2 REPL

Interactive cognitive session. MUST support parse → compile → run loop for cognitive directives.

### 15.3 Playground

Web UI at `http://localhost:5177/playground.html` (default).

REST API:

| Endpoint | Method | Body |
|----------|--------|------|
| `/api/status` | GET | — |
| `/api/validate` | POST | `{ "source" }` |
| `/api/compile` | POST | `{ "source", "format" }` |
| `/api/run` | POST | `{ "source", "trace?", "with_protocol?", "strict_protocol?", "feedback?" }` |
| `/api/explain` | POST | `{ "source" }` |
| `/api/examples` | GET | — |

### 15.4 Language Server (LSP)

Capabilities (v0.9 baseline, v1.0 extended):

- `textDocument/publishDiagnostics`
- `textDocument/completion` (keywords + stdlib)
- `textDocument/hover` (opcode docs)
- `textDocument/documentSymbol` (PROGRAM, TASK, GOAL, cognitive ops)

Server: `language-server/noeon-service.js`

### 15.5 VS Code Extension

SHOULD provide: syntax highlighting, Run command, LSP integration, profile detection for `.noeon` / `.ael`.

---

## 16. Roadmap Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Cognitive script — kernel, IR, core opcodes, `.noeon` hello | **Done** |
| **Phase 2** | Agent — AGENT blocks, SPAWN/DELEGATE, multi-agent debate | In progress (AGENT normative in alpha) |
| **Phase 3** | AI software — SYSTEM composition, MCP, real http_call, modules | v1.0-alpha target |
| **Phase 4** | General language — full `.noeon` syntax, types, control flow beyond cognitive cycle | Planned |

v1.0.0-alpha delivers Phase 1 completion + Phase 3 foundations (general profile surface, protocol bridge, tooling).

---

## 17. Conformance

### 17.1 Required Test Suites

Implementations MUST pass:

| Suite | Path | Checks |
|-------|------|--------|
| Conformance | `tests/conformance/run.js` | 32+ protocol/reference checks |
| Kernel | `tests/kernel.test.js` | Unified kernel + IR |
| Cognitive v0.3–v0.6 | `tests/cognitive*.test.js` | Primitive regressions |
| Unified v0.8 | `tests/unified-v08.test.js` | Dual-path convergence |
| Unified v0.9 | `tests/unified-v09.test.js` | Protocol bridge, config |
| Unified VM | `tests/unified-vm.test.js` | Profile detection, general profile |
| P0 examples | `tests/examples-p0.test.js` | Parse, validate, run general-profile P0 examples |
| CLI test | `tests/noeon-test.test.js` | `noeon test` command semantics (file MAY be added by parallel work) |

CI MUST run `npm test` before `npm run gate:strict`.

### 17.2 Reference Examples

| File | Profile | Purpose |
|------|---------|---------|
| `examples/hello.noeon` | general | Minimal general-profile cycle |
| `examples/cognitive_minimal.ael` | cognitive | Kernel-only script |
| `examples/noeon_superbrain.ael` | protocol | Full contract reference |
| `examples/noeon_native_mind.ael` | protocol | Native cognition directives |
| `examples/noeon_contract.ael` | protocol | Simulate/train reference |

### 17.3 Conformance Levels

| Level | Requirements |
|-------|--------------|
| **Core** | Parse, validate, compile to IR, kernel run for cognitive profile |
| **Protocol** | Core + simulate/train + META + compute receipts |
| **General** | Core + general profile + protocol bridge auto enrichment |
| **v1.0** | General + real http_call + MODULE + `.noeonrc.json` + full test suite |

### 17.4 Migration from v0.9

1. Add `PROFILE "general"` or use `.noeon` extension for new programs
2. Replace brain-metaphor docs with cognitive workflow framing
3. Enable `http_call` live mode only with explicit policy profile
4. Run `noeon doctor` to verify environment
5. v0.3 AEL contracts require **no source changes**

---

## Appendix A: Normative Keywords (quick reference)

```
PROFILE VERSION MODULE PROGRAM AGENT SYSTEM
GOAL OBJECTIVE INTENT SUCCESS_CRITERIA CONSTRAINT TASK
PERCEIVE OBSERVE READ FETCH MONITOR ATTEND
UNDERSTAND CLASSIFY EXTRACT SUMMARIZE
KNOW BELIEVE REMEMBER RECALL CONSOLIDATE
REASON INFER HYPOTHESIS EVIDENCE WHAT_IF WHY INTUIT PREDICT
DECIDE CHOOSE RANK ESCALATE APPROVE REJECT
ACT CALL EXECUTE DELEGATE COMMIT ACTION
FEEDBACK EVALUATE VERIFY CHECK REFLECT
DEBUG TRACE EXPLAIN INSPECT
LEARN ADAPT EVOLVE UPDATE_POLICY META_RULE
NETWORK BUDGET DEADLINE COMPUTE PLAN FLOW PLUGIN
IMPORT EXPORT
```

---

## Appendix B: Document History

| Version | Date | Change |
|---------|------|--------|
| 1.0.0-alpha | 2026-06-08 | Initial v1.0 normative spec; AI-native general language positioning |
| 0.9.0 | 2026-06-07 | Protocol bridge, deep LLM, LSP hover |
| 0.8.0 | 2026-06-07 | Unified architecture, tooling |
| 0.3.0 | — | AEL protocol foundation |

---

*End of specification.*
