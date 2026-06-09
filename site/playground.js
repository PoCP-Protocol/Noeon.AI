const sourceEl = document.getElementById("source");
const outputSummaryEl = document.getElementById("output-summary");
const outputDetailWrap = document.getElementById("output-detail-wrap");
const outputDetailEl = document.getElementById("output-detail");
const statusEl = document.getElementById("status-bar");
const statusDotEl = document.getElementById("status-dot");
const exampleSelect = document.getElementById("example-select");
const exampleFilterEl = document.getElementById("example-filter");
const sourceLineNumbersEl = document.getElementById("source-line-numbers");
const runBtn = document.getElementById("btn-run");
const lineInfoEl = document.getElementById("line-info");
const fusionBadge = document.getElementById("fusion-badge");
const fusionPanel = document.getElementById("fusion-panel");
const fusionSummary = document.getElementById("fusion-summary");
const fusionHumanEl = document.getElementById("fusion-human");
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
const resultEmptyEl = document.getElementById("result-empty");
const resultCardsEl = document.getElementById("result-cards");
const insightsEmptyEl = document.getElementById("insights-empty");
const pgAdvancedEl = document.getElementById("pg-advanced");

const DEFAULT_DEMO = "agent_risk_review.noeon";

const SIGNATURE_DEMOS = [
  {
    name: "agent_risk_review.noeon",
    tag: "人机共治",
    tagClass: "tag-gate",
    title: "风险审查",
    pitch: "支付审批必须人工确认——规则写在程序里，不依赖平台后台开关"
  },
  {
    name: "signed_act_demo.noeon",
    tag: "签名行动",
    tagClass: "tag-signed",
    title: "签名 HTTP",
    pitch: "对外调用带 HMAC 签名，每次行动可审计、可验真、可追责"
  }
];

const PHASE_LABELS = {
  observe: "感知输入",
  understand: "理解意图",
  reason: "推理分析",
  decide: "做出决策",
  act: "执行行动",
  feedback: "收集反馈",
  reflect: "反思总结",
  greet: "问候输出",
  plan: "制定计划",
  perceive: "感知",
  execute: "执行"
};

function labelPhase(phase) {
  const key = String(phase || "").toLowerCase();
  return PHASE_LABELS[key] || phase;
}

function updateFlowStep() {
  /* 初心版无步骤条 */
}

function wireRunEmptyButton() {
  document.getElementById("btn-run-empty")?.addEventListener("click", () => runBtn?.click());
}

function showResultEmpty({ lead, hint, showRunBtn = true, isError = false } = {}) {
  resultCardsEl?.classList.add("hidden");
  resultEmptyEl?.classList.remove("hidden");
  resultEmptyEl?.classList.toggle("is-error", isError);
  if (!resultEmptyEl) return;
  resultEmptyEl.innerHTML = [
    `<p class="result-empty-lead">${lead || "还没有运行过"}</p>`,
    hint ? `<p class="result-empty-hint">${hint}</p>` : "",
    showRunBtn ? '<button type="button" id="btn-run-empty" class="btn primary">运行当前示例</button>' : ""
  ].filter(Boolean).join("");
  wireRunEmptyButton();
}

function updateInsightsEmpty() {
  const anyVisible = [
    brainPanel,
    fusionPanel,
    meshTracePanel,
    humanGatePanel
  ].some((el) => el && !el.classList.contains("hidden"));
  insightsEmptyEl?.classList.toggle("hidden", anyVisible);
}

function buildRunResultView(data) {
  const report = data.report || data.unifiedReport;
  let status = "success";
  let icon = "✓";
  let title = "运行完成";
  let desc = "程序已按定义步骤执行完毕。";

  if (data.awaitingHuman) {
    status = "pending";
    icon = "⏸";
    title = "等待您的确认";
    desc = "该示例包含审批环节，请在下方确认后继续。";
  } else if (data.blocked) {
    status = "error";
    icon = "⊘";
    title = "运行被拦截";
    desc = data.error || "安全或治理规则阻止了继续执行。";
  } else if (data.success === false) {
    status = "error";
    icon = "✗";
    title = "运行未成功";
    desc = data.error || "执行过程中出现问题。";
  }

  const goal = report?.intent?.goal || data.intent?.goal || extractObjectiveFromSource();
  const phases = data.executionPhases || data.phases || data.executionSummary?.phases || report?.execution?.phases || [];
  const trace = data.actionTrace;
  let actions = "";
  if (trace?.lastAction) {
    const last = trace.lastAction;
    actions = `最近动作：${last.action || "—"}（${last.status || "—"}）`;
  }
  if (trace?.count) {
    actions += `${actions ? " · " : ""}共 ${trace.count} 项，${trace.succeeded} 项成功`;
  }
  if (data.pluginActs?.total) {
    actions += `${actions ? " · " : ""}插件调用 ${data.pluginActs.total} 次`;
  }

  return { status, icon, title, desc, goal, phases, actions };
}

function extractObjectiveFromSource() {
  const match = sourceEl.value.match(/objective\s+"([^"]+)"/i);
  return match?.[1] || null;
}

function extractAgentOutcome(data) {
  const report = data.report || data.unifiedReport;
  if (data.awaitingHuman) {
    return `审批流程已暂停：${data.pendingApproval?.message || report?.intent?.goal || "等待人工确认后继续。"}`;
  }
  const relay = report?.semantic?.relay?.action || report?.semantic?.pulse?.action;
  if (relay) return `语义行动：${relay}`;
  const trace = data.actionTrace;
  if (trace?.lastAction?.content) return String(trace.lastAction.content).slice(0, 320);
  if (trace?.lastAction) {
    const last = trace.lastAction;
    const plugin = last.plugin ? ` · 插件 ${last.plugin}` : "";
    return `执行 ${last.action || "行动"}（${last.status || "ok"}）${plugin}`;
  }
  const goal = report?.intent?.goal || extractObjectiveFromSource();
  if (data.success !== false && goal) return `已完成与目标相关的认知循环：${goal}`;
  if (data.blocked) return data.error || "运行被治理规则拦截。";
  if (data.success === false) return data.error || "运行未成功完成。";
  return "程序已按声明步骤执行完毕（详见下方证据链）。";
}

function appendProvenanceEntries(entries, report) {
  const effects = report?.effects;
  if (effects?.runtime?.length) {
    const escalated = effects.escalated?.length ? ` · 超出声明: ${effects.escalated.join(', ')}` : '';
    entries.push({
      label: '效应分类',
      value: `${effects.runtime.join(' · ')}${effects.valid ? '' : escalated || ' · 未通过策略'}`
    });
  }
  const meta = report?.transcriptMeta;
  if (meta?.replay_fingerprint) {
    const short = meta.replay_fingerprint.slice(0, 16);
    entries.push({
      label: '可重放指纹',
      value: `${short}…${meta.id ? ` · ${meta.id}` : ''}`
    });
  }
  const agent = report?.agentSurface?.cards?.[0];
  if (agent) {
    entries.push({
      label: '智能体',
      value: `${agent.name}${agent.tools?.length ? ` · ${agent.tools.length} 工具` : ''}`
    });
    if (agent.flow?.length) {
      const done = agent.flow.filter((s) => s.status === 'executed').length;
      entries.push({
        label: 'FLOW 对齐',
        value: `${done}/${agent.flow.length} 步已执行`
      });
    }
  }
}

function buildEvidenceEntries(data) {
  const report = data.report || data.unifiedReport;
  const structured = report?.cognitiveEvidence;

  if (structured?.artifacts?.length) {
    const entries = [];
    if (structured.goal) entries.push({ label: '声明目标', value: structured.goal });

    const wm = report?.worldModel;
    if (wm?.beliefs?.length) {
      entries.push({
        label: '世界模型',
        value: `${wm.stats?.belief_count ?? wm.beliefs.length} 个信念 · 平均置信 ${Math.round((wm.stats?.avg_confidence ?? 0) * 100)}%`
      });
      for (const b of wm.hypotheses.slice(-3)) {
        entries.push({
          label: '假设',
          value: `${b.claim} (${Math.round(b.confidence * 100)}%)`
        });
      }
      for (const rev of wm.revisions.filter((r) => r.op === 'revise_belief' || r.op === 'decide').slice(-2)) {
        entries.push({
          label: rev.op === 'decide' ? '决策写入模型' : '信念修订',
          value: rev.target + (rev.rationale ? ` · ${rev.rationale}` : '')
        });
      }
    }
    if (structured.summary?.avgConfidence != null) {
      entries.push({
        label: '平均置信度',
        value: `${Math.round(structured.summary.avgConfidence * 100)}% · ${structured.summary.total} 条证据`
      });
    }
    for (const artifact of structured.artifacts) {
      const phaseLabel = labelPhase(artifact.phase);
      const headline = artifact.hypothesis
        || artifact.decision?.chosen
        || artifact.outcome
        || artifact.evidence?.[0]?.claim
        || phaseLabel;
      const conf = artifact.confidence != null
        ? ` · 置信 ${Math.round(artifact.confidence * 100)}%`
        : '';
      const prov = artifact.provenance ? ` · ${artifact.provenance}` : '';
      entries.push({
        label: `${phaseLabel}${artifact.operation ? ` · ${artifact.operation}` : ''}`,
        value: `${headline}${conf}${prov}`
      });
    }
    if (data.awaitingHuman) {
      entries.push({ label: '人机共治', value: '已触发，等待确认后继续' });
    }
    appendProvenanceEntries(entries, report);
    return entries;
  }

  const entries = [];
  const goal = report?.intent?.goal || extractObjectiveFromSource();
  if (goal) entries.push({ label: "声明目标", value: goal });

  const phases = data.executionPhases || data.phases || data.executionSummary?.phases || report?.execution?.phases || [];
  if (phases.length) {
    entries.push({ label: "执行阶段", value: phases.map(labelPhase).join(" → ") });
  }

  const execLine = formatRunExecutionSummary(data);
  if (execLine) entries.push({ label: "执行策略", value: execLine.replace(/^执行：/, "") });

  if (data.pluginActs?.total) {
    entries.push({
      label: "插件签名",
      value: `${data.pluginActs.signed ?? 0}/${data.pluginActs.total} 已签名`
    });
  }

  if (data.awaitingHuman) {
    entries.push({ label: "人机共治", value: "已触发，等待确认后继续" });
  }

  const gov = report?.governance?.arbitration?.winner_tier;
  if (gov) entries.push({ label: "治理裁决", value: gov });

  if (report?.schema) {
    entries.push({ label: "执行报告", value: `${report.schema}${report.surface ? ` · ${report.surface}` : ""}` });
  }

  for (const item of data.actionTrace?.actions || []) {
    const tags = [
      item.status,
      item.signed ? "已签名" : null,
      item.mocked ? "模拟" : null
    ].filter(Boolean).join(" · ");
    entries.push({
      label: item.action || "行动",
      value: `${item.plugin || "内置"}${tags ? ` · ${tags}` : ""}`
    });
  }

  if (!entries.length) {
    entries.push({ label: "执行", value: "已完成（无分步记录）" });
  }
  appendProvenanceEntries(entries, report);
  return entries;
}

function renderEvidenceTrace(data) {
  const dl = document.getElementById("evidence-trace");
  if (!dl) return;
  dl.innerHTML = "";
  for (const { label, value } of buildEvidenceEntries(data)) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

function renderResultCards(data) {
  const view = buildRunResultView(data);
  resultEmptyEl?.classList.add("hidden");
  resultCardsEl?.classList.remove("hidden");
  updateInsightsEmpty();

  const statusCard = document.getElementById("result-status-card");
  if (statusCard) statusCard.className = `result-status result-status-${view.status}`;

  const iconEl = document.getElementById("result-status-icon");
  const titleEl = document.getElementById("result-status-title");
  const descEl = document.getElementById("result-status-desc");
  if (iconEl) iconEl.textContent = view.icon;
  if (titleEl) titleEl.textContent = view.title;
  if (descEl) descEl.textContent = view.desc;

  const outcomeEl = document.getElementById("agent-outcome");
  const outcomeText = document.getElementById("agent-outcome-text");
  if (outcomeEl && outcomeText) {
    outcomeText.textContent = extractAgentOutcome(data);
    outcomeEl.classList.remove("hidden");
  }

  renderCognitiveTimeline(view.phases);
  renderEvidenceTrace(data);

  if (outputSummaryEl) outputSummaryEl.textContent = formatRunResultHuman(data);
  if (outputDetailEl && outputDetailWrap) {
    outputDetailEl.textContent = JSON.stringify(data, null, 2);
    outputDetailWrap.classList.remove("hidden");
  }
  highlightSignatureDemo(activeExampleName);
}

function renderCognitiveTimeline(phases) {
  const el = document.getElementById("cognitive-timeline");
  if (!el) return;
  if (!phases?.length) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  const parts = [];
  for (let i = 0; i < phases.length; i += 1) {
    parts.push(
      `<div class="tl-node"><span class="tl-dot"></span><span class="tl-label">${labelPhase(phases[i])}</span></div>`
    );
    if (i < phases.length - 1) parts.push('<span class="tl-arrow">→</span>');
  }
  el.innerHTML = parts.join("");
}

function highlightSignatureDemo(name) {
  document.querySelectorAll(".pg-signature-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.example === name);
  });
}

function renderSignatureDemos() {
  const el = document.getElementById("signature-demos");
  if (!el) return;
  el.innerHTML = "";
  for (const demo of SIGNATURE_DEMOS) {
    const ex = cachedExamples.find((e) => e.name === demo.name);
    if (!ex) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pg-signature-card";
    btn.dataset.example = demo.name;
    btn.innerHTML = `
      <span class="pg-signature-tag ${demo.tagClass}">${demo.tag}</span>
      <h4>${demo.title}</h4>
      <p>${demo.pitch}</p>`;
    btn.addEventListener("click", () => {
      applyExampleByName(demo.name);
      highlightSignatureDemo(demo.name);
    });
    el.appendChild(btn);
  }
  highlightSignatureDemo(activeExampleName);
}

function renderQuickExamples() {
  renderSignatureDemos();
}
let activeExampleName = null;
let activeExampleCategory = null;
let cachedExamples = [];
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
  objective "演示通用配置下的认知循环执行"
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

function setStatus(text, tone = "ready") {
  if (statusEl) statusEl.textContent = text;
  if (statusDotEl) {
    statusDotEl.className = `status-dot ${tone === "busy" ? "busy" : tone === "error" ? "error" : "ready"}`;
  }
}

function applyOutputTone({ isError = false, tone = null } = {}) {
  if (!outputSummaryEl) return;
  outputSummaryEl.classList.remove("is-neutral", "is-success", "is-error", "is-pending");
  if (tone) {
    outputSummaryEl.classList.add(tone);
    return;
  }
  outputSummaryEl.classList.add(isError ? "is-error" : "is-pending");
}

function updateLineInfo() {
  const pos = sourceEl.selectionStart;
  const text = sourceEl.value.slice(0, pos);
  const line = text.split("\n").length;
  const col = text.length - text.lastIndexOf("\n");
  if (lineInfoEl) lineInfoEl.textContent = `第 ${line} 行，第 ${col} 列`;
}

function setOutput(text, isError = false, errorLine = null, options = {}) {
  const { hideDetail = true } = options;
  if (outputSummaryEl) outputSummaryEl.textContent = text;
  showResultEmpty({
    lead: isError ? "出现问题" : "提示",
    hint: text,
    showRunBtn: false,
    isError
  });
  if (hideDetail && outputDetailWrap) {
    outputDetailWrap.classList.add("hidden");
    if (outputDetailEl) outputDetailEl.textContent = "";
  }
  sourceEl.classList.remove("has-error-line");
  if (errorLine) {
    sourceEl.dataset.errorLine = String(errorLine);
    sourceEl.classList.add("has-error-line");
    highlightErrorLine(errorLine);
  }
}

function setRunOutput(data) {
  renderResultCards(data);
  sourceEl.classList.remove("has-error-line");
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
  if (!silent) setStatus("处理中…", "busy");
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
    if (!silent) setStatus("请求失败", "error");
    throw err;
  }
  if (!silent) setStatus("就绪", "ready");
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
  fusionBadge.textContent = `融合：${layers.join(" · ")}`;
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
  prefrontal_cortex: "执行中枢",
  sensory_cortex: "感知",
  association_cortex: "推理",
  motor_cortex: "行动",
  hippocampus: "记忆",
  amygdala: "显著性",
  basal_ganglia: "选择",
  cerebellum: "校正",
  thalamus: "路由",
  corpus_callosum: "整合",
  default_mode_network: "场域",
  neuromodulatory: "演化"
};

const CATEGORY_LABELS = {
  "getting-started": "入门",
  tools: "工具",
  production: "生产",
  agents: "智能体",
  fusion: "融合",
  universal: "通用",
  noeon: "程序",
  ael: "AEL"
};

const EXEC_PATH_LABELS = {
  hybrid: "混合",
  "snapshot-act": "工具快照",
  cognitive: "认知",
  canonical: "标准语义"
};

const STRATEGY_LABELS = {
  "hybrid-canonical-acts": "混合执行",
  "tool-snapshot-primary": "工具快照",
  "snapshot-primary": "标准语义",
  "cognitive-primary": "认知循环"
};

function labelStrategy(strategy) {
  return STRATEGY_LABELS[strategy] || strategy || "";
}

function labelExecPath(path) {
  return EXEC_PATH_LABELS[path] || path || "";
}

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
  const hasExec = data?.executionSummary?.strategy || data?.executionStrategy;
  if (!data?.routeLabel && !data?.runtime?.phases?.length && !hasExec) {
    sourceRouteBar.classList.add("hidden");
    sourceRouteBar.textContent = "";
    return;
  }
  sourceRouteBar.classList.remove("hidden");
  const routeLens = (data.code_lenses || []).find((l) => l.title?.includes("route:"));
  const cycleLens = (data.code_lenses || []).find((l) => l.title?.includes("cycle:"));
  const runtimePhases = data.runtime?.phases?.length
    ? `已运行：${data.runtime.phases.join("→")}`
    : null;
  const execSummary = data.executionSummary;
  const execStrategy = execSummary?.strategy
    ? `执行：${labelExecPath(execSummary.path) || labelStrategy(execSummary.strategy)}`
    : (data.executionStrategy ? `执行：${labelStrategy(data.executionStrategy)}` : null);
  sourceRouteBar.textContent = [
    routeLens?.title?.replace(/^▸ route:/, "路径：") || (data.routeLabel ? `路径：${data.routeLabel}` : null),
    execStrategy,
    data.active_regions?.length ? `${data.active_regions.length} 个脑区` : null,
    runtimePhases,
    cycleLens ? cycleLens.title.replace("◎ ", "") : null
  ].filter(Boolean).join(" · ");
}

function updateSourcePanelSub(ex) {
  const el = document.getElementById("source-panel-sub");
  if (!el) return;
  el.textContent = ex ? `· ${ex.title || ex.name}` : "";
}

function updateSourceLineNumbers() {
  if (!sourceLineNumbersEl || !sourceEl) return;
  const lines = sourceEl.value.split("\n");
  sourceLineNumbersEl.innerHTML = "";
  for (let i = 0; i < lines.length; i += 1) {
    const tag = document.createElement("span");
    tag.className = "source-line-num";
    tag.textContent = String(i + 1);
    sourceLineNumbersEl.appendChild(tag);
  }
  sourceLineNumbersEl.scrollTop = sourceEl.scrollTop;
}

function filterExampleOptions(query = "") {
  const q = String(query || "").trim().toLowerCase();
  let visible = 0;
  for (const opt of exampleSelect.querySelectorAll("option")) {
    if (!opt.value) {
      opt.hidden = false;
      continue;
    }
    const ex = cachedExamples.find((e) => e.name === opt.value);
    const hay = [
      ex?.title,
      ex?.description,
      ex?.name,
      CATEGORY_LABELS[ex?.category],
      ex?.executionPath ? labelExecPath(ex.executionPath) : null
    ].filter(Boolean).join(" ").toLowerCase();
    const match = !q || hay.includes(q);
    opt.hidden = !match;
    if (match) visible += 1;
  }
  if (q && visible === 0) {
    setStatus(`未找到「${query.trim()}」`, "error");
  } else if (q) {
    setStatus(`找到 ${visible} 个示例`, "ready");
  }
}

async function copyOutputText() {
  const text = outputSummaryEl?.textContent
    || document.getElementById("agent-outcome-text")?.textContent
    || "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("已复制摘要");
    setTimeout(() => setStatus("就绪", "ready"), 1200);
  } catch {
    setStatus("复制失败", "error");
  }
}

function resetActiveExample() {
  if (!activeExampleName) {
    setStatus("请先选择示例", "error");
    setTimeout(() => setStatus("就绪", "ready"), 1200);
    return;
  }
  if (applyExampleByName(activeExampleName)) {
    setStatus("已恢复示例");
    setTimeout(() => setStatus("就绪", "ready"), 1200);
  }
}

function setRunBusy(busy) {
  if (!runBtn) return;
  runBtn.classList.toggle("is-busy", busy);
  runBtn.disabled = busy;
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

    if (lens && (lens.title.includes("route:") || lens.title.includes("cycle:") || lens.title.includes("integration:") || lens.title.includes("exec:"))) {
      tag.className = "brain-line-tag lens";
      tag.style.setProperty("--brain-color", REGION_COLORS[region] || "#9c7bd8");
      tag.textContent = lens.title.includes("route:") ? "▸rt"
        : lens.title.includes("cycle:") ? "◎cy"
        : lens.title.includes("exec:") ? "⚡ex"
        : "◎fu";
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
    updateInsightsEmpty();
    return;
  }
  meshTracePanel.classList.remove("hidden");
  const s = trace.summary || {};
  if (meshTraceSummary) {
    const live = trace.live ? "实时" : "模拟";
    meshTraceSummary.textContent = `${live} · 派生 ${s.spawns || 0} · 委派 ${s.delegations || 0} · 完成 ${s.completed || 0}`;
  }
  if (meshTraceNodes) {
    meshTraceNodes.innerHTML = "";
    for (const n of trace.nodes || []) {
      const chip = document.createElement("span");
      chip.className = "brain-region-chip";
      chip.textContent = `${n.type}:${n.name}（${n.status}）`;
      meshTraceNodes.appendChild(chip);
    }
    for (const e of trace.edges || []) {
      const chip = document.createElement("span");
      chip.className = "brain-region-chip";
      chip.textContent = `→ ${e.strategy || e.type}（${e.status}）`;
      meshTraceNodes.appendChild(chip);
    }
  }
  if (meshTraceMermaid) meshTraceMermaid.textContent = trace.mermaid || "";
  updateInsightsEmpty();
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
    `质量评估：${payload.verdict}`,
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
  const lines = [`行动追踪 · ${trace.count} 项 · ${trace.succeeded} 成功 · ${trace.failed} 失败`];
  if (data?.pluginActs?.total) {
    lines.push(`插件签名：${data.pluginActs.signed ?? 0}/${data.pluginActs.total}`);
  }
  if (trace.lastAction) {
    const last = trace.lastAction;
    lines.push(
      `最近：${last.action || "?"} · ${last.status || "?"} · ${last.plugin || (last.simulated ? "模拟" : "无")}`
    );
  }
  if (trace.lastFetch) {
    lines.push(`请求：${String(trace.lastFetch).slice(0, 160)}`);
  }
  for (const item of trace.actions) {
    const mock = item.mocked ? " 模拟" : "";
    const sig = item.plugin ? (item.signed ? " 已签名" : " 未签名") : "";
    const preview = item.content ? ` · ${String(item.content).slice(0, 72)}` : "";
    lines.push(`  ${item.action} [${item.plugin || "模拟"}] ${item.status}${sig}${mock}${preview}`);
  }
  actionTraceEl.textContent = lines.join("\n");
}

function compileExtras() {
  const el = document.getElementById("canonical-mode");
  if (el?.checked) return { general_canonical: true };
  if (activeExampleCategory === "tools") return { general_canonical: true };
  const ex = cachedExamples.find((e) => e.name === activeExampleName);
  if (ex?.autoCanonical) return { general_canonical: true };
  return {};
}

function updateExampleDescHint(ex) {
  const el = document.getElementById("example-desc-hint");
  if (!el) return;
  if (!ex) {
    el.textContent = "加载示例后，这里会说明这个智能体在做什么。";
    return;
  }
  const sig = SIGNATURE_DEMOS.find((s) => s.name === ex.name);
  el.textContent = sig
    ? `【${sig.tag}】${sig.pitch}`
    : (ex.description || `「${ex.title || ex.name}」— 点击运行即可体验。`);
}

function updateExamplePathHint(ex) {
  const el = document.getElementById("example-path-hint");
  if (!el) return;
  if (!ex?.executionPath || ex.executionPath === "cognitive") {
    el.textContent = "";
    el.className = "example-path-hint hidden";
    updateCanonicalHint(ex);
    updateExampleDescHint(ex);
    return;
  }
  el.className = `example-path-hint path-${ex.executionPath}`;
  const signedTag = ex.signedAct ? " · 已签名" : "";
  el.textContent = `执行方式：${labelExecPath(ex.executionPath)}${signedTag}`;
  updateCanonicalHint(ex);
  updateExampleDescHint(ex);
}

function updateCanonicalHint(ex) {
  const el = document.getElementById("canonical-hint");
  if (!el) return;
  const extras = compileExtras();
  if (extras.general_canonical) {
    el.classList.remove("hidden");
    el.textContent = "标准语义模式（按示例自动启用）";
  } else {
    el.classList.add("hidden");
    el.textContent = "";
  }
}

function syncExampleSelects(name) {
  if (exampleSelect) exampleSelect.value = name || "";
  const adv = document.getElementById("example-select-advanced");
  if (adv) adv.value = name || "";
}

function applyExampleByName(name) {
  const ex = cachedExamples.find((e) => e.name === name);
  if (!ex) return false;
  sourceEl.value = ex.source;
  activeExampleName = name;
  syncExampleSelects(name);
  applyExampleCanonicalPreference(ex);
  updateExamplePathHint(ex);
  updateExampleDescHint(ex);
  updateSourcePanelSub(ex);
  updateFusionBadge();
  updateSourceBrainGutter();
  updateSourceLineNumbers();
  setStatus(`已加载 ${ex.title || name}`);
  highlightSignatureDemo(name);
  if (name === "agent_field.noeon") {
    setStatus("已加载场域分析师 · 该示例含融合层，运行后可查看下方架构");
  }
  return true;
}

function applyExampleCanonicalPreference(ex) {
  activeExampleCategory = ex?.category || null;
  const el = document.getElementById("canonical-mode");
  if (!el) return;
  const key = "noeon.playground.canonical-primary";
  const pref = localStorage.getItem(key);
  if (pref === "1") {
    el.checked = true;
    return;
  }
  if (pref === "0") {
    el.checked = false;
    return;
  }
  el.checked = ex?.autoCanonical === true || ex?.category === "tools" || ex?.category === "production";
}

(function initCanonicalPreference() {
  const el = document.getElementById("canonical-mode");
  if (!el) return;
  const key = "noeon.playground.canonical-primary";
  const pref = localStorage.getItem(key);
  if (pref === "1") el.checked = true;
  else if (pref === "0") el.checked = false;
  el.addEventListener("change", () => {
    localStorage.setItem(key, el.checked ? "1" : "0");
  });
})();

function actionTraceHint(data) {
  const trace = data?.actionTrace;
  return trace?.count ? `${trace.count} 项行动` : null;
}

function renderBrainTraceCompact(data) {
  const arch = data?.architecture;
  const archDetails = architectureDetailLines(data);
  const execTag = data?.executionSummary?.strategy
    ? `执行：${labelExecPath(data.executionSummary.path) || labelStrategy(data.executionSummary.strategy)}`
    : null;

  if (!arch?.active_regions?.length && !execTag && !archDetails.length) {
    brainPanel.classList.add("hidden");
    return;
  }

  brainPanel.classList.remove("hidden");
  brainSummary.textContent = [
    execTag,
    data.routeLabel ? `路径：${data.routeLabel}` : null,
    arch?.active_regions?.length ? `${arch.active_regions.length} 个脑区` : null,
    actionTraceHint(data),
    data.runtime?.phases?.length ? `已运行：${data.runtime.phases.join("→")}` : "实时同步"
  ].filter(Boolean).join(" · ");

  brainRegions.innerHTML = "";
  for (const id of arch?.active_regions || []) {
    const chip = document.createElement("span");
    chip.className = "brain-region-chip";
    chip.title = id;
    chip.textContent = REGION_LABELS[id] || id.replace(/_/g, " ");
    brainRegions.appendChild(chip);
  }

  const flowLines = [];
  if (data.agent_flows?.length) {
    for (const agent of data.agent_flows) {
      const steps = (agent.steps || []).map((s) => `${(s.kind || "?").toUpperCase()}→${REGION_LABELS[s.region] || s.region || "?"}`);
      flowLines.push(`${agent.name}: ${steps.join(" · ")}`);
    }
  }
  if (archDetails.length) {
    if (flowLines.length) flowLines.push("");
    flowLines.push("── 架构详情 ──", ...archDetails);
  }
  brainFlow.textContent = flowLines.join("\n");

  if (data.architectureMermaid) renderBrainMermaid(data.architectureMermaid);
  renderActionTrace(data);
  renderMeshTracePanel(data.meshTrace || data.report?.observability?.mesh_trace);
  updateInsightsEmpty();
}

async function syncBrainFromApi({ silent = true } = {}) {
  if (!liveBrainEnabled || !sourceEl.value.trim()) return;
  const gen = ++brainSyncGen;
  try {
    const data = await api("/api/brain", { with_protocol: "off" }, { silent });
    if (gen !== brainSyncGen) return;
    updateRouteBar(data);
    updateSourceBrainGutter(data);
    updateRunExecutionBar(data);
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

function architectureDetailLines(data) {
  return window.NoeonArchitecturePanel?.formatArchitectureLines(data) || [];
}

function renderBrainTrace(data) {
  liveBrainEnabled = false;
  clearTimeout(brainSyncTimer);
  const mesh = data?.meshTrace || data?.report?.observability?.mesh_trace;
  const arch = data?.architecture;
  const archDetails = architectureDetailLines(data);

  if (!arch?.active_regions?.length) {
    if (archDetails.length) {
      brainPanel.classList.remove("hidden");
      brainSummary.textContent = [
        data.routeLabel ? `路径：${data.routeLabel}` : null,
        data.compileMode ? `编译：${labelStrategy(data.compileMode) || data.compileMode}` : null
      ].filter(Boolean).join(" · ") || "认知架构";
      brainRegions.innerHTML = "";
      brainFlow.textContent = archDetails.join("\n");
    } else {
      brainPanel.classList.add("hidden");
    }
    renderActionTrace(data);
    renderMeshTracePanel(mesh);
    updateInsightsEmpty();
    return;
  }

  brainPanel.classList.remove("hidden");
  const executive = arch.governance_regions?.[0] || "prefrontal_cortex";
  brainSummary.textContent = [
    data.executionSummary?.strategy
      ? `执行：${labelExecPath(data.executionSummary.path) || labelStrategy(data.executionSummary.strategy)}`
      : null,
    `主控：${REGION_LABELS[executive] || executive}`,
    `核心：${REGION_LABELS[arch.core_field] || arch.core_field || "场域"}`,
    data.routeLabel ? `路径：${data.routeLabel}` : null,
    data.compileMode ? `编译：${labelStrategy(data.compileMode) || data.compileMode}` : null,
    actionTraceHint(data),
    data.runtime?.phases?.length ? `已运行：${data.runtime.phases.join("→")}` : null,
    arch.phase_regions?.length ? `阶段脑区：${arch.phase_regions.length}` : null
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
      "流水线：" +
        arch.pipeline_phases.map((p) => `${p.phase}[${(p.regions || []).map((r) => REGION_LABELS[r] || r).join("+")}]`).join(" → ")
    );
  }
  if (archDetails.length) {
    flowLines.push("", "── 详情 ──", ...archDetails);
  }
  brainFlow.textContent = flowLines.length ? flowLines.join("\n") : "暂无智能体流程，仅显示静态脑区映射。";

  if (data.architectureMermaid) renderBrainMermaid(data.architectureMermaid);
  updateRouteBar({
    routeLabel: data.routeLabel,
    active_regions: arch.active_regions,
    code_lenses: data.code_lenses,
    executionSummary: data.executionSummary,
    runtime: {
      phases: (arch.pipeline_phases || []).map((p) => p.phase)
    }
  });
  updateSourceBrainGutter(data);
  renderActionTrace(data);
  renderMeshTracePanel(mesh);
  if (!brainPanel.classList.contains("hidden")) {
    brainPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  updateInsightsEmpty();
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

function formatFusionHuman(data) {
  const lines = [];
  if (data.summary) lines.push(data.summary);
  if (data.phases?.length) lines.push(`阶段：${data.phases.join(" → ")}`);
  if (data.layers?.length) lines.push(`融合层：${data.layers.join("、")}`);
  if (data.profile) lines.push(`配置：${data.profile}`);
  if (data.context?.domain) lines.push(`域：${data.context.domain}`);
  return lines.filter(Boolean).join("\n");
}

function formatPlanHuman(plan) {
  const lines = ["── 执行规划 ──"];
  if (plan.routeLabel) lines.push(`路径：${plan.routeLabel}`);
  if (plan.stack?.core) {
    const surfaces = plan.stack.surfaces?.length ? ` · ${plan.stack.surfaces.join("+")}` : "";
    lines.push(`栈：${plan.stack.core}${surfaces}`);
  }
  const regions = plan.architecture?.active_regions?.length;
  if (regions) lines.push(`激活脑区：${regions} 个`);
  if (plan.validation?.valid === false) {
    lines.push(`校验：未通过（${(plan.validation.errors || []).join("；")}）`);
  } else if (plan.validation?.valid) {
    lines.push("校验：通过");
  }
  return lines.join("\n");
}

function formatBrainHuman(data) {
  const lines = ["── 架构分析 ──"];
  if (data.routeLabel) lines.push(`路径：${data.routeLabel}`);
  const exec = formatRunExecutionSummary(data);
  if (exec) lines.push(exec);
  const regions = data.architecture?.active_regions?.length;
  if (regions) lines.push(`脑区：${regions} 个`);
  if (data.runtime?.phases?.length) lines.push(`阶段：${data.runtime.phases.join(" → ")}`);
  return lines.join("\n");
}

function renderFusionPreview(data) {
  if (!data?.layers?.length) {
    fusionPanel.classList.add("hidden");
    updateInsightsEmpty();
    return;
  }
  fusionPanel.classList.remove("hidden");
  fusionSummary.textContent = data.summary || data.phases?.join(" → ") || "";
  if (fusionHumanEl) fusionHumanEl.textContent = formatFusionHuman(data);
  const detail = {
    profile: data.profile,
    layers: data.layers,
    phases: data.phases,
    nextField: data.nextField,
    liminalField: data.liminalField,
    fusion: data.fusion,
    context: data.context
  };
  if (fusionDetail) fusionDetail.textContent = JSON.stringify(detail, null, 2);
  if (data.mermaid) renderFusionMermaid(data.mermaid);
  updateInsightsEmpty();
}

async function previewFusion() {
  const layers = detectFusionLayers(sourceEl.value);
  if (!layers.length) {
    setOutput("未检测到融合模块。", true);
    fusionPanel.classList.add("hidden");
    return;
  }
  setOutput("预览融合层…");
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
    setOutput(formatFusionHuman(merged), !merged.success);
  } catch (e) {
    fusionPanel.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
}

function formatExampleLabel(ex) {
  const title = ex.title || ex.name;
  const cat = CATEGORY_LABELS[ex.category] || ex.category;
  const pathLabel = ex.executionPath && ex.executionPath !== "cognitive"
    ? labelExecPath(ex.executionPath)
    : null;
  const signedTag = ex.signedAct ? "已签名" : null;
  const tags = [pathLabel, signedTag].filter(Boolean).join(" · ");
  if (ex.category) return tags ? `[${cat}] ${title}（${tags}）` : `[${cat}] ${title}`;
  return tags ? `${title}（${tags}）` : title;
}

const EXAMPLE_CATEGORY_ORDER = ["getting-started", "tools", "agents", "fusion", "production", "universal"];

function populateExampleSelect(selectEl, examples) {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="">选择示例…</option>';
  const grouped = new Map();
  for (const ex of examples) {
    const cat = ex.category || "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(ex);
  }
  for (const cat of EXAMPLE_CATEGORY_ORDER) {
    const items = grouped.get(cat);
    if (!items?.length) continue;
    const optgroup = document.createElement("optgroup");
    optgroup.label = CATEGORY_LABELS[cat] || cat;
    for (const ex of items) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = formatExampleLabel(ex).replace(/^\[[^\]]+\]\s*/, "");
      optgroup.appendChild(opt);
    }
    selectEl.appendChild(optgroup);
    grouped.delete(cat);
  }
  for (const [cat, items] of grouped) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = CATEGORY_LABELS[cat] || cat;
    for (const ex of items) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = formatExampleLabel(ex).replace(/^\[[^\]]+\]\s*/, "");
      optgroup.appendChild(opt);
    }
    selectEl.appendChild(optgroup);
  }
}

function onExampleSelected(name, examples) {
  if (!name) {
    activeExampleName = null;
    syncExampleSelects("");
    updateExamplePathHint(null);
    updateExampleDescHint(null);
    updateSourcePanelSub(null);
    highlightSignatureDemo(null);
    return;
  }
  applyExampleByName(name);
}

async function loadExamples() {
  try {
    const res = await fetch("/api/examples");
    const data = await res.json();
    const examples = data.examples || [];
    cachedExamples = examples;

    populateExampleSelect(exampleSelect, examples);
    populateExampleSelect(document.getElementById("example-select-advanced"), examples);

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("example");
    if (requested && applyExampleByName(requested)) {
      // deep link from Studio / Gate policy panel
    } else {
      const defaultEx = examples.find((e) => e.name === DEFAULT_DEMO)
        || examples.find((e) => e.name === "hello.noeon");
      if (defaultEx) {
        applyExampleByName(defaultEx.name);
        updateSourceLineNumbers();
      } else {
        sourceEl.value = FALLBACK_SOURCE;
      }
    }

    renderQuickExamples();

    document.getElementById("example-select-advanced")?.addEventListener("change", (e) => {
      onExampleSelected(e.target.value, examples);
    });
  } catch (err) {
    sourceEl.value = FALLBACK_SOURCE;
    updateSourceBrainGutter();
    updateSourceLineNumbers();
    const msg = err?.message || "无法连接服务";
    showResultEmpty({
      lead: "示例加载失败",
      hint: `请确认已运行 node src/cli.js playground，并通过 http://localhost:5177/playground.html 打开（不要直接双击 HTML 文件）。${msg !== "无法连接服务" ? ` 原因：${msg}` : ""}`,
      showRunBtn: false,
      isError: true
    });
    setStatus("示例加载失败 · 请启动本地服务后刷新", "error");
  }
}

document.getElementById("btn-validate")?.addEventListener("click", async () => {
  setOutput("校验中…");
  try {
    const data = await api("/api/validate", {});
    const lines = [
      data.valid ? "✓ 校验通过" : "✗ 校验未通过",
      ...(data.errors?.length ? data.errors.map((e) => `  · ${e}`) : []),
      ...(data.warnings?.length ? ["提示：", ...data.warnings.map((w) => `  · ${w}`)] : [])
    ];
    setOutput(lines.filter(Boolean).join("\n"), !data.valid, null, { hideDetail: !data.valid });
    if (!data.valid && outputDetailEl && outputDetailWrap) {
      outputDetailEl.textContent = JSON.stringify(data, null, 2);
      outputDetailWrap.classList.remove("hidden");
    }
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-compile")?.addEventListener("click", async () => {
  setOutput("编译中…");
  try {
    const data = await api("/api/compile", { format: "ir", ...compileExtras() });
    const summary = [
      `编译模式：${labelStrategy(data.compileMode) || data.compileMode || "认知循环"}`,
      `主 IR：${data.primaryIr === "cognitive" ? "认知" : (data.primaryIr || "认知")}`,
      "",
      "展开「查看完整数据」可查看 IR 详情。"
    ].join("\n");
    setOutput(summary, false, null, { hideDetail: false });
    if (outputDetailEl && outputDetailWrap) {
      outputDetailEl.textContent = JSON.stringify(data, null, 2);
      outputDetailWrap.classList.remove("hidden");
    }
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

function formatRunExecutionSummary(data) {
  if (!data) return "";
  const summary = data.executionSummary;
  if (summary?.strategy) {
    const tags = [
      `策略：${labelStrategy(summary.strategy)}`,
      summary.path ? `路径：${labelExecPath(summary.path)}` : null,
      summary.hybrid ? "混合" : null,
      summary.snapshotAct ? "工具快照" : null,
      summary.actDriver ? `行动驱动：${summary.actDriver}` : null,
      summary.phases?.length ? `阶段：${summary.phases.join("→")}` : null
    ].filter(Boolean);
    return tags.length ? `执行：${tags.join(" · ")}` : "";
  }
  const strategy = data.executionStrategy || null;
  const phases = data.executionPhases || data.phases || data.runtime?.phases || [];
  const tags = [
    strategy ? `策略：${labelStrategy(strategy)}` : null,
    data.hybridActExecution ? "混合" : null,
    data.snapshotActExecution ? "工具快照" : null,
    data.actDriver ? `行动驱动：${data.actDriver}` : null,
    data.executionDriver ? `驱动：${data.executionDriver}` : null,
    phases.length ? `阶段：${phases.join("→")}` : null
  ].filter(Boolean);
  return tags.length ? `执行：${tags.join(" · ")}` : "";
}

function formatRunResultHuman(data) {
  if (!data) return "无结果";
  const report = data.report || data.unifiedReport;
  const lines = [];
  if (data.awaitingHuman) {
    lines.push("⏸ 等待人工确认后继续执行");
  } else if (data.blocked) {
    lines.push("⊘ 运行被拦截");
  } else if (data.success === false) {
    lines.push("✗ 运行失败");
  } else {
    lines.push("✓ 运行完成");
  }
  if (data.error) lines.push(`原因：${data.error}`);
  const goal = report?.intent?.goal || data.intent?.goal;
  if (goal) lines.push(`目标：${goal}`);
  const phases = data.executionPhases || data.phases || data.executionSummary?.phases || report?.execution?.phases || [];
  if (phases.length) lines.push(`阶段：${phases.join(" → ")}`);
  const trace = data.actionTrace;
  if (trace?.count) {
    lines.push(`行动：${trace.succeeded}/${trace.count} 成功${trace.failed ? `，${trace.failed} 失败` : ""}`);
  }
  if (data.pluginActs?.total) {
    lines.push(`插件签名：${data.pluginActs.signed ?? 0}/${data.pluginActs.total}`);
  }
  const execLine = formatRunExecutionSummary(data);
  if (execLine) lines.push(execLine);
  const reportBlock = formatCanonicalReportSummary(report);
  if (reportBlock) lines.push("", reportBlock.trim());
  return lines.join("\n");
}

function executionPathClass(data) {
  const summary = data?.executionSummary;
  if (summary?.path) return `path-${summary.path}`;
  const strategy = data?.executionStrategy;
  if (strategy === "hybrid-canonical-acts") return "path-hybrid";
  if (strategy === "tool-snapshot-primary") return "path-snapshot-act";
  if (strategy === "snapshot-primary") return "path-canonical";
  return "path-cognitive";
}

function updateRunExecutionBar(data) {
  const el = document.getElementById("run-execution-bar");
  if (!el) return;
  const summary = data?.executionSummary;
  if (summary?.strategy) {
    el.className = `run-execution-bar ${executionPathClass(data)}`;
    el.textContent = [
      labelStrategy(summary.strategy),
      summary.hybrid ? "混合" : null,
      summary.snapshotAct ? "工具快照" : null,
      summary.phases?.length ? summary.phases.join(" → ") : null
    ].filter(Boolean).join(" · ");
    return;
  }
  const strategy = data?.executionStrategy;
  const phases = data?.executionPhases || data?.phases || [];
  if (!strategy && !phases.length && !data?.hybridActExecution && !data?.snapshotActExecution) {
    el.textContent = "";
    el.className = "run-execution-bar hidden";
    return;
  }
  const parts = [
    labelStrategy(strategy) || "认知循环",
    data.hybridActExecution ? "混合" : null,
    data.snapshotActExecution ? "工具快照" : null,
    phases.length ? phases.join(" → ") : null
  ].filter(Boolean);
  el.className = `run-execution-bar ${executionPathClass(data)}`;
  el.textContent = parts.join(" · ");
}

function formatCanonicalReportSummary(report) {
  if (!report?.schema) return "";
  const gov = report.governance?.arbitration?.winner_tier || "—";
  const phases = (report.execution?.phases || []).join(" → ") || "—";
  const fusion = (report.fusion?.layers || []).join("、") || "无";
  const arch = report.execution?.architecture;
  const archLine = arch?.active_regions?.length
    ? `脑区：${arch.active_regions.map((r) => REGION_LABELS[r] || r).slice(0, 5).join("、")}${arch.active_regions.length > 5 ? "…" : ""}`
    : null;
  const runtimeTrace = report.observability?.runtime_trace;
  const runtimeLine = runtimeTrace?.phases?.length
    ? `追踪：${runtimeTrace.phases.join("→")}${runtimeTrace.scheduler ? `（${runtimeTrace.scheduler}）` : ""}`
    : null;
  const relay = report.semantic?.relay?.action || report.semantic?.pulse?.action;
  const semanticLine = relay
    ? `语义：${relay}${report.semantic?.convergence != null ? ` · 收敛 ${report.semantic.convergence}` : ""}`
    : null;
  return [
    "── 执行报告 ──",
    `类型：${report.surface} · 成功：${report.success} · 拦截：${report.blocked}`,
    `目标：${report.intent?.goal || "—"}`,
    `阶段：${phases}`,
    `治理：${gov} · 融合：${fusion}`,
    archLine,
    runtimeLine,
    semanticLine,
    report.fusion?.coherence != null ? `连贯性：${report.fusion.coherence}` : null
  ].filter(Boolean).join("\n");
}

function renderHumanGate(data) {
  if (!humanGatePanel) return;
  const pending = data?.pendingApproval;
  if (!data?.awaitingHuman || !pending?.id) {
    humanGatePanel.classList.add("hidden");
    pendingGateApproval = null;
    updateInsightsEmpty();
    return;
  }
  pendingGateApproval = pending;
  humanGatePanel.classList.remove("hidden");
  humanGatePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  updateInsightsEmpty();
  if (gateActionLabel) gateActionLabel.textContent = pending.action ? `· ${pending.action}` : "";
  if (gateMessage) {
    gateMessage.textContent = pending.message || pending.approve_hint || "继续执行前需要您的确认。";
  }
}

async function approveAndRerun() {
  if (!pendingGateApproval?.id) return;
  setOutput("正在确认…");
  try {
    await fetch("/api/human-gate/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingGateApproval.id })
    });
    const token = pendingGateApproval.token;
    humanGatePanel.classList.add("hidden");
    setOutput("已确认，重新运行…");
    const isNoeon = activeExampleName?.endsWith(".noeon");
    const data = await api("/api/run", {
      trace: true,
      with_protocol: isNoeon ? "off" : "auto",
      approval_token: token
    });
    pendingGateApproval = null;
    renderHumanGate(data);
    renderBrainTrace(data);
    updateRunExecutionBar(data);
    setRunOutput(data);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
}

document.getElementById("btn-gate-approve")?.addEventListener("click", approveAndRerun);
document.getElementById("btn-gate-dismiss")?.addEventListener("click", () => {
  humanGatePanel?.classList.add("hidden");
  pendingGateApproval = null;
});

document.getElementById("btn-run").addEventListener("click", async () => {
  const isNoeon = activeExampleName?.endsWith(".noeon");
  showResultEmpty({ lead: "正在运行…", hint: "请稍候，系统正在执行认知工作流。", showRunBtn: false });
  setRunBusy(true);
  try {
    const withProtocol = isNoeon ? "off" : "auto";
    const payload = { trace: true, with_protocol: withProtocol };
    if (pendingGateApproval?.token) payload.approval_token = pendingGateApproval.token;
    const data = await api("/api/run", { ...payload, ...compileExtras() });
    renderHumanGate(data);
    renderBrainTrace(data);
    renderActionTrace(data);
    updateRunExecutionBar(data);
    setRunOutput(data);
  } catch (e) {
    renderHumanGate(null);
    setOutput(e.message, true, e.line);
  } finally {
    setRunBusy(false);
  }
});

document.getElementById("btn-fusion")?.addEventListener("click", previewFusion);

document.getElementById("btn-plan")?.addEventListener("click", async () => {
  setOutput("生成执行规划…");
  try {
    const plan = await fetchBrainPlan();
    renderBrainTrace({ architecture: plan.architecture, architectureMermaid: plan.architectureMermaid, routeLabel: plan.routeLabel });
    setOutput(formatPlanHuman(plan), false, null, { hideDetail: false });
    if (outputDetailEl && outputDetailWrap) {
      outputDetailEl.textContent = JSON.stringify({
        routeLabel: plan.routeLabel,
        stack: plan.stack,
        architecture: plan.architecture,
        validation: plan.validation
      }, null, 2);
      outputDetailWrap.classList.remove("hidden");
    }
  } catch (e) {
    brainPanel.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-brain")?.addEventListener("click", async () => {
  setOutput("分析认知架构…");
  try {
    const data = await fetchBrainMap();
    renderBrainTrace(data);
    setOutput(formatBrainHuman(data), false, null, { hideDetail: false });
    if (outputDetailEl && outputDetailWrap) {
      outputDetailEl.textContent = JSON.stringify(data, null, 2);
      outputDetailWrap.classList.remove("hidden");
    }
  } catch (e) {
    brainPanel.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-ai-eval")?.addEventListener("click", async () => {
  setOutput("评估程序设计…");
  try {
    const evaluation = await fetchAiEvaluate(false);
    await renderAiNativePanel(evaluation);
    setOutput(JSON.stringify(evaluation, null, 2));
  } catch (e) {
    aiNativePanel?.classList.add("hidden");
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-golden")?.addEventListener("click", async () => {
  setOutput("运行质量评估…");
  try {
    const payload = await fetchGoldenPath();
    setOutput(renderGoldenOutput(payload), payload.verdict === "blocked");
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-dream")?.addEventListener("click", async () => {
  setOutput("生成演进设想…");
  try {
    const dream = await fetchAiDream();
    await renderAiNativePanel({ grade: dream.current?.grade, score: dream.current?.score, verdict: dream.current?.verdict, dimensions: {}, suggestions: dream.imagination?.priorities || [] });
    setOutput((dream.prompt_brief || JSON.stringify(dream, null, 2)));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-reflect")?.addEventListener("click", async () => {
  setOutput("运行自我反思…");
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

document.getElementById("btn-patch")?.addEventListener("click", async () => {
  setOutput("生成变更建议…");
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

document.getElementById("btn-remediate")?.addEventListener("click", async () => {
  setOutput("自动优化中…");
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
      `优化结果：${payload.verdict}`,
      `${payload.before?.grade} (${Math.round((payload.before?.score || 0) * 100)}%) → ${payload.after?.grade} (${Math.round((payload.after?.score || 0) * 100)}%)`,
      ...(payload.hints || [])
    ];
    if (payload.diff) {
      renderPatchDiffPanel(payload.diff, `优化 ${payload.before?.grade} → ${payload.after?.grade}`);
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

document.getElementById("btn-universal")?.addEventListener("click", async () => {
  setOutput("评估通用维度…");
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

document.getElementById("btn-universal-scaffold")?.addEventListener("click", async () => {
  const name = prompt("Universal agent name:", "MyUniversalAgent") || "MyUniversalAgent";
  const intent = prompt("INTENT (goal):", "Declare a measurable AI-native outcome");
  setOutput("生成程序模板…");
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
    setOutput(`已生成程序：${name}\n\n${payload.formula}`);
    document.getElementById("btn-universal")?.click();
  } catch (e) {
    setOutput(e.message, true);
  }
});

document.getElementById("btn-explain")?.addEventListener("click", async () => {
  setOutput("生成说明…");
  try {
    const data = await api("/api/explain", {});
    setOutput(data.explanation || "暂无说明。");
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
  updateSourceLineNumbers();
  scheduleBrainSync();
});
sourceEl.addEventListener("scroll", () => {
  if (sourceGutter) sourceGutter.scrollTop = sourceEl.scrollTop;
  if (sourceLineNumbersEl) sourceLineNumbersEl.scrollTop = sourceEl.scrollTop;
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
updateSourceLineNumbers();
updateSourceBrainGutter();
wireRunEmptyButton();
showResultEmpty();
updateInsightsEmpty();
loadExamples().then(() => scheduleBrainSync());
setStatus("就绪", "ready");

pgAdvancedEl?.addEventListener("toggle", () => {
  document.body.classList.toggle("pg-editing", pgAdvancedEl.open);
});
sourceEl?.addEventListener("focus", () => document.body.classList.add("pg-editing"));

document.getElementById("btn-copy-output")?.addEventListener("click", copyOutputText);
document.getElementById("btn-reset-example")?.addEventListener("click", resetActiveExample);
exampleFilterEl?.addEventListener("input", () => filterExampleOptions(exampleFilterEl.value));
exampleFilterEl?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    exampleFilterEl.value = "";
    filterExampleOptions("");
    exampleFilterEl.blur();
  }
});
