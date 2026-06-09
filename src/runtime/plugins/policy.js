const DEFAULT_ALLOWED_PLUGINS = ["echo", "policy_guard", "http_call", "mcp_call"];

function parseCsvList(value, fallback) {
  if (!value) {
    return [...fallback];
  }
  return String(value)
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function resolvePluginPolicy(binding, context) {
  const globalPolicy = context?.pluginPolicy || {};

  const allowedPlugins = parseCsvList(
    globalPolicy.allowedPlugins || process.env.NOEON_ALLOWED_PLUGINS,
    DEFAULT_ALLOWED_PLUGINS
  );

  const allowedActionTypes = parseCsvList(
    globalPolicy.allowedActionTypes || process.env.NOEON_ALLOWED_ACTION_TYPES,
    ["sense", "validate", "reason", "safety", "commit", "generic"]
  );

  const plugin = String(binding?.plugin || "").toLowerCase();
  const actionType = String(context?.actionType || "").toLowerCase();

  if (!allowedPlugins.includes(plugin)) {
    return {
      allow: false,
      category: "policy_block",
      reason: `plugin '${plugin}' is not in whitelist`
    };
  }

  if (actionType && !allowedActionTypes.includes(actionType)) {
    return {
      allow: false,
      category: "policy_block",
      reason: `action type '${actionType}' is not allowed`
    };
  }

  return {
    allow: true,
    category: null,
    reason: "policy-allow"
  };
}

module.exports = {
  resolvePluginPolicy
};
