const fs = require("fs");
const path = require("path");

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function appendAuditEntries(filePath, cycle) {
  if (!filePath) {
    return;
  }

  const resolved = path.resolve(process.cwd(), filePath);
  ensureDirFor(resolved);

  const steps = cycle?.cognition?.planTrace?.steps || [];
  const records = steps.map((step) => ({
    ts: cycle.cycleAt,
    network: cycle.contract.network,
    task: cycle.contract.task,
    goal: cycle.contract.goal,
    step: step.name,
    status: step.status,
    reason: step.reason || null,
    failureCategory: step.failureCategory || null,
    receipt: step.receipt || null
  }));

  const computeReceipts = cycle?.execution?.compute?.receipts || [];
  for (const receipt of computeReceipts) {
    records.push({
      ts: cycle.cycleAt,
      network: cycle.contract.network,
      task: cycle.contract.task,
      goal: cycle.contract.goal,
      step: `compute:${receipt.kind || "step"}`,
      status: receipt.status || "unknown",
      reason: receipt.reason || receipt.message || null,
      failureCategory: receipt.failureCategory || null,
      receipt
    });
  }

  const computeDiagnostics = cycle?.execution?.compute?.diagnostics || [];
  for (const diagnostic of computeDiagnostics) {
    records.push({
      ts: cycle.cycleAt,
      network: cycle.contract.network,
      task: cycle.contract.task,
      goal: cycle.contract.goal,
      step: "compute:diagnostic",
      status: diagnostic.level === "error" ? "failed" : "warn",
      reason: diagnostic.message || null,
      failureCategory: diagnostic.code || null,
      receipt: diagnostic
    });
  }

  const computeSummary = cycle?.execution?.compute?.summary || null;
  if (computeSummary) {
    records.push({
      ts: cycle.cycleAt,
      network: cycle.contract.network,
      task: cycle.contract.task,
      goal: cycle.contract.goal,
      step: "compute:summary",
      status: "done",
      reason: null,
      failureCategory: null,
      receipt: computeSummary
    });
  }

  records.push({
    ts: cycle.cycleAt,
    network: cycle.contract.network,
    task: cycle.contract.task,
    goal: cycle.contract.goal,
    step: "meta:policy",
    status: cycle?.cognition?.metaPolicy?.hardened ? "hardened" : "ok",
    reason: cycle?.cognition?.metaPolicy?.hardened
      ? "runtime hardened by policy"
      : "policy passed",
    failureCategory: null,
    receipt: {
      enabled: cycle?.cognition?.metaPolicy?.enabled || false,
      totalRules: cycle?.cognition?.metaPolicy?.totalRules || 0,
      hardened: cycle?.cognition?.metaPolicy?.hardened || false,
      violations: cycle?.cognition?.metaPolicy?.violations || []
    }
  });

  const next = cycle?.next || null;
  if (next) {
    const ritualSummary = (next.reflection?.insights || []).find((x) => x.type === 'ritual-summary') || null;
    const constitutionSummary = (next.reflection?.insights || []).find((x) => x.type === 'constitution-summary') || null;
    records.push({
      ts: cycle.cycleAt,
      network: cycle.contract.network,
      task: cycle.contract.task,
      goal: cycle.contract.goal,
      step: "next:reflection",
      status: next.blocked ? "failed" : "done",
      reason: next.reflection?.verdict || null,
      failureCategory: next.blocked ? (next.blockReason || "next_block") : null,
      receipt: {
        verdict: next.reflection?.verdict || null,
        summary: next.reflection?.summary || null,
        ritualSummary: ritualSummary
          ? {
              active: ritualSummary.active || 0,
              deferred: ritualSummary.deferred || 0,
              suspended: ritualSummary.suspended || 0,
              unknown: ritualSummary.unknown || 0,
              overridden: ritualSummary.overridden || 0,
              dependencyBlocked: ritualSummary.dependencyBlocked || 0
            }
          : null,
        constitutionSummary: constitutionSummary
          ? {
              passed: constitutionSummary.passed || 0,
              failed: constitutionSummary.failed || 0,
              unknown: constitutionSummary.unknown || 0,
              hardFailed: constitutionSummary.hardFailed || 0
            }
          : null,
        governance: next.governance
          ? {
              winner: next.governance.winner || 'none',
              blocked: next.governance.blocked === true,
              blockReason: next.governance.blockReason || null,
              detail: next.governance.detail || null,
              conflictCount: Number(next.governance.conflictCount || 0),
              precedence: Array.isArray(next.governance.precedence) ? next.governance.precedence : []
            }
          : null,
        selectedStrategy: next.selectedStrategy
          ? {
              name: next.selectedStrategy.name || next.selectedStrategy.objective || "strategy",
              risk: next.selectedStrategy.risk || "medium",
              utility: next.selectedStrategy.utility ?? null,
              memoryBias: next.selectedStrategy.memoryBias ?? 0
            }
          : null
      }
    });

    records.push({
      ts: cycle.cycleAt,
      network: cycle.contract.network,
      task: cycle.contract.task,
      goal: cycle.contract.goal,
      step: "next:evolution",
      status: next.evolution?.applied?.changed ? "done" : "warn",
      reason: next.evolution?.selected?.kind || null,
      failureCategory: null,
      receipt: {
        proposalCount: next.evolution?.count || 0,
        selected: next.evolution?.selected || null,
        applied: next.evolution?.applied || null
      }
    });

    records.push({
      ts: cycle.cycleAt,
      network: cycle.contract.network,
      task: cycle.contract.task,
      goal: cycle.contract.goal,
      step: "next:memory",
      status: "done",
      reason: null,
      failureCategory: null,
      receipt: {
        source: next.memorySource || 'unknown',
        runCount: next.nextMemory?.runCount || 0,
        lastSelected: next.nextMemory?.lastSelected || null,
        trackedStrategies: Object.keys(next.nextMemory?.strategyStats || {}).length,
        trackedRituals: Object.keys(next.nextMemory?.ritualStats || {}).length,
        evolutionHistorySize: Array.isArray(next.nextMemory?.evolutionHistory)
          ? next.nextMemory.evolutionHistory.length
          : 0
      }
    });
  }

  const payload = records.map((r) => JSON.stringify(r)).join("\n");
  const prefix = fs.existsSync(resolved) && fs.statSync(resolved).size > 0 ? "\n" : "";
  fs.appendFileSync(resolved, `${prefix}${payload}`, "utf8");
}

module.exports = {
  appendAuditEntries
};
