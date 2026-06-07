function buildDefaultFlow() {
  return [
    { from: "CREATED", to: "BIDDING", event: "publish" },
    { from: "BIDDING", to: "ASSIGNED", event: "assign" },
    { from: "ASSIGNED", to: "RUNNING", event: "start" },
    { from: "RUNNING", to: "PROVED", event: "prove" },
    { from: "PROVED", to: "VERIFYING", event: "verify" },
    { from: "VERIFYING", to: "SETTLED", event: "settle" }
  ];
}

function buildAdaptiveHints(ast) {
  const hints = [];
  const risk = ast.cognition?.risk?.level;
  if (!risk) {
    hints.push("Define RISK for adaptive control tuning.");
    return hints;
  }

  if (["high", "critical"].includes(risk)) {
    hints.push("Use dual-verifier path for high-risk tasks.");
    hints.push("Increase challenge window and maintain quorum >= 2/3.");
  } else if (risk === "medium") {
    hints.push("Use balanced verification with random sampling.");
  } else {
    hints.push("Use low-latency verification profile.");
  }

  if (ast.cognition?.memory?.mode === "episodic") {
    hints.push("Store high-fidelity event traces for dispute replay.");
  }
  if (ast.cognition?.learn?.signal === "hybrid") {
    hints.push("Blend reward and penalty updates for stable adaptation.");
  }
  if (ast.cognition?.nativeAI?.autonomy === "sovereign") {
    hints.push("Sovereign autonomy requires stronger self-check thresholds and audit depth.");
  }
  if (ast.cognition?.infer?.strategy === "abductive") {
    hints.push("Abductive inference should be paired with strict CRITIC for hallucination control.");
  }
  if (ast.cognition?.critic?.mode === "peer") {
    hints.push("Peer critic mode benefits from independent verifier diversity.");
  }

  return hints;
}

function compileAel(ast) {
  const flow = Array.isArray(ast.stateFlow) && ast.stateFlow.length > 0 ? ast.stateFlow : buildDefaultFlow();

  return {
    spec: {
      name: ast.language || "Noeon Contract Language",
      version: ast.version || "0.2",
      metaRules: Array.isArray(ast.metaRules) ? ast.metaRules : [],
      metaProfile: ast.metaProfile || null
    },
    contract: {
      network: ast.network,
      task: ast.task,
      tags: ast.tags || {},
      cognition: {
        goal: ast.cognition?.goal || ast.task,
        constraints: ast.cognition?.constraints || {},
        risk: ast.cognition?.risk || { level: "medium", profile: "balanced", impact: "standard" },
        memory: ast.cognition?.memory || { shortSeconds: 300, longDays: 30, mode: "balanced" },
        learn: ast.cognition?.learn || { signal: "reward", rate: 0.1, windowTasks: 100 },
        nativeAI: ast.cognition?.nativeAI || {
          mode: "hybrid",
          autonomy: "native",
          reflection: "adaptive",
          selfCheck: true
        },
        selfCheck: ast.cognition?.selfCheck || {
          metric: "uncertainty",
          threshold: 0.35,
          action: "escalate"
        },
        infer: ast.cognition?.infer || {
          strategy: "hybrid",
          depth: 4,
          diversity: 3
        },
        critic: ast.cognition?.critic || {
          mode: "self",
          strictness: 3,
          veto: false
        },
        hypotheses: ast.cognition?.hypotheses || [],
        evidences: ast.cognition?.evidences || [],
        counterexamples: ast.cognition?.counterexamples || [],
        traces: ast.cognition?.traces || [],
        debate: ast.cognition?.debate || {
          topic: "default",
          sides: 2,
          rounds: 2,
          protocol: "adversarial"
        },
        arbitration: ast.cognition?.arbitration || {
          mode: "threshold",
          accept: 0.68,
          revise: 0.48,
          fallback: "escalate"
        },
        jurors: ast.cognition?.jurors || [],
        plan: ast.cognition?.plan || [],
        actions: ast.cognition?.actions || {}
      },
      budget: {
        amount: ast.budget,
        unit: "msat"
      },
      deadline: ast.deadline,
      verify: ast.verify,
      collateral: ast.collateral,
      settlement: {
        success: ast.onSuccess,
        slash: ast.onSlash
      },
      compute: {
        functions: ast.compute?.functions || [],
        bindings: ast.compute?.bindings || [],
        branches: ast.compute?.branches || [],
        assertions: ast.compute?.assertions || [],
        calls: ast.compute?.calls || [],
        returnExpr: ast.compute?.returnExpr || null
      }
    },
    runtime: {
      transitions: flow,
      initialState: "CREATED",
      terminalStates: ["SETTLED", "SLASHED", "DISPUTED", "EXPIRED"],
      metaPolicy: {
        enabled: Array.isArray(ast.metaRules) && ast.metaRules.length > 0,
        ruleCount: Array.isArray(ast.metaRules) ? ast.metaRules.length : 0,
        profile: ast.metaProfile || null
      },
      neuralLoops: {
        perception: "tags + context",
        intention: "goal + task",
        control: "verify + constraints",
        memory: "short-term + long-term memory buffers",
        learning: "feedback-driven parameter updates",
        planning: "plan graph edges",
        reward: "onSuccess",
        inhibition: "onSlash"
      },
      adaptiveHints: buildAdaptiveHints(ast)
    },
    emittedAt: new Date().toISOString()
  };
}

module.exports = {
  compileAel
};
