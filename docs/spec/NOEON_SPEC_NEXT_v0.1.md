# NOEON Next Language Specification v0.1

Status: Draft
Date: 2026-06-08
Intent: Define a bold AI-native language core focused on world models, guarantees, and autonomous adaptation.

## 1. Core Position

Noeon Next is not just a cognitive workflow language. It is a language for building systems that can:

1. Build a world model from evidence.
2. Generate and compare strategies under uncertainty.
3. Prove policy and safety constraints before irreversible action.
4. Learn from outcome deltas and evolve behavior safely.

Formula:

Program = Goal + WorldModel + Strategy + Guarantees + Action + Reflection + Evolution

## 2. First-Class Constructs

v0.1 introduces seven first-class constructs:

1. GOAL: Desired business/system outcome.
2. MODEL: Structured world representation with assumptions and confidence.
3. STRATEGY: Candidate plan with expected utility and risk.
4. GUARANTEE: Hard constraints that must hold before commit.
5. ACT: External effects through bounded capabilities.
6. REFLECT: Post-execution causal analysis.
7. EVOLVE: Controlled policy/model updates.

## 3. Minimal Surface Grammar

The v0.1 surface keeps syntax intentionally small.

1. PROFILE "next"
2. VERSION "0.1.0"
3. PROGRAM "<name>"
4. GOAL "<text>" priority=<p>
5. MODEL name=<id> source=<id> confidence=<0..1>
6. STRATEGY name=<id> objective=<id> risk=<low|medium|high>
7. GUARANTEE name=<id> expr="<boolean expression>"
8. ACT action=<id> capability=<id> budget_ms=<n>
9. REFLECT target=<id> method=<causal|counterfactual>
10. EVOLVE scope=<model|strategy|policy> guard=<id>

## 4. Execution Semantics

Execution phases in v0.1:

1. Build: Parse and type-check constructs.
2. Model: Hydrate model and confidence map.
3. Explore: Evaluate strategies and expected outcomes.
4. Verify: Enforce guarantees.
5. Execute: Run selected action.
6. Reflect: Produce causal and counterfactual report.
7. Evolve: Apply bounded update.

Phase transitions are explicit and observable.

## 5. Safety and Governance Defaults

Mandatory in v0.1:

1. Any ACT requires at least one GUARANTEE.
2. Any EVOLVE requires a guard reference and rollback token.
3. A failed GUARANTEE blocks ACT and returns explainable diagnostics.
4. Reflection output includes:
   - selected strategy
   - rejected strategies
   - top causal factors
   - policy delta proposal

## 6. Type Model

Core types:

1. GoalType
2. ModelType
3. StrategyType
4. GuaranteeType
5. ActionType
6. ReflectionType
7. EvolutionDeltaType

Each value carries:

1. confidence
2. provenance
3. timestamp
4. policy_scope

## 7. Example (Executable Intent)

See examples/next_gen_world_model.noeon for the canonical v0.1 program.

## 8. v0.2 Roadmap

1. Multi-model fusion with conflict resolution.
2. Symbolic + neural hybrid guarantee checks.
3. Native counterfactual simulator blocks.
4. Module capability contracts and signed evolution deltas.

## 9. Non-Goals for v0.1

1. Full distributed consensus semantics.
2. Unbounded self-modifying runtime.
3. Opaque model invocation without trace artifacts.

This draft is deliberately ambitious and intentionally compact so iteration can be fast while keeping architectural rigor.
