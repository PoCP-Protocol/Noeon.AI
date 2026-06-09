async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function renderParity(payload) {
  const statusEl = document.getElementById("conform-status");
  const goalEl = document.getElementById("shared-goal");
  const schemaEl = document.getElementById("report-schema");
  const tbody = document.getElementById("parity-rows");

  if (!payload) return;

  statusEl.textContent = payload.allValid ? "4/4 PASS" : `${payload.results.filter((r) => r.valid).length}/4`;
  statusEl.className = `value ${payload.allValid ? "status-pass" : "status-fail"}`;
  goalEl.textContent = payload.goal || "—";
  schemaEl.textContent = payload.schema || "—";

  tbody.innerHTML = (payload.results || []).map((r) => `
    <tr>
      <td><code>${r.file}</code></td>
      <td>${r.executor || "—"}</td>
      <td>${r.goal ? "✓" : "—"}</td>
      <td>${r.governance_tier || "—"}</td>
      <td class="${r.valid ? "status-pass" : "status-fail"}">${r.valid ? "PASS" : "FAIL"}</td>
    </tr>
  `).join("");
}

function renderAudit(report) {
  const countEl = document.getElementById("audit-count");
  const logEl = document.getElementById("audit-log");
  const entries = report?.entries || report?.rows || [];
  countEl.textContent = String(report?.stats?.total ?? entries.length);
  logEl.textContent = entries.length
    ? entries.slice(-8).map((e) => JSON.stringify(e)).join("\n")
    : "No audit entries yet — run programs with canonical_audit enabled.";
}

function renderMcp(status) {
  if (!status) return;
  document.getElementById("mcp-mode").textContent = status.mode || "—";
  document.getElementById("mcp-servers").textContent = String(status.serverCount ?? 0);
  document.getElementById("mcp-tools").textContent = String(status.staticToolCount ?? 0);
  document.getElementById("mcp-detail").textContent = JSON.stringify(status.servers || [], null, 2);
}

function renderEcosystem(status) {
  if (!status) return;
  document.getElementById("eco-registry").textContent = String(status.registry?.count ?? 0);
  document.getElementById("eco-legacy").textContent = status.legacy?.deprecated
    ? `deprecated → ${status.legacy.sunset_target || "v1.2"}`
    : "—";
  document.getElementById("eco-detail").textContent = JSON.stringify({
    registry: status.registry?.packages?.slice(0, 5),
    legacy: status.legacy
  }, null, 2);
}

let ggSelectedFile = null;

const UNI_DIMS = [
  ['intent', 'INTENT'],
  ['epistemic', 'EPISTEMIC'],
  ['cognition', 'COGNITION'],
  ['capability', 'CAPABILITY'],
  ['governance', 'GOVERNANCE'],
  ['evolution', 'EVOLUTION']
];

function renderUniversalRadar(payload) {
  if (!payload) return;
  document.getElementById("uni-total").textContent = String(payload.summary?.total ?? 0);
  document.getElementById("uni-ready").textContent = `${payload.summary?.ready ?? 0}/${payload.summary?.total ?? 0}`;
  document.getElementById("uni-avg").textContent = `${Math.round((payload.summary?.avgScore ?? 0) * 100)}%`;

  const svg = document.getElementById("universal-radar");
  const checks = payload.aggregateChecks || {};
  const cx = 140;
  const cy = 140;
  const maxR = 100;
  const points = UNI_DIMS.map(([key], i) => {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI / UNI_DIMS.length);
    const r = maxR * (checks[key] ?? 0);
    return `${cx + r * Math.cos(angle)},${cy - r * Math.sin(angle)}`;
  }).join(' ');

  const grid = UNI_DIMS.map((_, i) => {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI / UNI_DIMS.length);
    return `<line x1="${cx}" y1="${cy}" x2="${cx + maxR * Math.cos(angle)}" y2="${cy - maxR * Math.sin(angle)}" stroke="rgba(255,255,255,0.12)" />`;
  }).join('');

  const labels = UNI_DIMS.map(([key, label], i) => {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI / UNI_DIMS.length);
    const x = cx + (maxR + 18) * Math.cos(angle);
    const y = cy - (maxR + 18) * Math.sin(angle);
    return `<text x="${x}" y="${y}" fill="#9fd4ff" font-size="9" text-anchor="middle">${label}</text>`;
  }).join('');

  svg.innerHTML = `${grid}<polygon points="${points}" fill="rgba(61,214,140,0.25)" stroke="#3dd68c" stroke-width="2" />${labels}`;

  const legend = document.getElementById("universal-legend");
  legend.innerHTML = UNI_DIMS.map(([key, label]) => {
    const pct = Math.round((checks[key] ?? 0) * 100);
    const cls = pct >= 100 ? 'ok' : 'miss';
    return `<div><span class="${cls}">${label}</span> ${pct}% programs</div>`;
  }).join('');

  const tbody = document.getElementById("uni-rows");
  tbody.innerHTML = (payload.programs || []).map((p) => `
    <tr>
      <td><code>${p.file}</code></td>
      <td>${p.name || "—"}</td>
      <td>${p.grade || "—"}</td>
      <td class="${p.ready ? "status-pass" : "status-fail"}">${Math.round((p.score || 0) * 100)}%</td>
      <td>${p.mesh ? `${p.mesh.spawns}s/${p.mesh.delegations}d` : "—"}</td>
      <td>${p.stdlib?.expanded ? "✓" : "—"}</td>
    </tr>`).join("") || "<tr><td colspan=\"6\">No universal programs</td></tr>";
}

function renderGoldenGate(payload) {
  if (!payload) return;
  const gateEl = document.getElementById("gg-gate");
  const programsEl = document.getElementById("gg-programs");
  const remediatedEl = document.getElementById("gg-remediated");
  const postEl = document.getElementById("gg-post-verify");
  const probesEl = document.getElementById("gg-canonical-probes");
  const probeRowsEl = document.getElementById("gg-probe-rows");
  const tbody = document.getElementById("gg-rows");
  const hintsEl = document.getElementById("gg-hints");

  const gate = payload.gate;
  if (gate) {
    gateEl.textContent = gate.ok ? "PASS" : "FAIL";
    gateEl.className = `value ${gate.ok ? "status-pass" : "status-fail"}`;
    const s = gate.summary || {};
    programsEl.textContent = `${s.passed ?? 0}/${s.total ?? payload.programs?.length ?? 0}`;
  } else {
    gateEl.textContent = "—";
    gateEl.className = "value";
    programsEl.textContent = "—";
  }

  const rem = payload.remediate?.summary;
  remediatedEl.textContent = rem ? `${rem.improved}/${rem.attempted}` : "—";

  const post = payload.postRemediateGate;
  if (post) {
    postEl.textContent = post.ok ? "PASS" : "FAIL";
    postEl.className = `value ${post.ok ? "status-pass" : "status-fail"}`;
  } else {
    postEl.textContent = "—";
    postEl.className = "value";
  }

  const probes = payload.canonicalProbes;
  const pathSummary = payload.canonicalPath;
  if (probesEl) {
    const probeLabel = window.NoeonExecutionSummary?.formatCanonicalProbesLabel(probes, pathSummary);
    if (probeLabel) {
      probesEl.textContent = probeLabel.text;
      probesEl.className = `value ${probeLabel.ok ? "status-pass" : probeLabel.ok === false ? "status-fail" : ""}`;
    } else {
      probesEl.textContent = "—";
      probesEl.className = "value";
    }
  }

  if (probeRowsEl) {
    probeRowsEl.innerHTML = window.NoeonExecutionSummary?.renderCanonicalProbeRows(
      probes?.programs
    ) || "<tr><td colspan=\"6\">No probe data — refresh golden gate.</td></tr>";
  }

  const diffIndex = new Map((payload.diffIndex || []).map((d) => [d.file, d]));

  function formatGateExecution(ex) {
    return window.NoeonExecutionSummary?.formatExecutionSummary(ex) || "—";
  }

  tbody.innerHTML = (payload.programs || []).map((p) => {
    const remRow = p.remediated;
    const remTxt = remRow?.ok
      ? `OK Δ${remRow.staticLens?.delta?.toFixed?.(2) ?? "—"}`
      : remRow ? "skip" : "—";
    const canDiff = diffIndex.get(p.file)?.hasDiff || remRow?.ok;
    const diffBtn = canDiff
      ? `<button type="button" class="btn-link gg-view-diff" data-file="${p.file}">diff</button>`
      : "—";
    return `
    <tr>
      <td><code>${p.file}</code></td>
      <td class="${p.ok ? "status-pass" : "status-fail"}">${p.grade || "—"}</td>
      <td>${p.verdict || "—"}</td>
      <td>${formatGateExecution(p.execution)}</td>
      <td>${p.patches ?? 0}</td>
      <td>${remTxt}</td>
      <td>${diffBtn}</td>
    </tr>`;
  }).join("") || "<tr><td colspan=\"7\">No gate data — run gate or refresh live.</td></tr>";

  hintsEl.textContent = (payload.hints || []).join("\n") || "—";

  tbody.querySelectorAll(".gg-view-diff").forEach((btn) => {
    btn.addEventListener("click", () => showGoldenDiff(btn.dataset.file));
  });
}

async function showGoldenDiff(file) {
  const panel = document.getElementById("gg-diff-panel");
  const pre = document.getElementById("gg-diff");
  const label = document.getElementById("gg-diff-file");
  if (!file || !panel || !pre) return;
  ggSelectedFile = file;
  panel.classList.remove("hidden");
  label.textContent = file;
  pre.textContent = "Loading diff…";
  try {
    const payload = await fetchJson(`/api/golden-gate/diff?file=${encodeURIComponent(file)}`);
    pre.textContent = payload.ok ? payload.diff : (payload.reason || "No diff available");
  } catch (e) {
    pre.textContent = e.message;
  }
}

async function applyGoldenPatches(options = {}) {
  const ggStatus = document.getElementById("gg-status");
  ggStatus.textContent = "Applying patches…";
  try {
    const body = options.all ? { all: true, verify: true } : { file: options.file || ggSelectedFile, verify: true };
    if (!body.all && !body.file) throw new Error("Select a file diff first or use Apply All");
    const res = await fetch("/api/golden-gate/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`apply → ${res.status}`);
    const payload = await res.json();
    renderGoldenGate(payload.studio || payload);
    const n = payload.apply?.summary?.applied ?? payload.apply?.applied?.filter((r) => r.ok).length ?? 0;
    ggStatus.textContent = `Applied ${n} file(s) at ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    ggStatus.textContent = `Error: ${e.message}`;
  }
}

async function fetchGoldenGate(live = false) {
  const url = live ? "/api/golden-gate/status?live=1" : "/api/golden-gate/status";
  return fetchJson(url);
}

async function runRemediate() {
  const ggStatus = document.getElementById("gg-status");
  ggStatus.textContent = "Remediating…";
  try {
    const res = await fetch("/api/golden-gate/remediate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apply: false, verify: true })
    });
    if (!res.ok) throw new Error(`remediate → ${res.status}`);
    const payload = await res.json();
    renderGoldenGate(payload.studio || payload);
    const improved = payload.remediate?.summary?.improved ?? 0;
    ggStatus.textContent = `Remediated ${improved} program(s) at ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    ggStatus.textContent = `Error: ${e.message}`;
  }
}

async function refresh() {
  const status = document.getElementById("studio-status");
  status.textContent = "Loading…";
  try {
    const [conform, audit, mcp, ecosystem, goldenGate, universalStatus, runtimeStatus, auditExport] = await Promise.all([
      fetchJson("/api/conform/parity"),
      fetchJson("/api/report/history?limit=20"),
      fetchJson("/api/mcp/status"),
      fetchJson("/api/ecosystem/status"),
      fetchGoldenGate(false),
      fetchJson("/api/universal/status"),
      fetchJson("/api/status"),
      fetchJson("/api/audit/export?limit=5")
    ]);
    renderParity(conform);
    renderAudit(audit);
    window.NoeonRuntimePolicy?.renderRuntimePolicy(runtimeStatus, auditExport);
    renderMcp(mcp);
    renderEcosystem(ecosystem);
    renderGoldenGate(goldenGate);
    renderUniversalRadar(universalStatus);
    window.NoeonGoldenGateBadge?.renderEngineeringBadges(runtimeStatus);
    status.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
  }
}

document.getElementById("btn-refresh")?.addEventListener("click", refresh);
document.getElementById("btn-audit-export")?.addEventListener("click", () => {
  window.NoeonRuntimePolicy?.downloadAuditExport();
});
document.getElementById("btn-gg-live")?.addEventListener("click", async () => {
  const ggStatus = document.getElementById("gg-status");
  ggStatus.textContent = "Running gate…";
  try {
    renderGoldenGate(await fetchGoldenGate(true));
    const runtimeStatus = await fetchJson("/api/status");
    window.NoeonGoldenGateBadge?.renderEngineeringBadges(runtimeStatus);
    ggStatus.textContent = `Gate updated ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    ggStatus.textContent = `Error: ${e.message}`;
  }
});
document.getElementById("btn-gg-remediate")?.addEventListener("click", runRemediate);
document.getElementById("btn-gg-apply-all")?.addEventListener("click", () => {
  if (confirm("Apply all remediated patches to worktree? Backups will be written as *.golden.bak")) {
    applyGoldenPatches({ all: true });
  }
});
document.getElementById("btn-gg-apply-file")?.addEventListener("click", () => {
  if (!ggSelectedFile) return;
  if (confirm(`Apply remediated patch for ${ggSelectedFile}?`)) applyGoldenPatches({ file: ggSelectedFile });
});
refresh();
