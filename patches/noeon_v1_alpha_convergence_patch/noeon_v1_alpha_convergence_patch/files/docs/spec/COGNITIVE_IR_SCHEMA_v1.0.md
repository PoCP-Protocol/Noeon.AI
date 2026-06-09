# Cognitive IR Schema v1.0

**Status:** Draft  
**Version:** 1.0.0-alpha  
**Scope:** This document freezes the minimum Cognitive Intermediate Representation required for Noeon v1.0-alpha convergence.

---

## 1. Purpose

Cognitive IR is the shared execution representation for Noeon programs. Surface syntaxes such as `.noeon`, `.ael`, `.next`, and `.lim` may differ, but they must lower into a common cognitive program shape before execution.

The goal of Cognitive IR is to make AI-native programs executable, inspectable, testable, auditable, governable, and model-neutral.

---

## 2. Core Principle

```text
Program = Goal + Context + Cognition + Action + Feedback + Evolution
```

Cognitive IR represents this formula as a typed node graph.

---

## 3. Required Node Types

The v1.0-alpha IR node set is frozen to 14 canonical types:

| Type | Meaning | Typical source |
|---|---|---|
| `intent` | What the program wants to achieve | `GOAL`, `OBJECTIVE`, `TASK`, `DRIVE` |
| `constraint` | Resource, policy, or behavior limits | `CONSTRAINT`, `BUDGET`, `RISK`, `ATTEND` |
| `process` | Reasoning, understanding, computation | `UNDERSTAND`, `REASON`, `INTUIT`, `COMPUTE` |
| `validate` | Verification and reflection | `VERIFY`, `CHECK`, `REFLECT`, `SELF_CHECK` |
| `learn` | Feedback and reinforcement | `FEEDBACK`, `LEARN`, `REWARD` |
| `perceive` | Sensing and input | `PERCEIVE`, `OBSERVE`, `PLUGIN` |
| `decide` | Choice, branch, threshold, or state transition | `DECIDE`, `FLOW` |
| `commit` | Commitment, stake, or durable action intent | `COMMIT`, `COLLATERAL` |
| `collaborate` | Delegation, action boundary, or multi-agent work | `ACT`, `DELEGATE`, `DEBATE`, `VOTE` |
| `evolve` | Controlled adaptation or self-modification | `EVOLVE`, `MUTATE`, `UPDATE_POLICY` |
| `remember` | Memory operations | `MEMORY`, `RECALL`, `REMEMBER`, `CONSOLIDATE` |
| `attend` | Attention and focus | `ATTEND`, `FOCUS`, `WORKSPACE` |
| `predict` | Anticipation and forecasting | `PREDICT` |
| `meta` | Governance, policy, or metacognition | `META`, `META_RULE`, `POLICY` |

---

## 4. IR Node Shape

Every node must conform to this minimum shape:

```json
{
  "id": "ir_...",
  "type": "process",
  "params": {},
  "children": [],
  "dependencies": [],
  "priority": 0.5,
  "confidence": 1.0,
  "source": "general"
}
```

## 5. Execution Semantics

A conforming v1.0-alpha runtime must preserve the normative phase order within one execution cycle:

```text
Perceive → Attend → Predict → Process → Decide → Validate → Learn → Remember → Evolve → Meta
```

Runtimes may skip empty phases. Runtimes may interleave or repeat phases in future schedulers, but the baseline deterministic kernel must preserve this order.

## 6. Next Work

The next patch should add JSON Schema conformance tests, stable deterministic node ids, IR snapshot tests for golden examples, explicit input/output schemas per node type, and effect/permission metadata for `collaborate` / `ACT` nodes.
