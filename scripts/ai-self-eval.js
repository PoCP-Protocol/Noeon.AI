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

function readText(filePath, fallback = "") {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function collectSignals() {
  const packageJson = readJson(projectPath("package.json"), { scripts: {} });
  const readme = readText(projectPath("README.md"));
  const releaseGate = readJson(projectPath("artifacts", "release-gate", "release-gate.latest.json"), null);
  const qualityUnified = readJson(projectPath("artifacts", "quality.unified.json"), null);
  const scorecard = readJson(projectPath("artifacts", "scorecard.90d.json"), null);
  const conformanceSummary = readJson(projectPath("artifacts", "conformance.summary.json"), null);
  const metrics = readJson(projectPath("artifacts", "quality.metrics.json"), null);

  const scripts = packageJson.scripts || {};
  const hasGateAll = Boolean(scripts["gate:all"]);
  const hasGateReport = Boolean(scripts["gate:report"]);
  const hasQuality90d = Boolean(scripts["quality:90d"]);
  const hasTestNext = Boolean(scripts["test:next"]);

  const roadmapSectionPresent = /##\s+Roadmap/i.test(readme);
  const gateReportMentioned = /gate:report/i.test(readme) && /gate:all/i.test(readme);
  const releasePathsMentioned = /release-gate\/release-gate\.latest\.(json|md)/i.test(readme);

  const testCount = countMatches(readme, /\bPASS\b|\bFAIL\b|\btest:/g);

  return {
    timestamp: new Date().toISOString(),
    scripts: {
      gateAll: hasGateAll,
      gateReport: hasGateReport,
      quality90d: hasQuality90d,
      testNext: hasTestNext,
      total: Object.keys(scripts).length
    },
    docs: {
      roadmapSectionPresent,
      gateReportMentioned,
      releasePathsMentioned,
      testCount
    },
    artifacts: {
      releaseGate,
      qualityUnified,
      scorecard,
      conformanceSummary,
      metrics
    }
  };
}

function normalizeStatus(value) {
  return String(value || "").toUpperCase();
}

function deriveScore(signals) {
  let score = 50;

  if (signals.scripts.gateAll) score += 15;
  if (signals.scripts.gateReport) score += 10;
  if (signals.scripts.quality90d) score += 5;
  if (signals.docs.roadmapSectionPresent) score += 3;
  if (signals.docs.gateReportMentioned) score += 5;
  if (signals.docs.releasePathsMentioned) score += 4;

  if (normalizeStatus(signals.artifacts.releaseGate?.decision?.status) === "PASS") score += 8;
  if (normalizeStatus(signals.artifacts.releaseGate?.decision?.status) === "WARN") score += 4;
  if (normalizeStatus(signals.artifacts.qualityUnified?.gateStatus) === "HEALTHY") score += 6;
  if (normalizeStatus(signals.artifacts.scorecard?.decision) === "ESTABLISHED") score += 8;
  if (signals.artifacts.conformanceSummary?.totalFail === 0) score += 6;
  if (signals.artifacts.metrics?.status === "HEALTHY") score += 4;

  return Math.max(0, Math.min(score, 100));
}

function buildStrengths(signals) {
  const items = [];
  if (signals.artifacts.conformanceSummary?.totalFail === 0) {
    items.push("核心回归门禁无失败，基础执行稳态已建立。");
  }
  if (normalizeStatus(signals.artifacts.qualityUnified?.gateStatus) === "HEALTHY") {
    items.push("统一质量视图是健康的，说明门禁与质量产物链路已打通。");
  }
  if (signals.scripts.gateAll) {
    items.push("已经具备可执行的发布入口 gate:all，具备工程化推广条件。");
  }
  if (signals.docs.gateReportMentioned) {
    items.push("README 已经开始把发布门禁显式化，具备产品化表达基础。");
  }
  return items;
}

function buildRisks(signals) {
  const items = [];
  if (normalizeStatus(signals.artifacts.scorecard?.decision) === "PENDING") {
    items.push("90 天 scorecard 仍是 PENDING，说明生态/证据层还没形成可持续证明。");
  }
  if (normalizeStatus(signals.artifacts.releaseGate?.decision?.status) === "WARN") {
    items.push("发布门禁当前仍是 WARN，证明链还缺少一类关键证据或自动化输入。");
  }
  if (!signals.docs.releasePathsMentioned) {
    items.push("文档未充分显式呈现产物路径，容易让人找不到机器可读结果。");
  }
  return items;
}

function buildInnovations(signals) {
  const items = [];
  items.push({
    title: "自解释发布门禁",
    detail: "把 gate:report 进一步升级为‘一键发布评审’，由系统自己给出 PASS/WARN/FAIL、原因和补救路径。"
  });
  items.push({
    title: "AI 优化建议层",
    detail: "在现有质量产物上叠加 deterministic 的 next-actions 输出，让系统不仅报告状态，还报告下一步怎么变好。"
  });
  items.push({
    title: "证据优先路由",
    detail: "把 PENDING 证据项直接转成任务优先级，自动推动 scorecard 从‘未建立’走向‘可验证’。"
  });

  if (normalizeStatus(signals.artifacts.scorecard?.decision) === "PENDING") {
    items.push({
      title: "证据闭环自动化",
      detail: "把 scorecard 证据缺失视为一级优化对象，先补数据，再谈扩张。"
    });
  }

  return items;
}

function buildActionPlan(signals) {
  const actions = [];

  if (normalizeStatus(signals.artifacts.scorecard?.decision) === "PENDING") {
    actions.push("补齐 scorecard.90d.evidence.json，让 90 天证据从 PENDING 进入 ESTABLISHED。");
  }
  if (normalizeStatus(signals.artifacts.releaseGate?.decision?.status) !== "PASS") {
    actions.push("把 release gate 结果与 scorecard/quality 证据进一步联动，减少 WARN 的默认状态。");
  }
  if (!signals.docs.releasePathsMentioned) {
    actions.push("在 README 中继续强化产物路径与入口命令，降低认知摩擦。");
  }
  actions.push("把 gate:all 作为默认发布前检查入口，并持续把门禁结果写入审计链路。");

  return actions;
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# Noeon AI Self Evaluation");
  lines.push("");
  lines.push(`- Timestamp: ${report.timestamp}`);
  lines.push(`- Score: ${report.score}/100`);
  lines.push(`- Release Gate: ${report.signals.artifacts.releaseGate?.decision?.status || "unknown"}`);
  lines.push(`- Quality Gate: ${report.signals.artifacts.qualityUnified?.gateStatus || "unknown"}`);
  lines.push(`- Scorecard: ${report.signals.artifacts.scorecard?.decision || "unknown"}`);
  lines.push("");
  lines.push("## Strengths");
  if (report.strengths.length) {
    for (const item of report.strengths) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("- No strong signals yet.");
  }
  lines.push("");
  lines.push("## Risks");
  if (report.risks.length) {
    for (const item of report.risks) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("- No critical risks detected.");
  }
  lines.push("");
  lines.push("## Innovations");
  for (const item of report.innovations) {
    lines.push(`- ${item.title}: ${item.detail}`);
  }
  lines.push("");
  lines.push("## Action Plan");
  for (const item of report.actions) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const signals = collectSignals();
  const score = deriveScore(signals);
  const strengths = buildStrengths(signals);
  const risks = buildRisks(signals);
  const innovations = buildInnovations(signals);
  const actions = buildActionPlan(signals);

  const report = {
    schema: "noeon.ai.self-eval/v1",
    timestamp: signals.timestamp,
    score,
    signals,
    strengths,
    risks,
    innovations,
    actions,
    verdict: score >= 85
      ? "strong"
      : score >= 70
        ? "promising"
        : score >= 55
          ? "watch"
          : "needs-work"
  };

  const outDir = projectPath("artifacts", "ai-self-eval");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `self-eval.${stamp}.json`);
  const mdPath = path.join(outDir, `self-eval.${stamp}.md`);
  const latestJson = path.join(outDir, "self-eval.latest.json");
  const latestMd = path.join(outDir, "self-eval.latest.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(mdPath, toMarkdown(report), "utf8");
  fs.writeFileSync(latestJson, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(latestMd, toMarkdown(report), "utf8");

  console.log("AI self evaluation report written:");
  console.log(`- ${jsonPath}`);
  console.log(`- ${mdPath}`);
  console.log(`Score: ${score}/100 | Verdict: ${report.verdict}`);
}

if (require.main === module) {
  main();
}
