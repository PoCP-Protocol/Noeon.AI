'use strict';

/**
 * Epoch 5 — CI auto-remediation after Golden Gate failure.
 * Writes patched sources, re-verifies, optional bot branch + PR.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runAutoRemediate, evaluateSource } = require('../src/core/auto-remediate');
const { formatUnifiedDiff } = require('../src/core/patch-preview');
const { runGoldenPath } = require('../src/core/golden-path');
const { readGatePayload, buildPrCommentMarkdown } = require('./golden-gate-pr-comment');
const { AI_PATH_PROGRAMS } = require('./golden-gate');

const REMEDIATE_CI_SCHEMA = 'noeon.golden.remediate/v1';

function git(args, options = {}) {
  return spawnSync('git', args, {
    cwd: options.root,
    encoding: 'utf8',
    env: { ...process.env, ...options.env }
  });
}

function gh(args, options = {}) {
  return spawnSync('gh', args, {
    cwd: options.root,
    encoding: 'utf8',
    env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN, ...options.env },
    stdio: options.inherit ? 'inherit' : 'pipe'
  });
}

async function remediateProgram(spec, root, options = {}) {
  const filePath = path.join(root, spec.file);
  const entry = {
    file: spec.file,
    minGrade: spec.minGrade || spec.min_grade || 'B',
    ok: false,
    errors: []
  };

  if (!fs.existsSync(filePath)) {
    entry.errors.push('file missing');
    return entry;
  }

  try {
    const original = fs.readFileSync(filePath, 'utf8');
    const beforeEval = await evaluateSource(original, filePath, { run: false });

    const remediate = await runAutoRemediate(filePath, {
      filename: filePath,
      min_grade: entry.minGrade,
      max_rounds: options.max_rounds ?? 2,
      human_gate_dir: options.human_gate_dir
    });

    entry.remediate = {
      verdict: remediate.verdict,
      before: remediate.before,
      after: remediate.after,
      score_delta: remediate.score_delta,
      improved: remediate.improved,
      remediated: remediate.remediated
    };

    if (!remediate.suggestedSource) {
      entry.errors.push('no suggestedSource');
      return entry;
    }

    const outDir = options.outDir || path.join(root, 'artifacts/golden-gate/remediated');
    fs.mkdirSync(outDir, { recursive: true });
    const safeName = spec.file.replace(/[/\\]/g, '__');
    const artifactPath = path.join(outDir, safeName);
    fs.writeFileSync(artifactPath, remediate.suggestedSource, 'utf8');
    entry.artifactPath = path.relative(root, artifactPath).replace(/\\/g, '/');

    const afterEval = await evaluateSource(remediate.suggestedSource, filePath, { run: false });
    entry.staticLens = {
      before: beforeEval.lens.score,
      after: afterEval.lens.score,
      delta: afterEval.lens.score - beforeEval.lens.score
    };

    const verify = await runGoldenPath(remediate.suggestedSource, {
      filename: filePath,
      min_grade: entry.minGrade,
      dream: false,
      human_gate_dir: options.human_gate_dir
    });
    entry.verify = {
      grade: verify.aiNative?.post?.grade,
      score: verify.aiNative?.post?.score,
      verdict: verify.verdict,
      ready: verify.ready
    };

    entry.ok = remediate.remediated || verify.ready || entry.staticLens.delta > 0.01;
    entry.suggestedSource = remediate.suggestedSource;
    entry.patchPreview = remediate.rounds?.[remediate.rounds.length - 1]?.patchPreview?.diff || null;
    entry.diff = remediate.diff || formatUnifiedDiff(original, remediate.suggestedSource, spec.file);

    if (options.applyToWorktree) {
      fs.writeFileSync(filePath, remediate.suggestedSource, 'utf8');
      entry.appliedToWorktree = true;
    }
  } catch (e) {
    entry.errors.push(e.message);
  }

  return entry;
}

async function runGoldenGateRemediate(options = {}) {
  const root = options.root || path.join(__dirname, '..');
  const gate = options.gatePayload || readGatePayload(path.join(root, 'artifacts/golden-gate/golden-gate.latest.json'));

  let targets = AI_PATH_PROGRAMS.map((s) => ({ ...s }));

  if (options.forceFiles?.length) {
    targets = options.forceFiles.map((f) => ({
      file: f,
      minGrade: options.min_grade || 'B'
    }));
  } else if (gate && !options.forceAll) {
    const failed = new Set((gate.programs || []).filter((p) => !p.ok).map((p) => p.file));
    if (failed.size > 0) {
      targets = targets.filter((t) => failed.has(t.file));
    } else if (!gate.ok) {
      targets = AI_PATH_PROGRAMS.map((s) => ({ ...s }));
    } else {
      return {
        schema: REMEDIATE_CI_SCHEMA,
        skipped: true,
        reason: 'golden gate passed — nothing to remediate',
        programs: [],
        summary: { attempted: 0, improved: 0, applied: 0 }
      };
    }
  }

  const outDir = path.join(root, 'artifacts/golden-gate/remediated');
  const programs = [];
  for (const spec of targets) {
    programs.push(await remediateProgram(spec, root, {
      ...options,
      outDir,
      applyToWorktree: options.applyToWorktree === true
    }));
  }

  const improved = programs.filter((p) => p.ok && p.suggestedSource);
  const payload = {
    schema: REMEDIATE_CI_SCHEMA,
    generatedAt: new Date().toISOString(),
    gateOk: gate?.ok ?? null,
    skipped: false,
    programs,
    summary: {
      attempted: programs.length,
      improved: improved.length,
      applied: programs.filter((p) => p.appliedToWorktree).length
    },
    artifactsDir: 'artifacts/golden-gate/remediated'
  };

  fs.mkdirSync(path.join(root, 'artifacts/golden-gate'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'artifacts/golden-gate/remediate.manifest.json'),
    JSON.stringify(payload, null, 2)
  );

  return payload;
}

function buildRemediatePrBody(payload) {
  const lines = [
    '## Noeon Auto-Remediate (Golden Gate)',
    '',
    'This PR was opened by the **Epoch 5–6** remediation bot after Golden Gate failure.',
    '',
    `Programs improved: **${payload.summary.improved}/${payload.summary.attempted}**`,
    ''
  ];

  for (const p of payload.programs) {
    lines.push(`### \`${p.file}\``);
    if (p.remediate) {
      lines.push(`- Lens: ${p.remediate.before?.grade} → ${p.remediate.after?.grade}`);
      lines.push(`- Verify: ${p.verify?.verdict || '—'} (${p.verify?.grade || '—'})`);
    }
    if (p.staticLens) {
      lines.push(`- Static score: ${p.staticLens.before?.toFixed(3)} → ${p.staticLens.after?.toFixed(3)}`);
    }
    if (p.artifactPath) lines.push(`- Artifact: \`${p.artifactPath}\``);
    lines.push('');
  }

  lines.push('---');
  lines.push('*Review AI-native patches before merge. Re-run `npm run gate:golden` locally.*');
  if (payload.postRemediateGate) {
    lines.push('');
    lines.push(`**Post-remediate gate:** ${payload.postRemediateGate.ok ? 'PASS ✓' : 'FAIL ✗'} (${payload.postRemediateGate.summary?.passed}/${payload.postRemediateGate.summary?.total})`);
  }
  return lines.join('\n');
}

function buildPostVerifyComment(verify, prUrl) {
  const mark = verify.ok ? '✅ PASS' : '❌ FAIL';
  const lines = [
    '<!-- noeon-golden-gate-verify -->',
    `## Golden Gate Re-Verify ${mark}`,
    '',
    `After auto-remediate: **${verify.summary?.passed}/${verify.summary?.total}** programs passed.`,
    ''
  ];
  for (const p of verify.programs || []) {
    lines.push(`- ${p.ok ? '✓' : '✗'} \`${p.file}\` grade **${p.grade || '—'}**`);
  }
  lines.push('', verify.ok ? 'Ready for human review and merge.' : 'Further manual fixes required.');
  return lines.join('\n');
}

function commentOnPullRequest(prUrl, body, options = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token || !prUrl) return { posted: false, reason: 'missing token or pr url' };

  const tmpPath = path.join(options.root || path.join(__dirname, '..'), 'artifacts/golden-gate/.verify-comment.txt');
  fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
  fs.writeFileSync(tmpPath, body, 'utf8');

  const marker = '<!-- noeon-golden-gate-verify -->';
  const prNumber = String(prUrl).match(/(\d+)\s*$/)?.[1] || String(prUrl).match(/pull\/(\d+)/)?.[1];
  if (!prNumber) return { posted: false, reason: 'could not parse PR number' };

  const env = { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token };
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return { posted: false, reason: 'missing GITHUB_REPOSITORY' };

  const list = gh(['api', `repos/${repo}/issues/${prNumber}/comments`, '--jq', '.[].id'], { root: options.root, env });
  if (list.status === 0 && list.stdout) {
    for (const id of list.stdout.trim().split('\n').filter(Boolean).slice(-30)) {
      const detail = gh(['api', `repos/${repo}/issues/comments/${id}`, '--jq', '.body'], { root: options.root, env });
      if (detail.stdout?.includes(marker)) {
        const upd = gh(['api', '-X', 'PATCH', `repos/${repo}/issues/comments/${id}`, '-F', `body@${tmpPath}`], { root: options.root, env });
        return { posted: upd.status === 0, updated: true, commentId: id };
      }
    }
  }

  const create = gh(['pr', 'comment', prNumber, '--body-file', tmpPath], { root: options.root, env, inherit: true });
  return { posted: create.status === 0, updated: false };
}

async function postRemediateVerify(root) {
  const { runGoldenGate } = require('./golden-gate');
  const gate = await runGoldenGate({ root, conform: true });
  const out = {
    ok: gate.ok,
    generatedAt: new Date().toISOString(),
    summary: gate.summary,
    programs: (gate.programs || []).map((p) => ({
      file: p.file,
      ok: p.ok,
      grade: p.grade,
      verdict: p.verdict
    }))
  };

  const gateDir = path.join(root, 'artifacts/golden-gate');
  fs.mkdirSync(gateDir, { recursive: true });

  const manifestPath = path.join(gateDir, 'remediate.manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.postRemediateGate = out;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  const gatePath = path.join(gateDir, 'golden-gate.latest.json');
  const existing = fs.existsSync(gatePath) ? JSON.parse(fs.readFileSync(gatePath, 'utf8')) : gate;
  existing.postRemediateGate = out;
  fs.writeFileSync(gatePath, JSON.stringify(existing, null, 2));

  return out;
}

async function openRemediatePullRequest(payload, options = {}) {
  const root = options.root || path.join(__dirname, '..');
  const improved = payload.programs.filter((p) => p.ok && p.suggestedSource);

  if (!improved.length) {
    return { opened: false, reason: 'no improved programs' };
  }

  if (!process.env.GITHUB_TOKEN && !process.env.GH_TOKEN) {
    return { opened: false, reason: 'missing GITHUB_TOKEN' };
  }

  const branch = options.branch || `noeon/remediate-${Date.now()}`;
  const base = options.base || process.env.GITHUB_BASE_REF || 'main';

  const status = git(['status', '--porcelain'], { root });
  if (status.stdout?.trim() && !options.allowDirty) {
    return { opened: false, reason: 'working tree not clean — use --apply first in dedicated job' };
  }

  git(['checkout', '-b', branch], { root });

  for (const p of improved) {
    const target = path.join(root, p.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, p.suggestedSource, 'utf8');
    git(['add', p.file], { root });
  }

  const commit = git(['commit', '-m', 'noeon: auto-remediate golden gate AI-native patches'], { root });
  if (commit.status !== 0) {
    return { opened: false, reason: commit.stderr || 'commit failed' };
  }

  const push = gh(['push', '-u', 'origin', branch], { root, inherit: true });
  if (push.status !== 0) {
    return { opened: false, reason: 'push failed' };
  }

  const body = buildRemediatePrBody(payload);
  const create = gh([
    'pr', 'create',
    '--base', base,
    '--head', branch,
    '--title', 'noeon: auto-remediate golden gate failures',
    '--body', body
  ], { root });

  const url = create.stdout?.trim();
  const result = { opened: create.status === 0, branch, url: url || null, reason: create.stderr || null };

  if (options.verify && result.opened) {
    result.postRemediateGate = await postRemediateVerify(root);
    payload.postRemediateGate = result.postRemediateGate;
    const comment = buildPostVerifyComment(result.postRemediateGate, result.url);
    result.verifyComment = commentOnPullRequest(result.url, comment, { root });
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const openPr = args.includes('--open-pr');
  const apply = args.includes('--apply');
  const forceAll = args.includes('--force-all');
  const forceHello = args.includes('--force-hello');

  const root = path.join(__dirname, '..');
  const payload = await runGoldenGateRemediate({
    root,
    applyToWorktree: apply,
    forceAll,
    forceFiles: forceHello ? ['examples/hello.noeon'] : undefined,
    max_rounds: 2
  });

  console.log('\n\x1b[36m═══ Golden Gate Auto-Remediate (CI) ═══\x1b[0m\n');

  if (payload.skipped) {
    console.log(payload.reason);
    process.exit(0);
  }

  for (const p of payload.programs) {
    const mark = p.ok ? '\x1b[32mOK\x1b[0m' : '\x1b[31mSKIP\x1b[0m';
    console.log(`  ${mark} ${p.file} | verify=${p.verify?.verdict || '—'} | static Δ=${p.staticLens?.delta?.toFixed(3) ?? '—'}`);
    for (const err of p.errors || []) console.log(`         \x1b[31m${err}\x1b[0m`);
  }

  console.log(`\nImproved: ${payload.summary.improved}/${payload.summary.attempted}`);
  console.log(`Manifest: artifacts/golden-gate/remediate.manifest.json\n`);

  if (openPr) {
    const pr = await openRemediatePullRequest(payload, { root, allowDirty: apply, verify: args.includes('--verify-pr') });
    console.log('PR result:', JSON.stringify(pr, null, 2));
    if (pr.url) console.log(`\n${pr.url}\n`);
  }

  process.exit(payload.summary.improved > 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  REMEDIATE_CI_SCHEMA,
  runGoldenGateRemediate,
  remediateProgram,
  openRemediatePullRequest,
  buildRemediatePrBody,
  postRemediateVerify,
  buildPostVerifyComment,
  commentOnPullRequest
};
