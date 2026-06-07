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
  } catch {
    return fallback;
  }
}

function main() {
  const scorecard = readJson(projectPath("artifacts", "scorecard.90d.json"), null);
  const unified = readJson(projectPath("artifacts", "quality.unified.json"), null);

  if (!scorecard) {
    console.error("Missing artifacts/scorecard.90d.json. Run npm run quality:scorecard first.");
    process.exit(1);
  }

  const snapshot = {
    timestamp: new Date().toISOString(),
    decision: scorecard.decision,
    summary: scorecard.summary,
    qualityGateStatus: unified?.gateStatus || "unknown",
    metricResults: scorecard.metricResults
  };

  const outPath = projectPath("artifacts", "scorecard.90d.history.jsonl");
  fs.appendFileSync(outPath, `${JSON.stringify(snapshot)}\n`, "utf8");

  console.log("Scorecard snapshot appended:");
  console.log(JSON.stringify(snapshot, null, 2));
}

if (require.main === module) {
  main();
}
