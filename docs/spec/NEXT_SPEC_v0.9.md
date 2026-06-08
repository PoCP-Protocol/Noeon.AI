> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# NEXT Profile Specification v0.9

**Status:** Draft  
**Profile:** `next`  
**Version:** `0.9.0`

## Overview

v0.9 completes the memory lifecycle — recall, consolidation, and declared spawn execution:

1. **Memory recall** — episodic/semantic memory influences signals and cell boosts
2. **Semantic consolidation** — episodic echoes compress into patterns
3. **Declared SPAWN execution** — `SPAWN` blocks become runtime cells after WEAVE
4. **Lineage tracking** — hybrid/auto/declared spawns recorded in field memory
5. **Narrative bus** — WEAVE narrative published to mycelium

## Memory Recall

```next
FIELD signals {
  recall: true
  recall_depth: 4
  consolidate_after: 3
}
```

On run start (after field memory restore):

- Recent episodic dominants → extra **signals**
- Matching cells receive **energy boosts**
- Semantic patterns add weighted recall

Runtime: `field.recall`, `run.next.fieldMemory.recall`

## Semantic Consolidation

When episodic echo count ≥ `consolidate_after`, episodic snapshots consolidate into:

```json
{
  "semantic": {
    "patterns": [{ "pattern": "hypothesis_risk_off", "kind": "dominant", "weight": 0.75 }]
  }
}
```

Stored in field memory and used on subsequent recalls.

## Declared SPAWN

```next
SPAWN analyst_thread {
  inherit: [hypothesis_*]
  goal: "Deep-dive the dominant cell after weave"
}
```

Executed after WEAVE; inherits matching cells' average energy. Hot-reload patch includes declared spawn cells.

Runtime: `field.declaredSpawns[]`, `run.next.declaredSpawns`

## Lineage

Each run appends to `field-memory` lineage:

```json
{ "dominant": "...", "hybrids": [], "declared": ["analyst_thread"], "auto_spawns": [] }
```

## Narrative Bus

`narrative.weave` events publish to mycelium alongside `field.dominant`.

## API

`GET /api/field-memory?program=genesis`

## Files

- `src/runtime/next/memory-recall.js`
- `src/runtime/next/memory-consolidate.js`
- `src/runtime/next/spawn-runner.js`
