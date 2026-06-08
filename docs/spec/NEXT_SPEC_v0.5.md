> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# NEXT Profile Specification v0.5

**Status:** Draft  
**Profile:** `next`  
**Version:** `0.5.0`

## Overview

v0.5 extends the autonomous living-field with three capabilities:

1. **Evolved source sync** — diff and merge base `.next` with hot-reload `.evolved` artifacts
2. **AUTOBOND → auto SPAWN** — strong auto-bonds spawn hybrid cells into the field
3. **Mycelium web graph** — live visualization via playground API and `site/mycelium.html`

## Evolved Sync

Hot-reload writes append-only patches to `artifacts/evolved/<file>.evolved`.

### CLI

```bash
noeon diff examples/genesis.next [--evolved-dir dir] [--json]
noeon merge examples/genesis.next [--strategy union|base-wins|evolved-wins] [--out file]
```

### Merge strategies

| Strategy | Behavior |
|----------|----------|
| `union` | Keep evolved; write conflict markers if same CELL name differs |
| `base-wins` | Output base source only |
| `evolved-wins` | Output evolved source only |

## AUTOBOND Spawn

```next
AUTOBOND {
  threshold: 0.38
  max: 8
  kind: resonates
  min_similarity: 0.08
  spawn: true                    # default true
  spawn_min_similarity: 0.18
  spawn_min_strength: 0.25
}
```

When `spawn: true`, auto-generated bonds above thresholds create hybrid cells:

- Name: `<a>__<b>_hybrid` (sorted lexicographically)
- Claim: `Hybrid(a, b): claim_a ⊗ claim_b`
- Energy: average of parents + bond strength bonus
- Tags: `hybrid`, `auto-spawn`

Hybrids are included in field results and hot-reload patches.

## Mycelium Web Graph

### API

`GET /api/mycelium/graph?file=examples/genesis.next&dir=artifacts/mycelium`

Returns:

```json
{
  "graph": { "nodes": [], "edges": [], "clusters": [] },
  "mermaid": "flowchart TD\n...",
  "nodeCount": 0,
  "edgeCount": 0
}
```

### Viewer

Open `http://localhost:5177/mycelium.html` after `noeon playground`.

Polls every 5 seconds when auto-refresh is enabled.

## Runtime Changes

- `src/runtime/next/evolved-sync.js` — diff/merge
- `src/runtime/next/auto-spawn.js` — hybrid generation
- `src/runtime/next/hot-reload.js` — spawn cells in patches
- `src/vm/next-phase.js` — exposes `spawns` in phase result
