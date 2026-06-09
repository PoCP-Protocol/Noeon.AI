const { getPlugin } = require("./plugins/registry");
const { resolvePluginPolicy } = require("./plugins/policy");
const { verifyPluginBinding } = require("./plugins/integrity");

function classifyAction(stepName) {
  const s = String(stepName || "").toLowerCase();
  if (s.includes("collect") || s.includes("observe")) {
    return "sense";
  }
  if (s.includes("validate") || s.includes("verify")) {
    return "validate";
  }
  if (s.includes("synthesize") || s.includes("reason")) {
    return "reason";
  }
  if (s.includes("risk") || s.includes("guard")) {
    return "safety";
  }
  if (s.includes("finalize") || s.includes("commit")) {
    return "commit";
  }
  return "generic";
}

function defaultLatencyByAction(actionType) {
  const table = {
    sense: 700,
    validate: 900,
    reason: 1400,
    safety: 1100,
    commit: 600,
    generic: 800
  };
  return table[actionType] || 800;
}

function simpleHash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `h${(h >>> 0).toString(16)}`;
}

function normalizeFailureCategory(errorCode) {
  const code = String(errorCode || "").toLowerCase();
  if (!code) {
    return "unknown_failure";
  }
  if (code.includes("timeout")) {
    return "timeout";
  }
  if (code.includes("policy") || code.includes("guard")) {
    return "policy_block";
  }
  if (code.includes("verify") || code.includes("validation")) {
    return "validation_error";
  }
  return "execution_error";
}

function isPromiseLike(value) {
  return Boolean(value) && typeof value.then === "function";
}

function buildStepResult(stepName, context, actionType, userResult, pluginResult, failedSet) {
  const feedback = context.feedback || {};

  const latencyMs = Number(
    userResult?.latencyMs ||
      pluginResult?.latencyMs ||
      feedback.stepLatencyMs?.[stepName] ||
      defaultLatencyByAction(actionType) * (context.adaptiveProfile?.latencyScale || 1)
  );

  const failed =
    userResult?.status === "failed" ||
    pluginResult?.status === "failed" ||
    failedSet.has(stepName);
  const status = failed ? "failed" : "done";
  const failureCategory = failed
    ? pluginResult?.failureCategory || normalizeFailureCategory(userResult?.errorCode)
    : null;
  const reason = failed
    ? userResult?.reason || pluginResult?.reason || `action-${failureCategory}`
    : userResult?.reason || pluginResult?.reason || "action-completed";

  return {
    status,
    latencyMs: Math.max(1, Math.round(latencyMs)),
    reason,
    failureCategory,
    receipt: {
      actionType,
      stepName,
      task: context.task,
      network: context.network,
      evidenceHash: simpleHash(`${context.task}:${stepName}:${status}:${reason}`),
      errorCode: userResult?.errorCode || pluginResult?.errorCode || null,
      plugin: context.actionBindings?.[stepName]?.plugin || null,
      pluginVersion: pluginResult?.pluginVersion || null,
      signatureVerified: pluginResult?.signatureVerified || false,
      expectedSignature: pluginResult?.expectedSignature || null,
      pluginMeta: pluginResult?.pluginMeta || null,
      content: pluginResult?.content || pluginResult?.pluginMeta?.contentPreview || null
    }
  };
}

function runActionStep(stepName, context) {
  const feedback = context.feedback || {};
  const actionType = classifyAction(stepName);
  const userResult = feedback.actionResults?.[stepName];
  const failedSet = Array.isArray(feedback.failedSteps) ? new Set(feedback.failedSteps) : new Set();
  const binding = context.actionBindings?.[stepName] || null;

  let pluginResult = null;
  if (binding?.plugin) {
    const policy = resolvePluginPolicy(binding, {
      ...context,
      actionType
    });

    if (!policy.allow) {
      pluginResult = {
        status: "failed",
        reason: policy.reason,
        latencyMs: Number(binding.latencyMs || 100),
        failureCategory: policy.category || "policy_block",
        errorCode: "PLUGIN_POLICY_DENY",
        pluginMeta: {
          template: "policy",
          decision: "deny"
        }
      };
    } else {
      const plugin = getPlugin(binding.plugin);
      if (plugin) {
        const integrity = verifyPluginBinding({
          binding,
          plugin,
          context
        });

        if (!integrity.ok) {
          pluginResult = {
            status: "failed",
            reason: integrity.reason,
            latencyMs: Number(binding.latencyMs || 120),
            failureCategory: "policy_block",
            errorCode: integrity.code,
            pluginMeta: {
              template: "integrity",
              decision: "deny"
            }
          };
        } else {
          let executeResult;
          try {
            executeResult = plugin.execute({
              stepName,
              actionType,
              feedback,
              binding,
              context
            });
          } catch (error) {
            executeResult = {
              status: "failed",
              reason: error?.message || "plugin execution failed",
              latencyMs: Number(binding.latencyMs || 120),
              failureCategory: "execution_error",
              errorCode: "PLUGIN_EXECUTION_ERROR",
              pluginMeta: {
                template: "runtime",
                decision: "deny"
              }
            };
          }

          if (isPromiseLike(executeResult)) {
            return executeResult
              .then((resolved) => {
                const next = {
                  ...(resolved || {}),
                  pluginVersion: integrity.version,
                  signatureVerified: !!binding.signature,
                  expectedSignature: integrity.expectedSignature
                };
                return buildStepResult(
                  stepName,
                  context,
                  actionType,
                  userResult,
                  next,
                  failedSet
                );
              })
              .catch((error) => {
                const next = {
                  status: "failed",
                  reason: error?.message || "plugin execution failed",
                  latencyMs: Number(binding.latencyMs || 120),
                  failureCategory: "execution_error",
                  errorCode: "PLUGIN_EXECUTION_ERROR",
                  pluginMeta: {
                    template: "runtime",
                    decision: "deny"
                  },
                  pluginVersion: integrity.version,
                  signatureVerified: !!binding.signature,
                  expectedSignature: integrity.expectedSignature
                };
                return buildStepResult(
                  stepName,
                  context,
                  actionType,
                  userResult,
                  next,
                  failedSet
                );
              });
          }

          pluginResult = executeResult;

          pluginResult.pluginVersion = integrity.version;
          pluginResult.signatureVerified = !!binding.signature;
          pluginResult.expectedSignature = integrity.expectedSignature;
        }
      } else {
        pluginResult = {
          status: "failed",
          reason: `plugin '${binding.plugin}' is not registered`,
          latencyMs: Number(binding.latencyMs || 100),
          failureCategory: "execution_error",
          errorCode: "PLUGIN_NOT_FOUND",
          pluginMeta: {
            template: "registry",
            decision: "deny"
          }
        };
      }
    }
  }

  return buildStepResult(
    stepName,
    context,
    actionType,
    userResult,
    pluginResult,
    failedSet
  );
}

module.exports = {
  runActionStep
};
