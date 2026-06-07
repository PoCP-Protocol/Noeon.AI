const fs = require("node:fs");
const path = require("node:path");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseExternalPolicyFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return {
      rules: [],
      profile: null,
      warning: `meta policy file not found: ${resolved}`
    };
  }

  try {
    const raw = fs.readFileSync(resolved, "utf8");
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      return {
        rules: data,
        profile: null,
        profiles: {},
        warning: null
      };
    }

    const profiles = normalizeExternalProfiles(data?.profiles);

    return {
      rules: Array.isArray(data?.rules) ? data.rules : [],
      profile: data?.profile || null,
      profiles,
      warning: null
    };
  } catch (error) {
    return {
      rules: [],
      profile: null,
      profiles: {},
      warning: `meta policy file parse failed: ${error.message}`
    };
  }
}

function normalizeExternalProfiles(input) {
  const out = {};
  if (!input) {
    return out;
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      if (!entry || !entry.name) {
        continue;
      }
      const name = String(entry.name);
      out[name] = {
        name,
        namespace: entry.namespace,
        version: entry.version,
        mode: entry.mode,
        extends: entry.extends,
        rules: Array.isArray(entry.rules) ? entry.rules : []
      };
    }
    return out;
  }

  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input)) {
      if (!value || typeof value !== "object") {
        continue;
      }
      out[key] = {
        name: String(value.name || key),
        namespace: value.namespace,
        version: value.version,
        mode: value.mode,
        extends: value.extends,
        rules: Array.isArray(value.rules) ? value.rules : []
      };
    }
  }

  return out;
}

function normalizeRules(compiled) {
  const baseRules = Array.isArray(compiled?.spec?.metaRules) ? compiled.spec.metaRules : [];
  const externalFile = process.env.NOEON_META_POLICY_FILE;
  if (!externalFile) {
    const inheritance = resolveProfileInheritance(compiled, null);
    const merged = inheritance.rules.concat(baseRules);
    const resolved = resolveConflicts(merged);
    return {
      rules: resolved.rules,
      warnings: inheritance.warnings.concat(resolved.conflicts.map(
        (c) => `meta conflict resolved by last-win: ${c.key} (kept #${c.keptIndex + 1})`
      )),
      profile: inheritance.profile
    };
  }

  const external = parseExternalPolicyFile(externalFile);
  const inheritance = resolveProfileInheritance(compiled, external);
  const mergedRules = inheritance.rules
    .concat(baseRules)
    .concat(Array.isArray(external.rules) ? external.rules : []);
  const resolved = resolveConflicts(mergedRules);
  const warnings = external.warning ? [external.warning] : [];
  warnings.push(...inheritance.warnings);
  warnings.push(
    ...resolved.conflicts.map(
      (c) => `meta conflict resolved by last-win: ${c.key} (kept #${c.keptIndex + 1})`
    )
  );
  return {
    rules: resolved.rules,
    warnings,
    externalProfile: external.profile,
    profile: inheritance.profile
  };
}

function normalizeProfileLike(profile, fallbackName = "default") {
  if (!profile) {
    return null;
  }

  return {
    name: String(profile.name || fallbackName),
    namespace: String(profile.namespace || "noeon.meta"),
    version: String(profile.version || "1.0"),
    mode: String(profile.mode || "enforce").toLowerCase() === "advisory" ? "advisory" : "enforce",
    extends: Array.isArray(profile.extends)
      ? profile.extends.map((item) => String(item))
      : []
  };
}

function resolveProfileInheritance(compiled, external) {
  const externalProfile = external?.profile || null;
  const externalProfiles = external?.profiles || {};
  const compiledProfile = compiled?.spec?.metaProfile || null;

  let base = normalizeProfileLike(compiledProfile, compiledProfile?.name || "default");
  if (!base) {
    base = normalizeProfileLike(externalProfile, externalProfile?.name || "default");
  }

  if (!base) {
    return {
      profile: null,
      rules: [],
      warnings: []
    };
  }

  const node = externalProfiles[base.name];
  if (node) {
    const normalizedNode = normalizeProfileLike(node, base.name);
    if (base.extends.length === 0 && normalizedNode.extends.length > 0) {
      base.extends = normalizedNode.extends;
    }
    if (!compiledProfile) {
      base.namespace = normalizedNode.namespace;
      base.version = normalizedNode.version;
      base.mode = normalizedNode.mode;
    }
  }

  const warnings = [];
  const visiting = new Set();
  const visited = new Set();
  const orderedProfiles = [];

  function walk(name) {
    if (!name) {
      return;
    }
    if (visiting.has(name)) {
      warnings.push(`meta profile inheritance cycle detected at '${name}'`);
      return;
    }
    if (visited.has(name)) {
      return;
    }

    const current = externalProfiles[name];
    if (!current) {
      warnings.push(`meta profile '${name}' not found in external policy profiles`);
      visited.add(name);
      return;
    }

    visiting.add(name);
    const normalized = normalizeProfileLike(current, name);
    for (const parent of normalized.extends) {
      walk(parent);
    }
    visiting.delete(name);
    visited.add(name);
    orderedProfiles.push(name);
  }

  for (const parent of base.extends) {
    walk(parent);
  }
  walk(base.name);

  const inheritedRules = [];
  for (const profileName of orderedProfiles) {
    const profileNode = externalProfiles[profileName];
    if (!profileNode || !Array.isArray(profileNode.rules)) {
      continue;
    }
    inheritedRules.push(...profileNode.rules);
  }

  return {
    profile: base,
    rules: inheritedRules,
    warnings
  };
}

function normalizeProfile(compiled, externalProfile = null) {
  return normalizeProfileLike(compiled?.spec?.metaProfile || externalProfile, "default");
}

function normalizeRuntimePath(dotPath) {
  const raw = String(dotPath || "").trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("contract.") || raw.startsWith("feedback.") || raw.startsWith("runtime.")) {
    return raw;
  }

  const path = raw.startsWith("ast.") ? raw.slice(4) : raw;

  if (path.startsWith("network")) {
    return `contract.${path}`;
  }
  if (path.startsWith("task")) {
    return `contract.${path}`;
  }
  if (path.startsWith("tags")) {
    return `contract.${path}`;
  }
  if (path.startsWith("cognition.")) {
    return `contract.${path}`;
  }
  if (path.startsWith("verify.")) {
    return `contract.${path}`;
  }
  if (path.startsWith("collateral.")) {
    return `contract.${path}`;
  }
  if (path === "budget") {
    return "contract.budget.amount";
  }
  if (path.startsWith("budget.")) {
    if (path === "budget.amount" || path === "budget.unit") {
      return `contract.${path}`;
    }
    return `contract.budget.${path.slice("budget.".length)}`;
  }
  if (path === "deadline") {
    return "contract.deadline";
  }
  if (path.startsWith("onSuccess.")) {
    return `contract.settlement.success.${path.slice("onSuccess.".length)}`;
  }
  if (path.startsWith("onSlash.")) {
    return `contract.settlement.slash.${path.slice("onSlash.".length)}`;
  }

  return path;
}

function metaRuleKey(rule) {
  if (!rule || !rule.kind) {
    return null;
  }

  if (rule.kind === "relation") {
    const whenPath = normalizeRuntimePath(rule.when?.path || "") || "";
    const targetPath = normalizeRuntimePath(rule.target?.path || "") || "";
    return [
      "relation",
      whenPath,
      rule.when?.op || "eq",
      JSON.stringify(rule.when?.value),
      targetPath,
      rule.target?.op || "eq",
      JSON.stringify(rule.target?.value)
    ].join("|");
  }

  const normalizedPath = normalizeRuntimePath(rule.path || "") || "";
  return [rule.kind, normalizedPath].join("|");
}

function resolveConflicts(rules) {
  const selected = new Map();
  const conflicts = [];

  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];
    const key = metaRuleKey(rule);
    if (!key) {
      continue;
    }

    if (selected.has(key)) {
      const previous = selected.get(key);
      conflicts.push({
        key,
        droppedIndex: previous.index,
        keptIndex: i
      });
    }

    selected.set(key, { index: i, rule });
  }

  const normalized = Array.from(selected.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.rule);

  return {
    rules: normalized,
    conflicts
  };
}

function resolvePath(target, dotPath) {
  const parts = String(dotPath || "")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  let current = target;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return { exists: false, value: undefined };
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return { exists: false, value: undefined };
    }
    current = current[part];
  }

  return { exists: true, value: current };
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return NaN;
}

function compareValues(left, op, right) {
  const lNum = toNumber(left);
  const rNum = toNumber(right);
  const numeric = !Number.isNaN(lNum) && !Number.isNaN(rNum);

  const l = numeric ? lNum : String(left);
  const r = numeric ? rNum : String(right);

  switch (op) {
    case "eq":
      return l === r;
    case "ne":
      return l !== r;
    case "gt":
      return l > r;
    case "gte":
      return l >= r;
    case "lt":
      return l < r;
    case "lte":
      return l <= r;
    default:
      return false;
  }
}

function decorateMessage(profile, message) {
  if (!profile) {
    return message;
  }
  return `[${profile.namespace}/${profile.name}@${profile.version}] ${message}`;
}

function evaluateRule(rule, runtimeContext, profile) {
  const rawLevel = String(rule.level || "error").toLowerCase() === "warning" ? "warning" : "error";
  const level = profile && profile.mode === "advisory" ? "warning" : rawLevel;
  const normalizedPath = normalizeRuntimePath(rule.path);
  const lookup = resolvePath(runtimeContext, normalizedPath);

  if (rule.kind === "require") {
    const ok = lookup.exists && lookup.value !== null && lookup.value !== undefined && lookup.value !== "";
    if (ok) {
      return null;
    }
    return {
      kind: rule.kind,
      level,
      path: normalizedPath || rule.path,
      expected: "value must exist",
      actual: "missing",
      message: decorateMessage(profile, rule.message || `meta require failed at '${normalizedPath || rule.path}'`)
    };
  }

  if (rule.kind === "range") {
    const numeric = toNumber(lookup.value);
    const ok = lookup.exists && !Number.isNaN(numeric) && numeric >= rule.min && numeric <= rule.max;
    if (ok) {
      return null;
    }
    return {
      kind: rule.kind,
      level,
      path: normalizedPath || rule.path,
      expected: `value in [${rule.min}, ${rule.max}]`,
      actual: lookup.exists ? String(lookup.value) : "missing",
      message: decorateMessage(profile, rule.message || `meta range failed at '${normalizedPath || rule.path}'`)
    };
  }

  if (rule.kind === "enum") {
    const expected = Array.isArray(rule.values) ? rule.values : [];
    const ok = lookup.exists && expected.includes(String(lookup.value));
    if (ok) {
      return null;
    }
    return {
      kind: rule.kind,
      level,
      path: normalizedPath || rule.path,
      expected: `value in {${expected.join(", ")}}`,
      actual: lookup.exists ? String(lookup.value) : "missing",
      message: decorateMessage(profile, rule.message || `meta enum failed at '${normalizedPath || rule.path}'`)
    };
  }

  if (rule.kind === "relation") {
    let whenPassed = true;
    if (rule.when && rule.when.path) {
      const whenPath = normalizeRuntimePath(rule.when.path);
      const whenLookup = resolvePath(runtimeContext, whenPath);
      whenPassed =
        whenLookup.exists && compareValues(whenLookup.value, rule.when.op || "eq", rule.when.value);
    }

    if (!whenPassed) {
      return null;
    }

    const targetPath = normalizeRuntimePath(rule.target?.path);
    const targetLookup = resolvePath(runtimeContext, targetPath);
    const ok =
      targetLookup.exists &&
      compareValues(targetLookup.value, rule.target?.op || "eq", rule.target?.value);

    if (ok) {
      return null;
    }

    return {
      kind: rule.kind,
      level,
      path: targetPath || rule.target?.path || "unknown",
      expected: `target ${rule.target?.op || "eq"} ${rule.target?.value}`,
      actual: targetLookup.exists ? String(targetLookup.value) : "missing",
      message: decorateMessage(
        profile,
        rule.message || `meta relation failed at '${targetPath || rule.target?.path || "unknown"}'`
      )
    };
  }

  return {
    kind: rule.kind || "unknown",
    level,
    path: normalizedPath || rule.path || "unknown",
    expected: "supported rule kind",
    actual: rule.kind || "missing",
    message: decorateMessage(profile, "unsupported meta rule kind")
  };
}

function hardenAdaptiveProfile(adaptiveProfile) {
  const next = clone(adaptiveProfile || {});
  next.profileName = "meta-guarded";
  next.verificationMode = "manual";
  if (typeof next.latencyScale !== "number") {
    next.latencyScale = 1;
  }
  next.latencyScale = Math.max(next.latencyScale, 1.1);
  return next;
}

function hardenLearning(learning) {
  const next = clone(learning || {});
  if (!next.updates) {
    return next;
  }

  if (next.updates.verify) {
    const currentChallenge = Number(next.updates.verify.challengeSeconds || 0);
    next.updates.verify.challengeSeconds = Math.max(900, currentChallenge);
  }

  if (next.updates.slash && typeof next.updates.slash.malicious === "number") {
    next.updates.slash.malicious = Math.max(95, next.updates.slash.malicious);
  }

  return next;
}

function evaluateMetaPolicy({ compiled, feedback, adaptiveProfile, learning, compute }) {
  const normalized = normalizeRules(compiled);
  const rules = normalized.rules;
  const profile = normalized.profile || normalizeProfile(compiled, normalized.externalProfile || null);
  const runtimeContext = {
    contract: compiled?.contract || {},
    feedback: feedback || {},
    runtime: {
      adaptiveProfile: adaptiveProfile || {},
      learning: learning || {},
      compute: {
        env: compute?.env || {},
        receipts: Array.isArray(compute?.receipts) ? compute.receipts : [],
        result: compute?.result,
        summary: compute?.summary || {}
      }
    }
  };

  const violations = [];
  for (const rule of rules) {
    const violation = evaluateRule(rule, runtimeContext, profile);
    if (violation) {
      violations.push(violation);
    }
  }

  const blockingViolations = violations.filter((v) => v.level === "error");
  const warningViolations = violations.filter((v) => v.level !== "error");
  const hardened = blockingViolations.length > 0;
  for (const warn of normalized.warnings || []) {
    warningViolations.push({
      kind: "loader",
      level: "warning",
      path: "runtime.meta.policy.file",
      expected: "valid policy file",
      actual: warn,
      message: decorateMessage(profile, warn)
    });
  }

  const mergedViolations = violations.concat(warningViolations.filter((v) => v.kind === "loader"));

  const safeAdaptiveProfile = hardened ? hardenAdaptiveProfile(adaptiveProfile) : adaptiveProfile;
  const safeLearning = hardened ? hardenLearning(learning) : learning;

  return {
    enabled: rules.length > 0,
    profile,
    totalRules: rules.length,
    violations: mergedViolations,
    blockingViolations,
    warningViolations,
    hardened,
    adaptiveProfile: safeAdaptiveProfile,
    learning: safeLearning
  };
}

module.exports = {
  evaluateMetaPolicy
};