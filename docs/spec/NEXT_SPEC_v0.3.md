> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# Noeon Next v0.3 — Bond, Mycelium, Flux Macros

**Formula:** `Program = Field + Cells + Bonds + Weave + Dream + Mycelium + Flux`

## BOND — cell chemistry

```next
BOND hypothesis_a <-> hypothesis_b {
  strength: 0.4
  kind: resonates    # amplifies | inhibits | resonates | symbiotic
}

BOND predator -> prey strength=0.3 kind=inhibits
```

Bonds run before and after each field tick — energy flows between coupled cells.

## MYCELIUM — cross-program field

```next
MYCELIUM join "dream_cluster" {
  share: [hypothesis_*]
  absorb: tagged=public
  isolate: [confidential_*]
}
```

Cells publish to `artifacts/mycelium/<cluster>.json` on run. Peer programs absorb by tag/pattern.

## FLUX macros — syntax crystallization

```next
@cycle(0.65)

FLUX syntax {
  when friction("observe reason decide") > 0.8 {
    crystallize macro cycle(threshold)
  }
}
```

`@name(args)` expands at parse time. FLUX registers macros into the runtime registry when triggered.

## Examples

- `examples/genesis.next` — bonds + mycelium + macro
- `examples/ember.next` — mycelium seed program

```bash
noeon run examples/ember.next
noeon run examples/genesis.next
node tests/next-profile-v03.test.js
```
