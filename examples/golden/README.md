# Noeon Golden Examples

These programs are the **proof set** for Noeon v1.0 consolidation. Run:

```bash
npm run test:golden
```

## Core proof (3 programs)

| ID | File(s) | Proves |
|---|---|---|
| `general` | `hello.noeon` | General `.noeon` authoring — cognitive workflow |
| `governance` | `genesis.next` | Next core — field, evolution, governance |
| `alignment` | `agent_field.noeon` + `agent_field.lim` | Liminal as alignment sidecar |

## Parity proof (4 surfaces, one intent)

Directory: [`examples/parity/`](../parity/)

| Surface | File | Bucket |
|---------|------|--------|
| `.noeon` | `risk_assess.noeon` | general |
| `.next` | `risk_assess.next` | governance |
| `.ael` | `risk_assess.ael` | contract |
| `.lim` | `risk_assess.lim` | alignment |

Shared goal: **Assess market risk with evidence** — all four must lower to the same canonical intent.

Manifest: [`manifest.json`](manifest.json)

Do not add new golden IDs without updating the manifest and an ADR.
