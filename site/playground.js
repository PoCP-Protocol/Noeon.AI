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
const humanGatePanel = document.getElementById("human-gate-panel");
const gateActionLabel = document.getElementById("gate-action-label");
const gateMessage = document.getElementById("gate-message");
const aiNativePanel = document.getElementById("ai-native-panel");
const aiNativeGrade = document.getElementById("ai-native-grade");
const aiNativeVerdict = document.getElementById("ai-native-verdict");
const aiNativeDims = document.getElementById("ai-native-dims");
const aiNativeSuggestions = document.getElementById("ai-native-suggestions");
const patchDiffPanel = document.getElementById("patch-diff-panel");
const patchDiffSummary = document.getElementById("patch-diff-summary");
const patchDiffEl = document.getElementById("patch-diff");
const universalPanel = document.getElementById("universal-panel");
const universalScore = document.getElementById("universal-score");
const universalFormula = document.getElementById("universal-formula");
const universalDims = document.getElementById("universal-dims");
const meshTracePanel = document.getElementById("mesh-trace-panel");
const meshTraceSummary = document.getElementById("mesh-trace-summary");
const meshTraceNodes = document.getElementById("mesh-trace-nodes");
const meshTraceMermaid = document.getElementById("mesh-trace-mermaid");
const actionTraceEl = document.getElementById("action-trace");

let activeExampleName = null;
let pendingGateApproval = null;
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

async function renderAiNativePanel(evaluation) {
  if (!aiNativePanel || !evaluation) {
    aiNativePanel?.classList.add("hidden");
    return;
  }
  aiNativePanel.classList.remove("hidden");
  if (aiNativeGrade) {
    aiNativeGrade.textContent = `${evaluation.grade} · ${Math.round((evaluation.score || 0) * 100)}%`;
  }
  if (aiNativeVerdict) aiNativeVerdict.textContent = evaluation.verdict || "";
  if (aiNativeDims) {
    aiNativeDims.innerHTML = "";
    for (const [key, dim] of Object.entries(evaluation.dimensions || {})) {
      const chip = document.createElement("span");
      chip.className = "brain-region-chip";
      chip.title = (dim.notes || []).join(", ");
      chip.textContent = `${key.replace(/_/g, " ")} ${Math.round((dim.score || 0) * 100)}%`;
      aiNativeDims.appendChild(chip);
    }
  }
  if (aiNativeSuggestions) {
    aiNativeSuggestions.innerHTML = "";
    for (const s of evaluation.suggestions || []) {
      const li = document.createElement("li");
      li.textContent = `[${s.priority}] ${s.action}`;
      aiNativeSuggestions.appendChild(li);
    }
  }
}

function renderMeshTracePanel(trace) {
  if (!meshTracePanel) return;
  if (!trace) {
    meshTracePanel.classList.add("hidden");
    return;
  }
  meshTracePanel.classList.remove("hidden");
  const s = trace.summary || {};
  if (meshTraceSummary) {
    const live = trace.live ? 'live' : 'simulated';
    meshTraceSummary.textContent = `${live} · ${s.spawns || 0} spawns · ${s.delegations || 0} delegations · ${s.completed || 0} completed`;
  }
  if (meshTraceNodes) {
    meshTraceNodes.innerHTML = "";
    for (const n of trace.nodes || []) {
      const chip = document.createElement("span");
      chip.className = "brain-region-chip";
      chip.textContent = `${n.type}:${n.name} (${n.status})`;
      meshTraceNodes.appendChild(chip);
    }
    for (const e of trace.edges || []) {
      const chip = document.createElement("span");
      chip.className = "brain-region-chip";
      chip.textContent = `→ ${e.strategy || e.type} (${e.status})`;
      meshTraceNodes.appendChild(chip);
    }
  }
  if (meshTraceMermaid) meshTraceMermaid.textContent = trace.mermaid || "";
}

function renderPatchDiffPanel(diff, summary) {
  if (!patchDiffPanel || !patchDiffEl) return;
  if (!diff) {
    patchDiffPanel.classList.add("hidden");
    return;
  }
  patchDiffPanel.classList.remove("hidden");
  if (patchDiffSummary) patchDiffSummary.textContent = summary || "";
  patchDiffEl.textContent = diff;
}

function renderUniversalPanel(payload) {
  if (!universalPanel || !payload?.validation) {
    universalPanel?.classList.add("hidden");
    return;
  }
  universalPanel.classList.remove("hidden");
  if (universalScore) {
    universalScore.textContent = `${Math.round((payload.validation.score || 0) * 100)}% · ${payload.aiNative?.grade || "—"}`;
  }
  if (universalFormula) universalFormula.textContent = payload.formula || "";
  if (universalDims) {
    universalDims.innerHTML = "";
    for (const [key, ok] of Object.entries(payload.validation.checks || {})) {
      const chip = document.createElement("span");
      chip.className = "brain-region-chip";
      chip.textContent = `${ok ? "✓" : "○"} ${key}`;
      universalDims.appendChild(chip);
    }
  }
}

async function fetchAiEvaluate(run = false) {
  return api("/api/ai/evaluate", { run }, { silent: !run });
}

async function fetchGoldenPath() {
  return api("/api/golden", { min_grade: "C", dream: true }, { silent: true });
}

async function fetchAiDream() {
  return api("/api/ai/dream", {}, { silent: true });
}

function renderGoldenOutput(payload) {
  renderAiNativePanel(payload.aiNative?.post || payload.aiNative?.pre);
  if (payload.run?.pendingApproval) {
    renderHumanGate({
      pendingApproval: payload.run.pendingApproval,
      humanGate: true,
      awaitingHuman: true
    });
  }
  const lines = [
    `Golden Path: ${payload.verdict}`,
    `AI-Native: ${payload.aiNative?.pre?.grade} → ${payload.aiNative?.post?.grade}`,
    payload.dream?.imagination?.title || "",
    ...(payload.hints || [])
  ].filter(Boolean);
  return lines.join("\n") + "\n\n" + JSON.stringify(payload, null, 2);
}

function renderActionTrace(data) {
  if (!actionTraceEl) return;
  const trace = data?.actionTrace;
  if (!trace?.actions?.length && !trace?.lastAction) {
    actionTraceEl.textContent = "";
    actionTraceEl.classList.add("hidden");
    return;
  }
  actionTraceEl.classList.remove("hidden");
  const lines = [`ACT trace · ${trace.count} action(s) · ${trace.succeeded} ok · ${trace.failed} fail`];
  if (trace.lastAction) {
    const last = trace.lastAction;
    lines.push(
      `last: ${last.action || "?"} · ${last.status || "?"} · ${last.plugin || (last.simulated ? "simulated" : "none")}`
    );
  }
  if (trace.lastFetch) {
    lines.push(`fetch: ${String(trace.lastFetch).slice(0, 160)}`);
  }
  for (const item of trace.actions) {
    const mock = item.mocked ? " mock" : "";
    const preview = item.content ? ` · ${String(item.content).slice(0, 72)}` : "";
    lines.push(`  ${item.action} [${item.plugin || "sim"}] ${item.status}${mock}${preview}`);
  }
  actionTraceEl.textContent = lines.join("\n");
}

function compileExtras() {
  const el = document.getElementById("canonical-mode");
  return el?.checked ? { general_canonical: true } : {};
}

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
  renderActionTrace(data);
  renderMeshTracePanel(data.meshTrace || data.report?.observability?.mesh_trace);
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
  const mesh = data?.meshTrace || data?.report?.observability?.mesh_trace;
  const arch = data?.architecture;
  if (!arch?.active_regions?.length) {
    brainPanel.classList.add("hidden");
    renderActionTrace(data);
    renderMeshTracePanel(mesh);
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
  renderActionTrace(data);
  renderMeshTracePanel(mesh);
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
    const data = await api("/api/compile", { format: "ir", ...compileExtras() });
    const summary = [
      `compileMode: ${data.compileMode || "cognitive-primary"}`,
      `primaryIr: ${data.primaryIr || "cognitive"}`,
      ""
    ].join("\n");
    setOutput(summary + JSON.stringify(data, null, 2));
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
  const relay = report.semantic?.relay?.action || report.semantic?.pulse?.action;
  const semanticLine = relay
    ? `semantic: ${relay}${report.semantic?.convergence != null ? ` | convergence: ${report.semantic.convergence}` : ""}`
    : null;
  return [
    "── Canonical Report ──",
    `surface: ${report.surface} | success: ${report.success} | blocked: ${report.blocked}`,
    `goal: ${report.intent?.goal || "—"}`,
    `phases: ${phases}`,
    `governance: ${gov} | fusion: ${fusion}`,
    archLine,
    runtimeLine,
    semanticLine,
    report.fusion?.coherence != null ? `coherence: ${report.fusion.coherence}` : null,
    ""
  ].filter(Boolean).join("\n");
}

function renderHumanGate(data) {
  if (!humanGatePanel) return;
  const pending = data?.pendingApproval;
  if (!data?.awaitingHuman || !pending?.id) {
    humanGatePanel.classList.add("hidden");
    pendingGateApproval = null;
    return;
  }
  pendingGateApproval = pending;
  humanGatePanel.classList.remove("hidden");
  if (gateActionLabel) gateActionLabel.textContent = pending.action ? `· ${pending.action}` : "";
  if (gateMessage) {
    gateMessage.textContent = pending.message || pending.approve_hint || "Human approval required before execution continues.";
  }
}

async function approveAndRerun() {
  if (!pendingGateApproval?.id) return;
  setOutput("Approving human gate…");
  try {
    await fetch("/api/human-gate/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingGateApproval.id })
    });
    const token = pendingGateApproval.token;
    humanGatePanel.classList.add("hidden");
    setOutput("Re-running with approval token…");
    const isNoeon = activeExampleName?.endsWith(".noeon");
    const data = await api("/api/run", {
      trace: true,
      with_protocol: isNoeon ? "off" : "auto",
      approval_token: token
    });
    pendingGateApproval = null;
    renderHumanGate(data);
    renderBrainTrace(data);
    const summary = formatCanonicalReportSummary(data.report || data.unifiedReport);
    setOutput(`${summary}${JSON.stringify(data, null, 2)}`, !data.success);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
}

document.getElementById("btn-gate-approve")?.addEventListener("click", approveAndRerun);
document.getElementById("btn-gate-dismiss")?.addEventListener("click", () => {
  humanGatePanel?.classList.add("hidden");
});

document.getElementById("btn-run").addEventListener("click", async () => {
  const isNoeon = activeExampleName?.endsWith(".noeon");
  setOutput(isNoeon ? "Running (cognitive workflow)…" : "Running (kernel + protocol auto)…");
  try {
    const withProtocol = isNoeon ? "off" : "auto";
    const payload = { trace: true, with_protocol: withProtocol };
    if (pendingGateApproval?.token) payload.approval_token = pendingGateApproval.token;
    const data = await api("/api/run", payload);
    renderHumanGate(data);
    renderBrainTrace(data);
    const summary = formatCanonicalReportSummary(data.report || data.unifiedReport);
    const body = JSON.stringify(data, null, 2);
    setOutput(summary ? `${summary}${body}` : body, !data.success);
  } catch (e) {
    renderHumanGate(null);
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

document.getElementById("btn-ai-eval").addEventListener("click", async () => {
  setOutput("Evaluating AI-native design…");
  try {
    const evaluation = await fetchAiEvaluate(false);
    await renderAiNativePanel(evaluation);
    setOutput(JSON.stringify(evaluation, null, 2));
  } catch (e) {
    aiNativePanel?.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-golden").addEventListener("click", async () => {
  setOutput("Running Golden Path (evaluate → run → self → dream)…");
  try {
    const payload = await fetchGoldenPath();
    setOutput(renderGoldenOutput(payload), payload.verdict === "blocked");
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-dream").addEventListener("click", async () => {
  setOutput("Imagining next epoch…");
  try {
    const dream = await fetchAiDream();
    await renderAiNativePanel({ grade: dream.current?.grade, score: dream.current?.score, verdict: dream.current?.verdict, dimensions: {}, suggestions: dream.imagination?.priorities || [] });
    setOutput((dream.prompt_brief || JSON.stringify(dream, null, 2)));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-reflect").addEventListener("click", async () => {
  setOutput("Running SELF-improve reflect loop…");
  try {
    const data = await api("/api/ai/reflect", {}, { silent: true });
    await renderAiNativePanel(data.aiNative);
    const improve = data.selfImprove;
    let text = improve?.brief || JSON.stringify(data, null, 2);
    const diff = data.patchPreview?.diff;
    if (diff) {
      renderPatchDiffPanel(diff, "Reflect patch preview");
      text += `\n\n--- diff ---\n${diff}`;
    }
    setOutput(text);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-patch").addEventListener("click", async () => {
  setOutput("Building patch preview…");
  try {
    const preview = await api("/api/ai/patch", {}, { silent: true });
    if (preview.suggestedSource && confirm("Apply suggested patch to editor?")) {
      sourceEl.value = preview.suggestedSource;
      updateSourceBrainGutter();
    }
    renderPatchDiffPanel(preview.diff, preview.primaryPatch?.action || "Patch preview");
    setOutput(preview.previewBrief || JSON.stringify(preview, null, 2));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-remediate").addEventListener("click", async () => {
  setOutput("Auto-remediate: patch → re-golden → verify…");
  try {
    const payload = await api("/api/ai/remediate", { min_grade: "C", max_rounds: 2 }, { silent: true });
    await renderAiNativePanel({
      grade: payload.after?.grade,
      score: payload.after?.score,
      verdict: payload.verdict,
      dimensions: {},
      suggestions: payload.hints?.map((h) => ({ priority: "medium", action: h })) || []
    });
    const lines = [
      `Remediate: ${payload.verdict}`,
      `${payload.before?.grade} (${Math.round((payload.before?.score || 0) * 100)}%) → ${payload.after?.grade} (${Math.round((payload.after?.score || 0) * 100)}%)`,
      ...(payload.hints || [])
    ];
    if (payload.diff) {
      renderPatchDiffPanel(payload.diff, `Remediate ${payload.before?.grade} → ${payload.after?.grade}`);
      lines.push("", "--- diff ---", payload.diff);
    }
    if (payload.suggestedSource && confirm("Apply remediated source to editor?")) {
      sourceEl.value = payload.suggestedSource;
      updateSourceBrainGutter();
    }
    setOutput(lines.join("\n"));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-universal").addEventListener("click", async () => {
  setOutput("Evaluating Universal program…");
  try {
    const payload = await api("/api/universal/evaluate", {
      source: sourceEl.value,
      filename: activeExampleName || "playground.noeon"
    }, { silent: true });
    renderUniversalPanel(payload);
    await renderAiNativePanel(payload.aiNative);
    setOutput(payload.brief || JSON.stringify(payload, null, 2));
  } catch (e) {
    universalPanel?.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-universal-scaffold").addEventListener("click", async () => {
  const name = prompt("Universal agent name:", "MyUniversalAgent") || "MyUniversalAgent";
  const intent = prompt("INTENT (goal):", "Declare a measurable AI-native outcome");
  setOutput("Scaffolding Universal program…");
  try {
    const res = await fetch("/api/universal/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, intent: intent || undefined })
    });
    if (!res.ok) throw new Error(`scaffold → ${res.status}`);
    const payload = await res.json();
    sourceEl.value = payload.source;
    activeExampleName = null;
    exampleSelect.value = "";
    updateSourceBrainGutter();
    setOutput(`Scaffolded Universal program: ${name}\n\n${payload.formula}`);
    document.getElementById("btn-universal")?.click();
  } catch (e) {
    setOutput(e.message, true);
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
