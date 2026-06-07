# NEXT Profile Specification v0.6

**Status:** Draft  
**Profile:** `next`  
**Version:** `0.6.0`

## Overview

v0.6 adds collaborative evolution semantics and cross-process field awareness:

1. **Three-way evolved merge** — reconcile base, hot-reload (ours), and manual branch (theirs)
2. **Hybrid DREAM** — dream branches scoped to auto-spawn hybrid cells and their parents
3. **Mycelium event bus** — JSONL pub/sub for cluster activity across runs and processes

## Three-Way Merge

When base, evolved, and a third branch (e.g. human-edited `.merged`) diverge:

```bash
noeon merge examples/genesis.next --three-way --theirs path/to/theirs.next [--strategy union]
```

Output defaults to `artifacts/evolved/<file>.evolved.3way`.

Conflict markers use three sections: `base`, `ours`, `theirs`.

## Hybrid DREAM

Explicit hybrid-scoped dreams:

```next
DREAM hybrid_lineage {
  on: hybrid
  branches: 4
  depth: 2
  merge_by: energy
}
```

When `AUTOBOND spawn: true` produces hybrid cells, the field engine also runs an implicit `hybrid_auto` dream unless disabled.

Hybrid dreams perturb only the subgraph of hybrid cells + their `parents`.

Runtime exposes `field.hybridDreams` and `run.next.hybridDreams`.

## Mycelium Event Bus

Events append to `artifacts/mycelium/events/<cluster>.jsonl`.

| Event type | Trigger |
|------------|---------|
| `cells.published` | `publishCells()` |
| `field.dominant` | Next phase after publish |

### CLI

```bash
noeon mycelium events dream_cluster --limit 20 [--json]
noeon mycelium status dream_cluster
```

### API

`GET /api/mycelium/events?cluster=dream_cluster&since=<iso>&limit=30`

The Mycelium web viewer (`/mycelium.html`) polls graph + events every 5s.

## Files

- `src/runtime/next/evolved-three-way.js`
- `src/runtime/next/hybrid-dream.js`
- `src/runtime/next/mycelium-bus.js`
