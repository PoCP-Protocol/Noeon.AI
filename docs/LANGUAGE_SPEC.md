# Noeon AEL — Formal Language Specification v0.6

> **Noeon Autonomous Execution Language** — The world's first cognitive programming language.

---

## 1. Overview

Noeon AEL is a cognitive programming language that maps directly to human brain architecture. Every construct in the language corresponds to a neural or cognitive mechanism. Programs in Noeon do not "execute instructions" — they **think**.

### 1.1 Design Principles

1. **Cognitive Fidelity** — Language constructs mirror brain processes
2. **Uncertainty Native** — All values carry confidence and provenance
3. **Temporal Awareness** — The language understands past, present, and future
4. **Self-Reflective** — Programs can observe and modify their own reasoning
5. **Emergent Behavior** — Simple rules compose into complex intelligence

### 1.2 Execution Model

Unlike sequential execution (von Neumann) or reactive execution (event-driven), Noeon uses a **Stream of Consciousness** execution model:

```
┌─────────────────────────────────────────────────────┐
│                CONSCIOUSNESS LOOP                     │
│                                                       │
│  PERCEIVE → PREDICT → ATTEND → REASON → DECIDE      │
│      ↑                                    │          │
│      └────── REFLECT ← CONSOLIDATE ←─────┘          │
│                                                       │
│  [Continuous cycle, not sequential steps]             │
└─────────────────────────────────────────────────────┘
```

---

## 2. Type System

### 2.1 Cognitive Types

Every value in Noeon is a `CognitiveValue` with metadata:

| Type | Description | Neural Correlate | Key Properties |
|------|-------------|-----------------|----------------|
| `Belief` | A proposition held true | Prefrontal cortex | confidence, evidence, contradictions, coherence |
| `Uncertain` | Value with probability distribution | Bayesian brain | mean, variance, bounds, distribution |
| `Temporal` | Time-varying value | Hippocampus | history, trend, velocity, acceleration |
| `Emotion` | Affective state | Amygdala | valence, arousal, dominance, intensity |
| `Intention` | Goal-directed state | Anterior cingulate | priority, urgency, feasibility, progress |
| `Percept` | Sensory input | Sensory cortex | modality, novelty, attention_weight, features |
| `MemoryTrace` | Stored experience | Hippocampus | encoding_strength, accessibility, associations |

### 2.2 Universal Properties

All cognitive values carry:

```
{
  value: <any>           // The actual content
  confidence: 0.0-1.0    // How certain (decays over time)
  provenance: <string>   // Where this came from
  timestamp: <ms>        // When this was created/updated
  salience: 0.0-1.0      // How important/attention-worthy
  decay_rate: <float>    // How fast confidence fades
}
```

### 2.3 Type Compatibility Rules

| Operation | Accepts | Produces | Constraint |
|-----------|---------|----------|------------|
| PERCEIVE | * | Percept | — |
| PREDICT | Belief, Temporal, Uncertain | Uncertain | — |
| INTUIT | Percept, CognitiveValue | Belief | max_confidence=0.8 |
| REASON | Belief, Uncertain, Percept | Belief | min_confidence=0.3 |
| DECIDE | Belief, Uncertain | Intention | min_confidence=0.5 |
| REFLECT | * | Belief (meta) | — |
| CONSOLIDATE | CognitiveValue, Belief, Percept | MemoryTrace | — |
| FEEL | * | Emotion | — |

---

## 3. Core Primitives

### 3.1 Perception Primitives

#### PERCEIVE

**Semantics**: Acquire information from an external source and create a typed Percept.

```
PERCEIVE source=<source> modality=<modality> [filter=<filter>] [attention=<weight>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| source | string | yes | Data source identifier (web, file, sensor, api) |
| modality | enum | yes | textual, visual, auditory, numerical, temporal, proprioceptive |
| filter | string | no | Content filter expression |
| attention | float | no | Initial attention weight (0-1) |

**Input**: External world state
**Output**: `Percept { content, modality, novelty, features, attention_weight }`
**Side Effects**: May trigger network I/O; updates working memory
**Neural Correlate**: Primary sensory cortex → thalamic relay

---

#### ATTEND

**Semantics**: Focus cognitive resources on specific items in the workspace.

```
ATTEND focus=<target> [intensity=<level>] [duration=<cycles>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| focus | string | yes | What to attend to (topic, modality, or memory key) |
| intensity | float | no | Attention intensity 0-1 (default: 0.7) |
| duration | int | no | How many cycles to maintain focus |

**Input**: Workspace contents
**Output**: Filtered workspace (attended items have boosted salience)
**Side Effects**: Inhibits non-attended items; updates attention map
**Neural Correlate**: Prefrontal attention network → thalamic gating

---

### 3.2 Prediction Primitives

#### PREDICT

**Semantics**: Generate a prediction about future state with explicit uncertainty.

```
PREDICT "<prediction_text>" confidence=<float> [horizon=<timeframe>] [model=<type>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prediction | string | yes | The predicted outcome |
| confidence | float | yes | Prior confidence (0-1) |
| horizon | string | no | Time horizon (short, medium, long) |
| model | string | no | Prediction model (linear, bayesian, neural) |

**Input**: Current beliefs + temporal history
**Output**: `Uncertain { mean, variance, bounds, confidence }`
**Side Effects**: Creates prediction error signal for next PERCEIVE cycle
**Neural Correlate**: Predictive coding in cortical columns

**Execution Semantics**:
1. Retrieve relevant beliefs from workspace
2. Generate prediction with stated confidence
3. Register prediction for future error computation
4. On next PERCEIVE, compute prediction_error = |predicted - actual|
5. If error > threshold, trigger SURPRISE → boost attention

---

#### HYPOTHESIS

**Semantics**: Propose an explanatory hypothesis for observed phenomena.

```
HYPOTHESIS "<hypothesis_text>" prior=<float> [testable=<bool>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hypothesis | string | yes | The proposed explanation |
| prior | float | yes | Prior probability |
| testable | bool | no | Whether this can be empirically tested |

**Input**: Observations (Percepts)
**Output**: `Belief { proposition, confidence=prior, evidence=[] }`
**Side Effects**: Adds to hypothesis pool for abductive reasoning
**Neural Correlate**: Prefrontal hypothesis generation

---

### 3.3 Reasoning Primitives

#### INTUIT

**Semantics**: Fast, automatic pattern recognition (System 1 thinking).

```
INTUIT domain=<domain> [speed=fast] [explain=<bool>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| domain | string | yes | Domain of expertise for pattern matching |
| speed | enum | no | Always "fast" — this is System 1 |
| explain | bool | no | Whether to generate post-hoc explanation |

**Input**: Current percepts + long-term memory patterns
**Output**: `Belief { proposition, confidence ≤ 0.8, provenance="intuition" }`
**Side Effects**: None (fast path, no memory modification)
**Neural Correlate**: Basal ganglia pattern matching

**Constraints**:
- Maximum confidence is 0.8 (intuitions are never certain)
- Execution time must be < 100ms (simulated)
- Cannot access explicit reasoning chains

---

#### REASON

**Semantics**: Deliberate, effortful reasoning (System 2 thinking).

```
REASON strategy=<strategy> [depth=<int>] [breadth=<int>] [timeout=<ms>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| strategy | enum | yes | deductive, inductive, abductive, analogical, dialectical |
| depth | int | no | Maximum reasoning depth (default: 3) |
| breadth | int | no | Alternatives to consider per step (default: 2) |
| timeout | int | no | Maximum reasoning time in ms |

**Input**: Beliefs, Percepts, Hypotheses in workspace
**Output**: `Belief { proposition, confidence, reasoning_chain }`
**Side Effects**: Consumes cognitive resources; may trigger fatigue
**Neural Correlate**: Prefrontal cortex deliberation

**Strategy Semantics**:

| Strategy | Algorithm | Best For |
|----------|-----------|----------|
| deductive | Modus ponens chain | Certain premises → certain conclusions |
| inductive | Pattern generalization | Many observations → general rule |
| abductive | Best explanation search | Observation → most likely cause |
| analogical | Structure mapping | Known domain → unknown domain |
| dialectical | Thesis-antithesis-synthesis | Conflicting beliefs → integration |

---

#### DEBATE

**Semantics**: Internal dialectical process between competing hypotheses.

```
DEBATE positions=<int> [rounds=<int>] [convergence=<float>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| positions | int | yes | Number of competing positions |
| rounds | int | no | Maximum debate rounds (default: 3) |
| convergence | float | no | Stop when agreement exceeds this (default: 0.8) |

**Input**: Multiple beliefs with conflicting propositions
**Output**: `Belief { proposition=synthesis, confidence, reasoning_chain }`
**Side Effects**: May revise existing beliefs; generates rich trace
**Neural Correlate**: Prefrontal conflict monitoring + resolution

---

### 3.4 Decision Primitives

#### DECIDE

**Semantics**: Commit to an action based on current beliefs and emotions.

```
DECIDE action=<action> [threshold=<float>] [strategy=<strategy>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action | string | yes | The action to potentially take |
| threshold | float | no | Minimum confidence to act (default: 0.6) |
| strategy | enum | no | maximizing, satisficing, minimax (default: maximizing) |

**Input**: Beliefs + Emotions + Intentions
**Output**: `Intention { goal=action, priority, feasibility, status }`
**Side Effects**: May trigger external actions; updates intention stack
**Neural Correlate**: Orbitofrontal cortex + somatic markers

**Decision Rules**:
1. Gather all relevant beliefs above threshold
2. Apply emotional bias (somatic markers)
3. Evaluate feasibility
4. If confidence ≥ threshold: commit (status='active')
5. If confidence < threshold: defer (status='pending')

---

### 3.5 Memory Primitives

#### CONSOLIDATE

**Semantics**: Transfer information from working memory to long-term storage.

```
CONSOLIDATE from=<source> to=<target> [strength=<float>] [associations=<list>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | enum | yes | workspace, perception, reasoning |
| to | enum | yes | episodic, semantic, procedural |
| strength | float | no | Encoding strength (default: 0.5) |
| associations | list | no | Keys to associate with |

**Input**: Items in working memory
**Output**: `MemoryTrace { content, encoding_strength, memory_type, associations }`
**Side Effects**: Clears items from working memory; creates long-term trace
**Neural Correlate**: Hippocampal consolidation (sleep replay)

---

#### RECALL

**Semantics**: Retrieve information from long-term memory.

```
RECALL cue=<cue> [type=<memory_type>] [limit=<int>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| cue | string | yes | Retrieval cue (keyword, context, or association) |
| type | enum | no | episodic, semantic, procedural (default: all) |
| limit | int | no | Maximum items to retrieve (default: 5) |

**Input**: Retrieval cue
**Output**: Array of `MemoryTrace` sorted by accessibility
**Side Effects**: Strengthens retrieved memories (testing effect)
**Neural Correlate**: Hippocampal pattern completion

---

### 3.6 Metacognition Primitives

#### REFLECT

**Semantics**: Observe and evaluate own cognitive processes.

```
REFLECT "<reflection_prompt>" [depth=<level>] [target=<process>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | yes | What to reflect on |
| depth | enum | no | shallow, deep, recursive (default: deep) |
| target | string | no | Specific process to evaluate (reasoning, memory, attention) |

**Input**: Recent cognitive trace + current state
**Output**: `Belief { proposition=assessment, confidence, recommendations }`
**Side Effects**: May trigger strategy adjustments; updates metacognitive model
**Neural Correlate**: Anterior cingulate cortex + medial prefrontal

---

#### MONITOR

**Semantics**: Continuous metacognitive monitoring of cognitive performance.

```
MONITOR metric=<metric> [threshold=<float>] [action=<response>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| metric | enum | yes | confidence, coherence, load, fatigue, progress |
| threshold | float | no | Alert threshold |
| action | string | no | Response when threshold crossed |

**Input**: Ongoing cognitive state
**Output**: Monitoring report with alerts
**Side Effects**: May interrupt current processing; trigger strategy switch
**Neural Correlate**: Dorsal anterior cingulate error monitoring

---

### 3.7 Motivation Primitives

#### DRIVE

**Semantics**: Establish a persistent motivational state that biases all cognition.

```
DRIVE goal="<goal>" priority=<float> [type=<drive_type>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| goal | string | yes | The driving goal |
| priority | float | yes | Priority level (0-1) |
| type | enum | no | achievement, exploration, safety, social (default: achievement) |

**Input**: None (top-level directive)
**Output**: Persistent motivational context
**Side Effects**: Biases attention, reasoning, and decision toward goal
**Neural Correlate**: Dopaminergic reward system + ventral striatum

---

### 3.8 Evolution Primitives

#### EVOLVE

**Semantics**: Trigger self-modification of cognitive rules.

```
EVOLVE target=<what> [strategy=<how>] [generations=<int>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | yes | What to evolve (rules, strategies, weights, syntax) |
| strategy | enum | no | genetic, gradient, random, directed (default: genetic) |
| generations | int | no | Evolution cycles (default: 10) |

**Input**: Current rule set + performance history
**Output**: Modified rule set with fitness scores
**Side Effects**: Permanently modifies cognitive rules
**Neural Correlate**: Synaptic plasticity + neurogenesis

---

### 3.9 Social Primitives

#### CONSULT

**Semantics**: Query another cognitive agent for input.

```
CONSULT agent=<agent_id> query="<question>" [trust=<float>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agent | string | yes | Agent identifier |
| query | string | yes | Question to ask |
| trust | float | no | Trust level for this agent (0-1) |

**Input**: Question + context
**Output**: `Belief { proposition=response, confidence=trust*agent_confidence }`
**Side Effects**: Network communication; updates social model
**Neural Correlate**: Mirror neuron system + theory of mind

---

#### DEBATE_MULTI

**Semantics**: Multi-agent deliberation process.

```
DEBATE_MULTI agents=<list> topic="<topic>" [rounds=<int>] [consensus=<float>]
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agents | list | yes | Participating agent IDs |
| topic | string | yes | Topic of debate |
| rounds | int | no | Maximum rounds (default: 5) |
| consensus | float | no | Required agreement level (default: 0.7) |

**Input**: Topic + agent perspectives
**Output**: Consensus belief or majority position
**Side Effects**: Updates all participating agents' beliefs
**Neural Correlate**: Social cognition network

---

## 4. Control Flow

### 4.1 Cognitive Flow (non-traditional)

Noeon does NOT use if/else/while. Instead:

| Noeon Construct | Traditional Equivalent | Difference |
|----------------|----------------------|------------|
| `WHEN_CONFIDENT` | if (confidence > x) | Threshold is probabilistic |
| `THINK_UNTIL` | while (!converged) | Stops on convergence, not boolean |
| `ATTEND_PARALLEL` | Promise.all() | Attention-weighted parallel processing |
| `SURPRISE_INTERRUPT` | event listener | Triggered by prediction error |
| `FATIGUE_YIELD` | sleep/yield | Triggered by cognitive load |

### 4.2 WHEN_CONFIDENT

```
WHEN_CONFIDENT threshold=0.8 {
  // Execute only when workspace confidence exceeds threshold
  DECIDE action=commit
}
```

### 4.3 THINK_UNTIL

```
THINK_UNTIL convergence=0.9 max_cycles=10 {
  REASON strategy=deductive depth=2
  REFLECT depth=shallow
}
```

### 4.4 ATTEND_PARALLEL

```
ATTEND_PARALLEL {
  PERCEIVE source=market modality=numerical
  PERCEIVE source=news modality=textual
  PERCEIVE source=social modality=textual
}
// All percepts merged into workspace with attention weights
```

---

## 5. Module System

### 5.1 Module Definition

```javascript
defineModule('market_analyzer')
  .version('1.0.0')
  .description('Analyzes market data with uncertainty')
  .accepts('numerical', 'temporal')
  .produces('Belief', 'Uncertain')
  .can('pattern_recognition', 'prediction')
  .tags('finance', 'analysis')
  .does(async (input, ctx) => {
    // Module logic
    return { trend: 'up', confidence: 0.75 };
  })
  .build();
```

### 5.2 Module Composition

```javascript
composer.compose('full_analysis', [
  { module: 'quick_analyzer', role: 'perceive' },
  { module: 'deep_reasoner', role: 'reason' },
  { module: 'decision_maker', role: 'decide' },
  { module: 'self_reflector', role: 'reflect' }
]);
```

---

## 6. Standard Library

### 6.1 Reasoning

| Function | Signature | Description |
|----------|-----------|-------------|
| `Reasoning.deductive` | (premises[], rule) → conclusion | If premises true, conclusion must be true |
| `Reasoning.inductive` | (observations[], threshold) → generalization | Generalize from instances |
| `Reasoning.abductive` | (observation, hypotheses[]) → best_explanation | Inference to best explanation |
| `Reasoning.analogical` | (source, target, threshold) → transfer | Cross-domain knowledge transfer |
| `Reasoning.dialectical` | (thesis, antithesis) → synthesis | Resolve contradictions |

### 6.2 Decision

| Function | Signature | Description |
|----------|-----------|-------------|
| `Decision.multiCriteria` | (options[], weights) → ranked | Weighted multi-criteria |
| `Decision.satisfice` | (options[], thresholds) → first_good_enough | Satisficing |
| `Decision.expectedValue` | (options[]) → highest_EV | Probability × payoff |
| `Decision.minimax` | (options[]) → safest | Minimize worst case |

### 6.3 Learning

| Function | Signature | Description |
|----------|-----------|-------------|
| `Learning.reinforcementUpdate` | (Q, reward, α, γ, next_max) → Q' | Q-learning update |
| `Learning.hebbianUpdate` | (weight, pre, post, rate) → weight' | Associative learning |
| `Learning.bayesianUpdate` | (prior, likelihood, evidence) → posterior | Belief update |
| `Learning.spacedRepetition` | (ease, interval, quality) → schedule | Memory scheduling |

### 6.4 Attention

| Function | Signature | Description |
|----------|-----------|-------------|
| `Attention.saliencyMap` | (items[], weights) → ranked | Compute attention priorities |
| `Attention.noveltyScore` | (item, history) → score | How novel is this? |
| `Attention.changeDetection` | (series[], sensitivity) → changed? | Detect significant changes |
| `Attention.inhibitionOfReturn` | (items[], recent) → adjusted | Suppress recently attended |

### 6.5 Pattern

| Function | Signature | Description |
|----------|-----------|-------------|
| `Pattern.detectSequence` | (sequence[]) → patterns | Find sequence patterns |
| `Pattern.detectAnomaly` | (value, reference[]) → anomaly? | Z-score anomaly detection |
| `Pattern.similarity` | (a, b) → score | Similarity between items |

---

## 7. REPL Commands

| Command | Description | Returns |
|---------|-------------|---------|
| `.think <text>` | Process through cognitive pathway | Associations, novelty assessment |
| `.believe <text>` | Assert a belief | Belief confirmation |
| `.predict <text>` | Make a prediction | Uncertainty estimate |
| `.reason <text>` | Deep reasoning | Conclusion with chain |
| `.reflect` | Metacognitive evaluation | Self-assessment |
| `.memory` | Show working memory | 7±2 slot display |
| `.beliefs` | Show all beliefs | Belief inventory |
| `.workspace` | Full state | Complete workspace |
| `.trace` | Recent trace | Last 5 operations |
| `.module <name>` | Run module | Module output |
| `.pipeline <a→b>` | Run pipeline | Pipeline result |
| `.type <expr>` | Type information | Type description |
| `.evolve` | Self-evolution | Optimization suggestions |
| `.status` | Engine status | Health report |

---

## 8. Formal Grammar (EBNF)

```ebnf
program        ::= header cognitive_block
header         ::= version_decl task_decl goal_decl context_decl?
version_decl   ::= 'VERSION' STRING
task_decl      ::= 'TASK' STRING
goal_decl      ::= 'GOAL' STRING
context_decl   ::= 'CONTEXT' param_list

cognitive_block ::= (primitive_stmt)*
primitive_stmt  ::= drive_stmt | perceive_stmt | predict_stmt | intuit_stmt
                  | reason_stmt | decide_stmt | reflect_stmt | consolidate_stmt
                  | attend_stmt | hypothesis_stmt | debate_stmt | monitor_stmt
                  | evolve_stmt | consult_stmt | recall_stmt | feel_stmt
                  | flow_stmt

drive_stmt     ::= 'DRIVE' 'goal=' STRING 'priority=' FLOAT param_list?
perceive_stmt  ::= 'PERCEIVE' 'source=' IDENT 'modality=' IDENT param_list?
predict_stmt   ::= 'PREDICT' STRING 'confidence=' FLOAT param_list?
intuit_stmt    ::= 'INTUIT' 'domain=' IDENT param_list?
reason_stmt    ::= 'REASON' 'strategy=' IDENT param_list?
decide_stmt    ::= 'DECIDE' 'action=' IDENT param_list?
reflect_stmt   ::= 'REFLECT' STRING? param_list?
consolidate_stmt ::= 'CONSOLIDATE' 'from=' IDENT 'to=' IDENT param_list?
attend_stmt    ::= 'ATTEND' 'focus=' STRING param_list?
monitor_stmt   ::= 'MONITOR' 'metric=' IDENT param_list?
evolve_stmt    ::= 'EVOLVE' 'target=' IDENT param_list?
consult_stmt   ::= 'CONSULT' 'agent=' IDENT 'query=' STRING param_list?
recall_stmt    ::= 'RECALL' 'cue=' STRING param_list?

flow_stmt      ::= when_confident | think_until | attend_parallel
when_confident ::= 'WHEN_CONFIDENT' 'threshold=' FLOAT '{' cognitive_block '}'
think_until    ::= 'THINK_UNTIL' 'convergence=' FLOAT param_list? '{' cognitive_block '}'
attend_parallel::= 'ATTEND_PARALLEL' '{' perceive_stmt+ '}'

param_list     ::= (IDENT '=' value)*
value          ::= STRING | FLOAT | INT | BOOL | IDENT
STRING         ::= '"' [^"]* '"'
FLOAT          ::= [0-9]+ '.' [0-9]+
INT            ::= [0-9]+
BOOL           ::= 'true' | 'false'
IDENT          ::= [a-zA-Z_][a-zA-Z0-9_]*
```

---

## 9. Comparison with Traditional Languages

| Dimension | Traditional (Python/JS) | Noeon |
|-----------|------------------------|-------|
| Values | Deterministic | Uncertain (confidence + provenance) |
| Control flow | if/else/while | WHEN_CONFIDENT / THINK_UNTIL |
| Memory | Variables (eternal) | Working memory (7±2, decays) |
| Errors | Exceptions | Prediction errors (learning signal) |
| Modules | Import/export | Cognitive modules (carry memory) |
| Debugging | Breakpoints + variables | Thought traces + belief inspection |
| Optimization | Profiling | Self-evolution |
| Concurrency | Threads/async | Parallel attention streams |
| Types | Data types | Cognitive types (Belief, Emotion, Intention) |
| Execution | Sequential/event | Stream of consciousness |

---

## 10. Version History

| Version | Milestone |
|---------|-----------|
| 0.1 | Initial AEL contract language |
| 0.2 | Neural aliases and validation |
| 0.3 | Cognitive primitives (14 core) |
| 0.4 | LLM bridge, semantic memory, social brain, evolution |
| 0.5 | Stream of consciousness, knowledge graph, multimodal, meta-language |
| **0.6** | **Type system, stdlib, modules, REPL, formal spec** |

---

*This specification is a living document. As the language evolves, so does this spec.*
