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
      ex.phases?.length ? ex.phases.join("→") : null
    ].filter(Boolean);
    return parts.join(" · ");
  }

  function formatExecutionBar(summary) {
    if (!summary?.strategy) return "";
    return [
      summary.path || summary.strategy,
      summary.hybrid ? "hybrid" : null,
      summary.snapshotAct ? "snapshot-act" : null,
      summary.phases?.length ? summary.phases.join(" → ") : null
    ].filter(Boolean).join(" · ");
  }

  window.NoeonExecutionSummary = {
    formatExecutionSummary,
    formatExecutionBar
  };
})();
