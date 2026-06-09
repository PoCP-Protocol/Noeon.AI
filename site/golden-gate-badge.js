(function () {
  function formatGoldenGateBadge(gg) {
    if (!gg || gg.available !== true) {
      return {
        text: "Golden Gate —",
        title: "Run npm run gate:golden to generate artifacts/golden-gate/",
        className: "gg-badge gg-badge-unknown"
      };
    }

    const probeTxt = gg.probes?.total != null
      ? ` · probes ${gg.probes.passed ?? 0}/${gg.probes.total}`
      : "";
    const aiTxt = gg.aiPath?.total != null
      ? ` · AI ${gg.aiPath.passed ?? 0}/${gg.aiPath.total}`
      : "";
    const hybridTxt = gg.aiPath?.hybrid ? ` · hybrid ${gg.aiPath.hybrid}` : "";

    return {
      text: gg.ok ? `Golden Gate PASS${probeTxt}` : `Golden Gate FAIL${probeTxt}`,
      title: [
        gg.generatedAt ? `updated ${gg.generatedAt}` : null,
        `AI path${aiTxt}${hybridTxt}`,
        gg.conform === false ? "conform FAIL" : gg.conform ? "conform PASS" : null
      ].filter(Boolean).join(" · "),
      className: gg.ok ? "gg-badge gg-badge-pass" : "gg-badge gg-badge-fail"
    };
  }

  function renderGoldenGateBadge(el, gg) {
    if (!el) return;
    const badge = formatGoldenGateBadge(gg);
    el.textContent = badge.text;
    el.className = badge.className;
    el.title = badge.title || "";
  }

  function formatProductionPolicyBadge(status) {
    const pg = status?.productionGate;
    if (pg?.available === true) {
      const checkTxt = pg.checks?.total != null ? ` · ${pg.checks.passed}/${pg.checks.total}` : "";
      return {
        text: pg.ok ? `Production gate PASS${checkTxt}` : `Production gate FAIL${checkTxt}`,
        title: [
          pg.generatedAt ? `last run ${pg.generatedAt}` : null,
          pg.checks?.failed?.length ? `failed: ${pg.checks.failed.join(", ")}` : null,
          "npm run gate:production"
        ].filter(Boolean).join(" · "),
        className: pg.ok ? "gg-badge gg-badge-pass" : "gg-badge gg-badge-fail"
      };
    }

    const pp = status?.pluginPolicy;
    const env = status?.config?.environment || pp?.environment || "development";
    if (!pp) {
      return {
        text: "Production —",
        title: "Start npm run playground for live plugin policy · npm run gate:production",
        className: "gg-badge gg-badge-unknown"
      };
    }

    const hardened = pp.requireVersion === true && pp.requireSignature === true;
    const flags = [
      pp.requireVersion ? "version" : null,
      pp.requireSignature ? "signature" : null
    ].filter(Boolean);

    if (hardened) {
      return {
        text: `Production · ${flags.join("+")}`,
        title: `${env} profile · plugin version + HMAC signature required · npm run gate:production`,
        className: "gg-badge gg-badge-pass"
      };
    }

    if (env === "production") {
      return {
        text: "Production policy FAIL",
        title: "NOEON_ENV=production but requireVersion/requireSignature not both enabled",
        className: "gg-badge gg-badge-fail"
      };
    }

    return {
      text: "Policy dev · gate:production",
      title: "Dev profile — npm run gate:production simulates production · signed ACT: signed_act_demo.noeon",
      className: "gg-badge gg-badge-prod-ready"
    };
  }

  function renderProductionPolicyBadge(el, status) {
    if (!el) return;
    const badge = formatProductionPolicyBadge(status);
    el.textContent = badge.text;
    el.className = badge.className;
    el.title = badge.title || "";
  }

  function renderEngineeringBadges(status, ids = {}) {
    renderGoldenGateBadge(document.getElementById(ids.golden || "golden-gate-badge"), status?.goldenGate);
    renderProductionPolicyBadge(document.getElementById(ids.production || "production-policy-badge"), status);
  }

  function formatHomeRuntimeLines(status = {}) {
    const lines = [];
    const gates = (status.engineering?.gates || []).slice(0, 3).join(" · ");
    lines.push(
      `Noeon ${status.version} · ${status.era} · alpha ${status.engineering?.alphaGateTests?.length ?? "—"} tests · ${gates || "gate:alpha"}`
    );
    const ep = status.executionPath;
    if (ep?.tracked) {
      const acts = ep.pluginActs?.total
        ? ` · acts ${ep.pluginActs.signed}/${ep.pluginActs.total} signed`
        : "";
      lines.push(
        `Execution path: hybrid=${ep.hybrid} snapshot=${ep.snapshotAct} cognitive=${ep.cognitive} (${ep.tracked} tracked)${acts}`
      );
    }
    const pp = status.pluginPolicy;
    if (pp?.schema) {
      const flags = [
        pp.requireVersion ? "version" : null,
        pp.requireSignature ? "signature" : null
      ].filter(Boolean);
      lines.push(
        `Plugin policy: ${pp.profile} · ${pp.allowedCount} allowed${flags.length ? ` · ${flags.join("+")}` : ""}`
      );
    }
    const pg = status.productionGate;
    if (pg?.available) {
      const checkTxt = pg.checks?.total != null ? ` · checks ${pg.checks.passed}/${pg.checks.total}` : "";
      lines.push(`Production gate: ${pg.ok ? "PASS" : "FAIL"}${checkTxt}`);
    }
    return lines;
  }

  function renderHomeRuntimeStatus(el, status) {
    if (!el) return;
    const lines = formatHomeRuntimeLines(status);
    el.innerHTML = lines.map((line) => `<span>${line}</span>`).join("<br />");
  }

  window.NoeonGoldenGateBadge = {
    formatGoldenGateBadge,
    renderGoldenGateBadge,
    formatProductionPolicyBadge,
    renderProductionPolicyBadge,
    renderEngineeringBadges,
    formatHomeRuntimeLines,
    renderHomeRuntimeStatus
  };
})();
