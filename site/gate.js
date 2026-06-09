const bodyEl = document.getElementById("gate-body");
const statsEl = document.getElementById("gate-stats");
const autoEl = document.getElementById("auto-human");
let humanTimer = null;

async function loadPending() {
  try {
    const res = await fetch("/api/human-gate/pending");
    const data = await res.json();
    statsEl.textContent = `${data.count || 0} pending approval(s)`;
    bodyEl.innerHTML = "";
    for (const g of data.pending || []) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${g.createdAt?.slice(11, 19) || "—"}</td>
        <td><code>${g.action || "—"}</code></td>
        <td>${g.file || "—"}</td>
        <td>${g.message || "—"}</td>
        <td><code>${g.id}</code></td>
        <td class="gate-actions">
          <button class="btn primary" data-approve="${g.id}">Approve</button>
          <button class="btn ghost" data-reject="${g.id}">Reject</button>
        </td>`;
      bodyEl.appendChild(tr);
    }
    bodyEl.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", () => actHuman("approve", btn.dataset.approve));
    });
    bodyEl.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", () => actHuman("reject", btn.dataset.reject));
    });
  } catch (e) {
    statsEl.textContent = e.message;
  }
}

async function actHuman(kind, id) {
  const path = kind === "approve" ? "/api/human-gate/approve" : "/api/human-gate/reject";
  await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  loadPending();
}

function scheduleHuman() {
  if (humanTimer) clearInterval(humanTimer);
  if (autoEl?.checked) humanTimer = setInterval(loadPending, 8000);
}

async function loadGoldenGate() {
  const stats = document.getElementById("gg-stats");
  const tbody = document.getElementById("gg-body");
  if (!stats || !tbody) return;
  try {
    const res = await fetch("/api/golden-gate/status");
    const data = await res.json();
    const gate = data.gate;
    const gateEl = document.getElementById("gg-gate");
    const remEl = document.getElementById("gg-remediated");
    const appliedEl = document.getElementById("gg-applied");

    window.NoeonGoldenGateBadge?.renderGoldenGateBadge(
      document.getElementById("golden-gate-badge"),
      data.goldenGateExecution
    );

    if (gateEl) {
      gateEl.textContent = gate ? (gate.ok ? "PASS" : "FAIL") : "—";
      gateEl.className = gate?.ok ? "status-pass" : "status-fail";
    }
    if (remEl) remEl.textContent = data.remediate ? `${data.remediate.summary?.improved ?? 0}/${data.remediate.summary?.attempted ?? 0}` : "—";
    if (appliedEl) appliedEl.textContent = String(data.remediate?.summary?.applied ?? 0);

    stats.textContent = gate
      ? `Golden gate ${gate.ok ? "PASS" : "FAIL"} · ${data.programs?.length ?? 0} programs · probes ${data.canonicalPath?.probes?.passed ?? "—"}/${data.canonicalPath?.probes?.total ?? "—"}`
      : "No gate data — run npm run gate:golden";

    function formatExecution(ex) {
      return window.NoeonExecutionSummary?.formatExecutionSummary(ex) || "—";
    }

    tbody.innerHTML = (data.programs || []).map((p) => {
      const rem = p.remediated;
      const remTxt = rem?.ok ? `OK (${rem.verify?.grade || "—"})` : rem ? "skip" : "—";
      const applied = rem?.appliedToWorktree ? " · applied" : "";
      const canAct = rem?.ok && !rem?.appliedToWorktree;
      return `<tr>
        <td><code>${p.file}</code></td>
        <td class="${p.ok ? "status-pass" : "status-fail"}">${p.grade || "—"}</td>
        <td>${p.verdict || "—"}</td>
        <td>${formatExecution(p.execution)}</td>
        <td>${remTxt}${applied}</td>
        <td class="gate-actions">
          ${canAct ? `<button class="btn ghost gg-apply-one" data-file="${p.file}">Apply</button>` : ""}
          <a class="btn ghost" href="./studio.html">Diff</a>
        </td>
      </tr>`;
    }).join("") || "<tr><td colspan=\"6\">No programs</td></tr>";

    tbody.querySelectorAll(".gg-apply-one").forEach((btn) => {
      btn.addEventListener("click", () => applyOne(btn.dataset.file));
    });
  } catch (e) {
    stats.textContent = e.message;
  }
}

async function remediateGolden() {
  const stats = document.getElementById("gg-stats");
  stats.textContent = "Remediating…";
  const res = await fetch("/api/golden-gate/remediate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apply: false, verify: true })
  });
  if (!res.ok) throw new Error(`remediate → ${res.status}`);
  await loadGoldenGate();
}

async function applyAllGolden() {
  if (!confirm("Apply all remediated patches? *.golden.bak backups will be created.")) return;
  const stats = document.getElementById("gg-stats");
  stats.textContent = "Applying…";
  const res = await fetch("/api/golden-gate/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true, verify: true })
  });
  if (!res.ok) throw new Error(`apply → ${res.status}`);
  await loadGoldenGate();
}

async function applyOne(file) {
  if (!confirm(`Apply remediated patch for ${file}?`)) return;
  const res = await fetch("/api/golden-gate/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file, verify: true })
  });
  if (!res.ok) throw new Error(`apply → ${res.status}`);
  await loadGoldenGate();
}

document.getElementById("btn-refresh-human")?.addEventListener("click", loadPending);
autoEl?.addEventListener("change", scheduleHuman);
document.getElementById("btn-gg-refresh")?.addEventListener("click", loadGoldenGate);
document.getElementById("btn-gg-remediate")?.addEventListener("click", () => remediateGolden().catch((e) => {
  document.getElementById("gg-stats").textContent = e.message;
}));
document.getElementById("btn-gg-apply")?.addEventListener("click", () => applyAllGolden().catch((e) => {
  document.getElementById("gg-stats").textContent = e.message;
}));

loadPending();
scheduleHuman();
loadGoldenGate();
