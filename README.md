# Noeon AI — Brain-Inspired Cognitive Programming Language

> **A new species of programming language that thinks like a human brain.**

Noeon is the world's first **cognitive programming language** — it doesn't just describe tasks, it describes *how to think*. Every construct maps directly to a mechanism in the human brain: attention, memory, reasoning, emotion, prediction, social cognition, and neuroplasticity.

**Version 0.4** introduces LLM integration, multi-agent collaboration, self-evolution, and brain-native flow control.

---

## Core Philosophy

| Traditional Programming | Noeon Cognitive Programming |
|---|---|
| `if/else` | `WHEN_SALIENT` (attention-weighted conditional) |
| `while` loop | `RUMINATE` (iterative thinking with confidence target) |
| `Promise.all` | `PERCEIVE_ALL` (parallel multi-modal perception) |
| `try/catch` | `ON_SURPRISE` (prediction error handler) |
| Function call | `DELEGATE` (assign to best cognitive agent) |
| Cache | `HABITUATE` (habit formation, System 1 fast path) |
| Background job | `DREAM` (offline consolidation) |
| Variable | `WORKSPACE` slot (attention-weighted, decaying) |
| Genetic algorithm | `EVOLVE` (self-modify rules at runtime) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NOEON SUPERBRAIN v0.4                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  DRIVE   │  │ WORKSPACE│  │ PREDICT  │  │ EMOTION  │   │
│  │(Motiva-  │  │(Global   │  │(Free     │  │(Somatic  │   │
│  │ tion)    │  │ Workspace│  │ Energy)  │  │ Marker)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DUAL PROCESS ENGINE                      │   │
│  │  ┌────────────────┐    ┌────────────────────────┐    │   │
│  │  │   SYSTEM 1     │    │      SYSTEM 2          │    │   │
│  │  │   (INTUIT)     │    │      (REASON)          │    │   │
│  │  │  Fast/Auto     │    │   Slow/Deliberate      │    │   │
│  │  │  Pattern Match │    │   Abductive/Deductive  │    │   │
│  │  └────────────────┘    └────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  MEMORY  │  │  SOCIAL  │  │ EVOLVE   │  │   LLM    │   │
│  │(Episodic │  │  BRAIN   │  │(Neuro-   │  │ BRIDGE   │   │
│  │ Semantic │  │(Multi-   │  │ plastic- │  │(Language │   │
│  │ Procedur)│  │ Agent)   │  │ ity)     │  │ Center)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              COGNITIVE FLOW CONTROL                   │   │
│  │  WHEN_SALIENT | RUMINATE | PERCEIVE_ALL | COMPETE    │   │
│  │  HABITUATE | ON_SURPRISE | DREAM | PRIME | INHIBIT   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              METACOGNITIVE MONITOR                    │   │
│  │  REFLECT | MONITOR | CONSOLIDATE | ADAPT             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# Install
npm install

# Parse a cognitive contract
npm run parse -- examples/cognitive_advanced.ael

# Run cognitive compilation (generates execution plan)
npm run cognitive -- examples/cognitive_advanced.ael

# Run all tests (208+ tests)
npm run test:all
```

---

## Language Reference

### Motivation & Attention

```
# What drives this system?
DRIVE_CMD "discover patterns in data" priority=high persistent=true

# What to attend to?
ATTEND target=anomalies intensity=0.9 duration=sustained

# Conscious workspace (limited capacity, like working memory)
WORKSPACE "analysis_lab" capacity=7 decay=time_based ttl=120
```

### Dual-System Reasoning (Kahneman)

```
# System 1: Fast intuition (basal ganglia)
INTUIT "Is this data pattern familiar?" using=pattern_match threshold=0.6

# System 2: Deep deliberate reasoning (prefrontal cortex)
REASON strategy=abductive depth=5 breadth=4 timeout_ms=15000
```

### Predictive Processing (Friston's Free Energy)

```
# Make predictions (brain constantly predicts)
PREDICT "user will request analysis" confidence=0.7 model=behavior_model

# Perceive and compare with prediction
PERCEIVE source=user_input modality=text filter=relevant
```

### Cognitive Flow Control (v0.4)

```
# Attention-weighted conditional (not just true/false, but HOW relevant)
WHEN_SALIENT "urgent_anomaly" threshold=0.7 relevance=0.9 urgency=0.8 then=investigate

# Iterative thinking (rumination with confidence target)
RUMINATE "what causes this pattern?" max_iterations=10 confidence_target=0.85

# Parallel multi-channel perception
PERCEIVE_ALL channels=visual,textual,numerical timeout=5000 merge=weighted

# Competitive hypotheses (winner takes all)
COMPETE "best explanation" candidates=h1,h2,h3 strategy=strongest

# Habit formation (cache frequent patterns)
HABITUATE "greeting_response" response=cached ttl=3600000

# Prediction error handler (brain's surprise response)
ON_SURPRISE threshold=0.8 action=investigate priority=high

# Background processing (like dreaming)
DREAM "reorganize knowledge" priority=medium delay=5000

# Semantic priming (pre-activate related concepts)
PRIME "machine_learning" associations=data,model,training strength=0.8

# Pathway suppression
INHIBIT pathway=distraction duration=5000
```

### Multi-Agent Collaboration — Social Brain (v0.4)

```
# Spawn specialized cognitive agents
SPAWN "analyst" specialty=data_analysis personality=methodical weight=1.2
SPAWN "theorist" specialty=hypothesis_generation personality=creative weight=1.0
SPAWN "critic" specialty=logical_validation personality=skeptical weight=1.1

# Delegate tasks to best agent
DELEGATE "analyze this dataset" specialty=data_analysis strategy=hybrid

# Structured multi-agent debate
DEBATE_MULTI "What approach is best?" rounds=3 protocol=socratic consensus_threshold=0.6

# Democratic decision
VOTE "Accept this conclusion?" quorum=0.6 protocol=meritocratic

# Share knowledge between agents
SHARE "key finding" from=analyst tags=insight,validated

# Remove agent when done
DISMISS "critic" reason=task_complete
```

### Self-Evolution — Neuroplasticity (v0.4)

```
# Trigger evolutionary cycle on strategies
EVOLVE target=reasoning_strategies generations=3 mutation_rate=0.15

# Create variation of a rule
MUTATE rule=hypothesis_generation type=parameter_shift intensity=0.3

# Generate new rule from learned patterns
SYNTHESIZE "improved_method" type=strategy from=patterns,elites

# Protect a proven rule from mutation
FREEZE rule=validated_methodology reason=proven_effective
```

### LLM Integration — Language Center (v0.4)

```
# Direct query to LLM
ASK "What patterns exist in this data?" model=default temperature=0.5

# Use specific model for deep reasoning
THINK_WITH "Analyze causal relationships" model=gpt-5-nano strategy=analytical depth=4

# Get vector embedding for semantic memory
EMBED "important concept" store_as=key_concept tags=core,validated
```

### Metacognition & Memory

```
# Self-reflection
REFLECT "Am I approaching this correctly?" depth=deep trigger=periodic

# Monitor reasoning quality
MONITOR metric=reasoning_quality threshold=0.6 action=adapt

# Consolidate to long-term memory
CONSOLIDATE from=workspace to=semantic strength=0.85

# Emotional context (biases decisions like somatic markers)
EMOTION valence=0.7 arousal=0.5 tag=confident influence=decision

# Adapt rules based on feedback
ADAPT rule=analysis_approach delta=0.1 signal=reward
```

---

## Brain-to-Code Mapping

| Brain Region | Function | Noeon Construct |
|---|---|---|
| Prefrontal Cortex | Planning, reasoning | `REASON`, `DECIDE` |
| Basal Ganglia | Habits, fast decisions | `INTUIT`, `HABITUATE` |
| Hippocampus | Memory consolidation | `CONSOLIDATE`, `REMEMBER` |
| Amygdala | Emotional valuation | `EMOTION`, `ON_SURPRISE` |
| Thalamus | Attention gating | `ATTEND`, `WORKSPACE` |
| Anterior Cingulate | Conflict monitoring | `MONITOR`, `REFLECT` |
| Mirror Neurons | Social cognition | `SPAWN`, `DEBATE_MULTI` |
| Broca's Area | Language processing | `ASK`, `THINK_WITH` |
| Temporal Cortex | Semantic memory | `EMBED`, `PRIME` |
| Cerebellum | Prediction | `PREDICT`, `FORESEE` |
| Dopamine System | Motivation/reward | `DRIVE_CMD`, `ADAPT` |
| DNA/Epigenetics | Self-modification | `EVOLVE`, `MUTATE`, `SYNTHESIZE` |

---

## Project Structure

```
src/
├── index.js                    # CLI entry point
├── parser.js                   # Main AEL parser (all primitives)
├── cognitive-parser.js         # Core cognitive primitive parsers
├── cognitive-parser-ext.js     # Extended v0.4 primitive parsers
├── cognitive-compiler.js       # Cognitive plan compiler
├── compiler.js                 # Legacy AEL compiler
├── validator.js                # Contract validator
├── explainer.js                # Natural language explainer
└── runtime/
    └── cognitive/
        ├── index.js            # Module exports (24 classes)
        ├── cognitive-engine.js # Unified SuperBrain orchestrator
        ├── workspace.js        # Global Workspace (Baars' GWT)
        ├── memory-system.js    # Episodic/Semantic/Procedural memory
        ├── dual-process.js     # System 1 + System 2 engine
        ├── predictive-engine.js# Free energy principle engine
        ├── metacognition.js    # Self-monitoring (ACC/PFC)
        ├── llm-bridge.js       # LLM integration layer
        ├── semantic-memory.js  # Vector-based associative memory
        ├── social-brain.js     # Multi-agent collaboration
        ├── evolution-engine.js # Self-modification & neuroplasticity
        └── cognitive-flow.js   # Brain-native flow control

examples/
├── cognitive_advanced.ael      # Full v0.4 demo (all features)
├── cognitive_superbrain.ael    # SuperBrain cognitive contract
├── cognitive_minimal.ael       # Minimal cognitive loop
└── noeon_superbrain.ael        # Legacy contract (backward compatible)

tests/
├── cognitive-v04.test.js       # v0.4 test suite (138 tests)
├── cognitive.test.js           # Core cognitive tests (70 tests)
└── conformance/                # Protocol conformance tests

docs/
└── NOEON_COGNITIVE_WHITEPAPER.md  # Full language design whitepaper
```

---

## Test Results

```
v0.4 Advanced Tests:    138 passed, 0 failed
Core Cognitive Tests:    70 passed, 0 failed
Conformance Tests:       All passed
─────────────────────────────────────────────
Total:                  208+ tests, 0 failures
```

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

---

## Roadmap

- **v0.5**: Real-time visualization dashboard (observe the brain thinking)
- **v0.6**: Persistent memory (cross-session learning)
- **v0.7**: Multi-brain federation (distributed cognitive networks)
- **v0.8**: Self-modifying syntax (language evolves its own grammar)
- **v1.0**: Production-ready SuperBrain runtime

---

## Noeon Positioning

Noeon is a distributed intelligence economy for the AI era.

- Free competition among agents.
- Verifiable cooperation across untrusted parties.
- Automatic value settlement by protocol rules.

**Tagline**: Let intelligence think freely, let value settle automatically, let order emerge spontaneously.

---

## Documentation

- Language design whitepaper: `docs/NOEON_COGNITIVE_WHITEPAPER.md`
- Governance brief (Chinese): `docs/NOEON_GOVERNANCE_BRIEF_CN.md`
- System development path: `docs/NOEON_SYSTEM_DEVELOPMENT_PATH_CN.md`
- Language system draft: `docs/NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md`
- Spec v0.3 draft: `docs/spec/NOEON_SPEC_v0.3.md`
- Conformance matrix: `docs/spec/CONFORMANCE_MATRIX_v0.3.md`

---

## License

MIT

---

> *"The brain is not a computer. It is a prediction machine that builds models of the world and acts on them. Noeon is the first programming language that works the same way."*
