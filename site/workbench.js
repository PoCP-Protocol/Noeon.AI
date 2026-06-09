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
  el.textContent = ex.autoCanonical
    ? `path: ${ex.executionPath} (auto canonical)`
    : `path: ${ex.executionPath}`;
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
  canonicalModeEl.checked = ex?.autoCanonical === true || ex?.category === "tools";
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
  const ex = cachedExamples.find((e) => e.name === exampleSelect?.value);
  if (ex?.autoCanonical) return { general_canonical: true };
  return {};
}

function formatExampleLabel(ex) {
  const title = ex.title || ex.name;
  const pathTag = ex.executionPath && ex.executionPath !== "cognitive"
    ? ` · ${ex.executionPath}`
    : "";
  return pathTag ? `${title}${pathTag}` : title;
}

function renderIrPanel(data) {
  const compileMode = data.compileMode || "cognitive-primary";
  const primaryIr = data.primaryIr || "cognitive";
  const cognitiveIr = data.cognitiveIr ?? data.output ?? null;
  const canonicalIr = data.canonicalIr || data.canonical || null;
  const primary = primaryIr === "canonical" ? canonicalIr : cognitiveIr;
  const secondary = primaryIr === "canonical" ? cognitiveIr : canonicalIr;
  const secondaryLabel = primaryIr === "canonical" ? "cognitive (secondary)" : "canonical (secondary)";

  if (irMetaEl) {
    irMetaEl.textContent = `compileMode: ${compileMode} · primary: ${primaryIr}`;
    irMetaEl.className = `ir-meta primary-${primaryIr}`;
  }

  if (irPrimaryEl) {
    irPrimaryEl.textContent = primary != null ? JSON.stringify(primary, null, 2) : "No IR payload";
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

function renderTrace(data) {
  const lines = [];
  if (data.actionTrace) {
    const t = data.actionTrace;
    lines.push(`ACT · ${t.count} total · ${t.succeeded} ok · ${t.failed} fail`);
    for (const item of t.actions || []) {
      const preview = item.content ? ` · ${String(item.content).slice(0, 80)}` : "";
      lines.push(`  ${item.action} [${item.plugin || "sim"}] ${item.status}${item.mocked ? " mock" : ""}${preview}`);
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
    lines.push("cognitive trace:");
    for (const entry of data.trace.slice(0, 24)) {
      lines.push(`  ${entry.phase}/${entry.operation} · ${JSON.stringify(entry.result)?.slice(0, 120)}`);
    }
  } else if (data.cognitive?.trace?.length) {
    lines.push("cognitive trace:");
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
  archPane.textContent = lines.length ? lines.join("\n") : "No architecture payload";
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
    statusEl.textContent = `Loaded ${exampleSelect.value}`;
    scheduleArchitecturePreview();
    return;
  }
  statusEl.textContent = `Example not found: ${exampleSelect.value}`;
});

document.getElementById("btn-compile").addEventListener("click", async () => {
  statusEl.textContent = "Compiling…";
  try {
    const data = await api("/api/compile", { format: "ir", ...compileExtras() });
    renderIrPanel(data);
    statusEl.textContent = `IR ready · ${data.compileMode || "cognitive-primary"}`;
  } catch (e) {
    if (irPrimaryEl) irPrimaryEl.textContent = e.message;
    statusEl.textContent = "Compile failed";
  }
});

function formatRunStatus(data) {
  const summary = data?.executionSummary;
  const parts = [
    data.success ? "Run OK" : "Run finished with issues",
    summary?.strategy || data.executionStrategy,
    summary?.hybrid || data.hybridActExecution ? "hybrid" : null,
    summary?.snapshotAct || data.snapshotActExecution ? "snapshot-act" : null,
    (summary?.phases || data.executionPhases || data.phases || []).join("→") || null
  ].filter(Boolean);
  return parts.join(" · ");
}

document.getElementById("btn-run").addEventListener("click", async () => {
  statusEl.textContent = "Running…";
  try {
    const data = await api("/api/run", compileExtras());
    renderTrace(data);
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
    statusEl.textContent = "Run failed";
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
fetch("/api/status")
  .then((r) => r.json())
  .then((s) => {
    window.NoeonGoldenGateBadge?.renderGoldenGateBadge(
      document.getElementById("golden-gate-badge"),
      s.goldenGate
    );
  })
  .catch(() => {});
