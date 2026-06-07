const httpCall = require("./http-call");

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
}

const plugins = {
  echo: {
    name: "echo",
    version: "1.0.0",
    execute({ stepName, actionType, binding }) {
      return {
        status: "done",
        reason: `echo-${actionType}-ok`,
        latencyMs: Number(binding.latencyMs || 500),
        failureCategory: null,
        pluginMeta: {
          template: "echo",
          message: binding.message || `executed ${stepName}`
        }
      };
    }
  },
  policy_guard: {
    name: "policy_guard",
    version: "1.1.0",
    execute({ stepName, feedback, binding }) {
      const guardDecision =
        feedback?.policyDecision || feedback?.actionResults?.[stepName]?.guardDecision || "allow";
      const strict = normalizeBoolean(binding.strict, true);
      const deny = String(guardDecision).toLowerCase() === "deny";

      if (deny && strict) {
        return {
          status: "failed",
          reason: "policy guard rejected step",
          latencyMs: Number(binding.latencyMs || 900),
          failureCategory: "policy_block",
          pluginMeta: {
            template: "policy_guard",
            decision: "deny"
          },
          errorCode: "POLICY_BLOCK_GUARD"
        };
      }

      return {
        status: "done",
        reason: "policy guard passed",
        latencyMs: Number(binding.latencyMs || 900),
        failureCategory: null,
        pluginMeta: {
          template: "policy_guard",
          decision: deny ? "soft-deny" : "allow"
        }
      };
    }
  },
  http_call: {
    name: "http_call",
    version: "0.9.0",
    execute: httpCall.execute
  }
};

function getPlugin(name) {
  const key = String(name || "").toLowerCase();
  return plugins[key] || null;
}

module.exports = {
  getPlugin
};
