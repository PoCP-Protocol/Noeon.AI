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

function toPercentDelta(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) {
    return null;
  }
  return Number((((baseline - current) / baseline) * 100).toFixed(2));
}

function toDiff(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) {
    return null;
  }
  return Number((current - baseline).toFixed(2));
}

function evaluateMetric(metric, value) {
  if (!Number.isFinite(value)) {
    return {
      id: metric.id,
      name: metric.name,
      status: "PENDING",
      value: null,
      threshold: metric.threshold,
      note: "evidence_missing"
    };
  }

  const pass = metric.direction === "gte" ? value >= metric.threshold : value <= metric.threshold;

  return {
    id: metric.id,
    name: metric.name,
    status: pass ? "PASS" : "FAIL",
    value,
    threshold: metric.threshold
  };
}

function main() {
  const config = readJson(projectPath("artifacts", "scorecard.90d.config.json"), null);
  if (!config || config._readError) {
    console.error("Missing or invalid config: artifacts/scorecard.90d.config.json");
    process.exit(1);
  }

  const unified = readJson(projectPath("artifacts", "quality.unified.json"), {});
  const evidence = readJson(projectPath("artifacts", "scorecard.90d.evidence.json"), {});

  const productivityValue = toPercentDelta(
    evidence?.productivity?.noeonMeanStatements,
    evidence?.productivity?.baselineMeanStatements
  );

  const reliabilityValue = toDiff(
    evidence?.reliability?.noeonSuccessRate,
    evidence?.reliability?.baselineSuccessRate
  );

  const governanceReplay = evidence?.governance?.auditReplaySuccessRate;

  const metricValues = {
    expression_compression: productivityValue,
    reliability_delta: reliabilityValue,
    audit_replay_success: governanceReplay
  };

  const metrics = config.metrics.map((metric) =>
    evaluateMetric(metric, metricValues[metric.id])
  );

  const passCount = metrics.filter((item) => item.status === "PASS").length;
  const failCount = metrics.filter((item) => item.status === "FAIL").length;
  const pendingCount = metrics.filter((item) => item.status === "PENDING").length;

  let decision = "PENDING";
  if (failCount > 0) {
    decision = "NOT_ESTABLISHED";
  } else if (passCount >= config.requiredPassCount && pendingCount === 0) {
    decision = "ESTABLISHED";
  }

  const report = {
    timestamp: new Date().toISOString(),
    windowDays: config.windowDays,
    requiredPassCount: config.requiredPassCount,
    decision,
    summary: {
      passCount,
      failCount,
      pendingCount
    },
    metricResults: metrics,
    inputs: {
      qualityGateStatus: unified.gateStatus || "unknown",
      evidenceVersion: evidence.version || "missing"
    }
  };

  const outPath = projectPath("artifacts", "scorecard.90d.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("90-day scorecard:");
  console.log(JSON.stringify(report, null, 2));

  if (decision === "NOT_ESTABLISHED") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
