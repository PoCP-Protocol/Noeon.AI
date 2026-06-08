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

4. **Phase 3 General Semantics** (implemented)
   - Expression grammar: `let`, `assert` with arithmetic/compare ops
   - Primitive type annotations on `fn` signatures
   - `@effect` compile-time enforcement (pure < io < ai < external)
   - `std.ai` bindings: `ask`, `embed`, `think_with` → `ast.llm.*`

5. **Phase 4 Consciousness Scheduler** (implemented)
   - `ConsciousnessStream.runBounded()` drives attention before kernel execution
   - Default for cognitive/full modes; `NOEON_SCHEDULER=sequential` to opt out
   - Module: `src/vm/consciousness-scheduler.js`

6. **Phase 5 Package + IDE** (implemented)
   - `noeon.json` / `.noeon-lock.json`, CLI `noeon pkg add|list|install`
   - Manifest-aware import validation for general profile
   - LSP completions/hover/symbols for `fn`, `@effect`, `std.ai`

7. **AI is language-native, not a library**
   - Cognitive types and opcodes are IR-first
   - LLM bridge backs PROCESS / PREDICT / REFLECT handlers

## Consequences

- Parser splits: line AEL parser + block general parser (`src/grammar/`)
- Phase 5 pkg: `src/pkg/manifest.js`, LSP general syntax in `language-server/noeon-service.js`
- Governance profile remains supported for protocol workloads

## Next

- Phase 6: remote package registry, VS Code extension publish
