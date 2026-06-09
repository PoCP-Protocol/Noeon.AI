'use strict';

const fs = require('fs');
const path = require('path');
const { listGoldenGateDiffs } = require('./golden-gate-diff');

const STUDIO_GOLDEN_SCHEMA = 'noeon.studio.golden-gate/v1';

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
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
    generatedAt: new Date().toISOString(),
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
    hints: buildStudioHints(gate, remediate)
  };
}

function buildStudioHints(gate, remediate) {
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

module.exports = {
  STUDIO_GOLDEN_SCHEMA,
  buildGoldenGateStudioStatus,
  refreshGoldenGateArtifacts,
  readJsonIfExists
};
