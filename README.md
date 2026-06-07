# Noeon AI — The Cognitive Programming Language

> **A new species of programming language that THINKS like a human brain.**

[![Version](https://img.shields.io/badge/version-0.5.0--supermind-blue)]()
[![Tests](https://img.shields.io/badge/tests-321%20passed-green)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## What Is Noeon?

Noeon is **not** another programming language. It is a **cognitive architecture expressed as code**.

Traditional languages tell computers *what to do*. Noeon tells artificial minds *how to think*.

```
# Traditional language: Execute instructions
if (data > threshold) { alert(); }

# Noeon: Think about the world
PERCEIVE channel="numerical" input=data
INTUIT "Is this dangerous?" confidence_threshold=0.7
REASON strategy="causal" depth=3
DECIDE action="alert" threshold=0.8
REFLECT "Was my reasoning sound?"
```

---

## Core Competitive Advantages

These are capabilities that **no other programming language has**:

### 1. Stream of Consciousness (vs. Sequential Execution)

Traditional programs execute line by line. Noeon programs **think continuously**.

```
STREAM mode="continuous" cycle_ms=200
  # The program never "stops" — it continuously:
  # perceive → think → act → reflect → evolve
  ON surprise > 0.7 DO REASON strategy="deep"
  ON confidence < 0.4 DO SEEK "clarification"
  ON idle > 10 DO CONSOLIDATE memories
```

### 2. Uncertainty-Native Values

Every value in Noeon carries a **confidence distribution**. No more pretending the world is certain.

```
# Traditional: price = 42 (pretends certainty)
# Noeon: price = 42 ± uncertainty, with confidence 0.8
BELIEVE "price" value=42 confidence=0.8 source="market_feed"

# Decisions automatically account for uncertainty
DECIDE threshold=0.7  # Only act when confident enough
```

### 3. Temporal Awareness

Noeon natively understands **past, present, and future**. Memory decays. Predictions update.

```
RECALL "similar_events" decay_rate=0.05  # Older memories fade
PREDICT target="next_state" horizon="7d"  # Look ahead
ANTICIPATE event="disruption" confidence=0.6  # Expect the unexpected
```

### 4. Self-Modifying Syntax

The language can **invent new grammar** at runtime based on usage patterns.

```
# After observing repeated patterns, Noeon suggests:
DEFINE "MARKET_SCAN" as
  PERCEIVE channel="numerical" sensitivity=0.9
  INTUIT "trend?" using=statistical
  PREDICT horizon="1d"
  DECIDE threshold=0.7

# Now use it as a first-class keyword:
MARKET_SCAN  # Expands to the full cognitive sequence
```

### 5. Multi-Modal Perception

Noeon can **see, hear, feel, and measure** — not just process text.

```
PERCEIVE channel="visual" input=camera_feed
PERCEIVE channel="auditory" input=microphone
PERCEIVE channel="numerical" input=sensor_data
PERCEIVE channel="temporal" input=event_timestamps

# Cross-modal binding: "things that happen together belong together"
BIND modalities=["visual", "auditory"] window_ms=2000
```

### 6. Cognitive Debugging

Debug **thoughts**, not variables. See **why** a decision was made.

```
DEBUG mode="trace"
  INSPECT "thought_stream"     # What is it thinking?
  INSPECT "uncertainty_map"    # What doesn't it know?
  INSPECT "attention_profile"  # Where is it looking?
  WHY_DECISION index=-1        # Why did it decide that?
  WHAT_IF inputs={price: 200}  # What would have changed?
```

### 7. Knowledge Graph & Causal Reasoning

Noeon maintains a **structured world model** and can reason about **causality**.

```
KNOW "rain" type="weather"
KNOW "flood" type="disaster"
CAUSE "rain" -> "flood" confidence=0.6

WHY "flood"                    # Traces causal chains
WHAT_IF "rain" value="none"    # Counterfactual reasoning
CONNECT "rain" to="late_arrival"  # Find hidden connections
ACTIVATE "rain" depth=3        # Spreading activation (associative thinking)
```

---

## Architecture: Mapping Brain to Code

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
| fMRI Scanner | `CognitiveDebugger` | Mind inspection & tracing |
| Temporal + Parietal | `KnowledgeGraph` | World model & causal inference |
| Default Mode Network | `ConsciousnessStream` | Continuous background thinking |
| Somatic Markers | `UncertainValue` | Confidence-weighted decisions |

---

## Quick Start

```bash
# Clone
git clone https://github.com/PoCP-Protocol/Noeon.AI.git
cd Noeon.AI && npm install

# Parse a cognitive contract
npm run parse -- examples/cognitive_supermind.ael

# Compile to executable cognitive plan
npm run cognitive -- examples/cognitive_supermind.ael

# Run all tests (321 tests)
npm run test:all
```

---

## Language Primitives (50+ Keywords)

### Perception & Attention
| Keyword | Function |
|---|---|
| `PERCEIVE` | Open a perceptual channel |
| `ATTEND` | Shift attention focus |
| `SENSE` | Receive input on a channel |
| `LOOK` / `LISTEN` / `READ` | Modality-specific perception |
| `PERCEIVE_ALL` | Parallel multi-modal sensing |

### Reasoning & Decision
| Keyword | Function |
|---|---|
| `INTUIT` | System 1 fast pattern matching |
| `REASON` | System 2 deep logical analysis |
| `PREDICT` | Generate predictions with confidence |
| `DECIDE` | Make emotion-weighted decisions |
| `DEBATE` | Internal dialectic reasoning |
| `COMPETE` | Hypothesis competition (winner-takes-all) |

### Memory & Knowledge
| Keyword | Function |
|---|---|
| `KNOW` | Add entity to knowledge graph |
| `RELATE` / `CAUSE` | Create relationships |
| `RECALL` | Retrieve from memory |
| `CONSOLIDATE` | Transfer to long-term storage |
| `ACTIVATE` | Spreading activation |
| `EMBED` | Vector embedding for semantic memory |
| `PRIME` | Pre-activate related concepts |

### Metacognition & Debugging
| Keyword | Function |
|---|---|
| `REFLECT` | Self-evaluate reasoning quality |
| `DEBUG` | Inspect thought processes |
| `WHY` | Explain causal chains |
| `WHAT_IF` | Counterfactual reasoning |
| `MONITOR` | Track cognitive metrics |

### Evolution & Self-Modification
| Keyword | Function |
|---|---|
| `EVOLVE` | Trigger grammar/strategy evolution |
| `DEFINE` | Create new keywords at runtime |
| `MUTATE` | Random exploration |
| `SYNTHESIZE` | Generate new rules from patterns |
| `FREEZE` | Protect proven rules |

### Flow Control (Brain-Native)
| Keyword | Function |
|---|---|
| `STREAM` | Continuous consciousness loop |
| `THINK_UNTIL` | Loop until confidence threshold |
| `RUMINATE` | Iterative thinking |
| `FORK_THOUGHT` | Parallel cognitive threads |
| `GATE` | Attention gating |
| `WHEN_SALIENT` | Attention-weighted conditional |
| `ON_SURPRISE` | Prediction error handler |
| `DREAM` | Background consolidation |
| `HABITUATE` | Habit formation |
| `INHIBIT` | Pathway suppression |

### Social Cognition
| Keyword | Function |
|---|---|
| `SPAWN` | Create cognitive agent |
| `DELEGATE` | Assign task to best agent |
| `DEBATE_MULTI` | Multi-agent structured debate |
| `VOTE` | Democratic decision |
| `SHARE` | Knowledge sharing |
| `DISMISS` | Remove agent |

---

## Project Structure

```
src/
├── index.js                    # CLI entry point
├── parser.js                   # AEL language parser (extended)
├── cognitive-parser.js         # Cognitive primitive parser
├── cognitive-parser-ext.js     # Extended cognitive parser (v0.5)
├── cognitive-compiler.js       # Compiles to cognitive execution plans
├── compiler.js                 # Traditional compiler
├── validator.js                # Contract validator
├── explainer.js                # Natural language explainer
└── runtime/
    └── cognitive/
        ├── index.js                    # Module exports (41 classes)
        ├── cognitive-engine.js         # Main SuperBrain orchestrator
        ├── workspace.js                # Global Workspace (attention)
        ├── memory-system.js            # Episodic/Semantic/Procedural
        ├── dual-process.js             # System 1 + System 2
        ├── predictive-engine.js        # Prediction & free energy
        ├── metacognition.js            # Self-monitoring
        ├── llm-bridge.js               # LLM integration
        ├── semantic-memory.js          # Vector memory
        ├── social-brain.js             # Multi-agent collaboration
        ├── evolution-engine.js         # Self-modification
        ├── cognitive-flow.js           # Brain-native flow control
        ├── stream-of-consciousness.js  # Continuous thinking
        ├── meta-language.js            # Self-modifying syntax
        ├── multimodal-perception.js    # Multi-channel sensing
        ├── cognitive-debugger.js       # Mind inspector
        └── knowledge-graph.js          # Causal reasoning

examples/
├── cognitive_supermind.ael     # v0.5 SuperMind demo (all features)
├── cognitive_advanced.ael      # v0.4 advanced demo
├── cognitive_superbrain.ael    # SuperBrain cognitive contract
├── cognitive_minimal.ael       # Minimal cognitive loop
└── noeon_superbrain.ael        # Legacy contract (backward compatible)

tests/
├── cognitive-v05.test.js       # v0.5 test suite (113 tests)
├── cognitive-v04.test.js       # v0.4 test suite (138 tests)
├── cognitive.test.js           # Core cognitive tests (70 tests)
└── conformance/                # Protocol conformance tests

docs/
└── NOEON_COGNITIVE_WHITEPAPER.md  # Full language design whitepaper
```

---

## Test Results

```
Conformance Tests:     ✓ All passed
Cognitive v0.3 Tests:  70 passed, 0 failed
Cognitive v0.4 Tests:  138 passed, 0 failed
Cognitive v0.5 Tests:  113 passed, 0 failed
─────────────────────────────────────────────
Total:                 321+ tests, 0 failures
```

---

## Why Noeon Is a New Species

| Traditional Languages | Noeon |
|---|---|
| Execute instructions | Think thoughts |
| Variables hold values | Beliefs hold uncertain knowledge |
| if/else branching | Intuition vs. deep reasoning |
| Sequential execution | Continuous consciousness |
| Fixed syntax | Self-evolving grammar |
| Process text/numbers | Perceive the world multi-modally |
| Debug with breakpoints | Inspect thoughts and decisions |
| Store data in tables | Build causal world models |
| Single-threaded logic | Multi-agent social cognition |
| Static programs | Self-modifying cognitive entities |

---

## Theoretical Foundations

Noeon's cognitive architecture is grounded in established neuroscience:

1. **Global Workspace Theory** (Baars, 1988) — Consciousness as a shared broadcast medium
2. **Dual Process Theory** (Kahneman, 2011) — Fast intuition vs. slow deliberation
3. **Free Energy Principle** (Friston, 2010) — The brain as a prediction machine
4. **Somatic Marker Hypothesis** (Damasio, 1994) — Emotions guide rational decision
5. **Memory Consolidation** (Squire, 1992) — Hippocampal replay and long-term storage
6. **Metacognition** (Flavell, 1979) — Thinking about thinking
7. **Social Brain Hypothesis** (Dunbar, 1998) — Intelligence evolved for social cooperation
8. **Neuroplasticity** (Hebb, 1949) — "Neurons that fire together wire together"
9. **Predictive Processing** (Clark, 2013) — Perception as controlled hallucination
10. **Spreading Activation** (Collins & Loftus, 1975) — Associative memory retrieval

---

## Roadmap

- [x] v0.3 — Core cognitive architecture (workspace, dual-process, prediction, metacognition)
- [x] v0.4 — LLM integration, multi-agent, evolution, cognitive flow
- [x] v0.5 — Consciousness stream, knowledge graph, multi-modal perception, cognitive debugger
- [ ] v0.6 — Visual IDE with real-time brain activity visualization
- [ ] v0.7 — Distributed cognition (multi-brain federation)
- [ ] v0.8 — Production runtime with persistence & fault tolerance
- [ ] v1.0 — Complete AI-native programming language

---

## Philosophy

> "The limits of my language mean the limits of my world." — Wittgenstein

If our programming languages can only express *computation*, then our AI can only *compute*.

Noeon expresses **cognition** — perception, reasoning, emotion, memory, prediction, reflection, evolution.

This is not a tool for building AI. **This IS an AI, expressed as a language.**

---

## Noeon Positioning

Noeon is a distributed intelligence economy for the AI era.

- Free competition among agents.
- Verifiable cooperation across untrusted parties.
- Automatic value settlement by protocol rules.

**Tagline**: Let intelligence think freely, let value settle automatically, let order emerge spontaneously.

---

## License

MIT

## Contributing

This is an open experiment in creating a new form of intelligence. Contributions welcome.
