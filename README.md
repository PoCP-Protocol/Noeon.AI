# Noeon AI — The Cognitive Programming Language

> **The world's first programming language that thinks like a human brain.**

[![Version](https://img.shields.io/badge/version-0.6.0--genesis-blue)]()
[![Tests](https://img.shields.io/badge/tests-472%2B%20passed-green)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## What Is Noeon?

Noeon is not a framework, not a library, not an agent toolkit. It is a **new species** — a programming language where every construct maps to a neural mechanism, every value carries uncertainty, and programs don't execute instructions — they **think**.

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

## Core Competitive Advantages

These are capabilities that **no other programming language has**:

### 1. Formal Cognitive Type System

Every value in Noeon is a `CognitiveValue` — it carries confidence, provenance, time, and salience.

```javascript
const { belief, uncertain, temporal, emotion, intention } = require('./src/runtime/cognitive/type-system');

// A belief with confidence that can be supported or contradicted
const b = belief('AI will transform education', 0.8);
b.support('Study shows 30% improvement');   // Strengthens
b.contradict('Some schools report no change'); // Weakens
console.log(b.coherence);  // How well-supported?

// An uncertain value with Bayesian updates
const price = uncertain(100, 25);  // mean=100, variance=25
price.observe(102, 10);  // Update with new evidence
console.log(price.probAbove(105));  // Probability of being > 105

// A temporal value that tracks change over time
const metric = temporal(0);
metric.update(1); metric.update(3); metric.update(6);
console.log(metric.trend);       // 'increasing'
console.log(metric.predict(10)); // Extrapolate 10 steps ahead

// An emotion that biases decisions
const excitement = emotion('excited', 0.8, 0.9);
console.log(excitement.riskModifier);  // > 1.0 (increases risk tolerance)
```

### 2. Stream of Consciousness (vs. Sequential Execution)

Traditional programs execute line by line. Noeon programs **think continuously**.

```
STREAM mode="continuous" cycle_ms=200
  ON surprise > 0.7 DO REASON strategy="deep"
  ON confidence < 0.4 DO SEEK "clarification"
  ON idle > 10 DO CONSOLIDATE memories
```

### 3. Uncertainty-Native Values

Every value carries a **confidence distribution**. No more pretending the world is certain.

### 4. Self-Modifying Syntax

The language can **invent new grammar** at runtime based on usage patterns.

```
DEFINE "MARKET_SCAN" as
  PERCEIVE channel="numerical" sensitivity=0.9
  INTUIT "trend?" using=statistical
  PREDICT horizon="1d"
  DECIDE threshold=0.7

MARKET_SCAN  # Now a first-class keyword
```

### 5. Knowledge Graph & Causal Reasoning

Noeon maintains a **structured world model** and can reason about **causality**.

```
KNOW "rain" type="weather"
CAUSE "rain" -> "flood" confidence=0.6
WHY "flood"                    # Traces causal chains
WHAT_IF "rain" value="none"    # Counterfactual reasoning
```

### 6. Cognitive Debugging

Debug **thoughts**, not variables. See **why** a decision was made.

### 7. Interactive REPL

Think in real-time with an interactive cognitive environment.

```bash
npm run repl

noeon> .believe "AI will transform education" confidence=0.8
noeon> .reason Is AI better than traditional methods?
noeon> .reflect
noeon> .evolve
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/PoCP-Protocol/Noeon.AI.git
cd Noeon.AI && npm install

# Interactive REPL — think in real-time
npm run repl

# Parse a cognitive contract
npm run cognitive -- examples/cognitive_superbrain.ael

# Run all tests (472+)
npm run test:all
```

---

## Architecture: 6-Layer Language Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 6: REPL & Developer Experience                            │
│    Interactive cognitive environment, thought traces              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Standard Library                                       │
│    Reasoning, Decision, Learning, Attention, Pattern, Probability│
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Module System                                          │
│    CognitiveModule, Registry, Composer, Pipeline, Loader         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Type System                                            │
│    Belief, Uncertain, Temporal, Emotion, Intention, Percept      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Cognitive Runtime (20 modules)                         │
│    Workspace, Memory, DualProcess, Prediction, Metacognition,    │
│    LLM Bridge, Social Brain, Evolution, Knowledge Graph,         │
│    Consciousness Stream, Meta-Language, Multimodal Perception    │
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

---

## Standard Library

Built-in cognitive algorithms — the "batteries included" of thinking.

```javascript
const { Reasoning, Decision, Learning, Attention, Pattern, Probability } = require('./src/stdlib');

// Deductive reasoning
Reasoning.deductive(premises, 'modus_ponens');

// Abductive: Inference to best explanation
Reasoning.abductive(observation, hypotheses);

// Multi-criteria decision making
Decision.multiCriteria(options, weights);

// Bayesian belief update
Learning.bayesianUpdate(prior, likelihood, evidence);

// Anomaly detection
Pattern.detectAnomaly(value, reference_distribution);
```

---

## Module System

Define, compose, and reuse cognitive modules.

```javascript
const { defineModule, ModuleComposer } = require('./src/runtime/cognitive/module-system');

const analyzer = defineModule('market_analyzer')
  .version('1.0.0')
  .accepts('numerical', 'temporal')
  .produces('Belief', 'Uncertain')
  .can('pattern_recognition', 'prediction')
  .does(async (input) => ({ trend: 'bullish', confidence: 0.75 }))
  .build();

// Compose into pipelines
const pipeline = composer.compose('full_analysis', [
  { module: 'market_analyzer', role: 'perceive' },
  { module: 'deep_reasoner', role: 'reason' },
  { module: 'decision_maker', role: 'decide' }
]);
```

---

## Language Primitives (50+ Keywords)

### Perception & Attention
| Keyword | Function |
|---|---|
| `PERCEIVE` | Open a perceptual channel |
| `ATTEND` | Shift attention focus |
| `SENSE` / `LOOK` / `LISTEN` / `READ` | Modality-specific perception |
| `PERCEIVE_ALL` | Parallel multi-modal sensing |

### Reasoning & Decision
| Keyword | Function |
|---|---|
| `INTUIT` | System 1 fast pattern matching |
| `REASON` | System 2 deep logical analysis |
| `PREDICT` | Generate predictions with confidence |
| `DECIDE` | Make emotion-weighted decisions |
| `DEBATE` | Internal dialectic reasoning |
| `HYPOTHESIS` | Propose explanatory hypothesis |

### Memory & Knowledge
| Keyword | Function |
|---|---|
| `KNOW` / `RELATE` / `CAUSE` | Knowledge graph operations |
| `RECALL` | Retrieve from memory |
| `CONSOLIDATE` | Transfer to long-term storage |
| `ACTIVATE` | Spreading activation |
| `EMBED` | Vector embedding |

### Metacognition & Evolution
| Keyword | Function |
|---|---|
| `REFLECT` | Self-evaluate reasoning quality |
| `MONITOR` | Track cognitive metrics |
| `EVOLVE` | Trigger grammar/strategy evolution |
| `DEFINE` | Create new keywords at runtime |
| `MUTATE` / `SYNTHESIZE` | Evolutionary operations |

### Flow Control (Brain-Native)
| Keyword | Function |
|---|---|
| `STREAM` | Continuous consciousness loop |
| `THINK_UNTIL` | Loop until confidence threshold |
| `WHEN_CONFIDENT` | Confidence-gated execution |
| `ATTEND_PARALLEL` | Parallel cognitive threads |
| `ON_SURPRISE` | Prediction error handler |

### Social Cognition
| Keyword | Function |
|---|---|
| `CONSULT` | Query another cognitive agent |
| `DEBATE_MULTI` | Multi-agent structured debate |
| `SPAWN` / `DELEGATE` / `VOTE` | Agent management |

---

## Project Stats

| Metric | Value |
|--------|-------|
| Total source code | ~20,000 lines |
| Cognitive primitives | 50+ |
| Runtime modules | 20 |
| Formal cognitive types | 7 (Belief, Uncertain, Temporal, Emotion, Intention, Percept, MemoryTrace) |
| Standard library algorithms | 25+ |
| Tests | 472+ (all passing) |
| Versions | v0.1 → v0.6 |

---

## Test Results

```
Conformance Tests:     ✓ All passed
Cognitive v0.3 Tests:  70 passed, 0 failed
Cognitive v0.4 Tests:  138 passed, 0 failed
Cognitive v0.5 Tests:  113 passed, 0 failed
Cognitive v0.6 Tests:  151 passed, 0 failed
─────────────────────────────────────────────
Total:                 472+ tests, 0 failures
```

---

## Documentation

- [Language Specification](docs/LANGUAGE_SPEC.md) — Formal semantics of every primitive
- [Cognitive Whitepaper](docs/NOEON_COGNITIVE_WHITEPAPER.md) — Design philosophy and neuroscience basis

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

## Roadmap

- [x] v0.1-0.2: AEL contract language foundation
- [x] v0.3: Cognitive primitives (14 core)
- [x] v0.4: LLM integration, semantic memory, social brain, evolution
- [x] v0.5: Consciousness stream, knowledge graph, multimodal, meta-language
- [x] **v0.6: Type system, stdlib, modules, REPL, formal spec (472+ tests)**
- [ ] v0.7: Web Playground & VS Code extension
- [ ] v0.8: Persistent memory & distributed cognition
- [ ] v0.9: Production runtime with error recovery
- [ ] v1.0: Complete AI-native programming language

---

## Philosophy

> "The limits of my language mean the limits of my world." — Wittgenstein

If our programming languages can only express *computation*, then our AI can only *compute*.

Noeon expresses **cognition** — perception, reasoning, emotion, memory, prediction, reflection, evolution.

This is not a tool for building AI. **This IS an AI, expressed as a language.**

---

## Positioning

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
