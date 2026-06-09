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

  window.NoeonGoldenGateBadge = {
    formatGoldenGateBadge,
    renderGoldenGateBadge
  };
})();
