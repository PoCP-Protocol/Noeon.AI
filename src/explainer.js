function explainAel(ast) {
  const lines = [];

  lines.push(`Noeon contract '${ast.task}' runs on network '${ast.network}'.`);
  lines.push(`Cognitive goal: '${ast.cognition?.goal || ast.task}'.`);
  lines.push(`Budget is ${ast.budget} msat and deadline is ${ast.deadline}.`);

  if (ast.cognition?.constraints && Object.keys(ast.cognition.constraints).length > 0) {
    const constraints = Object.entries(ast.cognition.constraints)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    lines.push(`Cognitive constraints: ${constraints}.`);
  }

  if (ast.cognition?.risk) {
    const risk = ast.cognition.risk;
    lines.push(
      `Risk profile: level=${risk.level}, profile=${risk.profile}, impact=${risk.impact}.`
    );
  }

  if (ast.cognition?.memory) {
    const memory = ast.cognition.memory;
    lines.push(
      `Memory system: short=${memory.shortSeconds}s, long=${memory.longDays}d, mode=${memory.mode}.`
    );
  }

  if (ast.cognition?.learn) {
    const learn = ast.cognition.learn;
    lines.push(
      `Learning policy: signal=${learn.signal}, rate=${learn.rate}, window=${learn.windowTasks} tasks.`
    );
  }

  if (ast.cognition?.nativeAI) {
    const native = ast.cognition.nativeAI;
    lines.push(
      `Native cognition: mode=${native.mode}, autonomy=${native.autonomy}, reflection=${native.reflection}, selfCheck=${native.selfCheck}.`
    );
  }

  if (ast.cognition?.selfCheck) {
    const check = ast.cognition.selfCheck;
    lines.push(
      `Self-check policy: metric=${check.metric}, threshold=${check.threshold}, action=${check.action}.`
    );
  }

  if (ast.cognition?.infer) {
    const infer = ast.cognition.infer;
    lines.push(
      `Inference engine: strategy=${infer.strategy}, depth=${infer.depth}, diversity=${infer.diversity}.`
    );
  }

  if (ast.cognition?.critic) {
    const critic = ast.cognition.critic;
    lines.push(
      `Critic engine: mode=${critic.mode}, strictness=${critic.strictness}, veto=${critic.veto}.`
    );
  }

  if (Array.isArray(ast.cognition?.hypotheses) && ast.cognition.hypotheses.length > 0) {
    const summary = ast.cognition.hypotheses
      .map((h) => `${h.id}(${h.type},${h.confidence})`)
      .join(", ");
    lines.push(`Hypotheses: ${summary}.`);
  }

  if (Array.isArray(ast.cognition?.evidences) && ast.cognition.evidences.length > 0) {
    const summary = ast.cognition.evidences
      .map((e) => `${e.source}(${e.quality},${e.weight})`)
      .join(", ");
    lines.push(`Evidence set: ${summary}.`);
  }

  if (Array.isArray(ast.cognition?.counterexamples) && ast.cognition.counterexamples.length > 0) {
    const summary = ast.cognition.counterexamples
      .map((c) => `${c.id}(against=${c.against},${c.severity},${c.weight})`)
      .join(", ");
    lines.push(`Counterexamples: ${summary}.`);
  }

  if (Array.isArray(ast.cognition?.traces) && ast.cognition.traces.length > 0) {
    const summary = ast.cognition.traces
      .map(
        (t) =>
          `${t.step}[h=${t.hypothesis || "-"},e=${t.evidence || "-"},c=${t.counterexample || "-"}]`
      )
      .join(", ");
    lines.push(`Trace links: ${summary}.`);
  }

  if (ast.cognition?.debate) {
    const debate = ast.cognition.debate;
    lines.push(
      `Debate arena: topic=${debate.topic}, sides=${debate.sides}, rounds=${debate.rounds}, protocol=${debate.protocol}.`
    );
  }

  if (ast.cognition?.arbitration) {
    const arbitration = ast.cognition.arbitration;
    lines.push(
      `Arbitration: mode=${arbitration.mode}, accept=${arbitration.accept}, revise=${arbitration.revise}, fallback=${arbitration.fallback}.`
    );
  }

  if (Array.isArray(ast.cognition?.jurors) && ast.cognition.jurors.length > 0) {
    const summary = ast.cognition.jurors
      .map((j) => `${j.id}(${j.role},${j.weight})`)
      .join(", ");
    lines.push(`Jury panel: ${summary}.`);
  }

  if (ast.cognition?.plan && ast.cognition.plan.length > 0) {
    const reasoning = ast.cognition.plan.map((edge) => `${edge.from} -> ${edge.to}`).join(" | ");
    lines.push(`Reasoning plan: ${reasoning}.`);
  }

  if (ast.cognition?.actions && Object.keys(ast.cognition.actions).length > 0) {
    const bindings = Object.entries(ast.cognition.actions)
      .map(([step, binding]) => `${step}:${binding.plugin}`)
      .join(", ");
    lines.push(`Action bindings: ${bindings}.`);
  }

  if (ast.tags && Object.keys(ast.tags).length > 0) {
    const tags = Object.entries(ast.tags)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    lines.push(`Context tags: ${tags}.`);
  }

  if (ast.verify) {
    const q = ast.verify.quorum;
    lines.push(
      `Verification requires quorum ${q.numerator}/${q.denominator}, challenge window ${ast.verify.challengeSeconds}s, mode ${ast.verify.mode}.`
    );
  }

  lines.push(
    `Collateral: solver ${ast.collateral.solver}, verifier ${ast.collateral.verifier}.`
  );

  if (ast.onSuccess) {
    lines.push(
      `Success distribution: solver ${ast.onSuccess.solver}%, verifier ${ast.onSuccess.verifier}%, protocol ${ast.onSuccess.protocol}%.`
    );
  }

  if (ast.onSlash) {
    const slashRules = Object.entries(ast.onSlash)
      .map(([k, v]) => `${k}=${v}%`)
      .join(", ");
    lines.push(`Penalty policy: ${slashRules}.`);
  }

  const flow = Array.isArray(ast.stateFlow) ? ast.stateFlow : [];
  if (flow.length > 0) {
    const sequence = flow.map((edge) => `${edge.from} --${edge.event}--> ${edge.to}`).join(" | ");
    lines.push(`Neural flow: ${sequence}.`);
  } else {
    lines.push("Neural flow: default protocol transitions will be used.");
  }

  lines.push(
    "Super-brain loop: perception -> intention -> control -> planning -> action -> memory update -> learning -> reward/inhibition."
  );

  return lines.join("\n");
}

module.exports = {
  explainAel
};
