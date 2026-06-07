function simpleHash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h${(h >>> 0).toString(16)}`;
}

function expectedSignature(name, version, signingKey) {
  return simpleHash(`${name}:${version}:${signingKey}`);
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
}

function verifyPluginBinding({ binding, plugin, context }) {
  if (!binding || !plugin) {
    return {
      ok: false,
      code: "PLUGIN_BINDING_INVALID",
      reason: "plugin binding is invalid"
    };
  }

  const requireVersion = toBool(context?.pluginPolicy?.requireVersion, false);
  const requireSignature = toBool(context?.pluginPolicy?.requireSignature, false);

  const manifestVersion = plugin.version || "0.0.0";
  const bindingVersion = binding.version;
  if (bindingVersion && String(bindingVersion) !== String(manifestVersion)) {
    return {
      ok: false,
      code: "PLUGIN_VERSION_MISMATCH",
      reason: `expected version ${manifestVersion}, got ${bindingVersion}`
    };
  }

  if (requireVersion && !bindingVersion) {
    return {
      ok: false,
      code: "PLUGIN_VERSION_REQUIRED",
      reason: "plugin version is required by policy"
    };
  }

  const signingKey =
    context?.pluginPolicy?.signingKey || process.env.NOEON_PLUGIN_SIGNING_KEY || "noeon-dev-key";
  const expected = expectedSignature(plugin.name, manifestVersion, signingKey);

  if (binding.signature) {
    if (String(binding.signature) !== expected) {
      return {
        ok: false,
        code: "PLUGIN_SIGNATURE_INVALID",
        reason: "plugin signature mismatch"
      };
    }
  } else if (requireSignature) {
    return {
      ok: false,
      code: "PLUGIN_SIGNATURE_REQUIRED",
      reason: "plugin signature is required by policy"
    };
  }

  return {
    ok: true,
    expectedSignature: expected,
    version: manifestVersion
  };
}

module.exports = {
  verifyPluginBinding,
  expectedSignature
};
