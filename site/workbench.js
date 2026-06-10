const sourceEl = document.getElementById("source");
const irPrimaryEl = document.getElementById("ir-primary");
const irSecondaryEl = document.getElementById("ir-secondary");
const irSecondaryWrap = document.getElementById("ir-secondary-wrap");
const irSecondaryLabel = document.getElementById("ir-secondary-label");
const irMetaEl = document.getElementById("ir-meta");
const tracePane = document.getElementById("trace-pane");
const archPane = document.getElementById("arch-pane");
const execPathBar = document.getElementById("exec-path-bar");
const statusEl = document.getElementById("status-bar");
const exampleSelect = document.getElementById("example-select");
const canonicalModeEl = document.getElementById("canonical-mode");
let cachedExamples = [];

const DEFAULT_SOURCE = `profile "general"
version "1.0.0-alpha.1"
module workbench_demo

import std.web

@effect(external)
fn main() {
  text("https://example.com/docs", mock=true)
}
`;

sourceEl.value = DEFAULT_SOURCE;

const CANONICAL_PREF_KEY = "noeon.workbench.canonical-primary";
let activeExampleCategory = null;

function updateExamplePathHint(ex) {
  const el = document.getElementById("example-path-hint");
  if (!el) return;
  if (!ex?.executionPath || ex.executionPath === "cognitive") {
    el.textContent = "";
    el.className = "example-path-hint hidden";
    return;
  }
  el.className = `example-path-hint path-${ex.executionPath}`;
  const signedTag = ex.signedAct ? " · 已签名" : "";
  el.textContent = `执行方式：${ex.executionPath}${signedTag}`;
}

function applyExampleByName(name) {
  const ex = cachedExamples.find((e) => e.name === name);
  if (!ex?.source) return false;
  sourceEl.value = ex.source;
  exampleSelect.value = name;
  applyExampleCanonicalPreference(ex);
  updateExamplePathHint(ex);
  statusEl.textContent = `已加载 ${ex.title || name}`;
  scheduleArchitecturePreview();
  return true;
}

function applyExampleCanonicalPreference(ex) {
  activeExampleCategory = ex?.category || null;
  if (!canonicalModeEl) return;
  const pref = localStorage.getItem(CANONICAL_PREF_KEY);
  if (pref === "1") {
    canonicalModeEl.checked = true;
    return;
  }
  if (pref === "0") {
    canonicalModeEl.checked = false;
    return;
  }
  canonicalModeEl.checked = ex?.autoCanonical === true || ex?.category === "tools" || ex?.category === "production";
}

if (canonicalModeEl) {
  const pref = localStorage.getItem(CANONICAL_PREF_KEY);
  if (pref === "1") canonicalModeEl.checked = true;
  else if (pref === "0") canonicalModeEl.checked = false;
  canonicalModeEl.addEventListener("change", () => {
    localStorage.setItem(CANONICAL_PREF_KEY, canonicalModeEl.checked ? "1" : "0");
  });
}

function compileExtras() {
  if (canonicalModeEl?.checked) return { general_canonical: true };
  if (activeExampleCategory === "tools") return { general_canonical: true };
  if (activeExampleCategory === "production") return { general_canonical: true };
  const ex = cachedExamples.find((e) => e.name === exampleSelect?.value);
  if (ex?.autoCanonical) return { general_canonical: true };
  return {};
}

function formatExampleLabel(ex) {
  const title = ex.title || ex.name;
  const pathTag = ex.executionPath && ex.executionPath !== "cognitive"
    ? ` · ${ex.executionPath}${ex.signedAct ? " · 已签名" : ""}`
    : ex.signedAct ? " · 已签名" : "";
  return pathTag ? `${title}${pathTag}` : title;
}

function renderIrPanel(data) {
  const compileMode = data.compileMode || "cognitive-primary";
  const primaryIr = data.primaryIr || "cognitive";
  const cognitiveIr = data.cognitiveIr ?? data.output ?? null;
  const canonicalIr = data.canonicalIr || data.canonical || null;
  const primary = primaryIr === "canonical" ? canonicalIr : cognitiveIr;
  const secondary = primaryIr === "canonical" ? cognitiveIr : canonicalIr;
  const secondaryLabel = primaryIr === "canonical" ? "认知表示（详细）" : "标准语义（详细）";

  if (irMetaEl) {
    irMetaEl.textContent = `模式：${compileMode === "canonical-primary" ? "标准语义" : "认知流"}`;
    irMetaEl.className = "ir-meta";
  }

  if (irPrimaryEl) {
    irPrimaryEl.textContent = primary != null ? JSON.stringify(primary, null, 2) : "暂无数据";
  }

  if (irSecondaryWrap && irSecondaryEl && irSecondaryLabel) {
    if (secondary != null) {
      irSecondaryLabel.textContent = secondaryLabel;
      irSecondaryEl.textContent = JSON.stringify(secondary, null, 2);
      irSecondaryWrap.hidden = false;
      irSecondaryWrap.open = false;
    } else {
      irSecondaryWrap.hidden = true;
      irSecondaryEl.textContent = "—";
    }
  }
}

async function api(path, extra = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: sourceEl.value, filename: "workbench.noeon", trace: true, with_protocol: "off", ...extra })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function renderDualView(data) {
  const dual = data?.dualView;
  if (dual?.rows?.length) {
    const lines = [`对齐 ${dual.matched}/${dual.declaredCount} · ${Math.round((dual.alignment || 0) * 100)}%`, ""];
    for (const row of dual.rows) {
      const left = (row.declared?.label || "—").padEnd(26).slice(0, 26);
      const right = row.runtime?.label || "—";
      const mark = row.status === "matched" ? "✓" : row.status === "missing" ? "✗" : "+";
      const conf = row.runtime?.confidence != null ? ` · ${Math.round(row.runtime.confidence * 100)}%` : "";
      lines.push(`${mark}  ${left}  →  ${right}${conf}`);
    }
    if (dual.effects?.runtime?.length) {
      lines.push("", `效应：${dual.effects.runtime.join(" · ")}`);
    }
    if (dual.replay?.fingerprint) {
      lines.push(`重放：${dual.replay.fingerprint.slice(0, 16)}…`);
    }
    if (data.agentSurface?.cards?.[0]) {
      const agent = data.agentSurface.cards[0];
      lines.push("", `智能体 ${agent.name} · FLOW ${agent.flow.filter((s) => s.status === "executed").length}/${agent.flow.length}`);
    }
    const mode = data.runtimeMode || data.report?.runtimeMode;
    if (mode?.cognition?.effective) {
      lines.push(`模式 ${mode.cognition.effective} · LLM ${mode.llm?.mode || "auto"}`);
    }
    tracePane.textContent = lines.join("\n");
    return;
  }
  renderTrace(data);
}

function renderTrace(data) {
  const lines = [];
  if (data.actionTrace) {
    const t = data.actionTrace;
    lines.push(`行动 · 共 ${t.count} 次 · ${t.succeeded} 成功 · ${t.failed} 失败`);
    if (data.pluginActs?.total) {
      lines.push(`插件调用：${data.pluginActs.signed ?? 0}/${data.pluginActs.total} 已签名`);
    }
    for (const item of t.actions || []) {
      const sig = item.plugin ? (item.signed ? " 已签名" : " 未签名") : "";
      const preview = item.content ? ` · ${String(item.content).slice(0, 80)}` : "";
      lines.push(`  ${item.action} [${item.plugin || "sim"}] ${item.status}${sig}${item.mocked ? " mock" : ""}${preview}`);
    }
    if (t.lastAction) {
      lines.push(`last: ${t.lastAction.action} · ${t.lastAction.status} · ${t.lastAction.plugin || "sim"}`);
    }
    if (t.lastFetch) {
      lines.push(`fetch: ${String(t.lastFetch).slice(0, 160)}`);
    }
    lines.push("");
  }
  if (data.trace?.length) {
    lines.push("执行追踪：");
    for (const entry of data.trace.slice(0, 24)) {
      lines.push(`  ${entry.phase}/${entry.operation} · ${JSON.stringify(entry.result)?.slice(0, 120)}`);
    }
  } else if (data.cognitive?.trace?.length) {
    lines.push("执行追踪：");
    for (const entry of data.cognitive.trace.slice(0, 24)) {
      lines.push(`  ${entry.phase}/${entry.operation}`);
    }
  }
  tracePane.textContent = lines.length ? lines.join("\n") : JSON.stringify(data.actionTrace || data.trace || data, null, 2);
}

function executionPathClass(summary) {
  const path = summary?.path;
  if (path === "hybrid") return "path-hybrid";
  if (path === "snapshot-act" || path === "canonical") return "path-snapshot-act";
  return "path-cognitive";
}

function updateExecPathBar(summary) {
  if (!execPathBar) return;
  const text = window.NoeonExecutionSummary?.formatExecutionBar(summary);
  if (!text) {
    execPathBar.className = "run-execution-bar hidden";
    execPathBar.textContent = "";
    return;
  }
  execPathBar.className = `run-execution-bar ${executionPathClass(summary)}`;
  execPathBar.textContent = text;
}

function renderArchitecture(data) {
  const lines = window.NoeonArchitecturePanel?.formatArchitectureLines(data) || [];
  archPane.textContent = lines.length ? lines.join("\n") : "暂无架构数据";
  updateExecPathBar(data?.executionSummary);
}

let archSyncTimer = null;
let archSyncGen = 0;

async function syncArchitecturePreview() {
  if (!sourceEl.value.trim()) {
    archPane.textContent = "—";
    updateExecPathBar(null);
    return;
  }
  const gen = ++archSyncGen;
  try {
    const data = await api("/api/brain", { with_protocol: "off" });
    if (gen !== archSyncGen) return;
    renderArchitecture(data);
  } catch {
    if (gen === archSyncGen) archPane.textContent = "—";
  }
}

function scheduleArchitecturePreview() {
  clearTimeout(archSyncTimer);
  archSyncTimer = setTimeout(syncArchitecturePreview, 700);
}

async function loadExamples() {
  try {
    const data = await fetch("/api/examples").then((r) => r.json());
    cachedExamples = data.examples || [];
    for (const ex of cachedExamples) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = formatExampleLabel(ex);
      exampleSelect.appendChild(opt);
    }
    const requested = new URLSearchParams(window.location.search).get("example");
    if (requested) applyExampleByName(requested);
  } catch {
    /* optional */
  }
}

exampleSelect?.addEventListener("change", () => {
  if (!exampleSelect.value) return;
  const ex = cachedExamples.find((e) => e.name === exampleSelect.value);
  if (ex?.source) {
    sourceEl.value = ex.source;
    applyExampleCanonicalPreference(ex);
    updateExamplePathHint(ex);
    statusEl.textContent = `已加载 ${exampleSelect.value}`;
    scheduleArchitecturePreview();
    return;
  }
  statusEl.textContent = `未找到示例：${exampleSelect.value}`;
});

document.getElementById("btn-compile").addEventListener("click", async () => {
  statusEl.textContent = "编译中…";
  try {
    const data = await api("/api/compile", { format: "ir", ...compileExtras() });
    renderIrPanel(data);
    if (data.declaredSteps?.length) {
      tracePane.textContent = [
        `已解析 ${data.declaredSteps.length} 个声明步骤（运行后对齐运行时）`,
        "",
        ...data.declaredSteps.map((s) => `· ${s.label}`)
      ].join("\n");
    }
    statusEl.textContent = "编译完成";
  } catch (e) {
    if (irPrimaryEl) irPrimaryEl.textContent = e.message;
    statusEl.textContent = "编译失败";
  }
});

function formatRunStatus(data) {
  const summary = data?.executionSummary;
  const parts = [
    data.success ? "运行成功" : "运行完成（有问题）",
    summary?.path || summary?.strategy || data.executionStrategy,
    (summary?.phases || data.executionPhases || data.phases || []).join("→") || null
  ].filter(Boolean);
  return parts.join(" · ");
}

document.getElementById("btn-run").addEventListener("click", async () => {
  statusEl.textContent = "运行中…";
  try {
    const data = await api("/api/run", compileExtras());
    renderDualView(data);
    renderArchitecture(data);
    if (data.cognitiveIr || data.canonicalIr || data.canonical) {
      renderIrPanel({
        compileMode: data.compileMode,
        primaryIr: data.primaryIr,
        cognitiveIr: data.cognitiveIr,
        canonicalIr: data.canonicalIr || data.canonical
      });
    }
    statusEl.textContent = formatRunStatus(data);
  } catch (e) {
    tracePane.textContent = e.message;
    statusEl.textContent = "运行失败";
  }
});

sourceEl.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-run").click();
  }
});

sourceEl.addEventListener("input", scheduleArchitecturePreview);

loadExamples().then(() => scheduleArchitecturePreview());
