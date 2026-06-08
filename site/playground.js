const sourceEl = document.getElementById("source");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status-bar");
const exampleSelect = document.getElementById("example-select");
const lineInfoEl = document.getElementById("line-info");
const fusionBadge = document.getElementById("fusion-badge");
const fusionPanel = document.getElementById("fusion-panel");
const fusionSummary = document.getElementById("fusion-summary");
const fusionDetail = document.getElementById("fusion-detail");
const fusionMermaid = document.getElementById("fusion-mermaid");
const brainPanel = document.getElementById("brain-panel");
const brainSummary = document.getElementById("brain-summary");
const brainRegions = document.getElementById("brain-regions");
const brainFlow = document.getElementById("brain-flow");
const brainMermaid = document.getElementById("brain-mermaid");
const sourceGutter = document.getElementById("source-gutter");
const sourceRouteBar = document.getElementById("source-route-bar");

let activeExampleName = null;
let mermaidReady = false;

if (window.mermaid) {
  window.mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
  mermaidReady = true;
}

const FALLBACK_SOURCE = `profile "general"
version "1.0.0-alpha"

module hello

program hello_world {
  objective "Demonstrate general profile execution through unified VM"
  context domain=general audience=developer mode=cognitive

  observe input modality=text source="user"
  understand context=developer_intent method=semantic_summary confidence=0.72
  reason strategy=deductive depth=2
  decide action=greet threshold=0.6
  act action=greet channel=console safety=low
  feedback source=user signal=acceptance window=1
  reflect "execution quality" depth=standard
}
`;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function updateLineInfo() {
  const pos = sourceEl.selectionStart;
  const text = sourceEl.value.slice(0, pos);
  const line = text.split("\n").length;
  const col = text.length - text.lastIndexOf("\n");
  if (lineInfoEl) lineInfoEl.textContent = `Ln ${line}, Col ${col}`;
}

function setOutput(text, isError = false, errorLine = null) {
  outputEl.textContent = text;
  outputEl.style.color = isError ? "#ff8a8a" : "#d8e8ff";
  sourceEl.classList.remove("has-error-line");
  if (errorLine) {
    sourceEl.dataset.errorLine = String(errorLine);
    sourceEl.classList.add("has-error-line");
    highlightErrorLine(errorLine);
  }
}

function highlightErrorLine(lineNum) {
  const lines = sourceEl.value.split("\n");
  if (lineNum > 0 && lineNum <= lines.length) {
    let start = 0;
    for (let i = 0; i < lineNum - 1; i++) start += lines[i].length + 1;
    sourceEl.focus();
    sourceEl.setSelectionRange(start, start + lines[lineNum - 1].length);
  }
}

async function api(path, body, options = {}) {
  const { silent = false } = options;
  if (!silent) setStatus(`Calling ${path}…`);
  const payload = {
    source: sourceEl.value,
    with_protocol: "auto",
    filename: activeExampleName || "playground.noeon",
    ...body
  };
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || data.errors?.join(", ") || "Request failed");
    err.line = data.line;
    throw err;
  }
  if (!silent) setStatus("Ready");
  return data;
}

function detectFusionLayers(source) {
  const layers = [];
  if (/^\s*fuse\s+triad\s*\{/im.test(source)) return ["triad", "next", "liminal", "general"];
  if (/^\s*fuse\s+next\s*\{/im.test(source)) layers.push("next");
  if (/^\s*fuse\s+liminal\s*\{/im.test(source)) layers.push("liminal");
  if (/^\s*fuse\s+general\s*\{/im.test(source)) layers.push("general");
  return layers;
}

function updateFusionBadge() {
  const layers = detectFusionLayers(sourceEl.value);
  if (!layers.length) {
    fusionBadge.classList.add("hidden");
    fusionBadge.textContent = "";
    return;
  }
  fusionBadge.classList.remove("hidden");
  fusionBadge.textContent = `FUSE: ${layers.join(" · ")}`;
}

async function renderBrainMermaid(mermaidText) {
  if (!brainMermaid) return;
  brainMermaid.innerHTML = "";
  if (!mermaidText || !mermaidReady) return;
  const pre = document.createElement("pre");
  pre.className = "mermaid";
  pre.textContent = mermaidText;
  brainMermaid.appendChild(pre);
  await window.mermaid.run({ nodes: [pre] });
}

const REGION_LABELS = {
  prefrontal_cortex: "Executive",
  sensory_cortex: "Perception",
  association_cortex: "Reasoning",
  motor_cortex: "Action",
  hippocampus: "Memory",
  amygdala: "Salience",
  basal_ganglia: "Selection",
  cerebellum: "Correction",
  thalamus: "Routing",
  corpus_callosum: "Integration",
  default_mode_network: "Field",
  neuromodulatory: "Evolution"
};

const REGION_COLORS = {
  prefrontal_cortex: "#9c7bd8",
  sensory_cortex: "#5dade2",
  association_cortex: "#48c9b0",
  motor_cortex: "#f5b041",
  hippocampus: "#58d68d",
  amygdala: "#ec7063",
  basal_ganglia: "#af7ac5",
  cerebellum: "#76d7c4",
  thalamus: "#85c1e9",
  corpus_callosum: "#bb8fce",
  default_mode_network: "#7fb3d5",
  neuromodulatory: "#f1948a"
};

const STRUCTURAL_REGION = {
  AGENT: "prefrontal_cortex",
  GOAL: "prefrontal_cortex",
  OBJECTIVE: "prefrontal_cortex",
  TASK: "prefrontal_cortex",
  PROGRAM: "prefrontal_cortex",
  CONSTITUTION: "prefrontal_cortex",
  VOW: "prefrontal_cortex",
  POLICY: "prefrontal_cortex",
  RITUAL: "thalamus",
  STRATEGY: "basal_ganglia",
  FUSE: "corpus_callosum",
  FLOW: "thalamus"
};

const COGNITIVE_KW = new Set([
  "PERCEIVE", "OBSERVE", "UNDERSTAND", "REASON", "INTUIT", "PREDICT",
  "DECIDE", "ACT", "FEEDBACK", "REFLECT", "CONSOLIDATE", "MEMORY", "FOCUS", "ATTEND"
]);

const PRIMITIVE_TO_REGION = {
  perceive: "sensory_cortex",
  observe: "sensory_cortex",
  reason: "association_cortex",
  understand: "association_cortex",
  process: "association_cortex",
  decide: "basal_ganglia",
  act: "motor_cortex",
  reflect: "cerebellum",
  feedback: "cerebellum",
  consolidate: "hippocampus",
  remember: "hippocampus",
  memory: "hippocampus",
  focus: "thalamus",
  attend: "thalamus",
  predict: "default_mode_network",
  adapt: "neuromodulatory",
  evolve: "neuromodulatory",
  learn: "neuromodulatory"
};

function regionForKeyword(kw) {
  const upper = String(kw || "").toUpperCase();
  if (STRUCTURAL_REGION[upper]) return STRUCTURAL_REGION[upper];
  if (COGNITIVE_KW.has(upper)) return PRIMITIVE_TO_REGION[upper.toLowerCase()] || "association_cortex";
  return null;
}

function updateRouteBar(data) {
  if (!sourceRouteBar) return;
  if (!data?.routeLabel && !data?.runtime?.phases?.length) {
    sourceRouteBar.classList.add("hidden");
    sourceRouteBar.textContent = "";
    return;
  }
  sourceRouteBar.classList.remove("hidden");
  const routeLens = (data.code_lenses || []).find((l) => l.title?.includes("route:"));
  const cycleLens = (data.code_lenses || []).find((l) => l.title?.includes("cycle:"));
  const runtimePhases = data.runtime?.phases?.length ? `ran: ${data.runtime.phases.join("→")}` : null;
  sourceRouteBar.textContent = [
    routeLens?.title || (data.routeLabel ? `▸ route: ${data.routeLabel}` : null),
    data.active_regions?.length ? `${data.active_regions.length} regions` : null,
    runtimePhases,
    cycleLens ? cycleLens.title.replace("◎ ", "") : null
  ].filter(Boolean).join(" · ");
}

function updateSourceBrainGutter(data) {
  if (!sourceGutter || !sourceEl) return;
  const decorations = data?.decorations || (Array.isArray(data) ? data : null);
  const lensesByLine = data?.code_lenses?.length
    ? new Map(data.code_lenses.map((l) => [l.line, l]))
    : null;
  const lines = sourceEl.value.split("\n");
  const byLine = decorations?.length
    ? new Map(decorations.map((d) => [d.line, d]))
    : null;

  sourceGutter.innerHTML = "";
  for (let i = 0; i < lines.length; i += 1) {
    const tag = document.createElement("span");
    tag.className = "brain-line-tag empty";
    const lineNo = i + 1;
    const serverDeco = byLine?.get(lineNo);
    const lens = lensesByLine?.get(lineNo);
    const line = lines[i];
    const trimmed = line.trimStart();
    const match = trimmed.match(/^([A-Z_]+)\b/i);

    let region = serverDeco?.region;
    let label = serverDeco?.role;
    let keyword = serverDeco?.keyword;

    if (!region && match) {
      region = regionForKeyword(match[1]);
      keyword = match[1].toUpperCase();
      label = REGION_LABELS[region];
    }

    if (lens && (lens.title.includes("route:") || lens.title.includes("cycle:") || lens.title.includes("integration:"))) {
      tag.className = "brain-line-tag lens";
      tag.style.setProperty("--brain-color", REGION_COLORS[region] || "#9c7bd8");
      tag.textContent = lens.title.includes("route:") ? "▸rt" : lens.title.includes("cycle:") ? "◎cy" : "◎fu";
      tag.title = lens.title;
    } else if (region) {
      tag.className = "brain-line-tag";
      tag.style.setProperty("--brain-color", serverDeco?.color || REGION_COLORS[region] || "#888");
      tag.textContent = (label || REGION_LABELS[region] || region).slice(0, 4);
      tag.title = lens?.title || `${keyword || match?.[1]?.toUpperCase() || "?"} → ${label || REGION_LABELS[region] || region}`;
    }

    sourceGutter.appendChild(tag);
  }
}

let brainSyncTimer = null;
let brainSyncGen = 0;
let liveBrainEnabled = true;

function renderBrainTraceCompact(data) {
  const arch = data?.architecture;
  if (!arch?.active_regions?.length) {
    brainPanel.classList.add("hidden");
    return;
  }

  brainPanel.classList.remove("hidden");
  brainSummary.textContent = [
    data.routeLabel ? `route: ${data.routeLabel}` : null,
    `${arch.active_regions.length} regions`,
    data.runtime?.phases?.length ? `ran: ${data.runtime.phases.join("→")}` : "live sync"
  ].filter(Boolean).join(" · ");

  brainRegions.innerHTML = "";
  for (const id of arch.active_regions) {
    const chip = document.createElement("span");
    chip.className = "brain-region-chip";
    chip.title = id;
    chip.textContent = REGION_LABELS[id] || id.replace(/_/g, " ");
    brainRegions.appendChild(chip);
  }

  if (data.agent_flows?.length) {
    const flowLines = data.agent_flows.map((agent) => {
      const steps = (agent.steps || []).map((s) => `${(s.kind || "?").toUpperCase()}→${REGION_LABELS[s.region] || s.region || "?"}`);
      return `${agent.name}: ${steps.join(" · ")}`;
    });
    brainFlow.textContent = flowLines.join("\n");
  }

  if (data.architectureMermaid) renderBrainMermaid(data.architectureMermaid);
}

async function syncBrainFromApi({ silent = true } = {}) {
  if (!liveBrainEnabled || !sourceEl.value.trim()) return;
  const gen = ++brainSyncGen;
  try {
    const data = await api("/api/brain", { with_protocol: "off" }, { silent });
    if (gen !== brainSyncGen) return;
    updateRouteBar(data);
    updateSourceBrainGutter(data);
    renderBrainTraceCompact(data);
  } catch {
    if (gen === brainSyncGen) {
      updateSourceBrainGutter();
      updateRouteBar(null);
    }
  }
}

function scheduleBrainSync() {
  clearTimeout(brainSyncTimer);
  brainSyncTimer = setTimeout(() => syncBrainFromApi(), 700);
}

function renderBrainTrace(data) {
  liveBrainEnabled = false;
  clearTimeout(brainSyncTimer);
  const arch = data?.architecture;
  if (!arch?.active_regions?.length) {
    brainPanel.classList.add("hidden");
    return;
  }

  brainPanel.classList.remove("hidden");
  const executive = arch.governance_regions?.[0] || "prefrontal_cortex";
  brainSummary.textContent = [
    `executive: ${REGION_LABELS[executive] || executive}`,
    `core: ${REGION_LABELS[arch.core_field] || arch.core_field || "field"}`,
    data.runtime?.phases?.length ? `ran: ${data.runtime.phases.join("→")}` : null,
    arch.phase_regions?.length ? `phases: ${arch.phase_regions.length} regions` : null
  ].filter(Boolean).join(" · ");

  brainRegions.innerHTML = "";
  for (const id of arch.active_regions) {
    const chip = document.createElement("span");
    chip.className = "brain-region-chip";
    chip.title = id;
    chip.textContent = REGION_LABELS[id] || id.replace(/_/g, " ");
    brainRegions.appendChild(chip);
  }

  const flowLines = [];
  for (const agent of arch.agent_flows || []) {
    const steps = (agent.steps || []).map((s) => `${(s.kind || "?").toUpperCase()}→${REGION_LABELS[s.region] || s.region || "?"}`);
    flowLines.push(`${agent.name}: ${steps.join(" · ")}`);
  }
  if (arch.pipeline_phases?.length) {
    flowLines.push(
      "pipeline: " +
        arch.pipeline_phases.map((p) => `${p.phase}[${(p.regions || []).map((r) => REGION_LABELS[r] || r).join("+")}]`).join(" → ")
    );
  }
  brainFlow.textContent = flowLines.length ? flowLines.join("\n") : "No agent flow — static region map only.";

  if (data.architectureMermaid) renderBrainMermaid(data.architectureMermaid);
  updateRouteBar({
    routeLabel: data.routeLabel,
    active_regions: arch.active_regions,
    code_lenses: data.code_lenses,
    runtime: {
      phases: (arch.pipeline_phases || []).map((p) => p.phase)
    }
  });
  updateSourceBrainGutter(data);
  setTimeout(() => { liveBrainEnabled = true; scheduleBrainSync(); }, 1500);
}

async function fetchBrainPlan() {
  return api("/api/plan", { with_protocol: "off" });
}

async function fetchBrainMap() {
  return api("/api/brain", { with_protocol: "off" });
}

async function renderFusionMermaid(mermaidText) {
  if (!fusionMermaid) return;
  fusionMermaid.innerHTML = "";
  if (!mermaidText || !mermaidReady) return;
  const pre = document.createElement("pre");
  pre.className = "mermaid";
  pre.textContent = mermaidText;
  fusionMermaid.appendChild(pre);
  await window.mermaid.run({ nodes: [pre] });
}

function renderFusionPreview(data) {
  if (!data?.layers?.length) {
    fusionPanel.classList.add("hidden");
    return;
  }
  fusionPanel.classList.remove("hidden");
  fusionSummary.textContent = data.summary || data.phases?.join(" → ") || "";
  const detail = {
    profile: data.profile,
    layers: data.layers,
    phases: data.phases,
    nextField: data.nextField,
    liminalField: data.liminalField,
    fusion: data.fusion,
    context: data.context
  };
  fusionDetail.textContent = JSON.stringify(detail, null, 2);
  if (data.mermaid) renderFusionMermaid(data.mermaid);
}

async function previewFusion() {
  const layers = detectFusionLayers(sourceEl.value);
  if (!layers.length) {
    setOutput("No FUSE blocks detected in source.", true);
    fusionPanel.classList.add("hidden");
    return;
  }
  setOutput("Previewing fusion layers…");
  try {
    const preview = await api("/api/fusion/preview", { with_protocol: "off" });
    let graphData = null;
    try {
      graphData = await api("/api/fusion/graph", { with_protocol: "off" });
    } catch {
      graphData = null;
    }
    const merged = graphData ? { ...preview, mermaid: graphData.mermaid, graph: graphData.graph } : preview;
    renderFusionPreview(merged);
    setOutput(JSON.stringify(merged, null, 2), !merged.success);
  } catch (e) {
    fusionPanel.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
}

function formatExampleLabel(ex) {
  const title = ex.title || ex.name;
  if (ex.category) return `[${ex.category}] ${title}`;
  return title;
}

async function loadExamples() {
  try {
    const res = await fetch("/api/examples");
    const data = await res.json();
    const examples = data.examples || [];

    for (const ex of examples) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = formatExampleLabel(ex);
      exampleSelect.appendChild(opt);
    }

    const hello = examples.find((e) => e.name === "hello.noeon");
    if (hello) {
      sourceEl.value = hello.source;
      activeExampleName = hello.name;
      exampleSelect.value = hello.name;
    } else {
      sourceEl.value = FALLBACK_SOURCE;
    }

    exampleSelect.addEventListener("change", () => {
      const name = exampleSelect.value;
      if (!name) {
        activeExampleName = null;
        return;
      }
      const ex = examples.find((e) => e.name === name);
      if (ex) {
        sourceEl.value = ex.source;
        activeExampleName = name;
        updateFusionBadge();
        updateSourceBrainGutter();
        setStatus(`Loaded ${ex.title || name}`);
        if (name === "agent_field.noeon") previewFusion();
      }
    });
  } catch {
    sourceEl.value = FALLBACK_SOURCE;
    updateSourceBrainGutter();
    setStatus("Examples unavailable (start server with npm run playground)");
  }
}

document.getElementById("btn-validate").addEventListener("click", async () => {
  setOutput("Validating…");
  try {
    const data = await api("/api/validate", {});
    setOutput(JSON.stringify(data, null, 2), !data.valid);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-compile").addEventListener("click", async () => {
  setOutput("Compiling…");
  try {
    const data = await api("/api/compile", { format: "ir" });
    setOutput(JSON.stringify(data, null, 2));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

function formatCanonicalReportSummary(report) {
  if (!report?.schema) return "";
  const gov = report.governance?.arbitration?.winner_tier || "—";
  const phases = (report.execution?.phases || []).join(" → ") || "—";
  const fusion = (report.fusion?.layers || []).join(", ") || "none";
  const arch = report.execution?.architecture;
  const archLine = arch?.active_regions?.length
    ? `brain: ${arch.active_regions.map((r) => REGION_LABELS[r] || r).slice(0, 5).join(", ")}${arch.active_regions.length > 5 ? "…" : ""}`
    : null;
  const runtimeTrace = report.observability?.runtime_trace;
  const runtimeLine = runtimeTrace?.phases?.length
    ? `trace: ${runtimeTrace.phases.join("→")}${runtimeTrace.scheduler ? ` (${runtimeTrace.scheduler})` : ""}`
    : null;
  return [
    "── Canonical Report ──",
    `surface: ${report.surface} | success: ${report.success} | blocked: ${report.blocked}`,
    `goal: ${report.intent?.goal || "—"}`,
    `phases: ${phases}`,
    `governance: ${gov} | fusion: ${fusion}`,
    archLine,
    runtimeLine,
    report.fusion?.coherence != null ? `coherence: ${report.fusion.coherence}` : null,
    ""
  ].filter(Boolean).join("\n");
}

document.getElementById("btn-run").addEventListener("click", async () => {
  const isNoeon = activeExampleName?.endsWith(".noeon");
  setOutput(isNoeon ? "Running (cognitive workflow)…" : "Running (kernel + protocol auto)…");
  try {
    const withProtocol = isNoeon ? "off" : "auto";
    const data = await api("/api/run", { trace: true, with_protocol: withProtocol });
    renderBrainTrace(data);
    const summary = formatCanonicalReportSummary(data.report || data.unifiedReport);
    const body = JSON.stringify(data, null, 2);
    setOutput(summary ? `${summary}${body}` : body, !data.success);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-fusion").addEventListener("click", previewFusion);

document.getElementById("btn-plan").addEventListener("click", async () => {
  setOutput("Planning (Next-centric pipeline)…");
  try {
    const plan = await fetchBrainPlan();
    renderBrainTrace({ architecture: plan.architecture, architectureMermaid: plan.architectureMermaid });
    setOutput(JSON.stringify({
      routeLabel: plan.routeLabel,
      stack: plan.stack,
      architecture: plan.architecture,
      validation: plan.validation
    }, null, 2));
  } catch (e) {
    brainPanel.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-brain").addEventListener("click", async () => {
  setOutput("Mapping cognitive architecture…");
  try {
    const data = await fetchBrainMap();
    renderBrainTrace(data);
    setOutput(JSON.stringify(data, null, 2));
  } catch (e) {
    brainPanel.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-explain").addEventListener("click", async () => {
  setOutput("Generating explanation…");
  try {
    const data = await api("/api/explain", {});
    setOutput(data.explanation || JSON.stringify(data, null, 2));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

sourceEl.addEventListener("keyup", () => {
  updateLineInfo();
  updateFusionBadge();
});
sourceEl.addEventListener("click", updateLineInfo);
sourceEl.addEventListener("input", () => {
  updateFusionBadge();
  updateSourceBrainGutter();
  scheduleBrainSync();
});
sourceEl.addEventListener("scroll", () => {
  if (sourceGutter) sourceGutter.scrollTop = sourceEl.scrollTop;
});
sourceEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-run").click();
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const start = sourceEl.selectionStart;
    const end = sourceEl.selectionEnd;
    sourceEl.value = `${sourceEl.value.slice(0, start)}  ${sourceEl.value.slice(end)}`;
    sourceEl.selectionStart = sourceEl.selectionEnd = start + 2;
  }
});

updateLineInfo();
updateSourceBrainGutter();
loadExamples().then(() => scheduleBrainSync());
fetch("/api/status").then((r) => r.json()).then((s) => {
  const base = `Noeon ${s.version} | LLM ${s.llm?.mode}`;
  fetch("/api/pkg/search?q=", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    .then((r) => r.json())
    .then((pkg) => setStatus(`${base} | registry ${pkg.count ?? 0} packages`))
    .catch(() => setStatus(base));
}).catch(() => {});
