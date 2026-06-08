> **ARCHIVED** — Superseded. See [docs/archive/INDEX.md](docs/archive/INDEX.md) and [NOEON_CANONICAL_ARCHITECTURE_v1.0.md](docs/spec/NOEON_CANONICAL_ARCHITECTURE_v1.0.md).

# Noeon Next v0.4

## AUTOBOND — emergent chemistry

High-energy cells automatically form bonds by claim similarity and energy proximity:

```next
AUTOBOND {
  threshold: 0.38
  max: 8
  kind: resonates
  min_similarity: 0.08
}
```

## Mycelium graph

Visualize cross-program cell fields and bonds:

```bash
noeon graph examples/genesis.next --mycelium --out artifacts/genesis.mmd
```

## Hot reload

FLUX crystallizations and auto-bonds append to `artifacts/evolved/<file>.evolved`.  
Next parse/run prefers the evolved source automatically.

```bash
noeon run examples/genesis.next
# writes artifacts/evolved/genesis.next.evolved when flux/autobond fires
```

Disable with `--no-hot-reload`.
