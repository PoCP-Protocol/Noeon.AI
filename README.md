# Noeon AEL: Agent Economics Language

Noeon AEL (Agent Economics Language) is the first version of Noeon Contract Language for distributed AI task contracts.

It is intentionally **not** a general-purpose programming language. Instead, it encodes:

- task identity
- budget and deadline
- verification policy
- collateral requirements
- settlement and slashing policy

This is the recommended starting point for an "AI-era new language" under the Noeon vision:

1. Start from protocol constraints.
2. Make contracts machine-checkable.
3. Evolve toward richer expressions only after real workloads.

## Quick Start

1. Install Node.js 18+.
2. Run:

```bash
npm install
npm run parse -- examples/sample.ael
npm run parse -- examples/noeon_contract.ael
npm run parse -- examples/noeon_neural.ael
npm run parse -- examples/noeon_superbrain.ael
npm run parse -- examples/noeon_native_mind.ael
npm run compile -- examples/noeon_contract.ael artifacts/noeon_contract.json
npm run compile -- examples/noeon_superbrain.ael artifacts/noeon_superbrain.json
npm run explain -- examples/noeon_neural.ael
npm run explain -- examples/noeon_superbrain.ael
npm run simulate -- examples/noeon_superbrain.ael examples/feedback_highrisk.json artifacts/noeon_cycle.json artifacts/noeon_state.json artifacts/noeon_report.json artifacts/noeon_audit.jsonl
npm run train -- examples/noeon_superbrain.ael examples/feedback_batch.json artifacts/noeon_training.json artifacts/noeon_state.json artifacts/noeon_convergence.json artifacts/noeon_audit.jsonl
npm run rollback -- artifacts/noeon_state.json 1
npm run conformance
npm run site
```

You should see parsed JSON and validation results.
The website preview is available at http://localhost:5177.

## Noeon Language v0.2 Syntax

```txt
SET net = "NoeonNet"
SET budget_msat = 50000
VERSION "0.2"
NETWORK "${net}"
TASK "doc.extract"
TAGS domain=edu risk=medium priority=p2
BUDGET ${budget_msat} msat
DEADLINE 2026-12-31T00:00:00Z
VERIFY quorum=2/3 challenge=600 mode=auto
SOLVER_COLLATERAL 10000
VERIFIER_COLLATERAL 5000
ON_SUCCESS solver=70 verifier=20 protocol=10
ON_SLASH timeout=10 bad_proof=80 malicious=100
FLOW "CREATED" -> "BIDDING" on=publish
FLOW "BIDDING" -> "ASSIGNED" on=assign
```

## Super Brain Extensions

Noeon v0.2 adds cognition primitives for a human-neural mental model:

1. `GOAL "..."`: intention layer
2. `CONSTRAINT key=value ...`: executive control constraints
3. `RISK level=... profile=... impact=...`: inhibition and safety policy
4. `MEMORY short=... long=... mode=...`: short/long memory system
5. `LEARN signal=... rate=... window=...`: feedback learning rule
6. `PLAN "step" => "next_step"`: reasoning pathway graph
7. `ACTION "step" plugin=...`: bind a plan step to runtime plugin
8. `COGNITION mode=... autonomy=... reflection=... selfcheck=...`: native AI cognition profile
9. `SELF_CHECK metric=... threshold=... action=...`: metacognitive policy
10. `INFER strategy=... depth=... diversity=...`: inference strategy profile
11. `CRITIC mode=... strictness=... veto=...`: critic and veto policy
12. `HYPOTHESIS id=... confidence=... type=...`: machine-verifiable hypothesis set
13. `EVIDENCE source=... quality=... weight=...`: evidence weighting for confidence control
14. `COUNTEREXAMPLE id=... against=... severity=... weight=...`: first-class falsification pressure
15. `TRACE step=... hypothesis=... evidence=... counterexample=...`: explainable reasoning linkage
16. `DEBATE topic=... sides=... rounds=... protocol=...`: multi-agent argument protocol
17. `ARBITRATE mode=... accept=... revise=... fallback=...`: final verdict policy
18. `JUROR id=... weight=... role=...`: weighted jury member for ARBITRATE mode=jury

Example:

```txt
GOAL "Deliver robust learning plan with evidence"
CONSTRAINT latency_ms=5000 privacy=high reproducibility=required
RISK level=high profile=conservative impact=systemic
MEMORY short=600 long=90 mode=episodic
LEARN signal=hybrid rate=0.15 window=120
PLAN "observe" => "reason"
PLAN "reason" => "act"
ACTION "observe" plugin=echo
```

## Neural-Style Syntax (Human-Friendly)

Noeon supports cognitive aliases that map to the same protocol core:

1. `THINK` -> `SET`
2. `BRAIN` -> `NETWORK`
3. `INTENT` -> `TASK`
4. `CONTEXT` -> `TAGS`
5. `ENERGY` -> `BUDGET`
6. `MEMORY_UNTIL` -> `DEADLINE`
7. `TRUST` -> `VERIFY`
8. `REWARD` -> `ON_SUCCESS`
9. `PENALTY` -> `ON_SLASH`
10. `SYNAPSE` -> `FLOW`
11. `DRIVE` -> `GOAL`
12. `RULES` -> `CONSTRAINT`
13. `THREAT` -> `RISK`
14. `HIPPOCAMPUS` -> `MEMORY`
15. `PLASTICITY` -> `LEARN`
16. `CIRCUIT` -> `PLAN`
17. `ROUTE` -> `ACTION`
18. `CONSCIOUSNESS` -> `COGNITION`
19. `METACOG` -> `SELF_CHECK`
20. `REASONER` -> `INFER`
21. `JUDGE` -> `CRITIC`
22. `THEOREM` -> `HYPOTHESIS`
23. `PROOF` -> `EVIDENCE`
24. `FALSIFY` -> `COUNTEREXAMPLE`
25. `CHAIN` -> `TRACE`
26. `FORUM` -> `DEBATE`
27. `COURT` -> `ARBITRATE`
28. `PANEL` -> `JUROR`

Example file: `examples/noeon_neural.ael`

Native AI example: `examples/noeon_native_mind.ael`

## Meta Rules (Self-Hosting Seed)

Noeon now supports contract-level meta rules, so language policy can be pushed from static JS checks into Noeon source itself.

`META_PROFILE` defines a reusable rule package namespace and execution mode:

`META_PROFILE name=strict_core namespace=noeon.policy version=1.0 mode=enforce extends=baseline_guard,org_default`

Modes:

1. `enforce`: `level=error` remains blocking
2. `advisory`: all meta violations are downgraded to warnings

Conflict resolution:

1. For same rule identity (same kind + normalized target path), Noeon uses deterministic `last-win`.
2. Overridden rules emit a meta warning for audit traceability.

1. `META_REQUIRE path=... level=error|warning message=...`
2. `META_RANGE path=... min=... max=... level=error|warning message=...`
3. `META_ENUM path=... values=a,b,c level=error|warning message=...`
4. `META_RELATION when_path=... when_op=eq|ne|gt|gte|lt|lte when_value=... target_path=... target_op=eq|ne|gt|gte|lt|lte target_value=... level=error|warning message=...`

If `message` needs spaces, use quoted form such as `message="high risk policy violation"`.

Meta rules are parsed into `ast.metaRules`, evaluated in `validateAel`, and emitted in compiled artifacts under `spec.metaRules`.

Self-hosting seed example: `examples/noeon_meta_selfhost.ael`

## Language-Native AI Capability

Noeon is not only a contract DSL. The language itself can carry AI cognition policy.

1. `COGNITION` defines native reasoning mode and autonomy level.
2. `SELF_CHECK` defines metacognitive thresholds and action when uncertainty rises.
3. `INFER` controls strategy, depth, and diversity of reasoning.
4. `CRITIC` controls review strictness and optional veto.
5. `HYPOTHESIS` and `EVIDENCE` make reasoning claims and evidence sources first-class language objects.
6. `COUNTEREXAMPLE` introduces explicit falsification tension to avoid overconfident reasoning.
7. `TRACE` binds plan steps to hypothesis/evidence/counterexample for auditable explainability.
8. `DEBATE` brings multi-agent argument pressure into runtime confidence and uncertainty.
9. `ARBITRATE` maps debate+uncertainty into final verdict (`accept|revise|reject|escalate`).
10. `JUROR` enables weighted jury scoring in arbitration mode `jury`.
11. `simulate` now emits `cognition.nativeMind` with confidence, uncertainty, infer/critic/hypothesis/evidence/counterexample/trace/debate/arbitration effects, `juryScore`, reflection trigger, control decision, and final verdict recommendation.

Example:

```txt
COGNITION mode=hybrid autonomy=sovereign reflection=adaptive selfcheck=true
SELF_CHECK metric=uncertainty threshold=0.32 action=escalate
INFER strategy=hybrid depth=6 diversity=4
CRITIC mode=peer strictness=4 veto=true
HYPOTHESIS id=macro_shift confidence=0.72 type=predictive
EVIDENCE source=dataset quality=high weight=0.8
COUNTEREXAMPLE id=alt_regime against=macro_shift severity=medium weight=0.45
TRACE step=risk_gate hypothesis=risk_spike counterexample=alt_regime
DEBATE topic=macro_regime sides=3 rounds=3 protocol=socratic
ARBITRATE mode=jury accept=0.68 revise=0.48 fallback=escalate
JUROR id=judge_alpha weight=0.4 role=domain
```

## Noeon Positioning

Noeon is a distributed intelligence economy for the AI era.

- Free competition among agents.
- Verifiable cooperation across untrusted parties.
- Automatic value settlement by protocol rules.

Tagline: let intelligence compete freely, let value settle automatically, let order emerge spontaneously.

Governance brief (Chinese): `docs/NOEON_GOVERNANCE_BRIEF_CN.md`
System development path (Chinese): `docs/NOEON_SYSTEM_DEVELOPMENT_PATH_CN.md`
System development template: `examples/noeon_system_development.ael`
Language system draft: `docs/NOEON_LANGUAGE_SYSTEM_v1.0_DRAFT.md`
Noeon vs Python positioning (Chinese): `docs/NOEON_VS_PYTHON_POSITIONING_CN.md`
Compute kernel draft: `docs/NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md`
Parallel execution board: `docs/NOEON_PARALLEL_EXECUTION_BOARD_v0.5.md`
Conformance levels: `docs/CONFORMANCE_LEVELS.md`
Error codes draft: `docs/NOEON_ERROR_CODES_v0.5.md`

Quality metrics:

`npm run metrics`
`npm run metrics:record`
`npm run conformance:summary`
`npm run conformance:init`
`npm run conformance:baseline:update`

CI quality gate workflow:

`.github/workflows/quality-gate.yml`

CK-3 governance paths:

`runtime.compute.env.*`
`runtime.compute.receipts`
`runtime.compute.summary.callFailureRate`

CI matrix:

`Node 18 + Node 20`

## JS Kernel + Meta-Rule Driven

Noeon runtime now supports a JS-kernel meta-policy layer as the self-improving starting point.

Use meta directives in contracts:

1. `META_REQUIRE path=<dot.path> level=<error|warning>`
2. `META_RANGE path=<dot.path> min=<number> max=<number> level=<error|warning>`
3. `META_ENUM path=<dot.path> values=a,b,c level=<error|warning>`

Example:

```txt
META_REQUIRE path=contract.cognition.goal level=error
META_REQUIRE path=feedback.proofHash level=warning
META_RANGE path=runtime.learning.updates.verify.challengeSeconds min=600 max=3600 level=warning
META_ENUM path=runtime.adaptiveProfile.verificationMode values=auto,manual level=error
```

Runtime behavior:

1. Evaluate meta rules before plan execution and after learning updates.
2. If any `level=error` rule fails, runtime enters `meta-guarded` mode.
3. In guarded mode, verification becomes manual and policy updates are hardened.
4. Reports include `metaPolicy` status and violation summaries.

External governance policy (file-driven):

1. Create a JSON policy file with `profile` and `rules`.
2. Set `NOEON_META_POLICY_FILE` before `simulate` or `train`.
3. Runtime merges file rules with in-contract meta rules.
4. Optional `profiles` registry supports `extends` inheritance for reusable rule packs.
5. Inheritance cycles are detected and emitted as meta warnings.

Example policy file:

```json
{
	"profile": {
		"name": "governance-strict",
		"namespace": "noeon.meta",
		"version": "1.0",
		"mode": "enforce"
	},
	"profiles": {
		"baseline_parent": {
			"name": "baseline_parent",
			"rules": [
				{
					"kind": "require",
					"path": "feedback.proofHash",
					"level": "error",
					"message": "feedback proof hash is required"
				}
			]
		},
		"strict_child": {
			"name": "strict_child",
			"extends": ["baseline_parent"],
			"rules": []
		}
	},
	"rules": [
		{
			"kind": "require",
			"path": "feedback.proofHash",
			"level": "error",
			"message": "feedback proof hash is required"
		},
		{
			"kind": "relation",
			"when": {
				"path": "contract.cognition.risk.level",
				"op": "eq",
				"value": "critical"
			},
			"target": {
				"path": "contract.verify.mode",
				"op": "eq",
				"value": "manual"
			},
			"level": "error",
			"message": "critical risk requires manual verification"
		}
	]
}
```

PowerShell example:

```powershell
$env:NOEON_META_POLICY_FILE='artifacts/noeon_meta_policy.json'
npm run simulate -- examples/noeon_hayek_bitcion_ai_extreme.ael examples/feedback_highrisk.json artifacts/noeon_hayek_extreme_cycle.json artifacts/noeon_hayek_extreme_state.json artifacts/noeon_hayek_extreme_report.json artifacts/noeon_hayek_extreme_audit.jsonl
```

## Why DSL First

- Reduces implementation risk compared with building a full language runtime.
- Directly maps to your protocol state machine.
- Creates a stable contract format for nodes, verifiers, and settlement engines.

## CLI Commands

1. Parse and validate contract:

```bash
npm run parse -- examples/noeon_contract.ael
```

2. Compile contract into protocol artifact:

```bash
npm run compile -- examples/noeon_contract.ael artifacts/noeon_contract.json
```

3. Explain contract in natural language:

```bash
npm run explain -- examples/noeon_neural.ael
```

4. Run one super-brain cycle (plan execution + learning update):

```bash
npm run simulate -- examples/noeon_superbrain.ael examples/feedback_highrisk.json artifacts/noeon_cycle.json artifacts/noeon_state.json artifacts/noeon_report.json artifacts/noeon_audit.jsonl
```

5. Run multi-round training and produce policy trajectory:

```bash
npm run train -- examples/noeon_superbrain.ael examples/feedback_batch.json artifacts/noeon_training.json artifacts/noeon_state.json artifacts/noeon_convergence.json artifacts/noeon_audit.jsonl
```

6. Roll back learning state by N rounds:

```bash
npm run rollback -- artifacts/noeon_state.json 1
```

## Adaptive Execution

Noeon runtime adapts plan depth by risk level:

1. low: fast-path (default max plan steps = 3)
2. medium: balanced (default max plan steps = 5)
3. high/critical: full-depth execution with stricter verification posture

## Language-Driven Action Execution

`simulate` now runs PLAN steps through an action runner skeleton and emits per-step receipts:

1. Action type classification (`sense`, `validate`, `reason`, `safety`, `commit`)
2. Step receipts with evidence hash
3. Failure categories (`timeout`, `policy_block`, `validation_error`, `execution_error`)
4. Plugin execution metadata (`plugin`, `pluginMeta`)

Built-in plugins:

1. `echo`
2. `policy_guard`
3. `http_call` (template / mocked transport)

Plugin policy controls (whitelist):

1. `NOEON_ALLOWED_PLUGINS` (csv)
2. `NOEON_ALLOWED_ACTION_TYPES` (csv)

Plugin integrity controls:

1. ACTION supports `version` for plugin version lock.
2. ACTION supports `signature` for plugin signature verification.
3. Set `requireVersion` / `requireSignature` in runtime plugin policy to enforce strictly.
4. Set `NOEON_REQUIRE_PLUGIN_VERSION=true` to enforce version in CLI runtime.
5. Set `NOEON_REQUIRE_PLUGIN_SIGNATURE=true` to enforce signature in CLI runtime.
6. Set `NOEON_PLUGIN_SIGNING_KEY=<key>` to define signature verification key.

Per-step audit trail:

1. `simulate` appends JSONL step receipts when `audit-jsonl` path is provided.
2. `train` appends round-level audit records when `audit-jsonl` path is provided.

You can inject action-level outcomes in feedback:

```json
{
	"actionResults": {
		"risk_review": {
			"status": "failed",
			"latencyMs": 1700,
			"errorCode": "POLICY_BLOCK_GUARD",
			"reason": "risk guard rejected unresolved contradiction"
		}
	}
}
```

## CI Governance Gate

This repository includes a strict governance gate workflow:

1. `.github/workflows/noeon-gate.yml`
2. Runs `npm run gate:strict`
3. Includes conformance and strict simulation for `examples/noeon_hayek_bitcion_ai_extreme.ael`
4. Enforces plugin version and signature requirements via environment policy

Local equivalent:

```bash
npm run gate:strict
```

## Convergence Dashboard

After running `train`, start the local site and open:

- `http://localhost:5177/convergence.html`

The page reads `artifacts/noeon_convergence.json` and renders strategy trend charts.

Audit replay view is also available on the same page, reading `artifacts/noeon_audit.jsonl`.

## Standardization Assets

1. Noeon Spec v0.3 draft: `docs/spec/NOEON_SPEC_v0.3.md`
2. Conformance matrix: `docs/spec/CONFORMANCE_MATRIX_v0.3.md`
3. RFC template: `docs/rfc/RFC_TEMPLATE.md`
4. Governance process: `docs/rfc/RFC-0001-governance-process.md`
5. Plugin signature enforcement: `docs/rfc/RFC-0002-plugin-signature-enforcement.md`

## Conformance

Run reference conformance checks:

```bash
npm run conformance
```

Current conformance runner covers:

1. parser + validator reference contract acceptance
2. compiler required artifact fields
3. plugin policy and integrity enforcement paths
