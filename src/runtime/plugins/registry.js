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
    execute({ stepName, binding, feedback }) {
      const latencyMs = Number(binding.latencyMs || 1000);
      const endpoint = binding.endpoint || "https://api.example.com/execute";

      const injected = feedback?.actionResults?.[stepName];
      if (injected?.status === "failed") {
        return {
          status: "failed",
          reason: injected.reason || "http call failed",
          latencyMs: Number(injected.latencyMs || latencyMs),
          failureCategory: "execution_error",
          pluginMeta: {
            template: "http_call",
            endpoint,
            mocked: true
          },
          errorCode: injected.errorCode || "HTTP_CALL_FAILED"
        };
      }

      return {
        status: "done",
        reason: "http call succeeded",
        latencyMs,
        failureCategory: null,
        pluginMeta: {
          template: "http_call",
          endpoint,
          mocked: true
        }
      };
    }
  }
};

function getPlugin(name) {
  const key = String(name || "").toLowerCase();
  return plugins[key] || null;
}

module.exports = {
  getPlugin
};
