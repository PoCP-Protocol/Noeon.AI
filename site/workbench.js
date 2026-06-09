const sourceEl = document.getElementById("source");
const irPane = document.getElementById("ir-pane");
const irMetaEl = document.getElementById("ir-meta");
const tracePane = document.getElementById("trace-pane");
const archPane = document.getElementById("arch-pane");
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

function compileExtras() {
  return canonicalModeEl?.checked ? { general_canonical: true } : {};
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

  const blocks = [];
  if (primary != null) {
    blocks.push(`=== PRIMARY · ${primaryIr} ===`, JSON.stringify(primary, null, 2));
  }
  if (secondary != null) {
    blocks.push("", `=== ${secondaryLabel.toUpperCase()} ===`, JSON.stringify(secondary, null, 2));
  }
  irPane.textContent = blocks.length ? blocks.join("\n") : "No IR payload";
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

function renderArchitecture(data) {
  const arch = data.architecture;
  if (!arch) {
    archPane.textContent = data.routeLabel ? `route: ${data.routeLabel}` : "No architecture payload";
    return;
  }
  const lines = [
    data.routeLabel ? `route: ${data.routeLabel}` : null,
    `regions: ${(arch.active_regions || []).join(", ")}`,
    arch.pipeline_phases?.length
      ? "pipeline: " + arch.pipeline_phases.map((p) => p.phase).join(" → ")
      : null
  ].filter(Boolean);
  archPane.textContent = lines.join("\n");
}

async function loadExamples() {
  try {
    const data = await fetch("/api/examples").then((r) => r.json());
    cachedExamples = data.examples || [];
    for (const ex of cachedExamples) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.title || ex.label || ex.name;
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
    statusEl.textContent = `Loaded ${exampleSelect.value}`;
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
    irPane.textContent = e.message;
    statusEl.textContent = "Compile failed";
  }
});

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
    statusEl.textContent = data.success ? "Run OK" : "Run finished with issues";
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

loadExamples();
