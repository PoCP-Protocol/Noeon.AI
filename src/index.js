const fs = require("fs");
const path = require("path");
const { parseAel } = require("./parser");
const { validateAel } = require("./validator");
const { compileAel } = require("./compiler");
const { explainAel } = require("./explainer");
const { runSuperBrainCycle } = require("./runtime/simulator");
const { runTraining } = require("./runtime/trainer");
const { loadState, saveState, rollbackState } = require("./runtime/state-store");
const { generateReport } = require("./runtime/report");
const { appendAuditEntries } = require("./runtime/audit-logger");

function printUsage() {
  console.log("Usage:");
  console.log("  npm run parse -- <path-to-contract-file>");
  console.log("  npm run compile -- <path-to-contract-file> [output-json]");
  console.log("  npm run explain -- <path-to-contract-file>");
  console.log(
    "  npm run simulate -- <path-to-contract-file> [feedback-json] [output-json] [state-json] [report-json] [audit-jsonl]"
  );
  console.log(
    "  npm run train -- <path-to-contract-file> <feedback-batch-json> [output-json] [state-json] [convergence-json] [audit-jsonl]"
  );
  console.log("  npm run rollback -- <state-json> [steps]");
}

function readJsonFileIfExists(filePath) {
  if (!filePath) {
    return {};
  }
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Feedback file not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, "utf8");
  return JSON.parse(raw);
}

function readFeedbackBatch(filePath) {
  const payload = readJsonFileIfExists(filePath);
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.rounds)) {
    return payload.rounds;
  }
  throw new Error("Feedback batch must be an array or an object with a 'rounds' array");
}

function main() {
  const argv = process.argv.slice(2);
  const explicitCommand =
    argv[0] === "parse" ||
    argv[0] === "compile" ||
    argv[0] === "explain" ||
    argv[0] === "simulate" ||
    argv[0] === "train" ||
    argv[0] === "rollback";
  const command = explicitCommand ? argv[0] : "parse";
  const inputPath = explicitCommand ? argv[1] : argv[0];
  const commandArg2 = explicitCommand ? argv[2] : undefined;
  const commandArg3 = explicitCommand ? argv[3] : undefined;
  const commandArg4 = explicitCommand ? argv[4] : undefined;
  const commandArg5 = explicitCommand ? argv[5] : undefined;
  const commandArg6 = explicitCommand ? argv[6] : undefined;

  if (!inputPath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "rollback") {
    try {
      const updated = rollbackState(inputPath, commandArg2);
      console.log("=== State After Rollback ===");
      console.log(JSON.stringify(updated, null, 2));
    } catch (err) {
      console.error(`Rollback failed: ${err.message}`);
      process.exitCode = 2;
    }
    return;
  }

  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exitCode = 1;
    return;
  }

  const source = fs.readFileSync(resolved, "utf8");

  try {
    const ast = parseAel(source);
    const validation = validateAel(ast);

    if (command === "parse") {
      console.log("=== Parsed AST ===");
      console.log(JSON.stringify(ast, null, 2));

      console.log("\n=== Validation ===");
      console.log(JSON.stringify(validation, null, 2));
    }

    if (command === "compile") {
      if (!validation.valid) {
        console.error("Compilation blocked: contract is invalid.");
        console.error(JSON.stringify(validation, null, 2));
        process.exitCode = 2;
        return;
      }

      const compiled = compileAel(ast);
      if (commandArg2) {
        const resolvedOut = path.resolve(process.cwd(), commandArg2);
        fs.writeFileSync(resolvedOut, JSON.stringify(compiled, null, 2), "utf8");
        console.log(`Compiled artifact written to: ${resolvedOut}`);
      } else {
        console.log("=== Compiled Artifact ===");
        console.log(JSON.stringify(compiled, null, 2));
      }
    }

    if (command === "simulate") {
      if (!validation.valid) {
        console.error("Simulation blocked: contract is invalid.");
        console.error(JSON.stringify(validation, null, 2));
        process.exitCode = 2;
        return;
      }

      const feedback = readJsonFileIfExists(commandArg2);
      const compiled = compileAel(ast);
      const cycle = runSuperBrainCycle(compiled, feedback);

      const statePath = commandArg4;
      const state = loadState(statePath);
      state.rounds.push({
        cycleAt: cycle.cycleAt,
        task: cycle.contract.task,
        feedback,
        updates: cycle.adaptation.updates,
        diagnostics: cycle.adaptation.diagnostics
      });
      state.currentPolicy = cycle.adaptation.updates;
      saveState(statePath, state);

      const report = generateReport(cycle, state);
      if (commandArg5) {
        const reportOut = path.resolve(process.cwd(), commandArg5);
        fs.writeFileSync(reportOut, JSON.stringify(report, null, 2), "utf8");
        console.log(`Simulation report written to: ${reportOut}`);
      }

      if (commandArg6) {
        appendAuditEntries(commandArg6, cycle);
        console.log(`Simulation audit appended to: ${path.resolve(process.cwd(), commandArg6)}`);
      }

      if (commandArg3) {
        const resolvedOut = path.resolve(process.cwd(), commandArg3);
        fs.writeFileSync(resolvedOut, JSON.stringify(cycle, null, 2), "utf8");
        console.log(`Simulation artifact written to: ${resolvedOut}`);
      } else {
        console.log("=== Super Brain Cycle ===");
        console.log(JSON.stringify(cycle, null, 2));
        console.log("\n=== Super Brain Report ===");
        console.log(JSON.stringify(report, null, 2));
      }
    }

    if (command === "train") {
      if (!validation.valid) {
        console.error("Training blocked: contract is invalid.");
        console.error(JSON.stringify(validation, null, 2));
        process.exitCode = 2;
        return;
      }

      const feedbackBatch = readFeedbackBatch(commandArg2);
      const compiled = compileAel(ast);
      const training = runTraining(compiled, feedbackBatch);

      const statePath = commandArg4;
      const state = loadState(statePath);
      for (const round of training.rounds) {
        state.rounds.push({
          cycleAt: new Date().toISOString(),
          task: compiled.contract.task,
          feedback: round.feedback,
          updates: round.policy,
          diagnostics: round.diagnostics,
          round: round.round
        });
      }
      state.currentPolicy = training.finalPolicy;
      saveState(statePath, state);

      if (commandArg3) {
        const out = path.resolve(process.cwd(), commandArg3);
        fs.writeFileSync(out, JSON.stringify(training, null, 2), "utf8");
        console.log(`Training artifact written to: ${out}`);
      } else {
        console.log("=== Training Summary ===");
        console.log(JSON.stringify(training, null, 2));
      }

      if (commandArg5) {
        const convergenceOut = path.resolve(process.cwd(), commandArg5);
        fs.writeFileSync(convergenceOut, JSON.stringify(training.convergence, null, 2), "utf8");
        console.log(`Convergence artifact written to: ${convergenceOut}`);
      }

      if (commandArg6) {
        for (const round of training.rounds) {
          const cycleSnapshot = {
            cycleAt: new Date().toISOString(),
            contract: {
              network: compiled.contract.network,
              task: compiled.contract.task,
              goal: compiled.contract.cognition.goal
            },
            cognition: {
              planTrace: {
                steps: [
                  {
                    name: `round_${round.round}`,
                    status: round.plan.complete ? "done" : "failed",
                    reason: round.plan.haltedReason || "round-complete",
                    failureCategory: round.plan.haltedReason ? "training_halt" : null,
                    receipt: {
                      round: round.round,
                      diagnostics: round.diagnostics,
                      policy: round.policy
                    }
                  }
                ]
              }
            }
          };
          appendAuditEntries(commandArg6, cycleSnapshot);
        }
        console.log(`Training audit appended to: ${path.resolve(process.cwd(), commandArg6)}`);
      }
    }

    if (command === "explain") {
      console.log("=== Human Explanation ===");
      console.log(explainAel(ast));

      console.log("\n=== Validation ===");
      console.log(JSON.stringify(validation, null, 2));
    }

    if (!validation.valid) {
      process.exitCode = 2;
    }
  } catch (err) {
    console.error(`Parse failed: ${err.message}`);
    process.exitCode = 2;
  }
}

main();
