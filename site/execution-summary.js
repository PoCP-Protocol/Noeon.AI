(function () {
  function formatExecutionSummary(ex) {
    if (!ex) return "—";
    const parts = [
      ex.path || ex.strategy || "—",
      ex.hybrid ? "hybrid" : null,
      ex.snapshotAct ? "snapshot" : null,
      ex.lensOnly ? "lens" : null,
      ex.inferred ? "inferred" : null,
      ex.actDriver ? `act: ${ex.actDriver}` : null,
      ex.phases?.length ? ex.phases.join("→") : null,
      ex.pluginActs?.total
        ? `acts ${ex.pluginActs.signed ?? 0}/${ex.pluginActs.total} signed`
        : null
    ].filter(Boolean);
    return parts.join(" · ");
  }

  function formatExecutionBar(summary) {
    if (!summary?.strategy) return "";
    const PATH_LABELS = {
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
    return [
      PATH_LABELS[summary.path] || STRATEGY_LABELS[summary.strategy] || summary.path || summary.strategy,
      summary.hybrid ? "混合" : null,
      summary.snapshotAct ? "工具快照" : null,
      summary.phases?.length ? summary.phases.join(" → ") : null
    ].filter(Boolean).join(" · ");
  }

  function formatProbeSigned(p) {
    const pa = p.execution?.pluginActs;
    if (!pa?.total) return "—";
    return `${pa.signed ?? 0}/${pa.total}`;
  }

  function renderCanonicalProbeRows(probePrograms) {
    return (probePrograms || []).map((p) => `
    <tr>
      <td><code>${p.file}</code></td>
      <td>${formatExecutionSummary(p.execution) || p.strategy || p.execution?.strategy || "—"}</td>
      <td>${p.execution?.hybrid || p.hybridCandidate ? "✓" : "—"}</td>
      <td>${p.execution?.snapshotAct || p.toolCandidate ? "✓" : "—"}</td>
      <td>${formatProbeSigned(p)}</td>
      <td class="${p.ok ? "status-pass" : "status-fail"}">${p.ok ? "PASS" : "FAIL"}</td>
    </tr>`).join("") || "<tr><td colspan=\"6\">No probe data — refresh golden gate.</td></tr>";
  }

  function formatCanonicalProbesLabel(probes, pathSummary) {
    if (probes) {
      const passed = probes.summary?.passed ?? 0;
      const total = probes.summary?.total ?? probes.programs?.length ?? 0;
      return { text: `${passed}/${total}`, ok: probes.ok };
    }
    if (pathSummary?.probes?.total != null) {
      return {
        text: `${pathSummary.probes.passed ?? 0}/${pathSummary.probes.total}`,
        ok: pathSummary.probes.ok
      };
    }
    return { text: "—", ok: null };
  }

  window.NoeonExecutionSummary = {
    formatExecutionSummary,
    formatExecutionBar,
    formatProbeSigned,
    renderCanonicalProbeRows,
    formatCanonicalProbesLabel
  };
})();
