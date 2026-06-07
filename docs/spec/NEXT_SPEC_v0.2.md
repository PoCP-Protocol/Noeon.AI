# Noeon Next Language Specification v0.2

**Profile:** `next`  
**Extensions:** `.next`, `.noeon` (with `profile "next"`)  
**Philosophy:** Programs as **living fields** — they ingest, compete, dream, fork, and crystallize. No human-in-the-loop required.

---

## Core formula

```text
Program = Field + Cells + Weave + Dream + Echo + Flux
```

| Construct | Meaning |
|-----------|---------|
| `FIELD` | Information ingress — what the program breathes in |
| `CELL` | Living hypothesis — energy, claim, conditional emit/split/merge |
| `WEAVE` | Competitive synthesis — pattern-matched cells into narrative |
| `DREAM` | Parallel alternate futures — branches merged by coherence |
| `SPAWN` | Fork cognitive threads inheriting cell patterns |
| `ECHO` | Persist run residue into memory |
| `FLUX` | Syntax/strategy mutation when friction exceeds threshold |

v0.1 constructs (`MODEL`, `STRATEGY`, `GUARANTEE`, `ACT`, `REFLECT`, `EVOLVE`) remain for world-model programs.

---

## Example

See `examples/genesis.next`:

```next
profile "next"
program "genesis"

GOAL "Let narratives emerge from competing hypotheses"

FIELD signals {
  ingest: [web, code, memory, latent]
  decay: 1h
}

CELL hypothesis_risk_off {
  energy: 0.42
  claim: "Markets entering risk-off"
  when energy > 0.6 { emit narrative.draft }
  when energy < 0.15 { split hypothesis_soft, hypothesis_crash }
}

WEAVE hypothesis_* INTO narrative { strategy: competitive max: 8 }

DREAM alternate_futures { branches: 5 depth: 3 merge_by: coherence }

FLUX syntax {
  when friction("observe reason decide") > 0.8 {
    crystallize macro cycle(threshold)
  }
}
```

---

## Runtime

```text
Parse → Lower → Next Phase (field engine) → Cognitive IR → Unified VM
```

The **field engine** (`src/runtime/next/field-engine.js`):

1. Ticks cell energy from ingested signals  
2. Fires `when` rules → emit / split / merge  
3. Weaves winners by pattern  
4. Dreams parallel branches  
5. Crystallizes flux when friction triggers  

Guarantees (optional) only block when explicitly declared and violated.

---

## CLI

```bash
noeon run examples/genesis.next
noeon parse examples/genesis.next
node tests/next-profile-v02.test.js
```

---

*Next: the language that creates itself while it runs.*
