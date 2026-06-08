# NEXT Profile Specification v1.0

**Status:** Stable (milestone)  
**Profile:** `next`  
**Version:** `1.0.0`

## Milestone

Next v1.0 unifies the living-field stack (v0.2–v0.9) into a production-ready autonomous profile:

| Layer | Capability |
|-------|------------|
| Field | CELL, BOND, WEAVE, DREAM, FLUX, FIELD |
| Evolution | AUTOBOND, auto-spawn, hot-reload, evolved merge |
| Network | MYCELIUM, event bus, relay, react |
| Memory | ECHO, recall, consolidation, lineage, decay |
| Ops | epoch runner, memory graph, cognitive bridge |

## Epoch Runner

Multi-run field evolution in one invocation:

```bash
noeon epoch examples/genesis.next --runs 5
noeon epoch examples/genesis.next --runs 3 --bridge --json
```

Returns per-epoch dominant, narrative, field memory state, and optional `cognitive` bridge artifact.

## Memory Graph

Visualize persisted field memory (cells, lineage, semantic, spawns):

```bash
noeon graph examples/genesis.next --memory
noeon graph examples/genesis.next --memory --program genesis --json
```

Web: `http://localhost:5177/memory.html`  
API: `GET /api/field-memory/graph?program=genesis`

## Cognitive Bridge

Maps Next field results to PERCEIVE→REFLECT cycle for interop with General/Cognitive profiles:

```bash
noeon epoch examples/genesis.next --runs 1 --bridge --json
```

Output: `cognitive.cycle[]` + `cognitive.artifact.summary`

## Version History (summary)

- **v0.2–v0.4** — Field engine, bonds, mycelium, hot-reload
- **v0.5–v0.6** — Evolved sync, hybrid dream, event bus, three-way merge
- **v0.7–v0.8** — Dream feedback, react/relay, field memory, ECHO, decay
- **v0.9** — Recall, consolidation, declared SPAWN, lineage
- **v1.0** — Epoch, memory graph, cognitive bridge, unified tooling

## Reference Implementation

- `src/runtime/next/field-engine.js` — core simulation
- `src/vm/next-phase.js` — VM integration
- `src/runtime/next/field-memory.js` — persistence
- `src/runtime/next/field-epoch.js` — multi-run
- `src/runtime/next/memory-graph.js` — visualization
- `src/runtime/next/cognitive-bridge.js` — profile bridge

See also: `NEXT_SPEC_v0.2.md` … `NEXT_SPEC_v0.9.md` for incremental details.
