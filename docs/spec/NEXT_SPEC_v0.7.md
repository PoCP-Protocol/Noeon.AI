# NEXT Profile Specification v0.7

**Status:** Draft  
**Profile:** `next`  
**Version:** `0.7.0`

## Overview

v0.7 closes the loop between dreams, field energy, and distributed mycelium awareness:

1. **Dream feedback** — dominant dream branches nudge live cell energy
2. **Mycelium react** — field listens to bus events and resonates
3. **Cluster relay** — forward dominant/publish events to peer clusters
4. **Smart three-way merge** — auto-resolve conflicts by higher `energy:` value

## Dream Feedback

```next
AUTOBOND {
  dream_feedback: 0.3   # blend strength, default 0.25
}

DREAM hybrid_lineage {
  on: hybrid
  feedback: true        # default true
}
```

After DREAM / hybrid DREAM simulation, dominant branch energies blend into field cells:

`new_energy = cell.energy + (dreamed - cell.energy) * dream_feedback`

Runtime: `field.dreamFeedback.applied[]`

## Mycelium React

```next
MYCELIUM join "dream_cluster" {
  absorb: [hypothesis_*]
  react: true
  listen: [field.dominant, cells.published]
  relay: [echo_cluster]
}
```

Before each field tick, recent bus events adjust matching local cells:

| Event | Effect |
|-------|--------|
| `field.dominant` | Boost cells matching peer dominant name/pattern |
| `cells.published` | Small boost when peer cell matches absorb/share filters |

Runtime: `field.mycelium.reactions[]`

## Cluster Relay

On publish, events copy to `relay` targets with `relay_from` metadata. Enables multi-cluster echo without shared storage locks.

## Smart Merge

```bash
noeon merge file.next --three-way --strategy smart --theirs branch.next
```

When ours and theirs both edit the same CELL vs base, pick the block with higher `energy:` value. Ties prefer ours.

## Files

- `src/runtime/next/dream-feedback.js`
- `src/runtime/next/mycelium-react.js`
- `src/runtime/next/mycelium-relay.js`
