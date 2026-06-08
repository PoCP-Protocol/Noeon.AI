# Noeon Profile Fusion Specification v1.1

**Status:** Draft  
**Scope:** Cross-profile orchestration (Next + Liminal + General)

## Overview

Fusion lets autonomous Next programs optionally layer alignment observation and cognitive bridging without surrendering field autonomy. **v1.1** adds unified orchestration, fusion history, and triad/bidirectional detection.

## FUSE Block (Next v1.1+)

```next
FUSE liminal {
  mode: observe       # observe | soft | enforce
  resonance_floor: 0.55
}

FUSE general {
  mode: bridge        # bridge | run
}
```

| Mode | Behavior |
|------|----------|
| `observe` | Liminal resonance runs; never blocks Next |
| `soft` | Same as observe |
| `enforce` | Liminal gate may block (strict alignment) |
| `bridge` | Export PERCEIVE→REFLECT artifact only |
| `run` | Bridge + execute cognitive kernel with injected context |

## Sidecar Loading

For `program.next`, auto-loads `program.lim` if present:

```
examples/genesis.next
examples/genesis.lim   ← Liminal sidecar
```

Sidecar takes precedence over synthesized liminal beliefs.

## Synthesized Liminal

When no sidecar exists, field cells + dominant generate a liminal overlay for observation.

## CLI

```bash
noeon fuse examples/genesis.next
noeon fuse examples/genesis.next --fuse liminal,general --json
noeon fuse examples/agent_field.noeon
noeon fuse examples/agent_field.noeon --json
```

`.next` runs Next phase + forward fusion (Liminal + General bridge).  
`.noeon` runs reverse fusion preview (Next field + Liminal observe) without full cognitive execution.

## Fusion Graph

```bash
noeon fuse examples/agent_field.noeon --graph
```

API:

- `GET /api/fusion/graph?file=examples/agent_field.noeon`
- `POST /api/fusion/graph` with `{ "source": "...", "filename": "..." }`

Visual dashboard: `site/fusion.html`

## Unified Orchestrator (v1.1)

Single entry: `runUnifiedFusion(ast, options)` in `unified-fusion.js`.

| Mode | Detection |
|------|-----------|
| **Forward** | `.next` with `FUSE liminal` / `FUSE general` |
| **Reverse** | `.noeon` with `FUSE next` |
| **Bidirectional** | `.noeon` with both `FUSE next` + `FUSE liminal` (e.g. `agent_field.noeon`) |
| **Triad** | Single program fusing all three targets |

Runtime metadata: `run.fusionMeta { triad, bidirectional, plan }`.

## FUSE triad (v1.2)

Declarative sugar for full cross-profile loop on `.noeon`:

```noeon
FUSE triad {
  next: "genesis.next"
  liminal: observe
  general: bridge
  relay: true
  inject: [dominant, narrative, summary]
}
```

Expands to three FUSE blocks. **Cross-file orchestrator** runs:
1. Forward leg on `genesis.next` (Next → Liminal + General)
2. Triad-link coherence check
3. Reverse leg on hub `.noeon` (field inject + liminal observe)

CLI:

```bash
noeon triad examples/fusion_triad.noeon --graph --save
noeon triad examples/fusion_triad.noeon --run
```

API: `POST /api/fusion/triad`

Innovation: **coherence score** + **relay pulse** when dominant shifts or energy delta exceeds threshold.

## Fusion History

```bash
noeon fuse examples/agent_field.noeon --save
```

Stored at `artifacts/fusion/history.jsonl`.

API: `GET /api/fusion/history?limit=30`

## Graph CLI

```bash
noeon graph examples/agent_field.noeon --fusion --out fusion.mmd
```

## Runtime

```json
{
  "phases": ["next", "fusion", "cognitive"],
  "fusion": {
    "layers": ["liminal", "general"],
    "liminal": { "mode": "observe", "observe": true, "resonance": {} },
    "general": { "bridge": { "cycle": [] } }
  }
}
```

## Cross-Profile Map

| Direction | Mechanism |
|-----------|-----------|
| Next → General | `FUSE general { mode: bridge \| run }` on `.next` |
| General → Next | `FUSE next { file: path.next }` on `.noeon` |
| General → Liminal | `FUSE liminal { mode: observe \| enforce }` + optional `.lim` sidecar |
| Next ↔ Liminal | `FUSE liminal` + optional `.lim` sidecar |

## Files

- `src/runtime/fusion/profile-fusion.js`
- `src/runtime/fusion/general-next-fusion.js`
- `src/runtime/fusion/general-liminal-fusion.js`
- `src/runtime/fusion/fusion-preview.js`
- `src/runtime/fusion/unified-fusion.js`
- `src/runtime/fusion/fusion-triad.js`
- `src/runtime/fusion/liminal-field-bridge.js`
- `src/runtime/next/cognitive-bridge.js`
