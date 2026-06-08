# General Profile Specification v1.0

**Status:** Stable  
**Profile:** `general`  
**Version:** `1.0.0`

## Overview

General v1.0 stabilizes the AI-native agent surface with **reverse fusion** into Next living fields.

## AGENT Blocks (v1)

```noeon
PROFILE "general"
VERSION "1.0.0"

AGENT "ResearchAnalyst"
  GOAL "Complete industry research report"
  MEMORY type=episodic+semantic
  TOOLS ["web_search", "file_reader"]
  POLICY require_citation=true
  FLOW
    PERCEIVE source=market_data
    REASON strategy=comparative
    ACT action=write_report
    REFLECT
```

## Reverse FUSE Next

General programs can pull live field state **before** cognitive execution:

```noeon
FUSE next {
  file: "examples/genesis.next"
  mode: field
  inject: [dominant, narrative, summary]
}
```

| Inject key | Injected into `cognition.context` |
|------------|----------------------------------|
| `dominant` | `next_dominant`, `next_cells` |
| `narrative` | `next_narrative[]` |
| `summary` | `next_summary`, `next_bridge` |

Also adds `understandings[]` entry with `source: next_field`.

## Reverse FUSE Liminal

General agents can observe alignment **after** Next injection, without blocking cognition:

```noeon
FUSE liminal {
  mode: observe       # observe | enforce
  resonance_floor: 0.55
}
```

Sidecar: `agent_field.lim` auto-loads beside `agent_field.noeon`.

| Mode | Behavior |
|------|----------|
| `observe` | Resonance runs; injects `liminal_*` context; never blocks |
| `enforce` | May block if resonance floor fails |

Injected keys: `liminal_resonance`, `liminal_alignment`, `liminal_mode`, `liminal_alignments`.

Runtime: `run.liminalField`, `run.phases` includes `liminal-field`.

## Execution Pipeline

```
FUSE next → run Next phase → inject context → FUSE liminal → observe alignment → Cognitive kernel
```

Runtime: `run.nextField`, `run.phases` includes `next-field`.

## Example

`examples/agent_field.noeon` — FieldAnalyst agent fused with `genesis.next`.

## Cross-Profile Map

| Direction | Mechanism |
|-----------|-----------|
| Next → General | `FUSE general { mode: bridge }` on `.next` |
| General → Next | `FUSE next { file: ... }` on `.noeon` |
| Next ↔ Liminal | `FUSE liminal` + `.lim` sidecar |

See `FUSION_SPEC_v1.0.md` and `NEXT_SPEC_v1.0.md`.

## Files

- `src/runtime/fusion/general-next-fusion.js`
- `src/runtime/fusion/general-liminal-fusion.js`
- `src/runtime/fusion/fusion-preview.js`
- `src/grammar/general-parser.js`
- `src/parser.js` (AGENT-style FUSE)
