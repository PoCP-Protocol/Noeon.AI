const { spawnSync } = require("node:child_process");

function run(command, args, env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    console.error("npm_execpath is not available; run this script via npm.");
    process.exit(1);
  }

  const env = {
    ...process.env,
    NOEON_REQUIRE_PLUGIN_VERSION: process.env.NOEON_REQUIRE_PLUGIN_VERSION || "true",
    NOEON_REQUIRE_PLUGIN_SIGNATURE: process.env.NOEON_REQUIRE_PLUGIN_SIGNATURE || "true",
    NOEON_PLUGIN_SIGNING_KEY: process.env.NOEON_PLUGIN_SIGNING_KEY || "noeon-hardened-key"
  };

  run(process.execPath, [npmCli, "run", "conformance"], env);
  run(
    process.execPath,
    [
      npmCli,
      "run",
      "simulate",
      "--",
      "examples/noeon_hayek_bitcion_ai_extreme.ael",
      "examples/feedback_highrisk.json",
      "artifacts/noeon_hayek_extreme_cycle.json",
      "artifacts/noeon_hayek_extreme_state.json",
      "artifacts/noeon_hayek_extreme_report.json",
      "artifacts/noeon_hayek_extreme_audit.jsonl"
    ],
    env
  );

  console.log("Strict governance gate passed.");
}

main();
