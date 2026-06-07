# NEXT Profile Specification v0.8

**Status:** Draft  
**Profile:** `next`  
**Version:** `0.8.0`

## Overview

v0.8 gives the living field persistent memory across runs:

1. **Field memory store** — cell energies and dominant history persist
2. **ECHO execution** — `ECHO last_run INTO memory.episodic` writes snapshots
3. **FIELD decay** — stored energy decays toward baseline between runs
4. **Dream crystallize** — significant dream feedback crystallizes into hot-reload patches
5. **Weave narrative** — structured narrative from WEAVE winners

## Field Memory

Stored at `artifacts/field-memory/<program>.json`:

```json
{
  "program": "genesis",
  "runs": 3,
  "cells": { "hypothesis_risk_off": { "energy": 0.55, "claim": "..." } },
  "dominant_history": [],
  "echoes": { "memory.episodic": [] }
}
```

On each run, cell energies restore from memory (with decay) before field tick.

### CLI

```bash
noeon field-memory show genesis [--json]
noeon field-memory clear genesis
```

### Runtime

`run.next.fieldMemory` — `{ path, runs, restored[], echoes[] }`

## FIELD Decay

```next
FIELD signals {
  decay: 1h
}
```

Exponential decay toward energy `0.5` based on elapsed time since last save.

## ECHO

```next
ECHO last_run INTO memory.episodic
```

Captures dominant, cells, woven results into the memory store echo slot (ring buffer, max 20).

## Dream Crystallize

When dream feedback delta exceeds `dream_crystallize_delta` (default `0.06`), hot-reload patch writes updated CELL energy:

```next
AUTOBOND {
  dream_crystallize_delta: 0.06
}
```

## Weave Narrative

`field.narrative[]` — `{ into, winners, coherence, text }` derived from WEAVE results.

## Files

- `src/runtime/next/field-memory.js`
- `src/runtime/next/weave-narrative.js`
