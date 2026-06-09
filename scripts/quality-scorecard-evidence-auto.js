const fs = require("node:fs");
const path = require("node:path");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { _readError: error.message };
  }
}

function parsePercent(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value.replace("%", ""));
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function getReleaseScriptCount(packageJson) {
  const scripts = packageJson?.scripts || {};
  const names = Object.keys(scripts);
  const releaseRelevant = names.filter((name) => /^(gate:|quality:|conformance|metrics|ai:self-eval)/.test(name));
  return {
    totalScripts: names.length,
    releaseRelevantScripts: releaseRelevant.length,
    releaseRelevantNames: releaseRelevant
  };
}

function main() {
  const packageJson = readJson(projectPath("package.json"), { scripts: {} });
  const unified = readJson(projectPath("artifacts", "quality.unified.json"), {});
  const metrics = readJson(projectPath("artifacts", "quality.metrics.json"), {});
  const conformanceSummary = readJson(projectPath("artifacts", "conformance.summary.json"), {});
  const releaseGate = readJson(projectPath("artifacts", "release-gate", "release-gate.latest.json"), {});
  const aiSelfEval = readJson(projectPath("artifacts", "ai-self-eval", "self-eval.latest.json"), {});

  const scriptStats = getReleaseScriptCount(packageJson);
  const baselineMeanStatements = scriptStats.totalScripts;
  const noeonMeanStatements = scriptStats.releaseRelevantScripts;
  const releaseCompression = baselineMeanStatements > 0
    ? Number((((baselineMeanStatements - noeonMeanStatements) / baselineMeanStatements) * 100).toFixed(2))
    : null;

  const baselineSuccessRate = parsePercent(unified?.gates?.metrics?.passRate) ?? 0;
  const qualityMetricsPassRate = parsePercent(metrics?.metrics?.passRate);
  const currentSuccessRate = Number.isFinite(qualityMetricsPassRate)
    ? qualityMetricsPassRate
    : baselineSuccessRate;
  const reliabilityDelta = Number((currentSuccessRate - baselineSuccessRate).toFixed(2));

  const auditReplaySuccessRate = conformanceSummary?.totalFail === 0 && releaseGate?.decision?.status !== "FAIL"
    ? 100
    : 0;

  const evidence = {
    version: "v1",
    updatedAt: new Date().toISOString(),
    productivity: {
      baselineMeanStatements,
      noeonMeanStatements,
      method: "release-surface-compression",
      note: "Proxy metric derived from total script surface vs release-oriented operational surface",
      source: {
        totalScripts: scriptStats.totalScripts,
        releaseRelevantScripts: scriptStats.releaseRelevantScripts,
        releaseRelevantNames: scriptStats.releaseRelevantNames.slice(0, 20)
      }
    },
    reliability: {
      baselineSuccessRate,
      noeonSuccessRate: currentSuccessRate,
      delta: reliabilityDelta,
      method: "quality-metrics-vs-unified-baseline",
      note: "Proxy metric derived from current quality pass rate compared with the unified quality baseline"
    },
    governance: {
      auditReplaySuccessRate,
      method: "conformance-and-gate-replay",
      note: "Proxy metric treats fully passing conformance plus non-failing gate output as successful audit replay",
      source: {
        conformanceTotalPass: conformanceSummary?.totalPass ?? null,
        conformanceTotalFail: conformanceSummary?.totalFail ?? null,
        releaseGateDecision: releaseGate?.decision?.status || "unknown"
      }
    },
    context: {
      qualityGateStatus: unified?.gateStatus || "unknown",
      aiSelfEvalScore: aiSelfEval?.score ?? null,
      aiSelfEvalVerdict: aiSelfEval?.verdict || "unknown",
      releaseCompression,
      releaseRelevantScripts: scriptStats.releaseRelevantScripts
    }
  };

  const outPath = projectPath("artifacts", "scorecard.90d.evidence.json");
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2), "utf8");

  console.log("Generated 90-day scorecard evidence:");
  console.log(JSON.stringify(evidence, null, 2));
}

if (require.main === module) {
  main();
}
