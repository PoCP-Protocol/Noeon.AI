# RFC-0003: MODEL / TOOL / CAPABILITY / EFFECT Declarations

Status: Draft

Author: Noeon Core Team

Created: 2026-06-08

Related: Sprint A — AI application declaration layer

## 1. Summary

Introduce top-level declarations in General profile programs so AI software can explicitly bind models, tools, capabilities, and effects before execution.

## 2. Motivation

Noeon programs today scatter model/tool/effect semantics across `TOOLS`, `context`, and stdlib calls. Production AI software requires static, auditable declarations:

```noeon
MODEL planner type=llm context=128k
TOOL search type=mcp capability=web_search
CAPABILITY web_search effects=[io,external_send] budget_tokens=2000
EFFECT external_send requires=human_gate
```

## 3. Syntax (General profile)

| Keyword | Form | Example |
|---------|------|---------|
| MODEL | `MODEL <name> <kv...>` | `MODEL planner type=llm context=128k provider=openai` |
| TOOL | `TOOL <name> <kv...>` | `TOOL search type=mcp capability=web_search risk=low` |
| CAPABILITY | `CAPABILITY <name> <kv...>` | `CAPABILITY web_search effects=[io,external_send]` |
| EFFECT | `EFFECT <name> <kv...>` | `EFFECT external_send requires=human_gate` |

Parameters use `key=value` tokens; arrays use `[a,b,c]`.

## 4. Canonical IR

Declarations lower to `canonical.declarations`:

```json
{
  "models": [{ "kind": "model", "name": "planner", "params": { "type": "llm" } }],
  "tools": [{ "kind": "tool", "name": "search", "params": { "type": "mcp", "capability": "web_search" } }],
  "capabilities": [{ "kind": "capability", "name": "web_search", "params": { "effects": ["io","external_send"] } }],
  "effects": [{ "kind": "effect", "name": "external_send", "params": { "requires": "human_gate" } }]
}
```

Schema: `noeon.declarations/v1`

## 5. Validation

1. Duplicate declaration names within a kind → error
2. `TOOL ... capability=X` → `CAPABILITY X` must exist → error
3. When TOOL declarations exist, bare `foo()` calls in fn bodies must match a declared TOOL name → error
4. `CAPABILITY` effects should be known (`pure|io|ai|external|external_send`) or declared `EFFECT` → warning
5. `EFFECT external_send requires=human_gate` + `@effect(external)` body → warn if no FUSE relay

## 6. Runtime (v1)

v1 is **declare + validate + report** only. Runtime binding of `MODEL planner` to LLM bridge is advisory via `cognition.context._declarations`.

Future: bind TOOL to MCP registry, MODEL to provider adapters, EFFECT to governance preflight.

## 7. Examples

See `examples/declarations/agent_with_tools.noeon`.

## 8. Tests

`tests/declaration-bindings.test.js` — parse, validate, canonical lower, negative cases.
