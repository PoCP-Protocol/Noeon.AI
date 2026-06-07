const {
  parseDrive: parseCogDrive,
  parseAttend,
  parseWorkspace,
  parsePredict,
  parsePerceive,
  parseIntuit,
  parseReason,
  parseReflect,
  parseConsolidate,
  parseDecide,
  parseEmotion,
  parseMonitor: parseCogMonitor,
  parseFocus,
  parseAdapt
} = require("./cognitive-parser");

const {
  parseWhenSalient,
  parseRuminate,
  parsePerceiveAll,
  parseCompete,
  parseHabituate,
  parseOnSurprise,
  parseDream,
  parsePrime,
  parseInhibit,
  parseSpawn,
  parseDelegate,
  parseDebate: parseDebateExt,
  parseVote,
  parseShare,
  parseDismiss,
  parseEvolve,
  parseMutate,
  parseSynthesize,
  parseFreeze,
  parseAsk,
  parseThinkWith,
  parseEmbed
} = require("./cognitive-parser-ext");


function parseQuoted(value, lineNo) {
  const m = value.match(/^"([\s\S]*)"$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: expected quoted string`);
  }
  return m[1];
}

function parseInteger(value, lineNo) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Line ${lineNo}: expected integer, got '${value}'`);
  }
  return Number(value);
}

function parseLiteral(value, lineNo) {
  const trimmed = value.trim();
  if (/^"[\s\S]*"$/.test(trimmed)) {
    return parseQuoted(trimmed, lineNo);
  }
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }
  return trimmed;
}

function interpolate(value, variables, lineNo) {
  return value.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, key) => {
    if (!(key in variables)) {
      throw new Error(`Line ${lineNo}: undefined variable '${key}'`);
    }
    return String(variables[key]);
  });
}

function parseKeyValuePairs(input, lineNo) {
  const parts = input.match(/(?:[^\s"]+="[\s\S]*?"|[^\s"]+)/g) || [];
  const out = {};

  for (const part of parts) {
    const m = part.match(/^([a-z_]+)=(.+)$/i);
    if (!m) {
      throw new Error(`Line ${lineNo}: invalid key=value token '${part}'`);
    }

    const key = m[1];
    const raw = m[2];
    out[key] = /^"[\s\S]*"$/.test(raw) ? parseQuoted(raw, lineNo) : raw;
  }

  return out;
}

function parseVerify(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);

  if (!kv.quorum || !/^\d+\/\d+$/.test(kv.quorum)) {
    throw new Error(`Line ${lineNo}: VERIFY requires quorum=n/m`);
  }
  if (!kv.challenge || !/^\d+$/.test(kv.challenge)) {
    throw new Error(`Line ${lineNo}: VERIFY requires challenge=<seconds>`);
  }

  const mode = kv.mode || "auto";
  if (!/^(auto|manual)$/i.test(mode)) {
    throw new Error(`Line ${lineNo}: VERIFY mode must be auto or manual`);
  }

  const [numerator, denominator] = kv.quorum.split("/").map(Number);
  return {
    quorum: { numerator, denominator },
    challengeSeconds: Number(kv.challenge),
    mode: mode.toLowerCase()
  };
}

function parseDistribution(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  const out = {};

  for (const [k, v] of Object.entries(kv)) {
    if (!/^\d+$/.test(v)) {
      throw new Error(`Line ${lineNo}: distribution '${k}' must be integer percent`);
    }
    out[k] = Number(v);
  }

  return out;
}

function parseRisk(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.level) {
    throw new Error(`Line ${lineNo}: RISK requires level=<low|medium|high|critical>`);
  }
  const level = kv.level.toLowerCase();
  if (!["low", "medium", "high", "critical"].includes(level)) {
    throw new Error(`Line ${lineNo}: invalid RISK level '${kv.level}'`);
  }

  return {
    level,
    profile: kv.profile || "balanced",
    impact: kv.impact || "standard"
  };
}

function parseMemory(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.short || !/^\d+$/.test(kv.short)) {
    throw new Error(`Line ${lineNo}: MEMORY requires short=<seconds>`);
  }
  if (!kv.long || !/^\d+$/.test(kv.long)) {
    throw new Error(`Line ${lineNo}: MEMORY requires long=<days>`);
  }
  const mode = (kv.mode || "balanced").toLowerCase();
  if (!["balanced", "episodic", "semantic"].includes(mode)) {
    throw new Error(`Line ${lineNo}: MEMORY mode must be balanced|episodic|semantic`);
  }
  return {
    shortSeconds: Number(kv.short),
    longDays: Number(kv.long),
    mode
  };
}

function parseLearn(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  const signal = (kv.signal || "reward").toLowerCase();
  const rate = kv.rate;
  const window = kv.window;

  if (!["reward", "penalty", "hybrid"].includes(signal)) {
    throw new Error(`Line ${lineNo}: LEARN signal must be reward|penalty|hybrid`);
  }
  if (!rate || !/^\d+(\.\d+)?$/.test(rate)) {
    throw new Error(`Line ${lineNo}: LEARN requires rate=<number>`);
  }
  if (!window || !/^\d+$/.test(window)) {
    throw new Error(`Line ${lineNo}: LEARN requires window=<tasks>`);
  }

  return {
    signal,
    rate: Number(rate),
    windowTasks: Number(window)
  };
}

function parsePlan(value, lineNo) {
  const m = value.match(/^"([^"]+)"\s*=>\s*"([^"]+)"$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: PLAN format is '"step" => "next_step"'`);
  }
  return {
    from: m[1],
    to: m[2]
  };
}

function parseAction(value, lineNo) {
  const m = value.match(/^"([^"]+)"\s+(.+)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: ACTION format is '"step" plugin=<name> [key=value ...]'`);
  }

  const step = m[1];
  const kv = parseKeyValuePairs(m[2], lineNo);
  if (!kv.plugin) {
    throw new Error(`Line ${lineNo}: ACTION requires plugin=<name>`);
  }

  return {
    step,
    binding: kv
  };
}

function parseCognition(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.mode) {
    throw new Error(`Line ${lineNo}: COGNITION requires mode=<symbolic|neural|hybrid>`);
  }

  const mode = String(kv.mode).toLowerCase();
  if (!["symbolic", "neural", "hybrid"].includes(mode)) {
    throw new Error(`Line ${lineNo}: invalid COGNITION mode '${kv.mode}'`);
  }

  const autonomy = String(kv.autonomy || "native").toLowerCase();
  if (!["assist", "copilot", "native", "sovereign"].includes(autonomy)) {
    throw new Error(
      `Line ${lineNo}: COGNITION autonomy must be assist|copilot|native|sovereign`
    );
  }

  const reflection = String(kv.reflection || "adaptive").toLowerCase();
  if (!["off", "on", "adaptive"].includes(reflection)) {
    throw new Error(`Line ${lineNo}: COGNITION reflection must be off|on|adaptive`);
  }

  const selfCheck = String(kv.selfcheck || "true").toLowerCase() === "true";

  return {
    mode,
    autonomy,
    reflection,
    selfCheck
  };
}

function parseSelfCheck(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  const metric = String(kv.metric || "uncertainty").toLowerCase();
  if (!["uncertainty", "consistency", "risk"].includes(metric)) {
    throw new Error(`Line ${lineNo}: SELF_CHECK metric must be uncertainty|consistency|risk`);
  }

  if (!kv.threshold || !/^\d+(\.\d+)?$/.test(String(kv.threshold))) {
    throw new Error(`Line ${lineNo}: SELF_CHECK requires threshold=<0..1>`);
  }

  const threshold = Number(kv.threshold);
  if (threshold < 0 || threshold > 1) {
    throw new Error(`Line ${lineNo}: SELF_CHECK threshold must be in [0, 1]`);
  }

  const action = String(kv.action || "escalate").toLowerCase();
  if (!["escalate", "retry", "halt", "continue"].includes(action)) {
    throw new Error(`Line ${lineNo}: SELF_CHECK action must be escalate|retry|halt|continue`);
  }

  return {
    metric,
    threshold,
    action
  };
}

function parseInfer(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  const strategy = String(kv.strategy || "hybrid").toLowerCase();
  if (!["deductive", "abductive", "hybrid"].includes(strategy)) {
    throw new Error(`Line ${lineNo}: INFER strategy must be deductive|abductive|hybrid`);
  }

  if (!kv.depth || !/^\d+$/.test(String(kv.depth))) {
    throw new Error(`Line ${lineNo}: INFER requires depth=<1..8>`);
  }
  const depth = Number(kv.depth);
  if (depth < 1 || depth > 8) {
    throw new Error(`Line ${lineNo}: INFER depth must be in [1, 8]`);
  }

  if (!kv.diversity || !/^\d+$/.test(String(kv.diversity))) {
    throw new Error(`Line ${lineNo}: INFER requires diversity=<1..5>`);
  }
  const diversity = Number(kv.diversity);
  if (diversity < 1 || diversity > 5) {
    throw new Error(`Line ${lineNo}: INFER diversity must be in [1, 5]`);
  }

  return {
    strategy,
    depth,
    diversity
  };
}

function parseCritic(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  const mode = String(kv.mode || "self").toLowerCase();
  if (!["none", "self", "peer"].includes(mode)) {
    throw new Error(`Line ${lineNo}: CRITIC mode must be none|self|peer`);
  }

  if (!kv.strictness || !/^\d+$/.test(String(kv.strictness))) {
    throw new Error(`Line ${lineNo}: CRITIC requires strictness=<1..5>`);
  }
  const strictness = Number(kv.strictness);
  if (strictness < 1 || strictness > 5) {
    throw new Error(`Line ${lineNo}: CRITIC strictness must be in [1, 5]`);
  }

  const veto = String(kv.veto || "false").toLowerCase() === "true";
  return {
    mode,
    strictness,
    veto
  };
}

function parseHypothesis(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.id) {
    throw new Error(`Line ${lineNo}: HYPOTHESIS requires id=<name>`);
  }
  if (!kv.confidence || !/^\d+(\.\d+)?$/.test(String(kv.confidence))) {
    throw new Error(`Line ${lineNo}: HYPOTHESIS requires confidence=<0..1>`);
  }

  const confidence = Number(kv.confidence);
  if (confidence < 0 || confidence > 1) {
    throw new Error(`Line ${lineNo}: HYPOTHESIS confidence must be in [0, 1]`);
  }

  const type = String(kv.type || "predictive").toLowerCase();
  if (!["causal", "predictive", "diagnostic"].includes(type)) {
    throw new Error(`Line ${lineNo}: HYPOTHESIS type must be causal|predictive|diagnostic`);
  }

  return {
    id: String(kv.id),
    confidence,
    type
  };
}

function parseEvidence(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.source) {
    throw new Error(`Line ${lineNo}: EVIDENCE requires source=<symbol>`);
  }

  const quality = String(kv.quality || "medium").toLowerCase();
  if (!["low", "medium", "high"].includes(quality)) {
    throw new Error(`Line ${lineNo}: EVIDENCE quality must be low|medium|high`);
  }

  if (!kv.weight || !/^\d+(\.\d+)?$/.test(String(kv.weight))) {
    throw new Error(`Line ${lineNo}: EVIDENCE requires weight=<0..1>`);
  }
  const weight = Number(kv.weight);
  if (weight < 0 || weight > 1) {
    throw new Error(`Line ${lineNo}: EVIDENCE weight must be in [0, 1]`);
  }

  return {
    source: String(kv.source),
    quality,
    weight
  };
}

function parseCounterexample(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.id) {
    throw new Error(`Line ${lineNo}: COUNTEREXAMPLE requires id=<name>`);
  }
  if (!kv.against) {
    throw new Error(`Line ${lineNo}: COUNTEREXAMPLE requires against=<hypothesis_id>`);
  }

  const severity = String(kv.severity || "medium").toLowerCase();
  if (!["low", "medium", "high"].includes(severity)) {
    throw new Error(`Line ${lineNo}: COUNTEREXAMPLE severity must be low|medium|high`);
  }

  if (!kv.weight || !/^\d+(\.\d+)?$/.test(String(kv.weight))) {
    throw new Error(`Line ${lineNo}: COUNTEREXAMPLE requires weight=<0..1>`);
  }
  const weight = Number(kv.weight);
  if (weight < 0 || weight > 1) {
    throw new Error(`Line ${lineNo}: COUNTEREXAMPLE weight must be in [0, 1]`);
  }

  return {
    id: String(kv.id),
    against: String(kv.against),
    severity,
    weight
  };
}

function parseTrace(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.step) {
    throw new Error(`Line ${lineNo}: TRACE requires step=<plan_step>`);
  }

  return {
    step: String(kv.step),
    hypothesis: kv.hypothesis ? String(kv.hypothesis) : null,
    evidence: kv.evidence ? String(kv.evidence) : null,
    counterexample: kv.counterexample ? String(kv.counterexample) : null,
    note: kv.note ? String(kv.note) : null
  };
}

function parseDebate(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.topic) {
    throw new Error(`Line ${lineNo}: DEBATE requires topic=<symbol>`);
  }
  if (!kv.sides || !/^\d+$/.test(String(kv.sides))) {
    throw new Error(`Line ${lineNo}: DEBATE requires sides=<2..6>`);
  }
  if (!kv.rounds || !/^\d+$/.test(String(kv.rounds))) {
    throw new Error(`Line ${lineNo}: DEBATE requires rounds=<1..7>`);
  }

  const sides = Number(kv.sides);
  const rounds = Number(kv.rounds);
  if (sides < 2 || sides > 6) {
    throw new Error(`Line ${lineNo}: DEBATE sides must be in [2, 6]`);
  }
  if (rounds < 1 || rounds > 7) {
    throw new Error(`Line ${lineNo}: DEBATE rounds must be in [1, 7]`);
  }

  const protocol = String(kv.protocol || "adversarial").toLowerCase();
  if (!["adversarial", "socratic", "consensus"].includes(protocol)) {
    throw new Error(`Line ${lineNo}: DEBATE protocol must be adversarial|socratic|consensus`);
  }

  return {
    topic: String(kv.topic),
    sides,
    rounds,
    protocol
  };
}

function parseArbitrate(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  const mode = String(kv.mode || "threshold").toLowerCase();
  if (!["threshold", "jury"].includes(mode)) {
    throw new Error(`Line ${lineNo}: ARBITRATE mode must be threshold|jury`);
  }

  if (!kv.accept || !/^\d+(\.\d+)?$/.test(String(kv.accept))) {
    throw new Error(`Line ${lineNo}: ARBITRATE requires accept=<0..1>`);
  }
  if (!kv.revise || !/^\d+(\.\d+)?$/.test(String(kv.revise))) {
    throw new Error(`Line ${lineNo}: ARBITRATE requires revise=<0..1>`);
  }

  const accept = Number(kv.accept);
  const revise = Number(kv.revise);
  if (accept < 0 || accept > 1 || revise < 0 || revise > 1) {
    throw new Error(`Line ${lineNo}: ARBITRATE thresholds must be in [0, 1]`);
  }

  const fallback = String(kv.fallback || "escalate").toLowerCase();
  if (!["accept", "revise", "reject", "escalate"].includes(fallback)) {
    throw new Error(
      `Line ${lineNo}: ARBITRATE fallback must be accept|revise|reject|escalate`
    );
  }

  return {
    mode,
    accept,
    revise,
    fallback
  };
}

function parseJuror(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.id) {
    throw new Error(`Line ${lineNo}: JUROR requires id=<name>`);
  }
  if (!kv.weight || !/^\d+(\.\d+)?$/.test(String(kv.weight))) {
    throw new Error(`Line ${lineNo}: JUROR requires weight=<0..1>`);
  }

  const weight = Number(kv.weight);
  if (weight <= 0 || weight > 1) {
    throw new Error(`Line ${lineNo}: JUROR weight must be in (0, 1]`);
  }

  const role = String(kv.role || "reviewer").toLowerCase();
  if (!["reviewer", "risk", "domain", "ethics"].includes(role)) {
    throw new Error(`Line ${lineNo}: JUROR role must be reviewer|risk|domain|ethics`);
  }

  return {
    id: String(kv.id),
    weight,
    role
  };
}

function parseFlow(value, lineNo) {
  const m = value.match(/^"([A-Z_]+)"\s*->\s*"([A-Z_]+)"\s+on=([a-zA-Z_][a-zA-Z0-9_.-]*)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: FLOW format is '"FROM" -> "TO" on=<event>'`);
  }
  return {
    from: m[1],
    to: m[2],
    event: m[3]
  };
}

function parseMetaLevel(level, lineNo) {
  const normalized = String(level || "error").toLowerCase();
  if (!['error', 'warning'].includes(normalized)) {
    throw new Error(`Line ${lineNo}: meta level must be error|warning`);
  }
  return normalized;
}

function parseMetaRequire(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.path) {
    throw new Error(`Line ${lineNo}: META_REQUIRE requires path=<dot.path>`);
  }

  return {
    kind: 'require',
    path: String(kv.path),
    level: parseMetaLevel(kv.level, lineNo),
    message: kv.message ? String(kv.message) : null
  };
}

function parseMetaRange(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.path) {
    throw new Error(`Line ${lineNo}: META_RANGE requires path=<dot.path>`);
  }
  if (!kv.min || !/^\d+(\.\d+)?$/.test(String(kv.min))) {
    throw new Error(`Line ${lineNo}: META_RANGE requires min=<number>`);
  }
  if (!kv.max || !/^\d+(\.\d+)?$/.test(String(kv.max))) {
    throw new Error(`Line ${lineNo}: META_RANGE requires max=<number>`);
  }

  const min = Number(kv.min);
  const max = Number(kv.max);
  if (min > max) {
    throw new Error(`Line ${lineNo}: META_RANGE requires min <= max`);
  }

  return {
    kind: 'range',
    path: String(kv.path),
    min,
    max,
    level: parseMetaLevel(kv.level, lineNo),
    message: kv.message ? String(kv.message) : null
  };
}

function parseMetaEnum(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.path) {
    throw new Error(`Line ${lineNo}: META_ENUM requires path=<dot.path>`);
  }
  if (!kv.values) {
    throw new Error(`Line ${lineNo}: META_ENUM requires values=a,b,c`);
  }

  const values = String(kv.values)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error(`Line ${lineNo}: META_ENUM values cannot be empty`);
  }

  return {
    kind: 'enum',
    path: String(kv.path),
    values,
    level: parseMetaLevel(kv.level, lineNo),
    message: kv.message ? String(kv.message) : null
  };
}

function parseMetaRelation(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.target_path) {
    throw new Error(`Line ${lineNo}: META_RELATION requires target_path=<dot.path>`);
  }

  const targetOp = String(kv.target_op || 'eq').toLowerCase();
  if (!['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].includes(targetOp)) {
    throw new Error(`Line ${lineNo}: META_RELATION target_op must be eq|ne|gt|gte|lt|lte`);
  }
  if (!kv.target_value) {
    throw new Error(`Line ${lineNo}: META_RELATION requires target_value=<literal>`);
  }

  const whenPath = kv.when_path ? String(kv.when_path) : null;
  const whenOp = String(kv.when_op || 'eq').toLowerCase();
  if (!['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].includes(whenOp)) {
    throw new Error(`Line ${lineNo}: META_RELATION when_op must be eq|ne|gt|gte|lt|lte`);
  }

  return {
    kind: 'relation',
    when: whenPath
      ? {
          path: whenPath,
          op: whenOp,
          value: parseLiteral(String(kv.when_value || ''), lineNo)
        }
      : null,
    target: {
      path: String(kv.target_path),
      op: targetOp,
      value: parseLiteral(String(kv.target_value), lineNo)
    },
    level: parseMetaLevel(kv.level, lineNo),
    message: kv.message ? String(kv.message) : null
  };
}

function parseMetaProfile(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (!kv.name) {
    throw new Error(`Line ${lineNo}: META_PROFILE requires name=<profile_name>`);
  }

  const mode = String(kv.mode || 'enforce').toLowerCase();
  if (!['enforce', 'advisory'].includes(mode)) {
    throw new Error(`Line ${lineNo}: META_PROFILE mode must be enforce|advisory`);
  }

  const extendsProfiles = kv.extends
    ? String(kv.extends)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    name: String(kv.name),
    namespace: String(kv.namespace || 'noeon.meta'),
    version: String(kv.version || '1.0'),
    mode,
    extends: extendsProfiles
  };
}

function parseComputeBinding(value, lineNo, kind) {
  const m = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: ${kind} format is '<name> = <expr>'`);
  }

  return {
    kind,
    name: m[1],
    expr: m[2].trim()
  };
}

function parseComputeDef(value, lineNo) {
  const m = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*=\s*([\s\S]+)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: DEF format is '<name>(<param1>, <param2>) = <expr>'`);
  }

  const name = m[1];
  const paramsRaw = m[2].trim();
  const expr = m[3].trim();
  const params = paramsRaw
    ? paramsRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  for (const param of params) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
      throw new Error(`Line ${lineNo}: DEF parameter '${param}' is invalid identifier`);
    }
  }

  if (!expr) {
    throw new Error(`Line ${lineNo}: DEF requires function expression`);
  }

  return {
    name,
    params,
    expr
  };
}

function parseComputeIf(value, lineNo) {
  const m = value.match(
    /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+?)\s*\?\s*([\s\S]+?)\s*:\s*([\s\S]+)$/
  );
  if (!m) {
    throw new Error(`Line ${lineNo}: IF format is '<name> = <cond> ? <thenExpr> : <elseExpr>'`);
  }

  return {
    name: m[1],
    condExpr: m[2].trim(),
    thenExpr: m[3].trim(),
    elseExpr: m[4].trim()
  };
}

function parseAssert(value, lineNo) {
  const m = value.match(/^([\s\S]*?)(?:\s+message=(.+))?$/);
  const expr = (m?.[1] || '').trim();
  if (!expr) {
    throw new Error(`Line ${lineNo}: ASSERT requires an expression`);
  }

  const rawMessage = m?.[2] ? m[2].trim() : null;
  const message = rawMessage
    ? (/^"[\s\S]*"$/.test(rawMessage) ? parseQuoted(rawMessage, lineNo) : rawMessage)
    : null;

  return {
    expr,
    message
  };
}

function parseReturn(value, lineNo) {
  const expr = String(value || '').trim();
  if (!expr) {
    throw new Error(`Line ${lineNo}: RETURN requires an expression`);
  }
  return {
    expr
  };
}

function parseComputeCall(value, lineNo) {
  const m = value.match(/^"([^\"]+)"\s+([\s\S]+)$/);
  if (!m) {
    throw new Error(
      `Line ${lineNo}: CALL format is '"step" plugin=<name> [input=<expr>] [budget_ms=<int>] [timeout_ms=<int>]'`
    );
  }

  const step = m[1];
  const kv = parseKeyValuePairs(m[2], lineNo);
  if (!kv.plugin) {
    throw new Error(`Line ${lineNo}: CALL requires plugin=<name>`);
  }

  const budgetMs = kv.budget_ms ? Number(kv.budget_ms) : null;
  const timeoutMs = kv.timeout_ms ? Number(kv.timeout_ms) : null;
  if (kv.budget_ms && !Number.isInteger(budgetMs)) {
    throw new Error(`Line ${lineNo}: CALL budget_ms must be integer`);
  }
  if (kv.timeout_ms && !Number.isInteger(timeoutMs)) {
    throw new Error(`Line ${lineNo}: CALL timeout_ms must be integer`);
  }

  return {
    step,
    plugin: String(kv.plugin),
    inputExpr: kv.input ? String(kv.input) : null,
    budgetMs,
    timeoutMs,
    binding: {
      ...kv,
      plugin: String(kv.plugin)
    }
  };
}

function lineIndent(rawLine) {
  const m = String(rawLine || "").match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function isSkippableLine(rawLine) {
  const trimmed = String(rawLine || "").trim();
  return (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("*/") ||
    trimmed === "'use strict';" ||
    trimmed === '"use strict";'
  );
}

function collectIndentedLines(lines, startIndex, parentIndent) {
  const blockLines = [];
  let index = startIndex;

  while (index < lines.length) {
    const raw = lines[index];
    if (isSkippableLine(raw)) {
      index += 1;
      continue;
    }

    const indent = lineIndent(raw);
    if (indent <= parentIndent) {
      break;
    }

    blockLines.push({ raw, lineNo: index + 1, indent });
    index += 1;
  }

  return { blockLines, nextIndex: index };
}

function parseToolsList(value, lineNo) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    throw new Error(`Line ${lineNo}: TOOLS requires a tool list`);
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error("not an array");
      }
      return parsed.map((item) => String(item));
    } catch (_err) {
      const quoted = trimmed.match(/"([^"]+)"/g);
      if (quoted && quoted.length > 0) {
        return quoted.map((item) => item.slice(1, -1));
      }
      throw new Error(`Line ${lineNo}: TOOLS array must be valid JSON or quoted list`);
    }
  }

  const quoted = trimmed.match(/"([^"]+)"/g);
  if (quoted && quoted.length > 0) {
    return quoted.map((item) => item.slice(1, -1));
  }

  return trimmed.split(/\s+/).filter(Boolean).map(String);
}

function parseAgentMemory(value, lineNo) {
  const kv = parseKeyValuePairs(value, lineNo);
  if (Object.keys(kv).length === 0) {
    throw new Error(`Line ${lineNo}: MEMORY requires key=value pairs`);
  }
  return kv;
}

function parseFlowReflectStep(value, lineNo) {
  if (!value) {
    return { kind: "reflect" };
  }

  const quoted = value.match(/^"([\s\S]*)"(\s+[\s\S]*)?$/);
  if (quoted) {
    const step = {
      kind: "reflect",
      subject: quoted[1]
    };
    const rest = (quoted[2] || "").trim();
    if (rest) {
      Object.assign(step, parseKeyValuePairs(rest, lineNo));
    }
    return step;
  }

  return {
    kind: "reflect",
    ...parseKeyValuePairs(value, lineNo)
  };
}

function parseCognitiveFlowStep(rawLine, lineNo, variables, keywordAliases) {
  const trimmed = rawLine.trim();
  const firstSpace = trimmed.indexOf(" ");
  const rawKeyword = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toUpperCase();
  const keyword = keywordAliases[rawKeyword] || rawKeyword;
  const rawValue = firstSpace === -1 ? "" : trimmed.slice(firstSpace + 1).trim();
  const value = rawValue ? interpolate(rawValue, variables, lineNo) : "";

  switch (keyword) {
    case "PERCEIVE":
      return { kind: "perceive", ...parseKeyValuePairs(value, lineNo) };
    case "REASON":
      return { kind: "reason", ...parseKeyValuePairs(value, lineNo) };
    case "ACT":
      return { kind: "act", ...parseKeyValuePairs(value, lineNo) };
    case "REFLECT":
      return parseFlowReflectStep(value, lineNo);
    case "UNDERSTAND":
      return { kind: "understand", ...parseKeyValuePairs(value, lineNo) };
    case "DECIDE":
      return { kind: "decide", ...parseKeyValuePairs(value, lineNo) };
    case "FEEDBACK":
      return { kind: "feedback", ...parseKeyValuePairs(value, lineNo) };
    default:
      throw new Error(`Line ${lineNo}: unsupported FLOW step keyword '${rawKeyword}'`);
  }
}

function parseCognitiveFlowSteps(blockLines, variables, keywordAliases) {
  const steps = [];
  for (const entry of blockLines) {
    steps.push(parseCognitiveFlowStep(entry.raw, entry.lineNo, variables, keywordAliases));
  }
  return steps;
}

function parseAgentBlockBody(blockLines, variables, keywordAliases) {
  const agent = {
    goal: null,
    memory: null,
    tools: [],
    policy: {},
    flow: []
  };

  let index = 0;
  while (index < blockLines.length) {
    const { raw, lineNo, indent } = blockLines[index];
    const trimmed = raw.trim();
    const firstSpace = trimmed.indexOf(" ");
    const rawKeyword = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toUpperCase();
    const keyword = keywordAliases[rawKeyword] || rawKeyword;
    const rawValue = firstSpace === -1 ? "" : trimmed.slice(firstSpace + 1).trim();
    const value = rawValue ? interpolate(rawValue, variables, lineNo) : "";

    switch (keyword) {
      case "GOAL":
        agent.goal = parseQuoted(value, lineNo);
        index += 1;
        break;
      case "MEMORY":
        agent.memory = parseAgentMemory(value, lineNo);
        index += 1;
        break;
      case "TOOLS":
        agent.tools = parseToolsList(value, lineNo);
        index += 1;
        break;
      case "POLICY":
        agent.policy = {
          ...agent.policy,
          ...parseKeyValuePairs(value, lineNo)
        };
        index += 1;
        break;
      case "FLOW":
        if (value) {
          throw new Error(`Line ${lineNo}: AGENT FLOW must be an indented block, not inline value`);
        }
        index += 1;
        const subLines = [];
        while (index < blockLines.length && blockLines[index].indent > indent) {
          subLines.push(blockLines[index]);
          index += 1;
        }
        agent.flow = parseCognitiveFlowSteps(subLines, variables, keywordAliases);
        break;
      default:
        throw new Error(`Line ${lineNo}: unsupported AGENT child keyword '${rawKeyword}'`);
    }
  }

  return agent;
}

function promoteAgentToAst(ast, agent) {
  ast.agents.push(agent);

  if (!ast.task) {
    ast.task = agent.name;
  }
  if (!ast.cognition.goal && agent.goal) {
    ast.cognition.goal = agent.goal;
  }
  if (agent.memory && !ast.cognition.memory) {
    const type = agent.memory.type || "balanced";
    ast.cognition.memory = {
      shortSeconds: Number(agent.memory.short || 300),
      longDays: Number(agent.memory.long || 30),
      mode: String(type).split("+")[0] || "balanced"
    };
  }

  for (const step of agent.flow) {
    switch (step.kind) {
      case "perceive":
        ast.cognitive.perceptions.push(step);
        break;
      case "reason":
        ast.cognitive.reasonings.push(step);
        break;
      case "act":
        ast.cognition.acts.push(step);
        break;
      case "reflect":
        ast.cognitive.reflections.push(
          step.subject
            ? { subject: step.subject, depth: step.depth || "standard", trigger: step.trigger || "uncertainty" }
            : { subject: "self", depth: step.depth || "standard", trigger: step.trigger || "uncertainty" }
        );
        break;
      case "understand":
        ast.cognition.understandings.push(step);
        break;
      case "decide":
        ast.cognitive.decisions.push(step);
        break;
      case "feedback":
        ast.cognition.feedback.push(step);
        break;
      default:
        break;
    }
  }
}

function parseAel(source, options = {}) {
  const { tryParseGeneral } = require('./grammar');
  const generalAst = tryParseGeneral(source, options);
  if (generalAst) return generalAst;

  const lines = source.split(/\r?\n/);
  const ast = {
    language: "Noeon Contract Language",
    version: "0.2",
    network: null,
    profile: null,
    module: null,
    task: null,
    tags: {},
    budget: null,
    deadline: null,
    verify: null,
    cognition: {
      goal: null,
      constraints: {},
      context: {},
      understandings: [],
      risk: null,
      memory: null,
      learn: null,
      nativeAI: null,
      selfCheck: null,
      infer: null,
      critic: null,
      hypotheses: [],
      evidences: [],
      counterexamples: [],
      traces: [],
      debate: null,
      arbitration: null,
      jurors: [],
      plan: [],
      actions: {},
      acts: [],
      feedback: []
    },
    collateral: {
      solver: null,
      verifier: null
    },
    onSuccess: null,
    onSlash: null,
    stateFlow: [],
    metaRules: [],
    metaProfile: null,
    compute: {
      functions: [],
      bindings: [],
      branches: [],
      assertions: [],
      calls: [],
      returnExpr: null
    },
    cognitive: {
      drives: [],
      attentions: [],
      workspace: null,
      predictions: [],
      perceptions: [],
      intuitions: [],
      reasonings: [],
      reflections: [],
      consolidations: [],
      decisions: [],
      emotions: [],
      monitors: [],
      focuses: [],
      adaptations: []
    },
    cognitiveFlow: {
      whenSalient: [],
      ruminations: [],
      perceiveAll: [],
      competitions: [],
      habits: [],
      surpriseHandlers: [],
      dreams: [],
      primes: [],
      inhibitions: []
    },
    social: {
      spawns: [],
      delegations: [],
      debates: [],
      votes: [],
      shares: [],
      dismissals: []
    },
    evolution: {
      evolves: [],
      mutations: [],
      syntheses: [],
      freezes: []
    },
    llm: {
      asks: [],
      thinkWiths: [],
      embeds: []
    },
    agents: []
  };

  const variables = {};

  const keywordAliases = {
    THINK: "SET",
    BRAIN: "NETWORK",
    INTENT: "TASK",
    CONTEXT: "TAGS",
    PROGRAM: "TASK",
    OBJECTIVE: "GOAL",
    OBSERVE: "PERCEIVE",
    UNDERSTAND: "UNDERSTAND",
    INTERPRET: "UNDERSTAND",
    ACT: "ACT",
    EXECUTE: "ACT",
    FEEDBACK: "FEEDBACK",
    EVALUATE: "FEEDBACK",
    ENERGY: "BUDGET",
    MEMORY_UNTIL: "DEADLINE",
    TRUST: "VERIFY",
    DRIVE: "GOAL",
    RULES: "CONSTRAINT",
    THREAT: "RISK",
    HIPPOCAMPUS: "MEMORY",
    PLASTICITY: "LEARN",
    CONSCIOUSNESS: "COGNITION",
    METACOG: "SELF_CHECK",
    REASONER: "INFER",
    JUDGE: "CRITIC",
    THEOREM: "HYPOTHESIS",
    PROOF: "EVIDENCE",
    FALSIFY: "COUNTEREXAMPLE",
    CHAIN: "TRACE",
    FORUM: "DEBATE",
    COURT: "ARBITRATE",
    PANEL: "JUROR",
    CIRCUIT: "PLAN",
    ROUTE: "ACTION",
    REWARD: "ON_SUCCESS",
    PENALTY: "ON_SLASH",
    SYNAPSE: "FLOW",
    IMPULSE: "DRIVE_CMD",
    SENSE: "PERCEIVE",
    FOCUS_ON: "FOCUS",
    FEEL: "EMOTION",
    REMEMBER: "CONSOLIDATE",
    CHOOSE: "DECIDE",
    ADAPT_RULE: "ADAPT",
    FORESEE: "PREDICT",
    GUT: "INTUIT",
    THINK_DEEP: "REASON",
    INTROSPECT: "REFLECT",
    PONDER: "RUMINATE",
    MULL_OVER: "RUMINATE",
    SENSE_ALL: "PERCEIVE_ALL",
    RACE: "COMPETE",
    AUTOMATE: "HABITUATE",
    STARTLE: "ON_SURPRISE",
    SLEEP: "DREAM",
    ACTIVATE: "PRIME",
    SUPPRESS: "INHIBIT",
    CREATE_AGENT: "SPAWN",
    ASSIGN: "DELEGATE",
    DISCUSS: "DEBATE_MULTI",
    BALLOT: "VOTE",
    TEACH: "SHARE",
    REMOVE_AGENT: "DISMISS",
    NATURAL_SELECT: "EVOLVE",
    VARY: "MUTATE",
    INVENT: "SYNTHESIZE",
    LOCK: "FREEZE",
    QUERY: "ASK",
    CONSULT: "THINK_WITH",
    VECTORIZE: "EMBED"
  };

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const rawLine = lines[i];

    if (isSkippableLine(rawLine)) {
      continue;
    }

    const raw = rawLine.trim();
    const firstSpace = raw.indexOf(" ");
    if (firstSpace === -1) {
      throw new Error(`Line ${lineNo}: missing statement value`);
    }

    const rawKeyword = raw.slice(0, firstSpace).toUpperCase();

    if (rawKeyword === "AGENT") {
      const rawValue = raw.slice(firstSpace + 1).trim();
      const name = parseQuoted(rawValue, lineNo);
      const parentIndent = lineIndent(rawLine);
      const { blockLines, nextIndex } = collectIndentedLines(lines, i + 1, parentIndent);
      const body = parseAgentBlockBody(blockLines, variables, keywordAliases);
      promoteAgentToAst(ast, {
        name,
        ...body
      });
      i = nextIndex - 1;
      continue;
    }

    const keyword = keywordAliases[rawKeyword] || rawKeyword;
    const rawValue = raw.slice(firstSpace + 1).trim();

    if (keyword === "SET") {
      const assign = rawValue.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if (!assign) {
        throw new Error(`Line ${lineNo}: SET format is '<name> = <literal>'`);
      }
      variables[assign[1]] = parseLiteral(assign[2], lineNo);
      continue;
    }

    const value = interpolate(rawValue, variables, lineNo);

    switch (keyword) {
      case "VERSION":
        ast.version = parseQuoted(value, lineNo);
        break;
      case "PROFILE":
        ast.profile = parseQuoted(value, lineNo).toLowerCase();
        ast.languageProfile = ast.profile;
        break;
      case "MODULE":
        ast.module = parseQuoted(value, lineNo);
        break;
      case "NETWORK":
        ast.network = parseQuoted(value, lineNo);
        break;
      case "TASK":
        ast.task = parseQuoted(value, lineNo);
        break;
      case "GOAL":
        ast.cognition.goal = parseQuoted(value, lineNo);
        break;
      case "UNDERSTAND":
        ast.cognition.understandings.push(parseKeyValuePairs(value, lineNo));
        break;
      case "ACT":
        ast.cognition.acts.push(parseKeyValuePairs(value, lineNo));
        break;
      case "FEEDBACK":
        ast.cognition.feedback.push(parseKeyValuePairs(value, lineNo));
        break;
      case "CONSTRAINT":
        ast.cognition.constraints = {
          ...ast.cognition.constraints,
          ...parseKeyValuePairs(value, lineNo)
        };
        break;
      case "RISK":
        ast.cognition.risk = parseRisk(value, lineNo);
        break;
      case "MEMORY":
        ast.cognition.memory = parseMemory(value, lineNo);
        break;
      case "LEARN":
        ast.cognition.learn = parseLearn(value, lineNo);
        break;
      case "COGNITION":
        ast.cognition.nativeAI = parseCognition(value, lineNo);
        break;
      case "SELF_CHECK":
        ast.cognition.selfCheck = parseSelfCheck(value, lineNo);
        break;
      case "INFER":
        ast.cognition.infer = parseInfer(value, lineNo);
        break;
      case "CRITIC":
        ast.cognition.critic = parseCritic(value, lineNo);
        break;
      case "HYPOTHESIS":
        ast.cognition.hypotheses.push(parseHypothesis(value, lineNo));
        break;
      case "EVIDENCE":
        ast.cognition.evidences.push(parseEvidence(value, lineNo));
        break;
      case "COUNTEREXAMPLE":
        ast.cognition.counterexamples.push(parseCounterexample(value, lineNo));
        break;
      case "TRACE":
        ast.cognition.traces.push(parseTrace(value, lineNo));
        break;
      case "DEBATE":
        ast.cognition.debate = parseDebate(value, lineNo);
        break;
      case "ARBITRATE":
        ast.cognition.arbitration = parseArbitrate(value, lineNo);
        break;
      case "JUROR":
        ast.cognition.jurors.push(parseJuror(value, lineNo));
        break;
      case "PLAN":
        ast.cognition.plan.push(parsePlan(value, lineNo));
        break;
      case "ACTION": {
        const action = parseAction(value, lineNo);
        ast.cognition.actions[action.step] = action.binding;
        break;
      }
      case "TAGS":
        ast.tags = parseKeyValuePairs(value, lineNo);
        ast.cognition.context = {
          ...ast.cognition.context,
          ...ast.tags
        };
        break;
      case "BUDGET": {
        const m = value.match(/^(\d+)\s+msat$/i);
        if (!m) {
          throw new Error(`Line ${lineNo}: BUDGET format is '<int> msat'`);
        }
        ast.budget = Number(m[1]);
        break;
      }
      case "DEADLINE": {
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) {
          throw new Error(`Line ${lineNo}: invalid ISO datetime`);
        }
        ast.deadline = dt.toISOString();
        break;
      }
      case "VERIFY":
        ast.verify = parseVerify(value, lineNo);
        break;
      case "SOLVER_COLLATERAL":
        ast.collateral.solver = parseInteger(value, lineNo);
        break;
      case "VERIFIER_COLLATERAL":
        ast.collateral.verifier = parseInteger(value, lineNo);
        break;
      case "ON_SUCCESS":
        ast.onSuccess = parseDistribution(value, lineNo);
        break;
      case "ON_SLASH":
        ast.onSlash = parseDistribution(value, lineNo);
        break;
      case "FLOW":
        ast.stateFlow.push(parseFlow(value, lineNo));
        break;
      case "META_REQUIRE":
        ast.metaRules.push(parseMetaRequire(value, lineNo));
        break;
      case "META_RANGE":
        ast.metaRules.push(parseMetaRange(value, lineNo));
        break;
      case "META_ENUM":
        ast.metaRules.push(parseMetaEnum(value, lineNo));
        break;
      case "META_RELATION":
        ast.metaRules.push(parseMetaRelation(value, lineNo));
        break;
      case "META_PROFILE":
        ast.metaProfile = parseMetaProfile(value, lineNo);
        break;
      case "DEF":
        ast.compute.functions.push(parseComputeDef(value, lineNo));
        break;
      case "LET":
        ast.compute.bindings.push(parseComputeBinding(value, lineNo, "LET"));
        break;
      case "COMPUTE":
        ast.compute.bindings.push(parseComputeBinding(value, lineNo, "COMPUTE"));
        break;
      case "IF":
        ast.compute.branches.push(parseComputeIf(value, lineNo));
        break;
      case "ASSERT":
        ast.compute.assertions.push(parseAssert(value, lineNo));
        break;
      case "RETURN":
        ast.compute.returnExpr = parseReturn(value, lineNo);
        break;
      case "CALL":
        ast.compute.calls.push(parseComputeCall(value, lineNo));
        break;
      case "DRIVE_CMD":
        ast.cognitive.drives.push(parseCogDrive(value, lineNo));
        break;
      case "ATTEND":
        ast.cognitive.attentions.push(parseAttend(value, lineNo));
        break;
      case "WORKSPACE":
        ast.cognitive.workspace = parseWorkspace(value, lineNo);
        break;
      case "PREDICT":
        ast.cognitive.predictions.push(parsePredict(value, lineNo));
        break;
      case "PERCEIVE":
        ast.cognitive.perceptions.push(parsePerceive(value, lineNo));
        break;
      case "INTUIT":
        ast.cognitive.intuitions.push(parseIntuit(value, lineNo));
        break;
      case "REASON":
        ast.cognitive.reasonings.push(parseReason(value, lineNo));
        break;
      case "REFLECT":
        ast.cognitive.reflections.push(parseReflect(value, lineNo));
        break;
      case "CONSOLIDATE":
        ast.cognitive.consolidations.push(parseConsolidate(value, lineNo));
        break;
      case "DECIDE":
        ast.cognitive.decisions.push(parseDecide(value, lineNo));
        break;
      case "EMOTION":
        ast.cognitive.emotions.push(parseEmotion(value, lineNo));
        break;
      case "MONITOR":
        ast.cognitive.monitors.push(parseCogMonitor(value, lineNo));
        break;
      case "FOCUS":
        ast.cognitive.focuses.push(parseFocus(value, lineNo));
        break;
      case "ADAPT":
        ast.cognitive.adaptations.push(parseAdapt(value, lineNo));
        break;
      // === Flow Control ===
      case "WHEN_SALIENT":
        ast.cognitiveFlow.whenSalient.push(parseWhenSalient(value, lineNo));
        break;
      case "RUMINATE":
        ast.cognitiveFlow.ruminations.push(parseRuminate(value, lineNo));
        break;
      case "PERCEIVE_ALL":
        ast.cognitiveFlow.perceiveAll.push(parsePerceiveAll(value, lineNo));
        break;
      case "COMPETE":
        ast.cognitiveFlow.competitions.push(parseCompete(value, lineNo));
        break;
      case "HABITUATE":
        ast.cognitiveFlow.habits.push(parseHabituate(value, lineNo));
        break;
      case "ON_SURPRISE":
        ast.cognitiveFlow.surpriseHandlers.push(parseOnSurprise(value, lineNo));
        break;
      case "DREAM":
        ast.cognitiveFlow.dreams.push(parseDream(value, lineNo));
        break;
      case "PRIME":
        ast.cognitiveFlow.primes.push(parsePrime(value, lineNo));
        break;
      case "INHIBIT":
        ast.cognitiveFlow.inhibitions.push(parseInhibit(value, lineNo));
        break;
      // === Multi-Agent ===
      case "SPAWN":
        ast.social.spawns.push(parseSpawn(value, lineNo));
        break;
      case "DELEGATE":
        ast.social.delegations.push(parseDelegate(value, lineNo));
        break;
      case "DEBATE_MULTI":
        ast.social.debates.push(parseDebateExt(value, lineNo));
        break;
      case "VOTE":
        ast.social.votes.push(parseVote(value, lineNo));
        break;
      case "SHARE":
        ast.social.shares.push(parseShare(value, lineNo));
        break;
      case "DISMISS":
        ast.social.dismissals.push(parseDismiss(value, lineNo));
        break;
      // === Evolution ===
      case "EVOLVE":
        ast.evolution.evolves.push(parseEvolve(value, lineNo));
        break;
      case "MUTATE":
        ast.evolution.mutations.push(parseMutate(value, lineNo));
        break;
      case "SYNTHESIZE":
        ast.evolution.syntheses.push(parseSynthesize(value, lineNo));
        break;
      case "FREEZE":
        ast.evolution.freezes.push(parseFreeze(value, lineNo));
        break;
      // === LLM Integration ===
      case "ASK":
        ast.llm.asks.push(parseAsk(value, lineNo));
        break;
      case "THINK_WITH":
        ast.llm.thinkWiths.push(parseThinkWith(value, lineNo));
        break;
      case "EMBED":
        ast.llm.embeds.push(parseEmbed(value, lineNo));
        break;
      default:
        throw new Error(`Line ${lineNo}: unknown keyword '${keyword}'`);
    }
  }

  return ast;
}

module.exports = {
  parseAel
};
