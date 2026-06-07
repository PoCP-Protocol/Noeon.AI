function buildPlanGraph(planEdges) {
  const outgoing = new Map();
  const incomingCount = new Map();

  for (const edge of planEdges) {
    if (!outgoing.has(edge.from)) {
      outgoing.set(edge.from, []);
    }
    outgoing.get(edge.from).push(edge.to);

    incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1);
    if (!incomingCount.has(edge.from)) {
      incomingCount.set(edge.from, 0);
    }
  }

  return { outgoing, incomingCount };
}

function findEntryNodes(incomingCount) {
  const nodes = [];
  for (const [node, count] of incomingCount.entries()) {
    if (count === 0) {
      nodes.push(node);
    }
  }
  return nodes;
}

function executePlan(planEdges, options = {}) {
  const failedSteps = Array.isArray(options.failedSteps) ? new Set(options.failedSteps) : new Set();
  const stepLatencyMs = options.stepLatencyMs || {};
  const maxSteps = Number.isInteger(options.maxSteps) && options.maxSteps > 0 ? options.maxSteps : null;
  const stepEvaluator = typeof options.stepEvaluator === "function" ? options.stepEvaluator : null;

  if (!Array.isArray(planEdges) || planEdges.length === 0) {
    return {
      started: false,
      reason: "No PLAN graph provided",
      orderedSteps: [],
      visitedCount: 0,
      steps: [],
      events: []
    };
  }

  const { outgoing, incomingCount } = buildPlanGraph(planEdges);
  const entries = findEntryNodes(incomingCount);
  const queue = [...entries];
  const visited = new Set();
  const orderedSteps = [];
  const steps = [];
  const events = [];

  let clockMs = 0;

  function pushEvent(step, type, atMs) {
    events.push({
      step,
      type,
      atMs
    });
  }

  while (queue.length > 0) {
    if (maxSteps !== null && orderedSteps.length >= maxSteps) {
      return {
        started: true,
        entries,
        orderedSteps,
        visitedCount: visited.size,
        complete: false,
        totalNodes: allNodesFromEdges(planEdges).size,
        steps,
        events,
        haltedAt: orderedSteps[orderedSteps.length - 1],
        haltedReason: "depth-limit"
      };
    }

    const node = queue.shift();
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    orderedSteps.push(node);

    let evalResult = null;
    if (stepEvaluator) {
      evalResult = stepEvaluator(node);
    }

    const latencyMs = Number(evalResult?.latencyMs || stepLatencyMs[node] || 350);
    pushEvent(node, "running", clockMs);
    clockMs += latencyMs;

    const failed = evalResult ? evalResult.status === "failed" : failedSteps.has(node);
    pushEvent(node, failed ? "failed" : "done", clockMs);
    steps.push({
      name: node,
      status: failed ? "failed" : "done",
      latencyMs,
      startedAtMs: clockMs - latencyMs,
      endedAtMs: clockMs,
      reason: failed
        ? evalResult?.reason || "feedback-indicated-failure"
        : evalResult?.reason || undefined,
      failureCategory: evalResult?.failureCategory || null,
      receipt: evalResult?.receipt || null
    });

    if (failed) {
      return {
        started: true,
        entries,
        orderedSteps,
        visitedCount: visited.size,
        complete: false,
        totalNodes: allNodesFromEdges(planEdges).size,
        steps,
        events,
        haltedAt: node,
        haltedReason: "step-failed"
      };
    }

    const next = outgoing.get(node) || [];
    for (const n of next) {
      if (!visited.has(n)) {
        queue.push(n);
      }
    }
  }

  const allNodes = allNodesFromEdges(planEdges);

  return {
    started: true,
    entries,
    orderedSteps,
    visitedCount: visited.size,
    complete: visited.size === allNodes.size,
    totalNodes: allNodes.size,
    steps,
    events
  };
}

function allNodesFromEdges(planEdges) {
  const allNodes = new Set();
  for (const edge of planEdges) {
    allNodes.add(edge.from);
    allNodes.add(edge.to);
  }
  return allNodes;
}

module.exports = {
  executePlan
};
