(function (global) {
  function formatExecutionSummaryLine(summary) {
    if (!summary?.strategy) return null;
    return global.NoeonExecutionSummary?.formatExecutionBar(summary) ||
      [
        summary.path || summary.strategy,
        summary.hybrid ? "hybrid" : null,
        summary.snapshotAct ? "snapshot-act" : null,
        summary.phases?.length ? summary.phases.join(" → ") : null
      ].filter(Boolean).join(" · ");
  }

  function formatArchitectureLines(data = {}) {
    const arch = data.architecture;
    const lines = [];
    const execLine = formatExecutionSummaryLine(data.executionSummary);

    if (data.routeLabel) lines.push(`route: ${data.routeLabel}`);
    if (execLine) lines.push(`execution: ${execLine}`);
    if (data.compileMode) {
      lines.push(`compile: ${data.compileMode} · primary ${data.primaryIr || "cognitive"}`);
    }
    if (data.canonicalPrimary) {
      lines.push(`era: ${data.era || "canonical-primary-era"} · source ${data.canonicalSource || "general.lower.snapshot"}`);
    }
    if (!execLine) {
      if (data.executionDriver === "snapshot-primary") {
        const acts = data.snapshotActCount ?? data.snapshot_act_count ?? "?";
        lines.push(`driver: snapshot-primary · acts ${acts}`);
      }
      if (data.actDriver === "canonical.execution.acts+kernel" || data.hybridActExecution) {
        lines.push(`act: hybrid · canonical acts then cognitive kernel`);
      } else if (data.actDriver === "canonical.execution.acts" || data.snapshotActExecution) {
        lines.push(`act: canonical.execution.acts · direct plugin path`);
      }
    }
    if (data.stack?.core) {
      const surfaces = data.stack.surfaces?.length ? ` · ${data.stack.surfaces.join("+")}` : "";
      lines.push(`stack: ${data.stack.core}${surfaces}`);
    }

    if (!arch) return lines;

    lines.push(`regions (${(arch.active_regions || []).length}): ${(arch.active_regions || []).join(", ")}`);

    if (arch.pipeline_phases?.length) {
      lines.push("");
      lines.push("pipeline phases:");
      for (const phase of arch.pipeline_phases) {
        const regions = (phase.regions || []).join("+") || "—";
        lines.push(`  ${phase.phase} → ${regions}`);
      }
    }

    if (Array.isArray(data.cognitiveCycle) && data.cognitiveCycle.length) {
      const cycle = data.cognitiveCycle.map((step) => step.phase || step.keyword || step).join(" → ");
      lines.push("");
      lines.push(`cognitive cycle: ${cycle}`);
    }

    if (arch.agent_flows?.length) {
      lines.push("");
      lines.push("agent flows:");
      for (const agent of arch.agent_flows) {
        const steps = (agent.steps || [])
          .map((s) => `${(s.kind || "?").toUpperCase()}→${s.region || "?"}`)
          .join(" · ");
        lines.push(`  ${agent.name}: ${steps || "—"}`);
      }
    }

    return lines;
  }

  global.NoeonArchitecturePanel = { formatArchitectureLines };
})(typeof window !== "undefined" ? window : globalThis);
