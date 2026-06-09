(function (global) {
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

  function labelPath(summary) {
    return PATH_LABELS[summary?.path] || STRATEGY_LABELS[summary?.strategy] || summary?.path || summary?.strategy;
  }

  function formatExecutionSummaryLine(summary) {
    if (!summary?.strategy) return null;
    return global.NoeonExecutionSummary?.formatExecutionBar(summary) ||
      [
        labelPath(summary),
        summary.hybrid ? "混合" : null,
        summary.snapshotAct ? "工具快照" : null,
        summary.phases?.length ? summary.phases.join(" → ") : null
      ].filter(Boolean).join(" · ");
  }

  function formatArchitectureLines(data = {}) {
    const arch = data.architecture;
    const lines = [];
    const execLine = formatExecutionSummaryLine(data.executionSummary);

    if (data.routeLabel) lines.push(`路径：${data.routeLabel}`);
    if (execLine) lines.push(`执行：${execLine}`);
    const pluginActsLine = global.NoeonPluginActs?.formatPluginActsLine(data.pluginActs)
      || (data.pluginActs?.total
        ? `插件签名（${data.pluginActs.total}）：${(data.pluginActs.acts || []).map((a) => `${a.plugin}${a.signed ? " 已签名" : " 未签名"}`).join("、")}`
        : null);
    if (pluginActsLine) lines.push(pluginActsLine);
    if (data.compileMode) {
      lines.push(`编译：${STRATEGY_LABELS[data.compileMode] || data.compileMode} · 主 IR ${data.primaryIr === "cognitive" ? "认知" : (data.primaryIr || "认知")}`);
    }
    if (data.canonicalPrimary) {
      lines.push(`时代：${data.era || "标准语义主路径"} · 来源 ${data.canonicalSource || "general.lower.snapshot"}`);
    }
    if (!execLine) {
      if (data.executionDriver === "snapshot-primary") {
        const acts = data.snapshotActCount ?? data.snapshot_act_count ?? "?";
        lines.push(`驱动：工具快照 · ${acts} 个行动`);
      }
      if (data.actDriver === "canonical.execution.acts+kernel" || data.hybridActExecution) {
        lines.push("行动：混合 · 标准语义行动后接认知内核");
      } else if (data.actDriver === "canonical.execution.acts" || data.snapshotActExecution) {
        lines.push("行动：标准语义插件路径");
      }
    }
    if (data.stack?.core) {
      const surfaces = data.stack.surfaces?.length ? ` · ${data.stack.surfaces.join("+")}` : "";
      lines.push(`栈：${data.stack.core}${surfaces}`);
    }

    if (!arch) return lines;

    lines.push(`脑区（${(arch.active_regions || []).length}）：${(arch.active_regions || []).join("、")}`);

    if (arch.pipeline_phases?.length) {
      lines.push("");
      lines.push("流水线阶段：");
      for (const phase of arch.pipeline_phases) {
        const regions = (phase.regions || []).join("+") || "—";
        lines.push(`  ${phase.phase} → ${regions}`);
      }
    }

    if (Array.isArray(data.cognitiveCycle) && data.cognitiveCycle.length) {
      const cycle = data.cognitiveCycle.map((step) => step.phase || step.keyword || step).join(" → ");
      lines.push("");
      lines.push(`认知循环：${cycle}`);
    }

    if (arch.agent_flows?.length) {
      lines.push("");
      lines.push("智能体流程：");
      for (const agent of arch.agent_flows) {
        const steps = (agent.steps || [])
          .map((s) => `${(s.kind || "?").toUpperCase()}→${s.region || "?"}`)
          .join(" · ");
        lines.push(`  ${agent.name}：${steps || "—"}`);
      }
    }

    return lines;
  }

  global.NoeonArchitecturePanel = { formatArchitectureLines };
})(typeof window !== "undefined" ? window : globalThis);
