/**
 * Noeon AI Cognitive Parser
 * 
 * Parses cognitive primitives that map to human brain architecture:
 * - DRIVE: Motivation/goal system (prefrontal cortex)
 * - ATTEND: Attention gating (thalamus + parietal cortex)
 * - WORKSPACE: Global workspace (Baars' GWT)
 * - PREDICT: Predictive processing (free energy principle)
 * - PERCEIVE: Sensory input processing
 * - INTUIT: System 1 fast heuristic (amygdala + basal ganglia)
 * - REASON: System 2 deliberate reasoning (prefrontal cortex)
 * - REFLECT: Metacognition (anterior cingulate cortex)
 * - CONSOLIDATE: Memory consolidation (hippocampus)
 * - DECIDE: Decision making (orbitofrontal cortex)
 * - EMOTION: Somatic marker / valence (amygdala)
 * - MONITOR: Conflict monitoring (ACC)
 */

function parseQuotedOrLiteral(value, lineNo) {
  const trimmed = value.trim();
  if (/^"[\s\S]*"$/.test(trimmed)) {
    const m = trimmed.match(/^"([\s\S]*)"$/);
    return m[1];
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }
  return trimmed;
}

function parseKV(input, lineNo) {
  const parts = input.match(/(?:[^\s"]+="[\s\S]*?"|[^\s"]+)/g) || [];
  const out = {};
  for (const part of parts) {
    const m = part.match(/^([a-z_][a-z0-9_]*)=(.+)$/i);
    if (!m) {
      throw new Error(`Line ${lineNo}: invalid key=value token '${part}'`);
    }
    const key = m[1];
    const raw = m[2];
    out[key] = /^"[\s\S]*"$/.test(raw)
      ? raw.match(/^"([\s\S]*)"$/)[1]
      : /^\d+(\.\d+)?$/.test(raw)
        ? Number(raw)
        : /^(true|false)$/i.test(raw)
          ? raw.toLowerCase() === "true"
          : raw;
  }
  return out;
}

function parseDrive(value, lineNo) {
  const m = value.match(/^"([^"]+)"(.*)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: DRIVE format is '"goal_description" [priority=high|medium|low] [persistent=true|false]'`);
  }
  const description = m[1];
  const rest = m[2].trim();
  const kv = rest ? parseKV(rest, lineNo) : {};

  const priority = kv.priority || "medium";
  if (!["low", "medium", "high", "critical"].includes(priority)) {
    throw new Error(`Line ${lineNo}: DRIVE priority must be low|medium|high|critical`);
  }

  return {
    description,
    priority,
    persistent: kv.persistent !== undefined ? kv.persistent : true,
    energy: kv.energy !== undefined ? Number(kv.energy) : 1.0
  };
}

function parseAttend(value, lineNo) {
  const kv = parseKV(value, lineNo);
  if (!kv.source) {
    throw new Error(`Line ${lineNo}: ATTEND requires source=<source_name>`);
  }

  return {
    source: String(kv.source),
    filter: kv.filter ? String(kv.filter) : null,
    focus: kv.focus ? String(kv.focus) : null,
    weight: kv.weight !== undefined ? Number(kv.weight) : 1.0,
    decay: kv.decay || "time_based"
  };
}

function parseWorkspace(value, lineNo) {
  const m = value.match(/^"([^"]+)"(.*)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: WORKSPACE format is '"name" [capacity=N] [decay=time_based|access_based|none]'`);
  }
  const name = m[1];
  const rest = m[2].trim();
  const kv = rest ? parseKV(rest, lineNo) : {};

  return {
    name,
    capacity: kv.capacity !== undefined ? Number(kv.capacity) : 7,
    decay: kv.decay || "time_based",
    ttl: kv.ttl !== undefined ? Number(kv.ttl) : 30
  };
}

function parsePredict(value, lineNo) {
  const m = value.match(/^"([^"]+)"(.*)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: PREDICT format is '"prediction_statement" [confidence=0.0-1.0] [model=<model_name>]'`);
  }
  const statement = m[1];
  const rest = m[2].trim();
  const kv = rest ? parseKV(rest, lineNo) : {};

  const confidence = kv.confidence !== undefined ? Number(kv.confidence) : 0.5;
  if (confidence < 0 || confidence > 1) {
    throw new Error(`Line ${lineNo}: PREDICT confidence must be between 0 and 1`);
  }

  return {
    statement,
    confidence,
    model: kv.model || "default",
    horizon: kv.horizon || "immediate"
  };
}

function parsePerceive(value, lineNo) {
  let normalized = value;
  const first = String(value).trim().split(/\s+/, 1)[0];
  if (first && !first.includes("=")) {
    normalized = `source=${first} ${String(value).trim().slice(first.length).trim()}`.trim();
  }

  const kv = parseKV(normalized, lineNo);
  if (!kv.source) {
    throw new Error(`Line ${lineNo}: PERCEIVE requires source=<source_name>`);
  }

  return {
    source: String(kv.source),
    modality: kv.modality || "text",
    filter: kv.filter ? String(kv.filter) : null,
    transform: kv.transform || "raw",
    timeout_ms: kv.timeout_ms !== undefined ? Number(kv.timeout_ms) : 5000
  };
}

function parseIntuit(value, lineNo) {
  const m = value.match(/^"([^"]+)"(.*)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: INTUIT format is '"question_or_pattern" [using=<heuristic>] [threshold=0.0-1.0]'`);
  }
  const query = m[1];
  const rest = m[2].trim();
  const kv = rest ? parseKV(rest, lineNo) : {};

  return {
    query,
    using: kv.using || "pattern_match",
    threshold: kv.threshold !== undefined ? Number(kv.threshold) : 0.6,
    max_latency_ms: kv.max_latency_ms !== undefined ? Number(kv.max_latency_ms) : 500
  };
}

function parseReason(value, lineNo) {
  const kv = parseKV(value, lineNo);

  const strategy = kv.strategy || "deductive";
  if (!["deductive", "inductive", "abductive", "analogical", "hybrid"].includes(strategy)) {
    throw new Error(`Line ${lineNo}: REASON strategy must be deductive|inductive|abductive|analogical|hybrid`);
  }

  return {
    strategy,
    depth: kv.depth !== undefined ? Number(kv.depth) : 5,
    breadth: kv.breadth !== undefined ? Number(kv.breadth) : 3,
    context: kv.context || "workspace",
    timeout_ms: kv.timeout_ms !== undefined ? Number(kv.timeout_ms) : 30000
  };
}

function parseReflect(value, lineNo) {
  const m = value.match(/^"([^"]+)"(.*)$/);
  if (!m) {
    throw new Error(`Line ${lineNo}: REFLECT format is '"subject" [depth=shallow|standard|deep] [trigger=error|uncertainty|periodic]'`);
  }
  const subject = m[1];
  const rest = m[2].trim();
  const kv = rest ? parseKV(rest, lineNo) : {};

  const depth = kv.depth || "deep";
  if (!["shallow", "standard", "deep", "recursive"].includes(depth)) {
    throw new Error(`Line ${lineNo}: REFLECT depth must be shallow|standard|deep|recursive`);
  }

  return {
    subject,
    depth,
    trigger: kv.trigger || "uncertainty",
    output: kv.output || "insight"
  };
}

function parseConsolidate(value, lineNo) {
  const kv = parseKV(value, lineNo);
  if (!kv.from) {
    throw new Error(`Line ${lineNo}: CONSOLIDATE requires from=<source>`);
  }
  if (!kv.to) {
    throw new Error(`Line ${lineNo}: CONSOLIDATE requires to=<memory_type>`);
  }

  const to = kv.to;
  if (!["episodic", "semantic", "procedural", "working"].includes(to)) {
    throw new Error(`Line ${lineNo}: CONSOLIDATE to must be episodic|semantic|procedural|working`);
  }

  return {
    from: String(kv.from),
    to,
    strength: kv.strength !== undefined ? Number(kv.strength) : 0.8,
    decay_rate: kv.decay_rate !== undefined ? Number(kv.decay_rate) : 0.01
  };
}

function parseDecide(value, lineNo) {
  const kv = parseKV(value, lineNo);
  if (!kv.action) {
    throw new Error(`Line ${lineNo}: DECIDE requires action=<action_name>`);
  }

  return {
    action: String(kv.action),
    threshold: kv.threshold !== undefined ? Number(kv.threshold) : 0.7,
    mode: kv.mode || "satisfice",
    fallback: kv.fallback || "escalate",
    valence_weight: kv.valence_weight !== undefined ? Number(kv.valence_weight) : 0.3
  };
}

function parseEmotion(value, lineNo) {
  const kv = parseKV(value, lineNo);

  const valence = kv.valence !== undefined ? Number(kv.valence) : 0;
  if (valence < -1 || valence > 1) {
    throw new Error(`Line ${lineNo}: EMOTION valence must be between -1 and 1`);
  }

  const arousal = kv.arousal !== undefined ? Number(kv.arousal) : 0.5;
  if (arousal < 0 || arousal > 1) {
    throw new Error(`Line ${lineNo}: EMOTION arousal must be between 0 and 1`);
  }

  return {
    valence,
    arousal,
    tag: kv.tag || "neutral",
    influence: kv.influence || "decision",
    duration: kv.duration || "transient"
  };
}

function parseMonitor(value, lineNo) {
  const kv = parseKV(value, lineNo);
  if (!kv.metric) {
    throw new Error(`Line ${lineNo}: MONITOR requires metric=<metric_name>`);
  }

  return {
    metric: String(kv.metric),
    threshold: kv.threshold !== undefined ? Number(kv.threshold) : 0.5,
    action: kv.action || "alert",
    window: kv.window !== undefined ? Number(kv.window) : 10,
    continuous: kv.continuous !== undefined ? kv.continuous : true
  };
}

function parseFocus(value, lineNo) {
  const kv = parseKV(value, lineNo);
  if (!kv.target) {
    throw new Error(`Line ${lineNo}: FOCUS requires target=<target_name>`);
  }

  return {
    target: String(kv.target),
    intensity: kv.intensity !== undefined ? Number(kv.intensity) : 1.0,
    duration: kv.duration || "sustained",
    suppress_others: kv.suppress_others !== undefined ? kv.suppress_others : false
  };
}

function parseAdapt(value, lineNo) {
  const kv = parseKV(value, lineNo);
  if (!kv.rule) {
    throw new Error(`Line ${lineNo}: ADAPT requires rule=<rule_name>`);
  }

  return {
    rule: String(kv.rule),
    delta: kv.delta !== undefined ? Number(kv.delta) : 0,
    signal: kv.signal || "reward",
    condition: kv.condition || null
  };
}

module.exports = {
  parseDrive,
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
  parseMonitor,
  parseFocus,
  parseAdapt
};
