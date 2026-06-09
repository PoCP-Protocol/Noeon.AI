'use strict';

/**
 * Epoch 4 — Closed-loop auto-remediation: patch → re-golden → verify grade lift.
 */

const fs = require('fs');
const path = require('path');
const { parseNoeonInput } = require('./pipeline');
const { prepareCanonicalExecution } = require('./canonical-runtime');
const { evaluateAiNative } = require('./ai-native-lens');
const { runPostRunSelfImprove } = require('./self-improve');
const { buildPatchPreview, formatUnifiedDiff } = require('./patch-preview');
const { runGoldenPath } = require('./golden-path');
const { executeProgram } = require('../vm/unified-executor');

const REMEDIATE_SCHEMA = 'noeon.auto.remediate/v1';

const GRADE_RANK = { A: 5, B: 4, C: 3, D: 2, F: 1 };

function gradeRank(grade) {
  return GRADE_RANK[String(grade || 'F').toUpperCase()] || 0;
}

function meetsGradeFloor(grade, floor) {
  return gradeRank(grade) >= gradeRank(floor);
}

function resolveSourceInput(input, options = {}) {
  const filename = options.filename
    || (typeof input === 'string' && !input.includes('\n') && fs.existsSync(input) ? path.resolve(input) : 'program.noeon');

  let source;
  if (options.source) {
    source = options.source;
  } else if (typeof input === 'string' && input.includes('\n')) {
    source = input;
  } else if (fs.existsSync(filename)) {
    source = fs.readFileSync(filename, 'utf8');
  } else if (typeof input === 'string') {
    source = input;
  } else {
    throw new Error('auto-remediate requires file path or source string');
  }

  return { filename, source };
}

async function evaluateSource(source, filename, options = {}) {
  const { ast } = parseNoeonInput(source, { filename, source });
  const prep = prepareCanonicalExecution(ast, { filename, ...options });
  let result = null;
  if (options.run !== false) {
    result = await executeProgram(ast, {
      quiet: true,
      with_protocol: 'off',
      filename,
      source,
      human_gate_dir: options.human_gate_dir
    });
  }
  const lens = result?.report?.aiNative || evaluateAiNative(ast, prep, result);
  const improve = result?.selfImprove
    || runPostRunSelfImprove(ast, prep, result || { success: true }, { source, filename });
  const preview = improve.patchPreview || buildPatchPreview(source, improve, { filename });
  return { ast, prep, result, lens, improve, preview };
}

async function runAutoRemediate(input, options = {}) {
  const minGrade = options.min_grade || options.minGrade || 'B';
  const maxRounds = Number(options.max_rounds ?? options.maxRounds ?? 2);
  const { filename, source: originalSource } = resolveSourceInput(input, options);

  let source = originalSource;
  const rounds = [];
  let lastWritten = null;

  for (let round = 0; round <= maxRounds; round += 1) {
    let golden;
    try {
      golden = await runGoldenPath(source, {
        ...options,
        filename,
        min_grade: minGrade,
        dream: false
      });
    } catch (err) {
      rounds.push({
        round,
        error: err.message,
        verdict: 'parse_error'
      });
      break;
    }

    const grade = golden.aiNative?.post?.grade || golden.aiNative?.pre?.grade;
    const score = golden.aiNative?.post?.score ?? golden.aiNative?.pre?.score;

    rounds.push({
      round,
      grade,
      score,
      verdict: golden.verdict,
      ready: golden.ready,
      patchPreview: golden.patchPreview || null,
      applied: golden.patchPreview?.applied?.length || 0
    });

    if (meetsGradeFloor(grade, minGrade) && golden.ready) {
      break;
    }

    const preview = golden.patchPreview
      || golden.report?.patchPreview
      || (await evaluateSource(source, filename, options)).preview;

    if (!preview?.changed || !preview?.suggestedSource) {
      break;
    }

    if (preview.suggestedSource === source) {
      break;
    }

    if (round >= maxRounds) {
      break;
    }

    source = preview.suggestedSource;
    lastWritten = source;
  }

  const before = rounds[0] || {};
  const after = rounds[rounds.length - 1] || before;
  const scoreDelta = (after.score ?? 0) - (before.score ?? 0);
  const improved = gradeRank(after.grade) > gradeRank(before.grade) || scoreDelta > 0.01;
  const remediated = meetsGradeFloor(after.grade, minGrade);

  let verdict = 'unchanged';
  if (remediated && after.ready) verdict = 'remediated';
  else if (remediated) verdict = 'grade_met';
  else if (improved) verdict = 'partial_improvement';
  else if (rounds.length > 1) verdict = 'attempted';

  return {
    schema: REMEDIATE_SCHEMA,
    file: filename,
    min_grade: minGrade,
    max_rounds: maxRounds,
    rounds,
    before: { grade: before.grade, score: before.score, verdict: before.verdict },
    after: { grade: after.grade, score: after.score, verdict: after.verdict, ready: after.ready },
    score_delta: scoreDelta,
    improved,
    remediated,
    verdict,
    suggestedSource: lastWritten && lastWritten !== originalSource ? lastWritten : null,
    diff: lastWritten && lastWritten !== originalSource
      ? formatUnifiedDiff(originalSource, lastWritten, filename)
      : null,
    hints: remediated
      ? ['Auto-remediation succeeded — review suggestedSource before committing']
      : improved
        ? [`Grade improved ${before.grade}→${after.grade} but below floor ${minGrade} — run again or edit manually`, 'noeon ai patch --apply --verify']
        : ['No applicable patches — use noeon ai dream for guidance']
  };
}

function formatAutoRemediateText(payload) {
  const lines = [
    '',
    '\x1b[36m═══ Noeon Auto-Remediate ═══\x1b[0m',
    '',
    `Verdict: \x1b[1m${payload.verdict}\x1b[0m  |  ${payload.before.grade} (${Math.round((payload.before.score || 0) * 100)}%) → ${payload.after.grade} (${Math.round((payload.after.score || 0) * 100)}%)`,
    `Floor: ${payload.min_grade}  |  Rounds: ${payload.rounds.length}`,
    ''
  ];

  for (const r of payload.rounds) {
    lines.push(`  round ${r.round}: ${r.grade} ${Math.round((r.score || 0) * 100)}% · ${r.verdict} · patches=${r.applied}`);
  }

  if (payload.suggestedSource) {
    lines.push('', '\x1b[1mSuggested source ready\x1b[0m — use --apply to write file');
  }

  for (const h of payload.hints || []) {
    lines.push(`  → ${h}`);
  }

  lines.push('');
  return lines.join('\n');
}

function writeRemediatedSource(payload, outPath, options = {}) {
  if (!payload.suggestedSource) {
    return { written: false, reason: 'no suggestedSource' };
  }
  const target = outPath || options.out || payload.file;
  if (!options.force && options.in_place !== true && target === payload.file) {
    const backup = `${target}.bak`;
    fs.writeFileSync(backup, fs.readFileSync(target, 'utf8'), 'utf8');
  }
  fs.writeFileSync(target, payload.suggestedSource, 'utf8');
  return { written: true, path: target };
}

module.exports = {
  REMEDIATE_SCHEMA,
  gradeRank,
  meetsGradeFloor,
  runAutoRemediate,
  formatAutoRemediateText,
  writeRemediatedSource,
  evaluateSource
};
