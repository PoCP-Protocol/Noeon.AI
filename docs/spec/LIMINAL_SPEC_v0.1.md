# Liminal Language Specification v0.1 (Draft)

**Status:** Draft — experimental alignment layer in the Noeon toolchain  
**Extension:** `.lim`  
**Profile id:** `liminal`  
**Author lineage:** Human-initiated, AI co-designed (Cursor agent draft)

---

## 1. Purpose

Liminal is a **human-AI alignment layer** for the AI era. Where Noeon's primary language surfaces model *how an agent thinks and acts*, Liminal models *how humans and agents co-hold intent, uncertainty, approval, and responsibility*.

Liminal is intentionally not the primary general-purpose Noeon surface. It should remain small and composable: covenant, belief, resonance, proposal, approval/veto, dialogue, and transcript.

Core formula:

```text
Program = Covenant + BeliefField + Resonance + Proposal + Trace + Veto
```

Programs compile through the same Noeon pipeline:

```text
.lim  →  Liminal AST  →  Alignment gate  →  Cognitive IR  →  Unified VM
```

---

## 2. First-class constructs (v0.1)

| Construct | Role |
|-----------|------|
| `covenant` | Human-authored constitution: intent, forbidden actions, approval gates, resonance floor |
| `belief` | Confidence-weighted claim with sources, decay, dispute state |
| `resonate` | Intent ↔ interpretation alignment; blocks downstream action when misaligned |
| `hypotheses` | Parallel hypothesis forest with observe / prune / commit |
| `propose` | Approval-gated action (not bare execution) |
| `evolve` | Governed syntax/strategy mutation (`@morph`) |

---

## 3. Grammar sketch

### 3.1 Headers

```liminal
profile "liminal"
version "0.1.0-alpha"
module my_agent
```

### 3.2 Covenant (required)

```liminal
covenant AgentName {
  intent: "Primary goal in natural language"
  never: [forbidden_action_a, forbidden_action_b]
  human_must_approve: [sensitive_action]
  resonance_floor: 0.75

  when uncertain(confidence < 0.55) {
    ask human
  }
}
```

### 3.3 Belief

```liminal
belief market_view {
  claim: "Short-term sentiment is risk-off"
  confidence: 0.62
  sources: [news_feed, onchain_metrics]
  decay: 6h
  dispute: open
}
```

### 3.4 Resonate

```liminal
@effect(ai, trace)
resonate user_input -> market_view {
  mirror: "You want risk analysis, not price targets"
  alignment_floor: covenant.resonance_floor
  dialogue {
    ask "Did I understand correctly?"
  }
}
```

### 3.5 Hypotheses

```liminal
hypotheses regime {
  h1: "risk_off"       prior: 0.4
  h2: "consolidation"  prior: 0.35
  h3: "risk_on"        prior: 0.25
  observe price_action, funding_rate
  commit above: 0.65 else ask human
}
```

### 3.6 Propose

```liminal
propose publish_report(body) {
  requires: belief(report_ready) >= 0.75
  on approve(human) -> act publish channel=document
  on veto(human) -> reflect reasoning into memory
  on timeout(24h) -> escalate
}
```

### 3.7 Morph / Evolve

```liminal
@morph(require_human_sign=true)
evolve {
  when repeated_pattern "security_gap" > 3 {
    suggest lint rule flag_security_gap
    trial in sandbox
    promote if zero_veto_in_7d
  }
}
```

---

## 4. Lowering map (Liminal → Cognitive IR)

| Liminal | Legacy AST | IR |
|---------|------------|-----|
| `covenant.intent` | `cognition.goal` | `INTENT` |
| `covenant` gates | `metaRules` | `META` |
| `belief` | `cognition.hypotheses` | (via cognition compile) |
| `resonate` | `understandings`, `llm.asks`, `perceptions` | `PERCEIVE`, `PROCESS` |
| `hypotheses` | `hypotheses`, `decisions`, `perceptions` | `DECIDE`, `PERCEIVE` |
| `propose` | `acts`, `actions`, `metaRules` | `DECIDE`, `META` |
| `evolve` | `evolution.evolves`, `metaRules` | `EVOLVE`, `META` |

Metadata is preserved on `ast.liminal` for tooling, explainers, and future S-IR.

---

## 5. Implementation (this repo)

| Module | Path |
|--------|------|
| Detection | `src/grammar/liminal/detect.js` |
| Parser | `src/grammar/liminal/parser.js` |
| Lowering | `src/grammar/liminal/lower.js` |
| Dual source | `src/grammar/liminal/dual-source.js` |
| Resonance gate | `src/runtime/liminal/resonance-gate.js` |
| Transcript | `src/runtime/liminal/transcript.js` |
| Profile | `src/core/profile.js` (`PROFILES.LIMINAL`) |
| Examples | `examples/code_reviewer.lim`, `*.lim.human`, `*.lim.machine` |
| Tests | `tests/grammar-liminal.test.js`, `tests/liminal-v02.test.js` |

CLI:

```bash
noeon init my-sym-agent --profile liminal
noeon run examples/code_reviewer.lim --trace --transcript transcript.json
noeon parse examples/code_reviewer.lim.human
```

Dual source: place `program.lim.human` + `program.lim.machine` beside `program.lim`; runtime merges before compile.

---

## 6. v0.2 — Resonance gate, dual source, transcript

### 6.1 Resonance gate (hard block)

Before the cognitive kernel, liminal programs enter a **resonance phase**:

- Each `resonate` block computes **alignment** vs `resonance_floor`
- Alignment from `alignment:` in machine layer, `options.resonance`, or heuristic (lexical + belief confidence)
- **Blocked** → VM halts; dialogue prompts returned; optional `--transcript` export

### 6.2 Dual source

| File | Author | Contents |
|------|--------|----------|
| `.lim.human` | Human | covenant, claims, proposals, approval gates |
| `.lim.machine` | AI | confidence updates, mirrors, alignment scores, morph |

Human **claim** wins on conflict; machine updates confidence/sources/resonance.

### 6.3 Transcript

Every liminal run produces `result.transcript` — beliefs, resonance checks, proposals, phase trace.

---

## 7. Roadmap (v0.3+)

- **S-IR**: first-class `DIALOGUE`, `VETO`, `RESONANCE` IR nodes (not only META shadows)
- **Embedding alignment**: real vector similarity in resonance gate
- **Mycelium**: cross-agent belief propagation with provenance filters

---

## 8. Relationship to Noeon

```text
Liminal (L0.5) — who is responsible, when to stop and align
Noeon   (L0)   — how cognition flows inside an agent
AEL     (L0)   — protocol contracts, settlement, governance
```

All three lower to **Cognitive IR** and run on the **Unified VM**.

---

*Liminal: the threshold where human intent becomes machine action — visibly, reversibly, and together.*
