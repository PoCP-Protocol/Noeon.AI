const bodyEl = document.getElementById("gate-body");
const statsEl = document.getElementById("gate-stats");
const autoEl = document.getElementById("auto-human");
let humanTimer = null;

async function loadPending() {
  try {
    const res = await fetch("/api/human-gate/pending");
    const data = await res.json();
    statsEl.textContent = `${data.count || 0} 条待审批`;
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
          <button class="btn primary" data-approve="${g.id}">批准</button>
          <button class="btn ghost" data-reject="${g.id}">拒绝</button>
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

document.getElementById("btn-refresh-human")?.addEventListener("click", loadPending);
autoEl?.addEventListener("change", scheduleHuman);
loadPending();
scheduleHuman();
