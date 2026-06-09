const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { _readError: error.message };
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function fmtTs(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).mtime.toISOString();
}

function getNpmExec() {
  if (process.env.npm_execpath) {
    return { cmd: process.execPath, argsPrefix: [process.env.npm_execpath] };
  }
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return { cmd: npmCmd, argsPrefix: [] };
}

function runNpmScript(scriptName) {
  const npm = getNpmExec();
  const result = spawnSync(npm.cmd, [...npm.argsPrefix, "run", scriptName], {
    cwd: projectPath(),
    encoding: "utf8",
    env: process.env
  });

  return {
    script: scriptName,
    status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status,
    signal: result.signal || null,
    durationMs: null,
    outputTail: `${result.stdout || ""}${result.stderr || ""}`.trim().split(/\r?\n/).slice(-12)
  };
}

function evaluateArtifacts() {
  const conformancePath = projectPath("artifacts", "conformance.summary.json");
  const qualityUnifiedPath = projectPath("artifacts", "quality.unified.json");
  const score90dPath = projectPath("artifacts", "scorecard.90d.json");
  const qualityCollectPath = projectPath("artifacts", "quality.collect.json");
  const aiSelfEvalPath = projectPath("artifacts", "ai-self-eval", "self-eval.latest.json");
  const aiCreatorPath = projectPath("artifacts", "ai-creator", "creator.blueprint.latest.json");

  const conformance = readJson(conformancePath, null);
  const qualityUnified = readJson(qualityUnifiedPath, null);
  const score90d = readJson(score90dPath, null);
  const qualityCollect = readJson(qualityCollectPath, null);
  const aiSelfEval = readJson(aiSelfEvalPath, null);
  const aiCreator = readJson(aiCreatorPath, null);

  const checks = [];

  if (!conformance) {
    checks.push({ id: "conformance.summary", status: "missing", reason: "artifacts/conformance.summary.json missing" });
  } else {
    const totalFail = Number(conformance.totalFail || 0);
    const newFail = Array.isArray(conformance.newFail) ? conformance.newFail.length : 0;
    checks.push({
      id: "conformance.summary",
      status: totalFail === 0 && newFail === 0 ? "pass" : "fail",
      totalFail,
      newFail,
      baselineStatus: conformance.baselineStatus || "unknown",
      updatedAt: fmtTs(conformancePath)
    });
  }

  if (!qualityUnified) {
    checks.push({ id: "quality.unified", status: "missing", reason: "artifacts/quality.unified.json missing" });
  } else {
    const gateStatus = String(qualityUnified.gateStatus || "unknown").toUpperCase();
    checks.push({
      id: "quality.unified",
      status: gateStatus === "DEGRADED" ? "fail" : (gateStatus === "HEALTHY" ? "pass" : "warn"),
      gateStatus,
      updatedAt: fmtTs(qualityUnifiedPath)
    });
  }

  if (!score90d) {
    checks.push({ id: "scorecard.90d", status: "missing", reason: "artifacts/scorecard.90d.json missing" });
  } else {
    const decision = String(score90d.decision || "unknown");
    checks.push({
      id: "scorecard.90d",
      status: decision === "NOT_ESTABLISHED" ? "fail" : (decision === "ESTABLISHED" ? "pass" : "warn"),
      decision,
      summary: score90d.summary || null,
      updatedAt: fmtTs(score90dPath)
    });
  }

  if (!qualityCollect) {
    checks.push({ id: "quality.collect", status: "missing", reason: "artifacts/quality.collect.json missing" });
  } else {
    checks.push({
      id: "quality.collect",
      status: qualityCollect.conformanceFailed ? "fail" : "pass",
      conformanceExitCode: qualityCollect.conformanceExitCode,
      metricsExitCode: qualityCollect.metricsExitCode,
      updatedAt: fmtTs(qualityCollectPath)
    });
  }

  if (!aiSelfEval) {
    checks.push({ id: "ai.self-eval", status: "missing", reason: "artifacts/ai-self-eval/self-eval.latest.json missing" });
  } else {
    const verdict = String(aiSelfEval.verdict || "unknown");
    const score = Number(aiSelfEval.score);
    checks.push({
      id: "ai.self-eval",
      status: verdict === "needs-work" ? "fail" : (verdict === "watch" || verdict === "promising" ? "warn" : "pass"),
      verdict,
      score: Number.isFinite(score) ? score : null,
      strengths: Array.isArray(aiSelfEval.strengths) ? aiSelfEval.strengths.slice(0, 3) : [],
      actions: Array.isArray(aiSelfEval.actions) ? aiSelfEval.actions.slice(0, 3) : [],
      updatedAt: fmtTs(aiSelfEvalPath)
    });
  }

  if (!aiCreator) {
    checks.push({ id: "ai.creator", status: "missing", reason: "artifacts/ai-creator/creator.blueprint.latest.json missing" });
  } else {
    const readinessScore = Number(aiCreator.readiness?.score);
    const loop = aiCreator.cognitiveDesignContract?.loop;
    const hasCognitiveContract = Array.isArray(loop)
      && loop.join("->") === "perceive->attend->reason->decide->act->reflect->learn";
    checks.push({
      id: "ai.creator",
      status: Number.isFinite(readinessScore) && readinessScore >= 70 && hasCognitiveContract ? "pass" : "warn",
      tier: aiCreator.readiness?.tier || "unknown",
      readinessScore: Number.isFinite(readinessScore) ? readinessScore : null,
      cognitiveContract: hasCognitiveContract ? "present" : "missing-or-invalid",
      priorityActions: Array.isArray(aiCreator.priorityActions) ? aiCreator.priorityActions.slice(0, 3) : [],
      updatedAt: fmtTs(aiCreatorPath)
    });
  }

  return checks;
}

function buildDecision(executionChecks, artifactChecks) {
  const hardFailures = [];
  const warnings = [];

  for (const c of [...executionChecks, ...artifactChecks]) {
    if (c.status === "fail") hardFailures.push(c.id || c.script);
    if (c.status === "warn" || c.status === "missing") warnings.push(c.id || c.script);
  }

  return {
    status: hardFailures.length > 0 ? "FAIL" : (warnings.length > 0 ? "WARN" : "PASS"),
    hardFailures,
    warnings
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Noeon Release Gate Report");
  lines.push("");
  lines.push(`- Timestamp: ${report.timestamp}`);
  lines.push(`- Decision: **${report.decision.status}**`);
  lines.push(`- Run mode: ${report.runMode ? "execute" : "artifact-only"}`);
  lines.push("");

  lines.push("## Execution Checks");
  lines.push("");
  lines.push("| Script | Status | Exit | Note |");
  lines.push("|---|---|---:|---|");
  for (const c of report.executionChecks) {
    lines.push(`| ${c.script} | ${c.status} | ${c.exitCode == null ? "-" : c.exitCode} | ${(c.note || "").replace(/\|/g, "\\|")} |`);
  }
  lines.push("");

  lines.push("## Artifact Checks");
  lines.push("");
  lines.push("| Check | Status | Detail |");
  lines.push("|---|---|---|");
  for (const c of report.artifactChecks) {
    const detail = [
      c.reason,
      c.gateStatus ? `gate=${c.gateStatus}` : null,
      c.decision ? `decision=${c.decision}` : null,
      c.tier ? `tier=${c.tier}` : null,
      Number.isFinite(c.readinessScore) ? `readiness=${c.readinessScore}` : null,
      c.cognitiveContract ? `cognitiveContract=${c.cognitiveContract}` : null,
      Number.isFinite(c.totalFail) ? `totalFail=${c.totalFail}` : null,
      Number.isFinite(c.newFail) ? `newFail=${c.newFail}` : null,
      c.updatedAt ? `updated=${c.updatedAt}` : null
    ].filter(Boolean).join("; ");
    lines.push(`| ${c.id} | ${c.status} | ${(detail || "-").replace(/\|/g, "\\|")} |`);
  }
  lines.push("");

  if (report.aiSelfEval) {
    lines.push("## AI Self Evaluation");
    lines.push("");
    lines.push(`- Score: ${report.aiSelfEval.score ?? "unknown"}`);
    lines.push(`- Verdict: **${report.aiSelfEval.verdict || "unknown"}**`);
    if (Array.isArray(report.aiSelfEval.strengths) && report.aiSelfEval.strengths.length > 0) {
      lines.push("- Strengths:");
      for (const item of report.aiSelfEval.strengths) {
        lines.push(`  - ${item}`);
      }
    }
    if (Array.isArray(report.aiSelfEval.risks) && report.aiSelfEval.risks.length > 0) {
      lines.push("- Risks:");
      for (const item of report.aiSelfEval.risks) {
        lines.push(`  - ${item}`);
      }
    }
    lines.push("");
    lines.push("## Recommended Next Actions");
    lines.push("");
    if (Array.isArray(report.aiSelfEval.actions) && report.aiSelfEval.actions.length > 0) {
      for (const item of report.aiSelfEval.actions) {
        lines.push(`- ${item}`);
      }
    } else {
      lines.push("- No AI recommendations available.");
    }
    lines.push("");
  }

  if (report.aiCreator) {
    lines.push("## AI Creator Blueprint");
    lines.push("");
    lines.push(`- Readiness: ${report.aiCreator.readiness?.score ?? "unknown"}/100`);
    lines.push(`- Tier: **${report.aiCreator.readiness?.tier || "unknown"}**`);
    lines.push(`- Vision: ${report.aiCreator.vision || "unknown"}`);
    lines.push("");
    lines.push("## Creator Priority Actions");
    lines.push("");
    if (Array.isArray(report.aiCreator.priorityActions) && report.aiCreator.priorityActions.length > 0) {
      for (const item of report.aiCreator.priorityActions) {
        lines.push(`- ${item}`);
      }
    } else {
      lines.push("- No creator actions available.");
    }
    lines.push("");
  }

  if (report.decision.hardFailures.length > 0) {
    lines.push("## Hard Failures");
    lines.push("");
    for (const item of report.decision.hardFailures) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (report.decision.warnings.length > 0) {
    lines.push("## Warnings / Missing Inputs");
    lines.push("");
    for (const item of report.decision.warnings) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const runMode = args.includes("--run");
  const strictMode = args.includes("--strict");
  const outDir = projectPath("artifacts", "release-gate");
  ensureDir(outDir);

  const packageJson = readJson(projectPath("package.json"), { scripts: {} });
  const scripts = packageJson?.scripts || {};

  const executionPlan = [
    "test:next",
    "test:canonical",
    "test:system",
    "test:fusion",
    "conformance",
    "quality:90d",
    "quality:snapshot"
  ];

  const executionChecks = executionPlan.map((scriptName) => {
    if (!scripts[scriptName]) {
      return {
        script: scriptName,
        status: "missing",
        exitCode: null,
        note: "script not defined in package.json"
      };
    }

    if (!runMode) {
      return {
        script: scriptName,
        status: "skipped",
        exitCode: null,
        note: "not executed (artifact-only mode)"
      };
    }

    const started = Date.now();
    const result = runNpmScript(scriptName);
    result.durationMs = Date.now() - started;
    result.note = result.status === "pass"
      ? `completed in ${result.durationMs}ms`
      : `failed in ${result.durationMs}ms`;
    return result;
  });

  const artifactChecks = evaluateArtifacts();
  const decision = buildDecision(executionChecks, artifactChecks);
  const aiSelfEval = readJson(projectPath("artifacts", "ai-self-eval", "self-eval.latest.json"), null);
  const aiCreator = readJson(projectPath("artifacts", "ai-creator", "creator.blueprint.latest.json"), null);

  const report = {
    schema: "noeon.release.gate/v1",
    timestamp: nowIso(),
    runMode,
    strictMode,
    executionChecks,
    artifactChecks,
    aiSelfEval,
    aiCreator,
    decision
  };

  const stamp = nowIso().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `release-gate.${stamp}.json`);
  const mdPath = path.join(outDir, `release-gate.${stamp}.md`);
  const latestJson = path.join(outDir, "release-gate.latest.json");
  const latestMd = path.join(outDir, "release-gate.latest.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(mdPath, toMarkdown(report), "utf8");
  fs.writeFileSync(latestJson, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(latestMd, toMarkdown(report), "utf8");

  console.log(`Release gate report written:`);
  console.log(`- ${jsonPath}`);
  console.log(`- ${mdPath}`);
  console.log(`Decision: ${decision.status}`);

  if (strictMode && decision.status === "FAIL") {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
