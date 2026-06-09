'use strict';

const fs = require('fs');
const path = require('path');
const { resolvePluginPolicyFromConfig, buildPluginPolicyStatusSummary, DEFAULT_CONFIG } = require('./config');
const { runDoctor } = require('../doctor');
const { verifyPluginBinding, expectedSignature } = require('../runtime/plugins/integrity');

const PRODUCTION_GATE_SCHEMA = 'noeon.production.gate/v1';
const PRODUCTION_GATE_STATUS_SCHEMA = 'noeon.production.gate.status/v1';

function resolveProductionGateArtifactPath(root = process.cwd()) {
  return path.join(root, 'artifacts', 'production-gate', 'production-gate.latest.json');
}

function readProductionGateArtifact(options = {}) {
  const filePath = options.filePath || resolveProductionGateArtifactPath(options.root);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeProductionGateArtifact(record, options = {}) {
  const root = options.root || process.cwd();
  const filePath = options.filePath || resolveProductionGateArtifactPath(root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  return filePath;
}

function runProductionGate(options = {}) {
  const root = options.root || process.cwd();
  const prevEnv = process.env.NOEON_ENV;
  process.env.NOEON_ENV = 'production';

  try {
    const prodConfig = { ...DEFAULT_CONFIG, environment: 'production' };
    const policy = resolvePluginPolicyFromConfig({}, prodConfig);
    const summary = buildPluginPolicyStatusSummary(prodConfig);
    const report = runDoctor({ file: 'examples/hello.noeon', cwd: root });
    const prodCheck = report.checks.find((c) => c.name === 'plugin_policy_production');
    const execCheck = report.checks.find((c) => c.name === 'execution_path_probes');

    const echoPlugin = { name: 'echo', version: '1.0.0' };
    const signingKey = options.signingKey
      || policy.signingKey
      || process.env.NOEON_PLUGIN_SIGNING_KEY
      || 'noeon-dev-key';
    const signedBinding = {
      plugin: 'echo',
      version: '1.0.0',
      signature: expectedSignature('echo', '1.0.0', signingKey)
    };
    const signedOk = verifyPluginBinding({
      binding: signedBinding,
      plugin: echoPlugin,
      context: { pluginPolicy: policy }
    });
    const unsignedBlocked = verifyPluginBinding({
      binding: { plugin: 'echo', version: '1.0.0' },
      plugin: echoPlugin,
      context: { pluginPolicy: policy }
    });

    let signedDemoOk = true;
    let signedDemoDetail = 'skipped';
    const signedDemoPath = path.join(root, 'examples', 'signed_act_demo.noeon');
    const demoSigningKey = options.demoSigningKey || 'noeon-dev-key';
    if (fs.existsSync(signedDemoPath)) {
      try {
        const { parseProgram } = require('../runtime/unified-runtime');
        const { buildActBinding } = require('../runtime/act-binding');
        const { ast } = parseProgram(signedDemoPath);
        const act = ast?.general?.canonicalIr?.execution?.acts?.find((a) => a.plugin === 'http_call');
        const binding = buildActBinding(act);
        const verified = verifyPluginBinding({
          binding,
          plugin: { name: 'http_call', version: '0.9.0' },
          context: { pluginPolicy: { ...policy, signingKey: demoSigningKey } }
        });
        signedDemoOk = Boolean(act?.signature && verified.ok);
        signedDemoDetail = signedDemoOk
          ? 'signed_act_demo http_call binding verifies'
          : verified.reason || 'signed_act_demo verification failed';
      } catch (error) {
        signedDemoOk = false;
        signedDemoDetail = error.message;
      }
    }

    const checks = [
      {
        name: 'production_require_version',
        ok: policy.requireVersion === true,
        detail: `requireVersion=${policy.requireVersion}`
      },
      {
        name: 'production_require_signature',
        ok: policy.requireSignature === true,
        detail: `requireSignature=${policy.requireSignature}`
      },
      {
        name: 'signed_plugin_probe',
        ok: signedOk.ok === true && unsignedBlocked.ok === false,
        detail: signedOk.ok
          ? 'signed echo binding ok · unsigned rejected'
          : (signedOk.reason || unsignedBlocked.reason || 'probe failed')
      },
      {
        name: 'signed_act_demo',
        ok: signedDemoOk,
        detail: signedDemoDetail
      },
      {
        name: 'plugin_policy_production',
        ok: prodCheck?.ok === true,
        detail: prodCheck?.detail || 'missing check'
      },
      {
        name: 'execution_path_probes',
        ok: execCheck?.ok === true,
        detail: execCheck?.detail || 'missing check'
      }
    ];

    const ok = checks.every((c) => c.ok);

    return {
      schema: PRODUCTION_GATE_SCHEMA,
      ok,
      generatedAt: new Date().toISOString(),
      profile: summary,
      policy,
      checks
    };
  } finally {
    if (prevEnv === undefined) delete process.env.NOEON_ENV;
    else process.env.NOEON_ENV = prevEnv;
  }
}

function summarizeProductionGate(record) {
  if (!record) {
    return {
      available: false,
      ok: null,
      generatedAt: null,
      checks: null
    };
  }

  const checks = record.checks || [];
  return {
    schema: PRODUCTION_GATE_STATUS_SCHEMA,
    available: true,
    ok: record.ok === true,
    generatedAt: record.generatedAt || null,
    checks: {
      total: checks.length,
      passed: checks.filter((c) => c.ok).length,
      failed: checks.filter((c) => !c.ok).map((c) => c.name)
    }
  };
}

function buildProductionGateStatusSummary(options = {}) {
  return summarizeProductionGate(readProductionGateArtifact(options));
}

function formatProductionGateStatusLine(summary) {
  if (!summary?.available) return 'Production gate: — (run npm run gate:production)';
  const checks = summary.checks;
  const checkTxt = checks?.total != null ? ` · checks ${checks.passed}/${checks.total}` : '';
  return `Production gate: ${summary.ok ? 'PASS' : 'FAIL'}${checkTxt}`;
}

module.exports = {
  PRODUCTION_GATE_SCHEMA,
  PRODUCTION_GATE_STATUS_SCHEMA,
  resolveProductionGateArtifactPath,
  readProductionGateArtifact,
  writeProductionGateArtifact,
  runProductionGate,
  summarizeProductionGate,
  buildProductionGateStatusSummary,
  formatProductionGateStatusLine
};
