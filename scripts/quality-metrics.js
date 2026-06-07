const fs = require("node:fs");
const path = require("node:path");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
}

function countConformanceTests() {
  const testFile = projectPath("tests", "conformance", "run.js");
  const content = fs.readFileSync(testFile, "utf8");
  const matches = content.match(/run\s*\(\s*["']/g);
  return matches ? matches.length : 0;
}

function readLastConformanceResult() {
  const outputFile = projectPath("artifacts", "conformance.last.txt");
  if (!fs.existsSync(outputFile)) {
    return {
      known: false,
      passRate: "unknown",
      passed: null,
      failed: null,
      total: null
    };
  }

  const content = fs.readFileSync(outputFile, "utf8");
  const passMatches = content.match(/^PASS\s+/gm);
  const failMatches = content.match(/^FAIL\s+/gm);
  const passed = passMatches ? passMatches.length : 0;
  const failed = failMatches ? failMatches.length : 0;
  const total = passed + failed;

  if (total === 0) {
    return {
      known: true,
      passRate: "unknown",
      passed,
      failed,
      total
    };
  }

  const rate = ((passed / total) * 100).toFixed(2) + "%";
  return {
    known: true,
    passRate: rate,
    passed,
    failed,
    total
  };
}

function toStatus(passRate) {
  if (passRate === "unknown") {
    return "PENDING";
  }
  const numeric = Number(String(passRate).replace("%", ""));
  if (Number.isNaN(numeric)) {
    return "UNKNOWN";
  }
  if (numeric === 100) {
    return "HEALTHY";
  }
  if (numeric >= 80) {
    return "WARN";
  }
  return "DEGRADED";
}

function main() {
  const totalTests = countConformanceTests();
  const last = readLastConformanceResult();
  const status = toStatus(last.passRate);

  const report = {
    timestamp: new Date().toISOString(),
    status,
    metrics: {
      conformanceTests: totalTests,
      passRate: last.passRate,
      passed: last.passed,
      failed: last.failed,
      total: last.total
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  countConformanceTests,
  readLastConformanceResult,
  toStatus
};
