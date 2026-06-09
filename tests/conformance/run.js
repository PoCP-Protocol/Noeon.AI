const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const { parseAel } = require("../../src/parser");
const { validateAel } = require("../../src/validator");
const { compileAel } = require("../../src/compiler");
const { runActionStep } = require("../../src/runtime/action-runner");
const { expectedSignature } = require("../../src/runtime/plugins/integrity");
const { runSuperBrainCycle } = require("../../src/runtime/simulator");

const originalMetaPolicyFile = process.env.NOEON_META_POLICY_FILE;
delete process.env.NOEON_META_POLICY_FILE;

function projectPath(...parts) {
  return path.resolve(__dirname, "..", "..", ...parts);
}

function loadExample(relPath) {
  return fs.readFileSync(projectPath(relPath), "utf8");
}

function baseContext(actionBindings, pluginPolicy = {}) {
  return {
    task: "macro.research.synthesis",
    network: "NoeonNet",
    feedback: {},
    adaptiveProfile: { latencyScale: 1 },
    actionBindings,
    pluginPolicy
  };
}

const queuedTests = [];

function run(name, fn) {
  queuedTests.push({ name, fn });
}

run("parser and validator accept reference contract", async () => {
  const source = loadExample("examples/noeon_superbrain.ael");
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(ast.network, "NoeonNet");
  assert.equal(ast.cognition.plan.length >= 1, true);
  assert.equal(result.valid, true);
});

run("parser accepts native cognition directives", async () => {
  const source = loadExample("examples/noeon_native_mind.ael");
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(ast.cognition.nativeAI.mode, "hybrid");
  assert.equal(ast.cognition.selfCheck.metric, "uncertainty");
  assert.equal(ast.cognition.infer.strategy, "hybrid");
  assert.equal(ast.cognition.critic.mode, "peer");
  assert.equal(ast.cognition.critic.veto, true);
  assert.equal(ast.cognition.hypotheses.length >= 2, true);
  assert.equal(ast.cognition.evidences.length >= 2, true);
  assert.equal(ast.cognition.counterexamples.length >= 2, true);
  assert.equal(ast.cognition.counterexamples[0].against.length > 0, true);
  assert.equal(ast.cognition.traces.length >= 4, true);
  assert.equal(ast.cognition.traces[0].step.length > 0, true);
  assert.equal(typeof ast.cognition.debate.topic, "string");
  assert.equal(ast.cognition.debate.protocol, "socratic");
  assert.equal(ast.cognition.arbitration.mode, "jury");
  assert.equal(ast.cognition.arbitration.fallback, "escalate");
  assert.equal(ast.cognition.jurors.length >= 3, true);
  assert.equal(ast.cognition.jurors[0].weight > 0, true);
  assert.equal(result.valid, true);
});

run("compute directives parse and validate", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nLET base_score = 10\nCOMPUTE adjusted = base_score * 2 + 5\nASSERT adjusted > 0 message=compute_assertion_ok\nRETURN adjusted`;
  const ast = parseAel(source);
  const result = validateAel(ast);
  const compiled = compileAel(ast);

  assert.equal(Array.isArray(ast.compute.bindings), true);
  assert.equal(ast.compute.bindings.length, 2);
  assert.equal(ast.compute.assertions.length, 1);
  assert.equal(ast.compute.returnExpr.expr, "adjusted");
  assert.equal(result.valid, true);
  assert.equal(Array.isArray(compiled.contract.compute.bindings), true);
  assert.equal(compiled.contract.compute.bindings.length, 2);
});

run("compute DEF signatures parse and compile", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nDEF score_boost(base, weight) = base * weight + 1\nLET base = 10\nLET weight = 2\nCOMPUTE boosted = base * weight + 1\nRETURN boosted`;
  const ast = parseAel(source);
  const result = validateAel(ast);
  const compiled = compileAel(ast);

  assert.equal(Array.isArray(ast.compute.functions), true);
  assert.equal(ast.compute.functions.length, 1);
  assert.equal(ast.compute.functions[0].name, "score_boost");
  assert.deepEqual(ast.compute.functions[0].params, ["base", "weight"]);
  assert.equal(result.valid, true);
  assert.equal(Array.isArray(compiled.contract.compute.functions), true);
  assert.equal(compiled.contract.compute.functions.length, 1);
});

run("compute DEF validation rejects duplicate parameters", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nDEF broken(x, x) = x + 1\nLET x = 1\nRETURN x`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((msg) => msg.includes("DEF 'broken' has duplicated parameter 'x'")),
    true
  );
});

run("compute DEF can be executed in runtime expressions", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nDEF double(x) = x * 2\nDEF boost(x) = double(x) + 1\nLET base = 10\nCOMPUTE out = boost(base)\nRETURN out`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.81,
    disputeRate: 0.09,
    maliciousRate: 0.02,
    observedLatencyMs: 1600
  });

  assert.equal(cycle.execution.compute.env.out, 21);
  assert.equal(cycle.execution.compute.result, 21);
});

run("compute DEF reports undefined function usage", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nLET base = 10\nCOMPUTE out = missingFn(base)\nRETURN out`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((msg) => msg.includes("undefined compute function 'missingFn'")),
    true
  );
});

run("compute IF parses and executes selected branch", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nLET base = 8\nIF gate = base > 5 ? 100 : 1\nRETURN gate`;
  const ast = parseAel(source);
  const result = validateAel(ast);
  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.8,
    disputeRate: 0.1,
    maliciousRate: 0.02,
    observedLatencyMs: 1800
  });

  assert.equal(Array.isArray(ast.compute.branches), true);
  assert.equal(ast.compute.branches.length, 1);
  assert.equal(result.valid, true);
  assert.equal(cycle.execution.compute.env.gate, 100);
  assert.equal(
    cycle.execution.compute.receipts.some((r) => r.kind === "IF" && r.status === "done"),
    true
  );
});

run("compute IF validation rejects non-boolean condition", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nLET base = 2\nIF gate = base + 1 ? 100 : 1\nRETURN gate`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((msg) => msg.includes("IF 'gate' condition must evaluate to boolean")),
    true
  );
});

run("compute validation fails on undefined symbol", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nCOMPUTE adjusted = missing_symbol + 1\nRETURN adjusted`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((msg) => msg.includes("undefined compute symbol 'missing_symbol'")),
    true
  );
});

run("compute validation enforces CALL policy fields", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nLET base = 1\nCALL "compute_step" plugin=echo input=base\nRETURN base`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.some((msg) => msg.includes("CALL 'compute_step' requires budget_ms")),
    true
  );
  assert.equal(
    result.errors.some((msg) => msg.includes("CALL 'compute_step' requires timeout_ms")),
    true
  );
});

run("simulate emits compute receipts for CALL", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nLET base = 4\nCOMPUTE score = base * 3\nCALL "compute_step" plugin=echo input=score budget_ms=200 timeout_ms=300\nRETURN score`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.8,
    disputeRate: 0.1,
    maliciousRate: 0.02,
    observedLatencyMs: 3000
  });

  assert.equal(typeof cycle.execution.compute, "object");
  assert.equal(Array.isArray(cycle.execution.compute.receipts), true);
  assert.equal(
    cycle.execution.compute.receipts.some((r) => r.kind === "CALL" && r.step === "compute_step"),
    true
  );
});

run("meta rules can validate runtime.compute.env", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_RANGE path=runtime.compute.env.score min=10 max=100 level=error message=meta_compute_score_out_of_range\nLET base = 5\nCOMPUTE score = base * 15\nCALL "compute_step" plugin=echo input=score budget_ms=200 timeout_ms=300\nRETURN score`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.8,
    disputeRate: 0.1,
    maliciousRate: 0.02,
    observedLatencyMs: 3000
  });

  assert.equal(cycle.cognition.metaPolicy.enabled, true);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) =>
      String(v.message).includes("meta_compute_score_out_of_range")
    ),
    false
  );
});

run("meta rules can validate runtime.compute.receipts", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_REQUIRE path=runtime.compute.receipts level=error message=meta_compute_must_have_receipts\nLET base = 4\nCOMPUTE value = base * 2\nCALL "compute_verify" plugin=echo input=value budget_ms=150 timeout_ms=250\nRETURN value`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.85,
    disputeRate: 0.05,
    maliciousRate: 0.01,
    observedLatencyMs: 2000
  });

  assert.equal(cycle.cognition.metaPolicy.enabled, true);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) =>
      String(v.message).includes("meta_compute_must_have_receipts")
    ),
    false
  );
  assert.equal(Array.isArray(cycle.execution.compute.receipts), true);
  assert.equal(cycle.execution.compute.receipts.length >= 2, true);
});

run("meta rules can gate runtime.compute.summary.callFailureRate", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_RANGE path=runtime.compute.summary.callFailureRate min=0 max=0 level=error message=meta_compute_call_failure_rate_must_be_zero\nLET base = 4\nCALL "broken_call" plugin=missing_plugin input=base budget_ms=120 timeout_ms=120\nRETURN base`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.85,
    disputeRate: 0.05,
    maliciousRate: 0.01,
    observedLatencyMs: 2000
  });

  assert.equal(cycle.execution.compute.summary.callTotal >= 1, true);
  assert.equal(cycle.execution.compute.summary.callFailureRate > 0, true);
  assert.equal(cycle.cognition.metaPolicy.hardened, true);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) =>
      String(v.message).includes("meta_compute_call_failure_rate_must_be_zero")
    ),
    true
  );
});

run("meta rules can gate runtime.compute.summary.callFailed", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_RANGE path=runtime.compute.summary.callFailed min=0 max=0 level=error message=meta_compute_call_failed_count_must_be_zero\nLET base = 4\nCALL "broken_call" plugin=missing_plugin input=base budget_ms=120 timeout_ms=120\nRETURN base`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.85,
    disputeRate: 0.05,
    maliciousRate: 0.01,
    observedLatencyMs: 2000
  });

  assert.equal(cycle.execution.compute.summary.callTotal >= 1, true);
  assert.equal(cycle.execution.compute.summary.callFailed >= 1, true);
  assert.equal(cycle.cognition.metaPolicy.hardened, true);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) =>
      String(v.message).includes("meta_compute_call_failed_count_must_be_zero")
    ),
    true
  );
});

run("meta rules can gate runtime.compute.summary.diagnosticCount", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_RANGE path=runtime.compute.summary.diagnosticCount min=0 max=0 level=error message=meta_compute_diagnostic_count_must_be_zero\nLET base = 4\nCALL "broken_call" plugin=missing_plugin input=base budget_ms=120 timeout_ms=120\nRETURN base`;
  const ast = parseAel(source);
  const validation = validateAel(ast);
  assert.equal(validation.valid, true);

  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.85,
    disputeRate: 0.05,
    maliciousRate: 0.01,
    observedLatencyMs: 2000
  });

  assert.equal(cycle.execution.compute.summary.diagnosticCount >= 1, true);
  assert.equal(cycle.cognition.metaPolicy.hardened, true);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) =>
      String(v.message).includes("meta_compute_diagnostic_count_must_be_zero")
    ),
    true
  );
});

run("meta rules drive dynamic validation", async () => {
  const source = loadExample("examples/noeon_meta_selfhost.ael");
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(typeof ast.metaProfile, "object");
  assert.equal(ast.metaProfile.name, "strict_core");
  assert.equal(Array.isArray(ast.metaProfile.extends), true);
  assert.equal(ast.metaProfile.extends.includes("baseline_guard"), true);
  assert.equal(Array.isArray(ast.metaRules), true);
  assert.equal(ast.metaRules.length >= 3, true);
  assert.equal(result.valid, false);
  assert.equal(
    result.warnings.some((msg) => msg.includes("meta warn: risk profile should be strict")),
    true
  );
  assert.equal(
    result.errors.some((msg) => msg.includes("meta_enforce_high_challenge_window")),
    true
  );
  assert.equal(
    result.errors.some((msg) => msg.includes("meta relation: high risk requires challenge >= 600")),
    true
  );
  assert.equal(
    result.errors.some((msg) => msg.includes("[noeon.policy/strict_core@1.0]")),
    true
  );
});

run("meta profile advisory downgrades rule severity in validator", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_PROFILE name=advisory_guard namespace=noeon.policy version=1.0 mode=advisory\nMETA_RANGE path=verify.challengeSeconds min=5000 max=6000 level=error message=meta_advisory_should_warn`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(ast.metaProfile.mode, "advisory");
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.some((msg) => msg.includes("meta_advisory_should_warn")), true);
  assert.equal(result.warnings.some((msg) => msg.includes("[noeon.policy/advisory_guard@1.0]")), true);
});

run("meta conflict uses last-win in validator", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_RANGE path=verify.challengeSeconds min=700 max=900 level=error message=meta_old_block\nMETA_RANGE path=contract.verify.challengeSeconds min=1000 max=1300 level=error message=meta_new_allow`;
  const ast = parseAel(source);
  const result = validateAel(ast);

  assert.equal(result.valid, true);
  assert.equal(result.errors.some((msg) => msg.includes("meta_old_block")), false);
  assert.equal(result.warnings.some((msg) => msg.includes("meta conflict resolved by last-win")), true);
});

run("compiler emits required artifact contract fields", async () => {
  const source = loadExample("examples/noeon_superbrain.ael");
  const ast = parseAel(source);
  const compiled = compileAel(ast);

  assert.equal(typeof compiled.spec.name, "string");
  assert.equal(typeof compiled.spec.version, "string");
  assert.equal(typeof compiled.contract.network, "string");
  assert.equal(typeof compiled.contract.task, "string");
  assert.equal(typeof compiled.contract.cognition, "object");
  assert.equal(typeof compiled.contract.verify, "object");
  assert.equal(typeof compiled.contract.collateral, "object");
  assert.equal(typeof compiled.contract.settlement, "object");
  assert.equal(Array.isArray(compiled.runtime.transitions), true);
  assert.equal(typeof compiled.runtime.neuralLoops, "object");
});

run("parser and compiler preserve meta rules", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_PROFILE name=strict_core namespace=noeon.policy version=1.0 mode=enforce extends=baseline_guard,org_default\nMETA_REQUIRE path=contract.cognition.goal level=error`;
  const ast = parseAel(source);
  const compiled = compileAel(ast);

  assert.equal(Array.isArray(ast.metaRules), true);
  assert.equal(ast.metaRules.length >= 1, true);
  assert.equal(typeof ast.metaProfile, "object");
  assert.equal(Array.isArray(compiled.spec.metaRules), true);
  assert.equal(compiled.spec.metaRules.length >= 1, true);
  assert.equal(compiled.spec.metaProfile.name, "strict_core");
  assert.equal(compiled.spec.metaProfile.extends.includes("baseline_guard"), true);
});

run("meta policy hardens runtime when blocking rules fail", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_REQUIRE path=feedback.proofHash level=error`;
  const ast = parseAel(source);
  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.7,
    disputeRate: 0.2,
    maliciousRate: 0.1,
    observedLatencyMs: 9000
  });

  assert.equal(cycle.cognition.metaPolicy.enabled, true);
  assert.equal(cycle.cognition.metaPolicy.hardened, true);
  assert.equal(cycle.cognition.executionProfile.verificationMode, "manual");
  assert.equal(cycle.adaptation.updates.verify.challengeSeconds >= 900, true);
  assert.equal(cycle.adaptation.updates.slash.malicious >= 95, true);
});

run("external meta policy file can harden runtime", async () => {
  const source = loadExample("examples/noeon_superbrain.ael");
  const ast = parseAel(source);
  const compiled = compileAel(ast);

  const externalPolicyPath = projectPath("artifacts", "conformance.meta-policy.json");
  const original = process.env.NOEON_META_POLICY_FILE;
  fs.writeFileSync(
    externalPolicyPath,
    JSON.stringify(
      {
        profile: {
          name: "external-strict",
          namespace: "noeon.meta",
          version: "1.0",
          mode: "enforce"
        },
        rules: [
          {
            kind: "require",
            path: "feedback.proofHash",
            level: "error",
            message: "external policy requires feedback proof hash"
          }
        ]
      },
      null,
      2
    ),
    "utf8"
  );

  try {
    process.env.NOEON_META_POLICY_FILE = externalPolicyPath;
    const cycle = await runSuperBrainCycle(compiled, {
      successRate: 0.82,
      disputeRate: 0.09,
      maliciousRate: 0.03,
      observedLatencyMs: 4200
    });

    assert.equal(cycle.cognition.metaPolicy.enabled, true);
    assert.equal(cycle.cognition.metaPolicy.hardened, true);
    assert.equal(
      cycle.cognition.metaPolicy.violations.some((v) =>
        String(v.message).includes("external policy requires feedback proof hash")
      ),
      true
    );
  } finally {
    if (original === undefined) {
      delete process.env.NOEON_META_POLICY_FILE;
    } else {
      process.env.NOEON_META_POLICY_FILE = original;
    }

    if (fs.existsSync(externalPolicyPath)) {
      fs.unlinkSync(externalPolicyPath);
    }
  }
});

run("external profile inheritance loads parent rules", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_PROFILE name=strict_child namespace=noeon.meta version=1.0 mode=enforce extends=baseline_parent`;
  const ast = parseAel(source);
  const compiled = compileAel(ast);

  const externalPolicyPath = projectPath("artifacts", "conformance.meta-policy.inherit.json");
  const original = process.env.NOEON_META_POLICY_FILE;
  fs.writeFileSync(
    externalPolicyPath,
    JSON.stringify(
      {
        profiles: {
          baseline_parent: {
            name: "baseline_parent",
            namespace: "noeon.meta",
            version: "1.0",
            mode: "enforce",
            rules: [
              {
                kind: "require",
                path: "feedback.proofHash",
                level: "error",
                message: "parent profile requires proof hash"
              }
            ]
          },
          strict_child: {
            name: "strict_child",
            namespace: "noeon.meta",
            version: "1.0",
            mode: "enforce",
            extends: ["baseline_parent"],
            rules: []
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );

  try {
    process.env.NOEON_META_POLICY_FILE = externalPolicyPath;
    const cycle = await runSuperBrainCycle(compiled, {
      successRate: 0.8,
      disputeRate: 0.1,
      maliciousRate: 0.05,
      observedLatencyMs: 4000
    });

    assert.equal(cycle.cognition.metaPolicy.enabled, true);
    assert.equal(cycle.cognition.metaPolicy.hardened, true);
    assert.equal(
      cycle.cognition.metaPolicy.violations.some((v) =>
        String(v.message).includes("parent profile requires proof hash")
      ),
      true
    );
  } finally {
    if (original === undefined) {
      delete process.env.NOEON_META_POLICY_FILE;
    } else {
      process.env.NOEON_META_POLICY_FILE = original;
    }

    if (fs.existsSync(externalPolicyPath)) {
      fs.unlinkSync(externalPolicyPath);
    }
  }
});

run("external profile inheritance cycle emits warning", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_PROFILE name=cycle_a namespace=noeon.meta version=1.0 mode=enforce extends=cycle_b`;
  const ast = parseAel(source);
  const compiled = compileAel(ast);

  const externalPolicyPath = projectPath("artifacts", "conformance.meta-policy.cycle.json");
  const original = process.env.NOEON_META_POLICY_FILE;
  fs.writeFileSync(
    externalPolicyPath,
    JSON.stringify(
      {
        profiles: {
          cycle_a: {
            name: "cycle_a",
            extends: ["cycle_b"],
            rules: []
          },
          cycle_b: {
            name: "cycle_b",
            extends: ["cycle_a"],
            rules: []
          }
        }
      },
      null,
      2
    ),
    "utf8"
  );

  try {
    process.env.NOEON_META_POLICY_FILE = externalPolicyPath;
    const cycle = await runSuperBrainCycle(compiled, {
      successRate: 0.8,
      disputeRate: 0.1,
      maliciousRate: 0.05,
      observedLatencyMs: 4000
    });

    assert.equal(
      cycle.cognition.metaPolicy.violations.some((v) =>
        String(v.message).includes("inheritance cycle detected")
      ),
      true
    );
  } finally {
    if (original === undefined) {
      delete process.env.NOEON_META_POLICY_FILE;
    } else {
      process.env.NOEON_META_POLICY_FILE = original;
    }

    if (fs.existsSync(externalPolicyPath)) {
      fs.unlinkSync(externalPolicyPath);
    }
  }
});

run("meta profile advisory prevents runtime hardening for advisory violations", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_PROFILE name=advisory_guard namespace=noeon.policy version=1.0 mode=advisory\nMETA_REQUIRE path=feedback.proofHash level=error message=meta_runtime_advisory`;
  const ast = parseAel(source);
  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.7,
    disputeRate: 0.2,
    maliciousRate: 0.1,
    observedLatencyMs: 9000
  });

  assert.equal(cycle.cognition.metaPolicy.enabled, true);
  assert.equal(cycle.cognition.metaPolicy.profile.name, "advisory_guard");
  assert.equal(cycle.cognition.metaPolicy.hardened, false);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) => v.level === "warning"),
    true
  );
});

run("meta conflict uses last-win in runtime engine", async () => {
  const source = `${loadExample("examples/noeon_superbrain.ael")}\nMETA_REQUIRE path=feedback.proofHash level=error message=runtime_old_block\nMETA_REQUIRE path=feedback.proofHash level=warning message=runtime_new_warn`;
  const ast = parseAel(source);
  const compiled = compileAel(ast);
  const cycle = await runSuperBrainCycle(compiled, {
    successRate: 0.8,
    disputeRate: 0.1,
    maliciousRate: 0.05,
    observedLatencyMs: 3000
  });

  assert.equal(cycle.cognition.metaPolicy.hardened, false);
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) => String(v.message).includes("runtime_new_warn")),
    true
  );
  assert.equal(
    cycle.cognition.metaPolicy.violations.some((v) => String(v.message).includes("meta conflict resolved by last-win")),
    true
  );
});

run("runtime denies when version is required but missing", async () => {
  const result = await runActionStep(
    "collect_signals",
    baseContext(
      {
        collect_signals: { plugin: "echo", latencyMs: 100 }
      },
      {
        requireVersion: true
      }
    )
  );

  assert.equal(result.status, "failed");
  assert.equal(result.failureCategory, "policy_block");
  assert.equal(result.receipt.errorCode, "PLUGIN_VERSION_REQUIRED");
});

run("runtime denies plugin version mismatch", async () => {
  const result = await runActionStep(
    "collect_signals",
    baseContext({
      collect_signals: { plugin: "echo", version: "9.9.9", latencyMs: 100 }
    })
  );

  assert.equal(result.status, "failed");
  assert.equal(result.failureCategory, "policy_block");
  assert.equal(result.receipt.errorCode, "PLUGIN_VERSION_MISMATCH");
});

run("runtime denies when signature is required but missing", async () => {
  const result = await runActionStep(
    "collect_signals",
    baseContext(
      {
        collect_signals: { plugin: "echo", version: "1.0.0", latencyMs: 100 }
      },
      {
        requireVersion: true,
        requireSignature: true
      }
    )
  );

  assert.equal(result.status, "failed");
  assert.equal(result.failureCategory, "policy_block");
  assert.equal(result.receipt.errorCode, "PLUGIN_SIGNATURE_REQUIRED");
});

run("runtime accepts valid signature and reports verification", async () => {
  const signingKey = "conformance-key";
  const signature = expectedSignature("echo", "1.0.0", signingKey);

  const result = await runActionStep(
    "collect_signals",
    baseContext(
      {
        collect_signals: {
          plugin: "echo",
          version: "1.0.0",
          signature,
          latencyMs: 100
        }
      },
      {
        requireVersion: true,
        requireSignature: true,
        signingKey
      }
    )
  );

  assert.equal(result.status, "done");
  assert.equal(result.receipt.plugin, "echo");
  assert.equal(result.receipt.pluginVersion, "1.0.0");
  assert.equal(result.receipt.signatureVerified, true);
  assert.equal(typeof result.receipt.expectedSignature, "string");
  assert.equal(result.receipt.expectedSignature.startsWith("hmac-sha256:"), true);
});

run("canonical parity surfaces emit unified report", async () => {
  const { parseAel } = require("../../src/parser");
  const { executeProgram } = require("../../src/vm/unified-executor");
  const { validateCanonicalReport } = require("../../src/core/canonical-contract");

  const PARITY_GOAL = "Assess market risk with evidence";
  const parityDir = projectPath("examples", "parity");
  const files = ["risk_assess.noeon", "risk_assess.next", "risk_assess.ael", "risk_assess.lim"];

  for (const file of files) {
    const filePath = path.join(parityDir, file);
    const ast = parseAel(fs.readFileSync(filePath, "utf8"), { filename: filePath });
    const run = await executeProgram(ast, {
      quiet: true,
      with_protocol: "off",
      filename: filePath,
      triad: false
    });
    assert.equal(run.executor, "canonical", `${file} uses canonical executor`);
    assert.equal(run.irFirst, true, `${file} is IR-first`);
    const contract = validateCanonicalReport(run.report);
    assert.equal(contract.valid, true, `${file} report contract (${contract.missing.join(", ")})`);
    assert.equal(run.report.intent.goal, PARITY_GOAL, `${file} shared intent.goal`);
  }
});

(async () => {
  for (const { name, fn } of queuedTests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (err) {
      console.error(`FAIL ${name}`);
      console.error(err.stack || err.message);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log("All conformance checks passed.");
  }

  if (originalMetaPolicyFile === undefined) {
    delete process.env.NOEON_META_POLICY_FILE;
  } else {
    process.env.NOEON_META_POLICY_FILE = originalMetaPolicyFile;
  }
})();
