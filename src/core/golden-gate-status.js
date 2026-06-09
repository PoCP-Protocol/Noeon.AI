'use strict';

const fs = require('fs');
const path = require('path');
const { listGoldenGateDiffs } = require('./golden-gate-diff');
const { buildReleaseManifest } = require('./release-version');
const { DEFAULT_CANONICAL_PROBE_PROGRAMS } = require('./canonical-probes');

const STUDIO_GOLDEN_SCHEMA = 'noeon.studio.golden-gate/v1';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function summarizeGoldenGateExecution(gate) {
  if (!gate) {
    return {
      available: false,
      ok: null,
      generatedAt: null,
      aiPath: null,
      probes: null,
      conform: null
    };
  }

  const aiPrograms = gate.programs || [];
  const tracked = aiPrograms.filter((p) => p.execution?.strategy);

  return {
    available: true,
    ok: gate.ok,
    generatedAt: gate.generatedAt,
    aiPath: {
      total: aiPrograms.length,
      passed: aiPrograms.filter((p) => p.ok).length,
      tracked: tracked.length,
      hybrid: tracked.filter((p) => p.execution?.hybrid).length,
      snapshotAct: tracked.filter((p) => p.execution?.snapshotAct).length,
      strategies: [...new Set(tracked.map((p) => p.execution.strategy).filter(Boolean))]
    },
    probes: gate.canonicalProbes
      ? {
          ok: gate.canonicalProbes.ok,
          passed: gate.canonicalProbes.summary?.passed ?? null,
          total: gate.canonicalProbes.summary?.total ?? null
        }
      : null,
    conform: gate.conform?.allValid ?? null
  };
}

function buildGoldenGateStatusSummary(options = {}) {
  const root = options.root || process.cwd();
  const gate = readJsonIfExists(path.join(root, 'artifacts/golden-gate/golden-gate.latest.json'));
  return summarizeGoldenGateExecution(gate);
}

function buildGoldenGateStudioStatus(options = {}) {
  const root = options.root || process.cwd();
  const gateDir = path.join(root, 'artifacts/golden-gate');
  const gate = readJsonIfExists(path.join(gateDir, 'golden-gate.latest.json'));
  const remediate = readJsonIfExists(path.join(gateDir, 'remediate.manifest.json'));
  const prComment = fs.existsSync(path.join(gateDir, 'golden-gate.pr-comment.md'))
    ? fs.readFileSync(path.join(gateDir, 'golden-gate.pr-comment.md'), 'utf8')
    : null;

  const programs = (gate?.programs || []).map((p) => ({
    file: p.file,
    ok: p.ok,
    grade: p.grade,
    minGrade: p.minGrade,
    verdict: p.verdict,
    score: p.score,
    patches: p.selfImprove ?? p.selfImprovePayload?.patches?.length ?? 0,
    hasDiff: Boolean(p.patchPreview?.diff),
    execution: p.execution || null,
    remediated: (remediate?.programs || []).find((r) => r.file === p.file) || null
  }));

  const remediatePrograms = (remediate?.programs || []).map((p) => ({
    file: p.file,
    ok: p.ok,
    artifactPath: p.artifactPath,
    staticDelta: p.staticLens?.delta,
    verifyGrade: p.verify?.grade,
    verifyVerdict: p.verify?.verdict,
    verifyReady: p.verify?.ready,
    remediateVerdict: p.remediate?.verdict,
    appliedToWorktree: p.appliedToWorktree === true,
    hasDiff: Boolean(p.diff || p.patchPreview),
    diffPreview: (p.diff || p.patchPreview || '').slice(0, 400) || null
  }));

  return {
    schema: STUDIO_GOLDEN_SCHEMA,
    era: buildReleaseManifest().era,
    generatedAt: new Date().toISOString(),
    canonicalPath: summarizeCanonicalPath(gate, gate?.canonicalProbes),
    canonicalProbes: gate?.canonicalProbes || null,
    canonicalProbePrograms: DEFAULT_CANONICAL_PROBE_PROGRAMS,
    goldenGateExecution: summarizeGoldenGateExecution(gate),
    gate: gate
      ? {
          ok: gate.ok,
          schema: gate.schema,
          generatedAt: gate.generatedAt,
          summary: gate.summary,
          conform: gate.conform?.allValid
        }
      : null,
    remediate: remediate
      ? {
          schema: remediate.schema,
          generatedAt: remediate.generatedAt,
          summary: remediate.summary,
          artifactsDir: remediate.artifactsDir
        }
      : null,
    postRemediateGate: remediate?.postRemediateGate || gate?.postRemediateGate || null,
    programs,
    remediatePrograms,
    diffIndex: listGoldenGateDiffs({ root }),
    prCommentPreview: prComment ? prComment.slice(0, 500) : null,
    hints: buildStudioHints(gate, remediate, { root })
  };
}

function summarizeCanonicalPath(gate, probes) {
  const programs = gate?.programs || [];
  const withExecution = programs.filter((p) => p.execution);
  const probePrograms = probes?.programs || [];
  return {
    tracked: withExecution.length + probePrograms.length,
    snapshotAct: withExecution.filter((p) => p.execution?.snapshotAct).length +
      probePrograms.filter((p) => p.execution?.snapshotAct).length,
    hybrid: withExecution.filter((p) => p.execution?.hybrid).length +
      probePrograms.filter((p) => p.execution?.hybrid).length,
    canonicalPrimary: withExecution.filter((p) => p.execution?.canonicalPrimary).length +
      probePrograms.filter((p) => p.execution?.canonicalPrimary).length,
    probes: {
      ok: probes?.ok ?? null,
      passed: probes?.summary?.passed ?? null,
      total: probes?.summary?.total ?? null
    }
  };
}

function buildStudioHints(gate, remediate, options = {}) {
  const hints = [];
  if (!gate) {
    hints.push('Run `npm run gate:golden` to generate golden gate status.');
    return hints;
  }
  if (!gate.ok) {
    hints.push('Golden gate failed — run `npm run gate:golden:remediate` or use Studio Remediate button.');
  }
  if (remediate?.summary?.improved > 0) {
    hints.push(`${remediate.summary.improved} program(s) auto-remediated — review artifacts/golden-gate/remediated/`);
    if ((remediate.summary.applied || 0) < remediate.summary.improved) {
      hints.push('Use Apply in Studio or `noeon golden apply --all` after reviewing diffs.');
    }
  }
  if (gate.postRemediateGate) {
    hints.push(
      gate.postRemediateGate.ok
        ? 'Post-remediate gate PASS — safe to merge after human review.'
        : 'Post-remediate gate still failing — manual patch required.'
    );
  }
  const pathSummary = summarizeCanonicalPath(gate, gate?.canonicalProbes);
  if (pathSummary.tracked > 0) {
    hints.push(
      `Canonical execution tracked on ${pathSummary.tracked} program(s) — snapshot=${pathSummary.snapshotAct} hybrid=${pathSummary.hybrid}`
    );
  }
  if (gate?.canonicalProbes && gate.canonicalProbes.ok === false) {
    hints.push('Canonical probes failed — run `npm run gate:alpha` or refresh golden gate with live probes.');
  }
  const { buildProductionGateStatusSummary } = require('./production-gate-status');
  const productionGate = buildProductionGateStatusSummary({ root: options.root });
  if (!productionGate.available) {
    hints.push('Run `npm run gate:production` to record signed ACT + plugin policy gate.');
  } else if (!productionGate.ok) {
    hints.push(
      `Production gate FAIL · checks ${productionGate.checks?.passed}/${productionGate.checks?.total} — run npm run gate:production`
    );
  } else if (productionGate.checks?.total) {
    hints.push(`Production gate PASS · checks ${productionGate.checks.passed}/${productionGate.checks.total}`);
  }
  return hints;
}

async function refreshGoldenGateArtifacts(options = {}) {
  const { runGoldenGate } = require('../../scripts/golden-gate');
  const gate = await runGoldenGate({
    root: options.root,
    human_gate_dir: options.human_gate_dir
  });
  const root = options.root || process.cwd();
  const gateDir = path.join(root, 'artifacts/golden-gate');
  fs.mkdirSync(gateDir, { recursive: true });
  fs.writeFileSync(path.join(gateDir, 'golden-gate.latest.json'), JSON.stringify(gate, null, 2));
  return gate;
}

const {
  buildExecutionPathStatusSummary,
  formatExecutionPathStatusLine
} = require('./execution-path-status');

module.exports = {
  STUDIO_GOLDEN_SCHEMA,
  buildGoldenGateStudioStatus,
  buildGoldenGateStatusSummary,
  buildExecutionPathStatusSummary,
  formatExecutionPathStatusLine,
  summarizeGoldenGateExecution,
  refreshGoldenGateArtifacts,
  readJsonIfExists
};
