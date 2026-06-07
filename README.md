# Noeon AI — Brain-Inspired Cognitive Programming Language

> **Let intelligence think like a human brain. Let code become a living mind.**

Noeon is the world's first **cognitive programming language** — a language that doesn't just describe tasks, but describes *how to think*. Inspired by neuroscience and cognitive psychology, Noeon maps human brain architecture directly into executable code.

## Vision

Traditional programming languages tell machines **what to do**. Noeon tells machines **how to think**.

| Traditional Languages | Noeon AI |
|---|---|
| Sequential execution | Predictive processing loops |
| Static logic | Dual-system reasoning (intuition + logic) |
| No memory model | Episodic/Semantic/Procedural memory |
| No self-awareness | Metacognitive monitoring |
| Fixed rules | Neuroplastic adaptation |

## Cognitive Architecture

Noeon's runtime implements a complete brain-inspired cognitive architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    METACOGNITION (ACC/PFC)                    │
│              Monitor · Reflect · Adapt · Regulate            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  SYSTEM 1 │    │  GLOBAL WORKSPACE │    │   SYSTEM 2   │  │
│  │  (Fast)   │◄──►│  (Consciousness) │◄──►│   (Slow)     │  │
│  │ Intuition │    │  Attention-gated  │    │  Reasoning   │  │
│  └──────────┘    └──────────────────┘    └──────────────┘  │
│                          ▲                                    │
│  ┌──────────┐           │            ┌──────────────────┐   │
│  │ EMOTIONS │           │            │ PREDICTIVE ENGINE │   │
│  │ Valence  │───────────┤            │ Predict→Perceive │   │
│  │ Arousal  │           │            │ Error→Update     │   │
│  └──────────┘           │            └──────────────────┘   │
│                          │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                    MEMORY SYSTEM                        │   │
│  │  Episodic (events) · Semantic (facts) · Procedural    │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install
npm install

# Parse a cognitive contract
npm run parse -- examples/cognitive_superbrain.ael

# Execute cognitive reasoning cycle
npm run cognitive -- examples/cognitive_superbrain.ael

# Run cognitive architecture tests (70 tests)
npm run cognitive:test

# Run full conformance suite
npm run conformance
```

## Cognitive Primitives

Noeon v0.3 introduces brain-native cognitive primitives:

### Motivation & Drive (Prefrontal Cortex)

```
DRIVE_CMD "maximize prediction accuracy" priority=high
```

What motivates the brain? Drives create persistent goals that influence all downstream processing.

### Global Workspace (Baars' GWT)

```
WORKSPACE "analysis" capacity=7 decay=time_based ttl=60
ATTEND source=data_feed filter=anomalies weight=0.9 decay=time_based
FOCUS target=critical_sector intensity=0.9 duration=sustained
```

Limited-capacity conscious workspace. Only the most relevant information enters awareness.

### Emotional Context (Amygdala + OFC)

```
EMOTION valence=0.3 arousal=0.6 tag=cautiously_optimistic influence=decision
```

Emotions bias decision thresholds — just like in the human brain. Negative valence + high arousal = more cautious decisions.

### Predictive Processing (Free Energy Principle)

```
PREDICT "market will rise 10%" confidence=0.7 model=trend_model
PERCEIVE source=market_api modality=text filter=earnings timeout_ms=5000
```

The brain predicts before it perceives. Prediction errors drive learning and model updates.

### Dual-System Reasoning (Kahneman)

```
INTUIT "Is sentiment bullish?" using=pattern_heuristic threshold=0.6
REASON strategy=abductive depth=5 breadth=3 context=workspace timeout_ms=15000
```

System 1 (fast intuition) runs first. If confidence is low, System 2 (deep reasoning) engages automatically.

Available reasoning strategies: `deductive`, `inductive`, `abductive`, `analogical`, `hybrid`

### Decision Making (Orbitofrontal Cortex)

```
DECIDE action=execute_trade threshold=0.75 mode=satisfice fallback=escalate valence_weight=0.3
```

Decisions integrate reasoning confidence + emotional valence. Supports satisficing and maximizing modes.

### Metacognition (ACC + PFC)

```
MONITOR metric=uncertainty threshold=0.5 action=alert window=10 continuous=true
REFLECT "prediction accuracy" depth=deep trigger=periodic
```

The brain watches itself think. Monitors track uncertainty, performance, and cognitive load.

### Memory & Learning (Hippocampus)

```
CONSOLIDATE from=workspace to=semantic strength=0.8 decay_rate=0.01
ADAPT rule=bullish_bias delta=0.05 signal=reward
```

Working memory consolidates to long-term storage. Rules strengthen or weaken based on outcomes (neuroplasticity).

## Neural Aliases

Noeon supports a rich vocabulary of brain-inspired aliases:

| Alias | Maps To | Brain Region |
|---|---|---|
| `IMPULSE` | `DRIVE_CMD` | Prefrontal Cortex |
| `SENSE` | `PERCEIVE` | Sensory Cortex |
| `FOCUS_ON` | `FOCUS` | Parietal Cortex |
| `FEEL` | `EMOTION` | Amygdala |
| `GUT` | `INTUIT` | Basal Ganglia |
| `THINK_DEEP` | `REASON` | Prefrontal Cortex |
| `FORESEE` | `PREDICT` | Predictive Cortex |
| `INTROSPECT` | `REFLECT` | ACC |
| `REMEMBER` | `CONSOLIDATE` | Hippocampus |
| `CHOOSE` | `DECIDE` | OFC |
| `ADAPT_RULE` | `ADAPT` | Synaptic Plasticity |

## Example: Minimal Cognitive Loop

```
VERSION "0.3-cognitive"
NETWORK "noeon-testnet"
TASK "decision_maker"

DRIVE_CMD "answer accurately" priority=high
WORKSPACE "query" capacity=5 decay=time_based ttl=30

PREDICT "user wants factual answer" confidence=0.8
INTUIT "most relevant answer?" using=pattern_match threshold=0.7
REASON strategy=deductive depth=3 breadth=2 context=workspace timeout_ms=5000

DECIDE action=respond threshold=0.6 mode=satisfice fallback=ask_clarification valence_weight=0.1
REFLECT "response quality" depth=shallow trigger=uncertainty
CONSOLIDATE from=workspace to=episodic strength=0.6 decay_rate=0.02
```

## Example: SuperBrain Market Analyst

See `examples/cognitive_superbrain.ael` for a full cognitive contract that demonstrates:
- Multi-drive motivation
- Emotional context influencing decisions
- Predictive processing with error tracking
- Dual-system reasoning (intuition + abductive logic)
- Metacognitive monitoring and self-reflection
- Neuroplastic rule adaptation

## Legacy Contract Support (v0.2)

Noeon v0.3 is fully backward compatible with v0.2 protocol contracts:

```
VERSION "0.2"
NETWORK "NoeonNet"
TASK "doc.extract"
BUDGET 50000 msat
DEADLINE 2026-12-31T00:00:00Z
VERIFY quorum=2/3 challenge=600 mode=auto
SOLVER_COLLATERAL 10000
VERIFIER_COLLATERAL 5000
ON_SUCCESS solver=70 verifier=20 protocol=10
ON_SLASH timeout=10 bad_proof=80 malicious=100
```

## Super Brain Extensions (v0.2)

Legacy cognition primitives remain supported:

1. `GOAL` / `CONSTRAINT` / `RISK` / `MEMORY` / `LEARN`
2. `PLAN` / `ACTION` / `COGNITION` / `SELF_CHECK`
3. `INFER` / `CRITIC` / `HYPOTHESIS` / `EVIDENCE`
4. `COUNTEREXAMPLE` / `TRACE` / `DEBATE` / `ARBITRATE` / `JUROR`

## CLI Commands

| Command | Description |
|---|---|
| `npm run parse -- <file>` | Parse and validate contract |
| `npm run compile -- <file> [output]` | Compile to protocol artifact |
| `npm run cognitive -- <file> [output]` | Execute cognitive reasoning cycle |
| `npm run explain -- <file>` | Natural language explanation |
| `npm run simulate -- <file> [feedback] [out] [state] [report] [audit]` | Run super-brain cycle |
| `npm run train -- <file> <batch> [out] [state] [convergence] [audit]` | Multi-round training |
| `npm run rollback -- <state> [steps]` | Roll back learning state |
| `npm run conformance` | Run conformance test suite |
| `npm run cognitive:test` | Run cognitive architecture tests |

## Project Structure

```
src/
├── index.js                    # CLI entry point
├── parser.js                   # Noeon language parser (v0.2 + v0.3 cognitive)
├── cognitive-parser.js         # Cognitive primitive parsers
├── cognitive-compiler.js       # Cognitive plan compiler & executor
├── validator.js                # Contract validator
├── compiler.js                 # Legacy protocol compiler
├── explainer.js                # Natural language explainer
└── runtime/
    ├── cognitive/              # ★ Brain-inspired cognitive runtime
    │   ├── index.js            # Module exports
    │   ├── cognitive-engine.js # SuperBrain orchestrator
    │   ├── workspace.js        # Global Workspace (Baars' GWT)
    │   ├── memory-system.js    # Episodic/Semantic/Procedural memory
    │   ├── dual-process.js     # System 1 + System 2 (Kahneman)
    │   ├── predictive-engine.js # Predictive processing (Friston FEP)
    │   └── metacognition.js    # Self-monitoring & adaptation
    ├── simulator.js            # Legacy super-brain cycle
    ├── trainer.js              # Training loop
    └── plugins/                # Plugin system

examples/
├── cognitive_superbrain.ael    # Full cognitive architecture demo
├── cognitive_minimal.ael       # Minimal cognitive loop
├── noeon_superbrain.ael        # Legacy super-brain contract
└── ...

tests/
├── cognitive.test.js           # Cognitive architecture tests (70 tests)
└── conformance/                # Protocol conformance suite
```

## Theoretical Foundations

Noeon's cognitive architecture is grounded in established neuroscience and cognitive science:

1. **Global Workspace Theory** (Baars, 1988) — Consciousness as a shared broadcast medium
2. **Dual Process Theory** (Kahneman, 2011) — Fast intuition vs. slow deliberation
3. **Free Energy Principle** (Friston, 2010) — The brain as a prediction machine
4. **Somatic Marker Hypothesis** (Damasio, 1994) — Emotions guide rational decision
5. **Memory Consolidation** (Squire, 1992) — Hippocampal replay and long-term storage
6. **Metacognition** (Flavell, 1979) — Thinking about thinking

## Noeon Positioning

Noeon is a distributed intelligence economy for the AI era.

- Free competition among agents.
- Verifiable cooperation across untrusted parties.
- Automatic value settlement by protocol rules.

**Tagline**: Let intelligence think freely, let value settle automatically, let order emerge spontaneously.

## Documentation

- Language design whitepaper: `docs/NOEON_COGNITIVE_WHITEPAPER.md`
- Governance brief (Chinese): `docs/NOEON_GOVERNANCE_BRIEF_CN.md`
- System development path: `docs/NOEON_SYSTEM_DEVELOPMENT_PATH_CN.md`
- Language system draft: `docs/NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md`
- Spec v0.3 draft: `docs/spec/NOEON_SPEC_v0.3.md`
- Conformance matrix: `docs/spec/CONFORMANCE_MATRIX_v0.3.md`

## License

MIT
