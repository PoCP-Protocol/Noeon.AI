'use strict';

/**
 * Runtime mode — explicit mock/live/deterministic boundaries for every run.
 * Schema: noeon.runtime.mode/v1
 */

const RUNTIME_MODE_SCHEMA = 'noeon.runtime.mode/v1';

const MODE_DISCLAIMER =
  'Noeon alpha runs are reproducible by default. mock = simulated cognition/plugins; '
  + 'live = real LLM/API when keys and NOEON_LLM_MODE allow; deterministic = no LLM.';

function resolveLlmConfig(options = {}) {
  const mode = String(
    options.llm?.mode
    || options.llm_mode
    || process.env.NOEON_LLM_MODE
    || options.config?.llm?.mode
    || 'auto'
  ).toLowerCase();
  const configured = Boolean(
    process.env.OPENAI_API_KEY
    || process.env.NOEON_API_KEY
    || options.llm?.apiKey
  );
  const enableLlm = options.enable_llm !== false && mode !== 'off';
  return { mode, configured, enableLlm };
}

function inferEvidenceProvenance(result = {}) {
  const artifacts = result.report?.cognitiveEvidence?.artifacts
    || result.cognitiveEvidence?.artifacts
    || [];
  const set = new Set(artifacts.map((a) => a.provenance).filter(Boolean));
  return {
    mock: set.has('mock'),
    live: set.has('live'),
    deterministic: set.has('deterministic') || set.size === 0
  };
}

function summarizePluginMode(result = {}) {
  const actions = result.actionTrace?.actions
    || result.report?.actionTrace?.actions
    || [];
  let mocked = 0;
  let live = 0;
  for (const a of actions) {
    if (a.mocked || a.simulated) mocked += 1;
    else live += 1;
  }
  if (!actions.length && result.pluginActs?.total) {
    mocked = result.pluginActs.total - (result.pluginActs.signed || 0);
    live = result.pluginActs.signed || 0;
  }
  const defaultMode = process.env.NOEON_ENV === 'production' ? 'policy-governed' : 'mock';
  return {
    default: defaultMode,
    mocked,
    live,
    total: mocked + live,
    allMocked: live === 0
  };
}

function resolveEffectiveCognitionMode(options = {}, result = {}) {
  const llm = resolveLlmConfig(options);
  const evidence = inferEvidenceProvenance(result);
  const kernelLlm = result.llm || result.cognitive?.llm || null;

  if (!llm.enableLlm || llm.mode === 'off') {
    return {
      effective: 'deterministic',
      llmMode: 'off',
      reason: 'llm_disabled',
      evidence
    };
  }

  if (llm.mode === 'mock') {
    return {
      effective: 'mock',
      llmMode: 'mock',
      reason: 'NOEON_LLM_MODE=mock',
      evidence
    };
  }

  if (llm.mode === 'live') {
    if (!llm.configured) {
      return {
        effective: 'mock',
        llmMode: 'live',
        reason: 'live_requested_but_no_api_key',
        evidence
      };
    }
    return {
      effective: evidence.live || kernelLlm?.liveCalls ? 'live' : 'mock',
      llmMode: 'live',
      reason: evidence.live ? 'live_calls_in_evidence' : 'live_mode_no_live_artifacts',
      evidence
    };
  }

  // auto
  if (!llm.configured) {
    return {
      effective: 'mock',
      llmMode: 'auto',
      reason: 'no_api_key_defaults_to_mock',
      evidence
    };
  }

  const effective = evidence.live ? 'live' : 'mock';
  return {
    effective,
    llmMode: 'auto',
    reason: evidence.live ? 'api_key_and_live_artifacts' : 'api_key_but_mock_path',
    evidence
  };
}

function buildRuntimeModeReport(result = {}, ast = null, options = {}) {
  const llm = resolveLlmConfig(options);
  const cognition = resolveEffectiveCognitionMode(options, result);
  const plugins = summarizePluginMode(result);

  return {
    schema: RUNTIME_MODE_SCHEMA,
    cognition: {
      effective: cognition.effective,
      llmMode: cognition.llmMode,
      reason: cognition.reason,
      evidenceProvenance: cognition.evidence
    },
    llm: {
      mode: llm.mode,
      configured: llm.configured,
      enabled: llm.enableLlm,
      env: process.env.NOEON_LLM_MODE || null
    },
    plugins,
    environment: process.env.NOEON_ENV || options.environment || 'development',
    disclaimer: MODE_DISCLAIMER,
    boundaries: {
      mockMeans: 'Simulated LLM reasoning and/or mock plugin I/O — same schemas, deterministic fingerprints.',
      liveMeans: 'Real LLM and/or external plugins when keys, policy, and NOEON_LLM_MODE=live|auto allow.',
      deterministicMeans: 'No LLM bridge; rule-based cognitive handlers only.',
      checkCommand: 'noeon status --json → .runtimeMode or report.runtimeMode on every run'
    },
    profile: result.profile || ast?.profile || null,
    surface: result.profile || ast?.detectedSurface || 'general'
  };
}

function formatRuntimeModeLine(report) {
  if (!report?.cognition) return null;
  const cog = report.cognition.effective;
  const llm = report.llm?.mode || 'auto';
  const plugins = report.plugins?.allMocked !== false ? 'plugins=mock' : 'plugins=mixed';
  const key = report.llm?.configured ? 'key=yes' : 'key=no';
  return `运行时 ${cog} · LLM=${llm} · ${key} · ${plugins}`;
}

function formatRuntimeModeLines(report) {
  const line = formatRuntimeModeLine(report);
  if (!line) return [];
  return [
    line,
    `  ${report.disclaimer}`,
    `  mock: ${report.boundaries?.mockMeans || ''}`,
    `  live: ${report.boundaries?.liveMeans || ''}`
  ];
}

module.exports = {
  RUNTIME_MODE_SCHEMA,
  MODE_DISCLAIMER,
  resolveLlmConfig,
  resolveEffectiveCognitionMode,
  buildRuntimeModeReport,
  formatRuntimeModeLine,
  formatRuntimeModeLines,
  summarizePluginMode
};
