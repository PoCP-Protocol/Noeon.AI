(function (global) {
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  }

  function renderRuntimePolicy(runtimeStatus, auditExport, ids = {}) {
    const id = (key) => ids[key] || key;
    const pp = runtimeStatus?.pluginPolicy;
    const ep = runtimeStatus?.executionPath;
    const profileEl = document.getElementById(id("policy-profile"));
    const allowedEl = document.getElementById(id("policy-allowed"));
    const execEl = document.getElementById(id("policy-exec"));
    const totalEl = document.getElementById(id("audit-export-total"));
    const metaEl = document.getElementById(id("audit-export-meta"));
    const previewEl = document.getElementById(id("audit-export-preview"));

    if (profileEl && pp) {
      const flags = [
        pp.requireVersion ? "version" : null,
        pp.requireSignature ? "signature" : null
      ].filter(Boolean);
      profileEl.textContent = flags.length ? `${pp.profile} · ${flags.join("+")}` : (pp.profile || "—");
      profileEl.className = `value ${pp.profile === "production" ? "status-pass" : ""}`;
    }
    if (allowedEl && pp) {
      allowedEl.textContent = String(pp.allowedCount ?? "—");
    }
    if (execEl && ep) {
      const acts = ep.pluginActs?.total
        ? ` · acts ${ep.pluginActs.signed}/${ep.pluginActs.total} signed`
        : '';
      execEl.textContent = `hybrid=${ep.hybrid} · snapshot=${ep.snapshotAct} · cognitive=${ep.cognitive}${acts}`;
    }
    if (totalEl && auditExport) {
      totalEl.textContent = auditExport.exists ? String(auditExport.summary?.total ?? 0) : "0";
      totalEl.className = `value ${auditExport.summary?.total ? "status-pass" : ""}`;
    }
    if (metaEl && auditExport) {
      const archives = auditExport.archives?.length ? ` · archives ${auditExport.archives.length}` : "";
      metaEl.textContent = auditExport.exists
        ? `schema ${auditExport.schema}${archives}`
        : "No canonical audit.jsonl — run with canonical_audit enabled";
    }
    if (previewEl && auditExport) {
      previewEl.textContent = auditExport.entries?.length
        ? auditExport.entries.slice(-3).map((e) => JSON.stringify(e)).join("\n")
        : "—";
    }
    renderSignedActPolicyHint(pp, ids.signedHint || "policy-signed-hint");
  }

  function renderSignedActPolicyHint(pp, hintId = "policy-signed-hint") {
    const el = document.getElementById(hintId);
    if (!el) return;
    if (!pp) {
      el.textContent = "—";
      return;
    }
    const flags = [
      pp.requireVersion ? "version" : null,
      pp.requireSignature ? "signature" : null
    ].filter(Boolean);
    el.textContent = flags.length
      ? `Active: ${flags.join(" + ")} required · verify npm run gate:production`
      : "Dev profile — P0 agents include signing comments · npm run gate:production";
  }

  async function downloadAuditExport(metaId = "audit-export-meta") {
    const metaEl = document.getElementById(metaId);
    try {
      const bundle = await fetchJson("/api/audit/export");
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noeon-audit-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      if (metaEl) metaEl.textContent = `Downloaded ${bundle.summary?.total ?? 0} entries`;
    } catch (e) {
      if (metaEl) metaEl.textContent = `Export failed: ${e.message}`;
    }
  }

  async function loadRuntimePolicyPanel() {
    const [runtimeStatus, auditExport] = await Promise.all([
      fetchJson("/api/status"),
      fetchJson("/api/audit/export?limit=5")
    ]);
    renderRuntimePolicy(runtimeStatus, auditExport);
    window.NoeonGoldenGateBadge?.renderProductionPolicyBadge(
      document.getElementById("production-policy-badge"),
      runtimeStatus
    );
    return { runtimeStatus, auditExport };
  }

  global.NoeonRuntimePolicy = {
    renderRuntimePolicy,
    renderSignedActPolicyHint,
    downloadAuditExport,
    loadRuntimePolicyPanel
  };
})(typeof window !== "undefined" ? window : globalThis);
