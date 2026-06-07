# ADR-002: Noeon as AI-Native General Programming Language

Status: Accepted  
Date: 2026-06-07

## Context

Noeon began as a protocol DSL (ADR-001). The project goal is now an **AI-era general programming language** whose programs model human nervous-system cognition: goals, perception, understanding, reasoning, decision, action, feedback, memory, and evolution.

## Decision

1. **Dual Profile model**
   - `.noeon` — General Profile (AI-native GP syntax)
   - `.ael` — Governance Profile (contracts, META, settlement)

2. **Single pipeline**
   - Both profiles lower to legacy AST → Cognitive IR → Unified VM

3. **Phase 2 General Syntax** (implemented)
   - `fn`, `export fn`, `import`, `@effect`, `program { }`
   - Cognitive statements as first-class body statements
   - Function call inlining at lower time

4. **AI is language-native, not a library**
   - Cognitive types and opcodes are IR-first
   - LLM bridge backs PROCESS / PREDICT / REFLECT handlers

## Consequences

- Parser splits: line AEL parser + block general parser (`src/grammar/`)
- Future Phase 3 adds expression grammar, typechecker, and `std.ai` surface
- Governance profile remains supported for protocol workloads

## Next

- Phase 3: expressions, types, `@effect` enforcement
- Phase 4: consciousness stream as default scheduler
- Phase 5: package manager + IDE
