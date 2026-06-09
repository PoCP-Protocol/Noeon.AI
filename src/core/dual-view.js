'use strict';

/**
 * Declaration ↔ runtime dual view (Weft-inspired alignment).
 * Schema: noeon.dual.view/v1
 */

const DUAL_VIEW_SCHEMA = 'noeon.dual.view/v1';

const RUNTIME_ALIASES = {
  perceive: ['perceive', 'observe', 'attend'],
  understand: ['understand', 'process'],
  reason: ['reason', 'process', 'infer', 'intuit'],
  predict: ['predict'],
  decide: ['decide'],
  act: ['act', 'execute'],
  reflect: ['reflect', 'validate', 'monitor'],
  feedback: ['feedback', 'collaborate', 'learn'],
  attend: ['attend', 'perceive']
};

function summarizeDetail(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const parts = [];
  for (const key of ['action', 'strategy', 'method', 'context', 'source', 'channel', 'target']) {
    if (obj[key] != null) parts.push(String(obj[key]));
  }
  return parts.length ? parts.join(' · ') : null;
}

function extractDeclaredSteps(ast) {
  const steps = [];
  if (!ast) return steps;

  function push(phase, label, detail, source) {
    steps.push({
      id: `${phase}-${steps.length}`,
      phase,
      label,
      detail: detail || null,
      source
    });
  }

  for (const agent of ast.agents || []) {
    for (const step of agent.flow || []) {
      const kind = String(step.kind || step).toLowerCase();
      push(kind, `${agent.name}: ${kind}`, summarizeDetail(step), 'agent.flow');
    }
  }
  if (steps.length) return steps;

  for (const p of ast.cognitive?.perceptions || []) {
    push('perceive', `observe ${p.source || p.modality || 'input'}`, summarizeDetail(p), 'cognitive.perceptions');
  }
  for (const u of ast.cognition?.understandings || []) {
    push('understand', `understand ${u.context || u.method || 'context'}`, summarizeDetail(u), 'cognition.understandings');
  }
  for (const r of ast.cognitive?.reasonings || []) {
    push('reason', `reason ${r.strategy || 'default'}`, summarizeDetail(r), 'cognitive.reasonings');
  }
  for (const d of ast.cognitive?.decisions || []) {
    push('decide', `decide ${d.action || d.strategy || 'action'}`, summarizeDetail(d), 'cognitive.decisions');
  }
  for (const a of ast.cognition?.acts || []) {
    const tail = a.channel ? ` · ${a.channel}` : '';
    push('act', `act ${a.action || a.step || 'action'}${tail}`, summarizeDetail(a), 'cognition.acts');
  }
  for (const f of ast.cognition?.feedback || []) {
    push('feedback', `feedback ${f.source || f.signal || 'signal'}`, summarizeDetail(f), 'cognition.feedback');
  }
  for (const r of ast.cognitive?.reflections || []) {
    push('reflect', `reflect ${r.target || r.criteria || 'outcome'}`, summarizeDetail(r), 'cognitive.reflections');
  }

  if (!steps.length) {
    for (const act of ast.general?.canonicalIr?.execution?.acts || []) {
      push('act', `act ${act.action}`, summarizeDetail(act), 'canonical.execution.acts');
    }
    for (const flow of ast.general?.canonicalIr?.execution?.flow || []) {
      const kind = String(flow.kind || 'step').toLowerCase();
      push(kind, `${kind} ${flow.action || flow.step || ''}`.trim(), summarizeDetail(flow), 'canonical.execution.flow');
    }
  }

  return steps;
}

function extractRuntimeSteps(result = {}, report = null) {
  const steps = [];
  const trace = result.cognitive?.trace || result.trace || [];

  for (const entry of trace) {
    steps.push({
      id: `rt-${steps.length}`,
      phase: entry.phase,
      operation: entry.operation,
      label: `${entry.phase}/${entry.operation}`,
      confidence: entry.result?.confidence ?? null,
      provenance: entry.result?.provenance || entry.result?.llm || null,
      matched: false
    });
  }

  const evidence = report?.cognitiveEvidence?.artifacts || [];
  for (const artifact of evidence) {
    if (artifact.phase !== 'act') continue;
    const label = artifact.decision?.chosen || artifact.outcome || artifact.hypothesis || 'act';
    steps.push({
      id: `act-${steps.length}`,
      phase: 'act',
      operation: 'act',
      label: `act/${label}`,
      confidence: artifact.confidence ?? null,
      provenance: artifact.provenance || null,
      matched: false,
      fromEvidence: true
    });
  }

  return steps;
}

function runtimeMatchesDeclared(declaredPhase, runtimeStep) {
  const aliases = RUNTIME_ALIASES[declaredPhase] || [declaredPhase];
  const op = String(runtimeStep.operation || '').toLowerCase();
  const phase = String(runtimeStep.phase || '').toLowerCase();
  return aliases.includes(op) || aliases.includes(phase);
}

function alignDualView(declared, runtime) {
  const unused = runtime.map((r, i) => ({ ...r, index: i }));
  const rows = [];

  for (const decl of declared) {
    let matchIdx = -1;
    for (let i = 0; i < unused.length; i += 1) {
      if (unused[i].matched) continue;
      if (runtimeMatchesDeclared(decl.phase, unused[i])) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx >= 0) {
      const rt = unused[matchIdx];
      rt.matched = true;
      rows.push({
        declared: decl,
        runtime: {
          label: rt.label,
          phase: rt.phase,
          operation: rt.operation,
          confidence: rt.confidence,
          provenance: rt.provenance
        },
        status: 'matched'
      });
    } else {
      rows.push({
        declared: decl,
        runtime: null,
        status: 'missing'
      });
    }
  }

  for (const rt of unused) {
    if (rt.matched) continue;
    rows.push({
      declared: null,
      runtime: {
        label: rt.label,
        phase: rt.phase,
        operation: rt.operation,
        confidence: rt.confidence,
        provenance: rt.provenance
      },
      status: 'extra'
    });
  }

  const matched = rows.filter((r) => r.status === 'matched').length;
  const declaredCount = declared.length;
  const alignment = declaredCount
    ? Number((matched / declaredCount).toFixed(3))
    : (runtime.length ? 0 : 1);

  return { rows, matched, declaredCount, alignment };
}

function buildDualView(ast, result = {}, report = null) {
  const declared = extractDeclaredSteps(ast);
  const runtime = extractRuntimeSteps(result, report);
  const { rows, matched, declaredCount, alignment } = alignDualView(declared, runtime);

  const effects = report?.effects || null;
  const transcript = report?.transcriptMeta || null;

  return {
    schema: DUAL_VIEW_SCHEMA,
    declaredCount,
    runtimeCount: runtime.length,
    matched,
    alignment,
    complete: declaredCount > 0 && matched === declaredCount,
    rows,
    effects: effects
      ? { runtime: effects.runtime, valid: effects.valid === true, max: effects.max_effect }
      : null,
    replay: transcript
      ? {
          id: transcript.id || null,
          fingerprint: transcript.replay_fingerprint || null
        }
      : null
  };
}

function formatDualViewLines(dualView) {
  if (!dualView?.rows?.length) {
    return ['声明 ↔ 运行：暂无对齐数据（运行后生成）'];
  }

  const lines = [
    `对齐 ${dualView.matched}/${dualView.declaredCount} · 覆盖率 ${Math.round((dualView.alignment || 0) * 100)}%`,
    ''
  ];

  for (const row of dualView.rows) {
    const left = row.declared?.label || '—';
    const right = row.runtime?.label || '—';
    const mark = row.status === 'matched' ? '✓'
      : row.status === 'missing' ? '✗ 未运行'
        : '+ 额外';
    const conf = row.runtime?.confidence != null
      ? ` · ${Math.round(row.runtime.confidence * 100)}%`
      : '';
    lines.push(`${mark}  ${left.padEnd(28).slice(0, 28)}  →  ${right}${conf}`);
  }

  if (dualView.effects?.runtime?.length) {
    lines.push('');
    lines.push(`效应：${dualView.effects.runtime.join(' · ')}${dualView.effects.valid ? '' : ' · 超出声明'}`);
  }
  if (dualView.replay?.fingerprint) {
    lines.push(`重放：${dualView.replay.fingerprint.slice(0, 16)}…`);
  }

  return lines;
}

module.exports = {
  DUAL_VIEW_SCHEMA,
  RUNTIME_ALIASES,
  extractDeclaredSteps,
  extractRuntimeSteps,
  alignDualView,
  buildDualView,
  formatDualViewLines
};
