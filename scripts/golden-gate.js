'use strict';

const fs = require('fs');
const path = require('path');
const { runGoldenPath } = require('../src/core/golden-path');
const { runParityConformance } = require('../src/core/canonical-conform');
const { buildExecutionSummary } = require('../src/core/canonical-probes');
const { buildPrCommentMarkdown, enrichProgramsWithPreviews } = require('./golden-gate-pr-comment');

const GATE_SCHEMA = 'noeon.golden.gate/v1';

const AI_PATH_PROGRAMS = [
  { file: 'examples/ai_native_copilot.noeon', minGrade: 'B', expectVerdict: ['golden_ready', 'awaiting_human'] },
  { file: 'examples/ai_native_self_reflect.noeon', minGrade: 'C', expectVerdict: ['golden_ready', 'awaiting_human', 'partial'] },
  { file: 'examples/universal/research_synth.noeon', minGrade: 'B', lensOnly: true, requireUniversal: true, expectVerdict: ['golden_ready', 'partial', 'blocked'] },
  { file: 'examples/universal/code_agent.noeon', minGrade: 'B', lensOnly: true, requireUniversal: true, expectVerdict: ['golden_ready', 'partial', 'blocked'] },
  { file: 'examples/universal/orchestrator.noeon', minGrade: 'B', lensOnly: true, requireUniversal: true, expectVerdict: ['golden_ready', 'partial', 'blocked'], requireMesh: true },
  { file: 'examples/universal/inline_fn.noeon', minGrade: 'C', requireHybrid: true, requireMesh: true, requireLiveMesh: true, expectVerdict: ['golden_ready', 'partial', 'blocked', 'needs_improvement'] },
  { file: 'examples/universal/hybrid_weave.noeon', minGrade: 'C', requireHybrid: true, requireMesh: true, requireLiveMesh: true, expectVerdict: ['golden_ready', 'partial', 'blocked', 'needs_improvement'] }
];

const GRADE_RANK = { A: 5, B: 4, C: 3, D: 2, F: 1 };

function gradeOk(actual, minimum) {
  return (GRADE_RANK[actual] || 0) >= (GRADE_RANK[minimum] || 0);
}

function buildGateExecutionEntry(payload, filePath, root, spec) {
  const run = payload.run || {};
  const execution = {
    strategy: run.executionStrategy || null,
    driver: run.executionDriver || null,
    actDriver: run.actDriver || null,
    snapshotAct: run.snapshotActExecution === true,
    hybrid: run.hybridActExecution === true,
    canonicalPrimary: run.canonicalPrimary === true,
    phases: run.phases || [],
    lensOnly: spec.lensOnly === true
  };

  if (!execution.strategy || (spec.lensOnly && !execution.phases.length)) {
    try {
      const { parseNoeonInput } = require('../src/core/pipeline');
      const { loadProjectConfig } = require('../src/core/config');
      const { resolveExecutionStrategy } = require('../src/core/general-canonical-mode');
      const { ast } = parseNoeonInput(filePath, { filename: filePath });
      const { config } = loadProjectConfig({ cwd: root });
      const strategy = resolveExecutionStrategy(ast, { projectConfig: config });
      execution.strategy = strategy;
      execution.snapshotAct = strategy === 'tool-snapshot-primary';
      execution.hybrid = strategy === 'hybrid-canonical-acts';
      execution.canonicalPrimary = strategy !== 'cognitive-primary';
      execution.inferred = true;
    } catch {
      /* keep run-derived execution */
    }
  }

  Object.assign(execution, buildExecutionSummary({
    executionStrategy: execution.strategy,
    executionDriver: execution.driver,
    actDriver: execution.actDriver,
    hybridActExecution: execution.hybrid,
    snapshotActExecution: execution.snapshotAct,
    canonicalPrimary: execution.canonicalPrimary,
    phases: execution.phases
  }));
  execution.lensOnly = spec.lensOnly === true;

  return execution;
}

async function runGoldenGate(options = {}) {
  const root = options.root || path.join(__dirname, '..');
  const results = [];
  let failed = 0;

  for (const spec of AI_PATH_PROGRAMS) {
    const filePath = path.join(root, spec.file);
    const entry = { file: spec.file, minGrade: spec.minGrade, ok: true, errors: [] };

    if (!fs.existsSync(filePath)) {
      entry.ok = false;
      entry.errors.push('file missing');
      failed += 1;
      results.push(entry);
      continue;
    }

    try {
      const payload = await runGoldenPath(filePath, {
        filename: filePath,
        min_grade: spec.minGrade,
        dream: false,
        with_protocol: 'off',
        lens_only: spec.lensOnly === true,
        human_gate_dir: options.human_gate_dir
      });

      entry.verdict = payload.verdict;
      entry.grade = payload.aiNative?.post?.grade || payload.aiNative?.pre?.grade;
      entry.score = payload.aiNative?.post?.score ?? payload.aiNative?.pre?.score;
      entry.selfImprove = payload.report?.selfImprove?.patches?.length ?? 0;
      entry.selfImprovePayload = payload.report?.selfImprove || null;
      entry.brief = entry.selfImprovePayload?.brief || null;
      entry.patchPreview = payload.patchPreview || payload.report?.patchPreview || null;
      entry.golden = {
        ready: payload.ready,
        verdict: payload.verdict,
        hints: payload.hints
      };
      entry.execution = buildGateExecutionEntry(payload, filePath, root, spec);

      if (!gradeOk(entry.grade, spec.minGrade)) {
        entry.ok = false;
        entry.errors.push(`grade ${entry.grade} below min ${spec.minGrade}`);
      }
      if (spec.expectVerdict && !spec.expectVerdict.includes(payload.verdict)) {
        entry.ok = false;
        entry.errors.push(`verdict ${payload.verdict} not in ${spec.expectVerdict.join('|')}`);
      }
      if (!payload.report?.selfImprove?.schema && !spec.lensOnly) {
        entry.ok = false;
        entry.errors.push('missing selfImprove in report');
      }
      if (spec.requireUniversal) {
        const uni = payload.aiNative?.pre?.universal || payload.report?.aiNative?.universal;
        if (!uni?.ready) {
          entry.ok = false;
          entry.errors.push('universal six-dimension check failed');
        } else {
          entry.universal = { score: uni.score, ready: uni.ready };
        }
      }
      if (spec.requireMesh) {
        const { parseNoeonInput } = require('../src/core/pipeline');
        const { ast } = parseNoeonInput(filePath, { filename: filePath });
        const spawnCount = ast?.social?.spawns?.length || 0;
        const delegCount = ast?.social?.delegations?.length || 0;
        if (spawnCount < 1 || delegCount < 1) {
          entry.ok = false;
          entry.errors.push(`mesh simulation missing spawns=${spawnCount} delegations=${delegCount}`);
        } else {
          entry.mesh = { spawns: spawnCount, delegations: delegCount };
        }
      }
      if (spec.requireHybrid) {
        const { parseNoeonInput } = require('../src/core/pipeline');
        const { ast } = parseNoeonInput(filePath, { filename: filePath });
        const fragments = ast?.general?.universalInline?.length || 0;
        const isHybrid = fragments >= 1 || ast?.profile === 'general' && (ast?.general?.imports || []).includes('std.universal');
        if (!isHybrid && !ast?.universal) {
          entry.ok = false;
          entry.errors.push('hybrid program missing std.universal inline or universal surface');
        } else {
          entry.hybrid = { fragments, surface: ast?.profile, imports: ast?.general?.imports || [] };
        }
      }
      if (spec.requireLiveMesh) {
        const liveMesh = payload.run?.meshRuntime;
        const trace = payload.run?.meshTrace || payload.report?.observability?.mesh_trace;
        if (!liveMesh?.summary?.live && trace?.live !== true) {
          entry.ok = false;
          entry.errors.push('live mesh runtime missing (expected meshRuntime.summary.live)');
        } else {
          entry.liveMesh = {
            completed: liveMesh?.summary?.completed ?? trace?.summary?.completed,
            routed: liveMesh?.summary?.routed,
            timeline: (liveMesh?.timeline || trace?.timeline || []).length
          };
        }
      }
    } catch (e) {
      entry.ok = false;
      entry.errors.push(e.message);
    }

    if (!entry.ok) failed += 1;
    results.push(entry);
  }

  let conform = null;
  let canonicalProbes = null;
  if (options.canonical_probes !== false) {
    try {
      const { runCanonicalProbes } = require('../src/core/canonical-probes');
      canonicalProbes = await runCanonicalProbes({ root, ...options });
      if (!canonicalProbes.ok) failed += 1;
    } catch (e) {
      canonicalProbes = { ok: false, error: e.message, programs: [] };
      failed += 1;
    }
  }

  if (options.conform !== false) {
    try {
      conform = await runParityConformance();
      if (!conform.allValid) failed += 1;
    } catch (e) {
      conform = { allValid: false, error: e.message };
      failed += 1;
    }
  }

  const gatePayload = {
    schema: GATE_SCHEMA,
    generatedAt: new Date().toISOString(),
    ok: failed === 0,
    programs: results,
    canonicalProbes,
    conform,
    summary: {
      passed: results.filter((r) => r.ok).length,
      total: results.length,
      conform: conform?.allValid ?? null,
      canonicalProbes: canonicalProbes?.summary?.passed ?? null
    }
  };

  gatePayload.programs = enrichProgramsWithPreviews(gatePayload, root);
  gatePayload.prComment = buildPrCommentMarkdown(gatePayload);

  return gatePayload;
}

async function main() {
  const payload = await runGoldenGate({
    human_gate_dir: process.env.NOEON_GOLDEN_GATE_DIR || path.join(__dirname, '../artifacts/golden-gate')
  });

  const outDir = path.join(__dirname, '../artifacts/golden-gate');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'golden-gate.latest.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(outDir, 'golden-gate.pr-comment.md'), payload.prComment, 'utf8');

  console.log('\n\x1b[36m═══ Noeon Golden Gate (AI Path) ═══\x1b[0m\n');
  for (const r of payload.programs) {
    const mark = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    const diffLines = r.patchPreview?.diff ? r.patchPreview.diff.split('\n').filter((l) => l.startsWith('+') || l.startsWith('-')).length : 0;
    console.log(`  ${mark} ${r.file} | ${r.grade || '—'} | ${r.verdict || '—'} | patches=${r.selfImprove ?? '—'} | diff=${diffLines}`);
    for (const err of r.errors || []) console.log(`         \x1b[31m${err}\x1b[0m`);
  }
  if (payload.conform) {
    const mark = payload.conform.allValid ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`  ${mark} conform parity`);
  }
  if (payload.canonicalProbes) {
    const mark = payload.canonicalProbes.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    const s = payload.canonicalProbes.summary || {};
    console.log(`  ${mark} canonical probes ${s.passed ?? 0}/${s.total ?? payload.canonicalProbes.programs?.length ?? 0}`);
    for (const p of payload.canonicalProbes.programs || []) {
      if (!p.ok) {
        for (const err of p.errors || []) console.log(`         \x1b[31m${p.file}: ${err}\x1b[0m`);
      }
    }
  }
  console.log(`\n${payload.ok ? '\x1b[32m' : '\x1b[31m'}Golden gate: ${payload.summary.passed}/${payload.summary.total} programs\x1b[0m\n`);
  if (!payload.ok) {
    console.log(`PR comment: ${path.join(outDir, 'golden-gate.pr-comment.md')}\n`);
  }

  process.exit(payload.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runGoldenGate, GATE_SCHEMA, AI_PATH_PROGRAMS };
