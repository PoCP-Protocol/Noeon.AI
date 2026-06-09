'use strict';

/**
 * Golden Path — AI-native end-to-end: evaluate → run → gate → self → verdict.
 */

const fs = require('fs');
const path = require('path');
const { parseNoeonInput } = require('./pipeline');
const { prepareCanonicalExecution } = require('./canonical-runtime');
const { evaluateAiNative } = require('./ai-native-lens');
const { imagineProgram } = require('./ai-imagination');
const { buildSelfExport } = require('./self-introspection');
const { executeProgram } = require('../vm/unified-executor');
const { loadProjectConfig } = require('./config');
const { resolveGeneralCanonical } = require('./general-canonical-mode');

const GOLDEN_SCHEMA = 'noeon.golden.path/v1';
const MIN_GRADE_SCORE = { A: 0.85, B: 0.7, C: 0.55, D: 0.4, F: 0 };

function step(id, status, detail = {}) {
  return { id, status, at: new Date().toISOString(), ...detail };
}

function deriveVerdict(payload) {
  const { aiNativePre, run, awaitingHuman, gradeFloor } = payload;
  if (awaitingHuman) return 'awaiting_human';
  if ((aiNativePre?.score ?? 0) < (MIN_GRADE_SCORE[gradeFloor] ?? 0.7)) return 'needs_improvement';
  if (run?.success && !run?.blocked) return 'golden_ready';
  if (run?.blocked && !awaitingHuman) return 'blocked';
  return 'partial';
}

async function runGoldenPath(input, options = {}) {
  const gradeFloor = options.min_grade || 'B';
  const filename = options.filename || (typeof input === 'string' && fs.existsSync(input) ? path.resolve(input) : 'program.noeon');
  const parsed = parseNoeonInput(input, { filename, source: typeof input === 'string' && input.includes('\n') ? input : undefined });
  const { ast } = parsed;
  const sourceText = typeof input === 'string' && input.includes('\n')
    ? input
    : (fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null);
  const steps = [];

  steps.push(step('parse', 'ok', { surface: ast.noeonStack?.surface || ast.profile }));

  const { config } = loadProjectConfig({ cwd: path.dirname(filename) });
  const generalCanonical = resolveGeneralCanonical(ast, {
    ...options,
    projectConfig: config,
    general_canonical: options.general_canonical
  });
  const runOptions = {
    ...options,
    filename,
    general_canonical: generalCanonical,
    projectConfig: config
  };

  const prep = prepareCanonicalExecution(ast, runOptions);
  steps.push(step('canonical', 'ok', {
    fingerprint: prep.fingerprint,
    executionDriver: prep.executionDriver || null,
    canonicalPrimary: prep.canonicalPrimary === true
  }));

  const aiNativePre = evaluateAiNative(ast, prep, null);
  steps.push(step('ai_evaluate_pre', 'ok', { grade: aiNativePre.grade, score: aiNativePre.score }));

  let run;
  if (options.lens_only || options.evaluate_only) {
    run = {
      success: true,
      blocked: false,
      phases: [],
      report: { aiNative: aiNativePre, selfImprove: null, patchPreview: null },
      awaitingHuman: false,
      humanGate: false
    };
    steps.push(step('run', 'skip', { lens_only: true }));
  } else {
    run = await executeProgram(ast, {
      ...runOptions,
      quiet: true,
      with_protocol: options.with_protocol || 'off',
      source: sourceText || undefined,
      human_gate_dir: options.human_gate_dir
    });

    steps.push(step('run', run.success && !run.blocked ? 'ok' : run.awaitingHuman ? 'gate' : 'fail', {
      success: run.success,
      blocked: run.blocked,
      phases: run.phases,
      executionStrategy: run.executionStrategy || null,
      hybridActExecution: run.hybridActExecution === true
    }));
  }

  const aiNativePost = run.report?.aiNative || evaluateAiNative(ast, prep, run);
  steps.push(step('ai_evaluate_post', 'ok', { grade: aiNativePost.grade, score: aiNativePost.score }));

  const self = buildSelfExport(ast) || run.self || null;
  if (self) steps.push(step('self', 'ok', { goal: self.goal, run: self.run?.success }));

  let dream = null;
  if (options.dream !== false) {
    dream = imagineProgram(ast, prep, run);
    steps.push(step('dream', 'ok', { epoch: dream.epoch, title: dream.imagination.title }));
  }

  const awaitingHuman = run.awaitingHuman === true || run.humanGate === true;
  const verdict = deriveVerdict({ aiNativePre, run, awaitingHuman, gradeFloor });

  return {
    schema: GOLDEN_SCHEMA,
    file: filename,
    verdict,
    ready: verdict === 'golden_ready',
    grade_floor: gradeFloor,
    steps,
    aiNative: { pre: aiNativePre, post: aiNativePost },
    run: {
      success: run.success,
      blocked: run.blocked,
      awaitingHuman,
      humanGate: run.humanGate,
      epistemicGate: run.epistemicGate,
      pendingApproval: run.pendingApproval || null,
      phases: run.phases,
      error: run.error || null,
      executionDriver: run.executionDriver || null,
      actDriver: run.actDriver || null,
      executionStrategy: run.executionStrategy || null,
      snapshotActExecution: run.snapshotActExecution === true,
      hybridActExecution: run.hybridActExecution === true,
      canonicalPrimary: run.canonicalPrimary === true,
      meshRuntime: run.meshRuntime || null,
      meshTrace: run.meshTrace || run.report?.observability?.mesh_trace || null
    },
    self,
    patchPreview: run.selfImprove?.patchPreview || run.report?.patchPreview || null,
    dream,
    report: run.report || null,
    hints: awaitingHuman
      ? [run.pendingApproval?.approve_hint || 'Approve human gate and re-run with --approval-token']
      : verdict === 'needs_improvement'
        ? aiNativePre.suggestions.slice(0, 3).map((s) => s.action)
        : ['Golden Path complete — ship to production with MCP + conform in CI']
  };
}

function formatGoldenPathText(payload) {
  const lines = [
    '',
    '\x1b[36m═══ Noeon Golden Path ═══\x1b[0m',
    '',
    `Verdict: \x1b[1m${payload.verdict}\x1b[0m  |  AI-Native: ${payload.aiNative.pre.grade} → ${payload.aiNative.post.grade}`,
    `Goal: ${payload.self?.goal || payload.report?.intent?.goal || '—'}`,
    ''
  ];

  for (const s of payload.steps) {
    const mark = s.status === 'ok' ? '\x1b[32m✓\x1b[0m' : s.status === 'gate' ? '\x1b[33m⏸\x1b[0m' : '\x1b[31m✗\x1b[0m';
    lines.push(`  ${mark} ${s.id}${s.grade ? ` (${s.grade})` : ''}${s.score != null ? ` ${Math.round(s.score * 100)}%` : ''}`);
  }

  if (payload.run.pendingApproval) {
    lines.push('', '\x1b[33mHuman gate:\x1b[0m', `  ${payload.run.pendingApproval.message}`, `  ${payload.run.pendingApproval.approve_hint}`);
  }

  if (payload.dream?.imagination?.title) {
    lines.push('', '\x1b[1mDream:\x1b[0m', `  ${payload.dream.imagination.title}`);
    for (const p of payload.dream.imagination.priorities.slice(0, 3)) {
      lines.push(`  [${p.priority}] ${p.action}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

module.exports = {
  GOLDEN_SCHEMA,
  runGoldenPath,
  formatGoldenPathText,
  deriveVerdict
};
