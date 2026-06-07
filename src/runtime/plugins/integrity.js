const crypto = require("crypto");

function expectedSignature(name, version, signingKey) {
  const payload = `${name}:${version}`;
  const digest = crypto
    .createHmac("sha256", String(signingKey || ""))
    .update(payload)
    .digest("hex");
  return `hmac-sha256:${digest}`;
}

function signaturesEqual(left, right) {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
    if (!signaturesEqual(binding.signature, expected)) {
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
