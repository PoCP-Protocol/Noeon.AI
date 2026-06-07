const fs = require("node:fs");
const path = require("node:path");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return { ...fallback, _readError: error.message };
  }
}

function parseConformanceFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { passed: [], failed: [] };
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const passed = [];
  const failed = [];

  for (const line of lines) {
    if (line.startsWith("PASS ")) {
      passed.push(line.slice(5).trim());
    } else if (line.startsWith("FAIL ")) {
      failed.push(line.slice(5).trim());
    }
  }

  return { passed, failed };
}

function normalizePassRate(passRate, passed, total) {
  if (typeof passRate === "string" && passRate.endsWith("%")) {
    const numeric = Number(passRate.slice(0, -1));
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (typeof passRate === "number" && Number.isFinite(passRate)) {
    return passRate;
  }

  if (Number.isFinite(passed) && Number.isFinite(total) && total > 0) {
    return Number(((passed / total) * 100).toFixed(2));
  }

  return null;
}

function toGateStatus(totalFail, passRateNumeric) {
  if (Number.isFinite(totalFail) && totalFail > 0) {
    return "DEGRADED";
  }

  if (!Number.isFinite(passRateNumeric)) {
    return "PENDING";
  }

  if (passRateNumeric === 100) {
    return "HEALTHY";
  }

  if (passRateNumeric >= 95) {
    return "WARN";
  }

  return "DEGRADED";
}

function main() {
  const strictMode = process.argv.slice(2).includes("--strict");

  const collectReport = readJson(projectPath("artifacts", "quality.collect.json"), {
    conformanceFailed: false,
    conformanceExitCode: 0
  });

  const conformanceLast = parseConformanceFile(projectPath("artifacts", "conformance.last.txt"));
  const conformanceSummary = readJson(projectPath("artifacts", "conformance.summary.json"), {
    baselineStatus: "missing",
    totalPass: conformanceLast.passed.length,
    totalFail: conformanceLast.failed.length,
    addedPass: [],
    newFail: []
  });

  const metricsReport = readJson(projectPath("artifacts", "quality.metrics.json"), {
    status: "PENDING",
    metrics: {
      conformanceTests: conformanceLast.passed.length + conformanceLast.failed.length,
      passRate: "unknown",
      passed: conformanceLast.passed.length,
      failed: conformanceLast.failed.length,
      total: conformanceLast.passed.length + conformanceLast.failed.length
    }
  });

  const passRateNumeric = normalizePassRate(
    metricsReport.metrics?.passRate,
    metricsReport.metrics?.passed,
    metricsReport.metrics?.total
  );

  let gateStatus = toGateStatus(conformanceSummary.totalFail, passRateNumeric);
  if (collectReport.conformanceFailed) {
    gateStatus = "DEGRADED";
  }
  const strictGateClean =
    Array.isArray(conformanceSummary.newFail) && conformanceSummary.newFail.length === 0;

  const report = {
    timestamp: new Date().toISOString(),
    gateStatus,
    gates: {
      conformance: {
        totalPass: conformanceSummary.totalPass,
        totalFail: conformanceSummary.totalFail,
        baselineStatus: conformanceSummary.baselineStatus,
        newFail: conformanceSummary.newFail || []
      },
      metrics: {
        status: metricsReport.status,
        passRate: passRateNumeric,
        total: metricsReport.metrics?.total,
        passed: metricsReport.metrics?.passed,
        failed: metricsReport.metrics?.failed
      },
      strict: {
        clean: strictGateClean
      },
      collector: {
        conformanceFailed: Boolean(collectReport.conformanceFailed),
        conformanceExitCode: collectReport.conformanceExitCode
      }
    }
  };

  const outPath = projectPath("artifacts", "quality.unified.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("Unified quality summary:");
  console.log(JSON.stringify(report, null, 2));

  if (strictMode && report.gateStatus === "DEGRADED") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
