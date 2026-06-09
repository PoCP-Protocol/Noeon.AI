# Noeon v1.0-alpha Scope (Frozen)

**Version:** 1.0.0-alpha.1  
**Status:** Normative for consolidation phase

## Stage definition

> **Noeon v1.0-alpha** — AI-native general programming language with unified runtime prototype: language positioning, Dual IR, Unified VM, General Profile, LLM Bridge, Playground/API, and package registry **in alpha**; production hardening in progress.

## Public vocabulary (5 terms)

Use these in README, Studio, and onboarding. Everything else is advanced documentation.

| Term | Meaning |
|------|---------|
| **Noeon Program** | Any `.noeon` / capability entry file lowered to one pipeline |
| **Cognitive IR** | Execution-layer IR (perceive, decide, act, …) |
| **Unified VM** | Single executor: governance → fusion → cognitive → protocol |
| **Policy / Governance** | Constraints, approval, constitution-tier rules |
| **Trace / Memory** | Reports, audit, field memory, reflections |

Advanced concepts (fusion, triad, mycelium, consciousness scheduler, canonical IR details) belong in spec/ADR — not first-run docs.

## Frozen language core

Do not add new top-level syntax families during v1.0-alpha. Extend only within:

`PROGRAM`, `AGENT`, `GOAL`, `OBJECTIVE`, `CONTEXT`, `PERCEIVE`, `OBSERVE`, `UNDERSTAND`, `REASON`, `DECIDE`, `ACT`, `FEEDBACK`, `REFLECT`, `LEARN`, `MEMORY`, `POLICY`, `TRACE`

Capability entry modes remain: `.noeon`, `.next`, `.lim`, `.ael`.

## Golden proof set

- 3 vertical demos: `examples/hello.noeon`, `agent_research`, `agent_risk_review`, `agent_customer_service`
- 4-surface parity: `examples/parity/risk_assess.*`
- Gate: `npm run test:golden`, `npm run gate:golden` (when configured)

## Next engineering priorities (alpha → beta)

1. Real `ACT` → plugins — **`std.http` + `std.fs` + `std.github` + kernel plugin path (alpha)**
2. General `.noeon` lowers with **parallel `canonicalIr` snapshot** (legacy AST still executes)
2. General AST → Canonical IR without permanent legacy-only path
3. CI badge + reproducible test report on GitHub
4. Noeon Studio minimal: Code · IR · Trace · Architecture panels (Playground API ready)
