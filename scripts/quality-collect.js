const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    cwd: projectPath(),
    encoding: "utf8",
    env: process.env
  });
}

function writeOutput(filePath, content) {
  fs.writeFileSync(filePath, content || "", "utf8");
}

function main() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error("npm_execpath is missing. Run via npm scripts.");
    process.exit(1);
  }

  const conformanceResult = runCommand(process.execPath, [npmCli, "run", "conformance"]);
  const conformanceOutput = `${conformanceResult.stdout || ""}${conformanceResult.stderr || ""}`;
  writeOutput(projectPath("artifacts", "conformance.last.txt"), conformanceOutput);

  const summaryResult = runCommand(process.execPath, [npmCli, "run", "conformance:summary"]);
  const metricsResult = runCommand(process.execPath, [npmCli, "run", "metrics"]);
  writeOutput(
    projectPath("artifacts", "quality.metrics.json"),
    `${metricsResult.stdout || ""}${metricsResult.stderr || ""}`
  );

  const collectReport = {
    timestamp: new Date().toISOString(),
    conformanceExitCode: conformanceResult.status,
    conformanceSignal: conformanceResult.signal,
    conformanceFailed: conformanceResult.status !== 0,
    summaryExitCode: summaryResult.status,
    metricsExitCode: metricsResult.status
  };

  writeOutput(
    projectPath("artifacts", "quality.collect.json"),
    JSON.stringify(collectReport, null, 2)
  );

  console.log("Quality collect report:");
  console.log(JSON.stringify(collectReport, null, 2));

  if (summaryResult.status !== 0 || metricsResult.status !== 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
