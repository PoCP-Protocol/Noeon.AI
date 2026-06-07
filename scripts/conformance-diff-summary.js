const fs = require("node:fs");
const path = require("node:path");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
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

function diffLists(current, baseline) {
  const base = new Set(baseline);
  return current.filter((item) => !base.has(item));
}

function serializeConformance(parsed) {
  const lines = [];
  for (const test of parsed.passed) {
    lines.push(`PASS ${test}`);
  }
  for (const test of parsed.failed) {
    lines.push(`FAIL ${test}`);
  }
  return lines.join("\n") + (lines.length > 0 ? "\n" : "");
}

function main() {
  const args = process.argv.slice(2);
  const initMode = args.includes("--init");
  const updateMode = args.includes("--update-baseline");
  const strictMode = args.includes("--strict");

  const currentPath = projectPath("artifacts", "conformance.last.txt");
  const baselinePath = projectPath("artifacts", "conformance.baseline.txt");
  const current = parseConformanceFile(currentPath);
  const baselineExists = fs.existsSync(baselinePath);

  let baseline = { passed: [], failed: [] };
  let baselineStatus = "existing";

  if (!baselineExists) {
    if (strictMode && !initMode) {
      console.error(
        "ERROR: conformance.baseline.txt missing and --strict mode enabled. Run with --init first."
      );
      process.exitCode = 1;
      return;
    }

    baseline = current;
    baselineStatus = initMode ? "initialized" : "initialized-implicit";
    fs.writeFileSync(baselinePath, serializeConformance(current), "utf8");
  } else {
    baseline = parseConformanceFile(baselinePath);
    if (updateMode) {
      fs.writeFileSync(baselinePath, serializeConformance(current), "utf8");
      baselineStatus = "updated";
    }
  }

  const suppressDiff = baselineStatus === "initialized" || baselineStatus === "initialized-implicit";
  const addedPass = suppressDiff ? [] : diffLists(current.passed, baseline.passed);
  const newFail = suppressDiff ? [] : diffLists(current.failed, baseline.failed);

  const summary = {
    timestamp: new Date().toISOString(),
    baselineStatus,
    totalPass: current.passed.length,
    totalFail: current.failed.length,
    addedPass,
    newFail
  };

  const outPath = projectPath("artifacts", "conformance.summary.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");

  console.log("Conformance summary:");
  console.log(JSON.stringify(summary, null, 2));

  if (current.failed.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
