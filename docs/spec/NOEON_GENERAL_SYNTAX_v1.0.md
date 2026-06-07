# Noeon General Syntax Specification v1.0.0-alpha

Status: Draft (Phase 2)  
Profile: `general`  
Extension: `.noeon`

## Overview

General Profile programs describe AI-native cognitive agents using block syntax. They lower to the legacy AEL AST and execute through the Unified VM (cognitive kernel + optional protocol phase).

## File Structure

```noeon
profile "general"
version "1.0.0-alpha"

module my_agent

import std.cognition

@effect(ai)
fn think(input: string) {
  observe input modality=text source="user"
  reason strategy=abductive depth=3
  decide action=respond threshold=0.65
}

export fn main() {
  think("Hello")
}
```

## Header Declarations

| Keyword | Form | Description |
|---------|------|-------------|
| `profile` | `profile "general"` | Execution profile |
| `version` | `version "1.0.0-alpha"` | Language version |
| `module` | `module name` | Module identifier |
| `import` | `import std.cognition` | Import declaration |
| `objective` | `objective "goal text"` | Program goal |
| `context` | `context key=value ...` | Cognition context |

## Program Blocks

```noeon
program hello_world {
  objective "Demonstrate general syntax"
  context domain=general mode=cognitive

  observe input modality=text source="user"
  understand context=intent method=semantic confidence=0.72
  decide action=greet threshold=0.6
  act action=greet channel=console
}
```

## Functions

- `fn name(params) { body }` — cognitive function
- `export fn main() { body }` — entry point (defaults to `main`)
- `@effect(pure|io|ai|external)` — effect annotation on following function

Function calls in bodies are inlined at lower time with parameter substitution.

## Cognitive Statements

Lowercase keywords map to cognitive opcodes:

| Syntax | Opcode |
|--------|--------|
| `observe` | PERCEIVE |
| `predict` | PREDICT |
| `intuit` | INTUIT |
| `reason` | REASON |
| `understand` | UNDERSTAND |
| `decide` | DECIDE |
| `reflect` | REFLECT |
| `act` | ACT |
| `feedback` | FEEDBACK |
| `consolidate` | CONSOLIDATE |
| `attend` | ATTEND |
| `monitor` | MONITOR |
| `focus` | FOCUS |
| `adapt` | ADAPT |
| `emotion` | EMOTION |
| `spawn` | SPAWN |
| `debate` | DEBATE |
| `evolve` | EVOLVE |

Forms:

- `keyword key=value ...` — parameter list
- `keyword subject key=value ...` — subject + parameters (`observe input modality=text`)
- `reflect "target text" depth=standard` — quoted subject

## Lowering Pipeline

```
.noeon source
  → isGeneralSyntax() detect
  → parseGeneralProgram()
  → lowerGeneralProgram()
  → legacy AEL AST
  → validateAel()
  → Cognitive IR
  → Unified VM
```

## Examples

- `examples/hello.noeon` — `program { }` block style
- `examples/cognitive_agent.noeon` — `fn` + `@effect(ai)` style

## Phase 3 (planned)

- Expression grammar and type annotations
- `@effect` enforcement at compile time
- `std.ai` language bindings
