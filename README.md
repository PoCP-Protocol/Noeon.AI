# Noeon AI — The Cognitive Programming Language

**A new species of programming language, created by Humans and AI together.**

> *"A language that doesn't just describe computation — it thinks."*

[![Version](https://img.shields.io/badge/version-0.9.0-blue)]()
[![Tests](https://img.shields.io/badge/tests-551%2B%20passed-green)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## What Is Noeon?

Noeon is the world's first **cognitive programming language** — a language modeled after the human brain's thinking process. Unlike traditional languages that execute instructions sequentially, Noeon programs **perceive, attend, predict, reason, decide, validate, learn, remember, and evolve** — just like a brain.

Every program, whether it's an AEL task contract or a cognitive flow, compiles down to a single **Cognitive Intermediate Representation (IR)** and executes through one **Unified Cognitive Kernel**.

```
# Traditional language: Execute instructions
if (data > threshold) { alert(); }

# Noeon: Think about the world
PERCEIVE source=sensor modality=numerical
PREDICT "threshold breach" confidence=0.7
INTUIT domain=anomaly_detection speed=fast
REASON strategy=abductive depth=3
DECIDE action=alert threshold=0.8
REFLECT "Was my reasoning sound?" depth=deep
```

---

## v0.9: Protocol Bridge + Deep LLM + Config

v0.9 closes the remaining gap between cognitive run and protocol simulate:

| Feature | Description |
|---|---|
| **Protocol bridge** | `noeon run` auto-enriches with compute + META when detected |
| **Deep LLM** | PREDICT, REFLECT, DEBATE, dialectical PROCESS use LLM bridge |
| **Project config** | `.noeonrc.json` controls LLM, observability, `with_protocol` |
| **Smarter DECIDE** | Confidence-threshold decisions with fallback/escalate |
| **LSP v0.9** | Hover docs + document outline symbols |
| **Playground v0.9** | Ctrl+Enter run, status bar, error line jump |

```bash
noeon run examples/noeon_contract.ael --with-protocol --trace
noeon compile examples/cognitive_minimal.ael --format both --out out.json
```

See [NOEON_SPEC_v0.9.md](docs/spec/NOEON_SPEC_v0.9.md).

---

## v0.8: Production Developer Experience

v0.8 converges the dual execution paths and adds production-ready tooling:

| Capability | Command |
|---|---|
| Unified CLI (cognitive + protocol) | `noeon run` / `noeon simulate` / `noeon train` |
| Web Playground | `npm run playground` → http://localhost:5177/playground.html |
| Language Server | `noeon lsp` (VS Code extension v0.8) |
| LLM integration | Set `OPENAI_API_KEY` or `NOEON_API_KEY` (`NOEON_LLM_MODE=auto`) |
| npm install | `npm install -g noeon-ael` → `noeon` command |

See [NOEON_SPEC_v0.8.md](docs/spec/NOEON_SPEC_v0.8.md) for normative specification.

---

## v0.7: The Unification

The key insight of v0.7: **A contract IS a thought.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOEON UNIFIED ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   .ael Source Code                                                │
│        │                                                          │
│        ▼                                                          │
│   ┌─────────┐     ┌──────────────┐     ┌───────────────────┐    │
│   │ Parser  │────▶│ Cognitive IR │────▶│ Unified Kernel    │    │
│   └─────────┘     └──────────────┘     │                   │    │
│                                         │ Perceive → Attend │    │
│   AEL Contracts ─┐                     │ → Predict         │    │
│                   ├─▶ Same IR ─────────▶│ → Process         │    │
│   Cognitive     ─┘                     │ → Decide          │    │
│   Flows                                │ → Validate        │    │
│                                         │ → Learn           │    │
│                                         │ → Remember        │    │
│                                         │ → Evolve          │    │
│                                         └───────────────────┘    │
│                                                   │               │
│                                                   ▼               │
│                                         ┌───────────────────┐    │
│                                         │ Observability     │    │
│                                         │ (Logs + Traces +  │    │
│                                         │  Metrics)         │    │
│                                         └───────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

| AEL Contract Primitive | Maps To | Cognitive Operation |
|---|---|---|
| `TASK` | → | `INTENT` (goal the brain pursues) |
| `BUDGET` | → | `CONSTRAINT` (resource limits) |
| `COLLATERAL` | → | `COMMIT` (motivation/skin in the game) |
| `VERIFY` | → | `VALIDATE` (self-checking) |
| `REWARD` | → | `LEARN` (reinforcement signal) |
| `COMPUTE` | → | `PROCESS` (reasoning) |
| `FLOW` | → | `DECIDE` (state transitions = attention shifts) |
| `PLUGIN` | → | `PERCEIVE` (external modality) |
| `META_RULE` | → | `META` (self-governance) |

Both styles compile to the same Cognitive IR and execute through the same Kernel.

---

## Quick Start

```bash
# Clone
git clone https://github.com/PoCP-Protocol/Noeon.AI.git
cd Noeon.AI && npm install

# Run a cognitive program through the Unified Kernel
node src/cli.js run examples/cognitive_superbrain.ael --trace

# Compile to Cognitive IR (see how the brain plans)
node src/cli.js compile examples/cognitive_advanced.ael --verbose

# Inspect execution (full observability)
node src/cli.js inspect examples/cognitive_minimal.ael

# Interactive REPL (think interactively)
node src/cli.js repl

# Create a new project
node src/cli.js init my-brain
```

Compatibility scripts are available for governance and legacy docs:

```bash
npm run simulate -- <contract.ael> <feedback.json> <cycle.json> <state.json> <report.json> <audit.jsonl>
npm run train -- <contract.ael> <feedback_batch.json> <training.json> <state.json> <convergence.json> <audit.jsonl>
npm run rollback -- <state.json> [steps]
```

---

## CLI Commands

| Command | Description |
|---|---|
| `noeon run <file>` | Execute through Cognitive Kernel |
| `noeon parse <file>` | Show AST structure |
| `noeon compile <file>` | Compile to Cognitive IR |
| `noeon explain <file>` | Natural language explanation |
| `noeon validate <file>` | Validate syntax and semantics |
| `noeon inspect <file>` | Execute with full tracing |
| `noeon repl` | Interactive cognitive session |
| `noeon init <name>` | Create new project |
| `noeon status` | Show kernel status |
| `noeon simulate` | Protocol simulation + audit artifacts |
| `noeon train` | Multi-round policy training |
| `noeon rollback` | Roll back persisted state |
| `noeon playground` | Start web playground + API |
| `noeon lsp` | Start language server (stdio) |

---

## LLM Configuration

```bash
export OPENAI_API_KEY=sk-...
export NOEON_LLM_MODE=auto    # auto | live | mock | off
export NOEON_LLM_MODEL=gpt-4o-mini
noeon run examples/cognitive_superbrain.ael --trace
```

Without an API key, the kernel uses deterministic mock reasoning (tests stay offline).

---

## npm Publish

```bash
npm install -g noeon-ael
noeon --version
noeon init my-agent
noeon playground
```

## Core Competitive Advantages

### 1. Intent as Program
You describe WHAT you want to achieve, the brain figures out HOW.

### 2. Uncertainty-Native
All values carry confidence. The system reasons under uncertainty natively.

### 3. Time-Aware
Memory decays, predictions update, beliefs evolve. The language understands time.

### 4. Self-Aware
Programs observe their own execution and adjust strategy in real-time.

### 5. Emergent Behavior
Simple cognitive rules combine to produce complex intelligent behavior.

### 6. Self-Modifying Syntax
The language can invent new grammar at runtime based on usage patterns.

### 7. Causal Reasoning
Built-in knowledge graph with counterfactual and interventional reasoning.

---

## Architecture: 7-Layer Language Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 7: CLI & Developer Experience                             │
│    Unified CLI, REPL, project scaffolding                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: Observability                                          │
│    Structured logs, thought traces, metrics, dashboard           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Standard Library & Modules                             │
│    Reasoning, Decision, Learning, Attention, Pattern, Modules    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Type System                                            │
│    Belief, Uncertain, Temporal, Emotion, Intention, Percept      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Unified Cognitive Kernel                               │
│    Single execution engine, cognitive cycle, handler registry     │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Cognitive IR (14 node types)                           │
│    INTENT, CONSTRAINT, PROCESS, VALIDATE, LEARN, PERCEIVE,      │
│    DECIDE, COMMIT, COLLABORATE, EVOLVE, REMEMBER, ATTEND,        │
│    PREDICT, META                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Parser & Compiler                                      │
│    50+ cognitive primitives, AEL syntax, AST generation          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Brain-to-Code Mapping

| Brain Region | Noeon Module | Function |
|---|---|---|
| Prefrontal Cortex | `GlobalWorkspace` | Attention & working memory |
| Hippocampus | `MemorySystem` | Episodic/semantic/procedural memory |
| Basal Ganglia | `DualProcessEngine` | System 1 (fast) + System 2 (slow) |
| Predictive Cortex | `PredictiveEngine` | Free energy minimization |
| Anterior Cingulate | `MetacognitiveMonitor` | Self-monitoring & error detection |
| Broca's Area | `LLMBridge` | Language & LLM integration |
| Temporal Cortex | `SemanticMemory` | Vector-based associative memory |
| Mirror Neurons | `SocialBrain` | Multi-agent Theory of Mind |
| Epigenetic System | `EvolutionEngine` | Self-modification & adaptation |
| Executive Function | `CognitiveFlow` | Brain-native control structures |
| Thalamus | `MultiModalPerception` | Multi-channel sensory routing |
| Default Mode Network | `ConsciousnessStream` | Continuous background thinking |
| Temporal + Parietal | `KnowledgeGraph` | World model & causal inference |
| fMRI Scanner | `CognitiveDebugger` | Mind inspection & tracing |
| Thalamo-cortical Loop | `CognitiveKernel` | Central integrator (Unified Kernel) |
| Error Circuits | `FaultTolerance` | Graceful degradation |

---

## Type System (7 Cognitive Types)

| Type | Description | Example |
|---|---|---|
| `Belief` | Proposition + confidence | `Belief("sky is blue", 0.95)` |
| `Uncertain` | Value + distribution | `Uncertain(42, {std: 5})` |
| `Temporal` | Value + time + decay | `Temporal(price, "2024-01-01", 0.9)` |
| `Emotion` | Valence + arousal | `Emotion(-0.3, 0.8)` |
| `Intention` | Goal + priority + deadline | `Intention("learn", 0.9)` |
| `Percept` | Sensory data + modality | `Percept(image, "visual")` |
| `MemoryTrace` | Content + strength + associations | `MemoryTrace(fact, 0.7)` |

---

## Language Primitives (50+ Keywords)

### Perception & Attention
`PERCEIVE`, `ATTEND`, `SENSE`, `LOOK`, `LISTEN`, `READ`, `PERCEIVE_ALL`

### Reasoning & Decision
`INTUIT`, `REASON`, `PREDICT`, `DECIDE`, `DEBATE`, `HYPOTHESIS`

### Memory & Knowledge
`KNOW`, `RELATE`, `CAUSE`, `RECALL`, `CONSOLIDATE`, `ACTIVATE`, `EMBED`

### Metacognition & Evolution
`REFLECT`, `MONITOR`, `EVOLVE`, `DEFINE`, `MUTATE`, `SYNTHESIZE`

### Flow Control (Brain-Native)
`STREAM`, `THINK_UNTIL`, `WHEN_CONFIDENT`, `ATTEND_PARALLEL`, `ON_SURPRISE`

### Social Cognition
`CONSULT`, `DEBATE_MULTI`, `SPAWN`, `DELEGATE`, `VOTE`

---

## Test Results

```
Kernel Tests (v0.7):   79 passed, 0 failed   ← NEW: Unified Kernel + IR + Observability
Cognitive v0.3 Tests:  70 passed, 0 failed
Cognitive v0.4 Tests:  138 passed, 0 failed
Cognitive v0.5 Tests:  113 passed, 0 failed
Cognitive v0.6 Tests:  151 passed, 0 failed
Conformance Tests:     ✓ All passed
─────────────────────────────────────────────
Total:                 551+ tests, 0 failures
```

---

## Project Statistics

| Metric | Value |
|---|---|
| Total source code | ~22,000 lines |
| Cognitive primitives | 50+ |
| Runtime modules | 22 |
| IR node types | 14 |
| Formal cognitive types | 7 |
| Standard library algorithms | 25+ |
| CLI commands | 10 |
| Tests | 551+ (all passing) |

---

## Evolution History

```
v0.1-0.2  AEL contract language foundation
v0.3      Cognitive primitives (14 core)
v0.4      LLM integration, semantic memory, social brain, evolution
v0.5      Consciousness stream, knowledge graph, multimodal, meta-language
v0.6      Type system, stdlib, modules, REPL, formal spec
v0.7      UNIFIED COGNITIVE KERNEL ← You are here
          └── Single IR, Single Kernel, Full Observability, CLI Toolchain
```

---

## Theoretical Foundations

1. **Global Workspace Theory** (Baars, 1988) — Consciousness as shared broadcast
2. **Dual Process Theory** (Kahneman, 2011) — Fast intuition vs. slow deliberation
3. **Free Energy Principle** (Friston, 2010) — The brain as prediction machine
4. **Somatic Marker Hypothesis** (Damasio, 1994) — Emotions guide decisions
5. **Memory Consolidation** (Squire, 1992) — Hippocampal replay
6. **Metacognition** (Flavell, 1979) — Thinking about thinking
7. **Social Brain Hypothesis** (Dunbar, 1998) — Intelligence for cooperation
8. **Neuroplasticity** (Hebb, 1949) — "Neurons that fire together wire together"
9. **Predictive Processing** (Clark, 2013) — Perception as controlled hallucination
10. **Spreading Activation** (Collins & Loftus, 1975) — Associative retrieval

---

## Documentation

- [Language Specification](docs/LANGUAGE_SPEC.md) — Formal semantics of every primitive
- [Cognitive Whitepaper](docs/NOEON_COGNITIVE_WHITEPAPER.md) — Design philosophy and neuroscience basis

---

## Roadmap

- [x] v0.1-0.2: AEL contract language foundation
- [x] v0.3: Cognitive primitives (14 core)
- [x] v0.4: LLM integration, semantic memory, social brain, evolution
- [x] v0.5: Consciousness stream, knowledge graph, multimodal, meta-language
- [x] v0.6: Type system, stdlib, modules, REPL, formal spec
- [x] **v0.7: Unified Cognitive Kernel, Cognitive IR, Observability, CLI (551+ tests)**
- [x] **v0.8: Dual-path convergence, LSP, Web Playground, LLM integration, npm publish**
- [x] **v0.9: Protocol bridge, config loader, deep LLM handlers, LSP hover/symbols**
- [ ] v1.0: Complete AI-native programming language

---

## Philosophy

> "The limits of my language mean the limits of my world." — Wittgenstein

If our programming languages can only express *computation*, then our AI can only *compute*.

Noeon expresses **cognition** — perception, reasoning, emotion, memory, prediction, reflection, evolution.

This is not a tool for building AI. **This IS an AI, expressed as a language.**

---

## Positioning

Noeon is a cognitive intelligence infrastructure for the AI era.

- Programs that think, not just compute.
- Verifiable reasoning with full observability.
- Self-evolving systems that improve over time.

**Tagline**: Let intelligence think freely, let value settle automatically, let order emerge spontaneously.

---

## License

MIT

## Created By

Humans & AI, together. A new species.
