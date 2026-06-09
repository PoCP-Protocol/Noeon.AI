'use strict';

/**
 * Epoch 3 — Apply SELF-improve patches to source and emit unified diff preview.
 */

const PATCH_PREVIEW_SCHEMA = 'noeon.patch.preview/v1';

function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n');
}

function snippetAlreadyPresent(source, snippet) {
  const adapted = adaptSnippetToSurface(source, snippet);
  const s = String(adapted || snippet || '').trim();
  if (!s) return true;
  const key = s.split('\n')[0].trim();
  if (/require_citation|citation_policy|policy modality=governance/i.test(s) &&
      /require_citation|citation_policy|policy modality=governance/i.test(source)) {
    return true;
  }
  if (/human_must_approve|governance modality=relay/i.test(s) &&
      /human_must_approve|governance modality=relay/i.test(source)) {
    return true;
  }
  if (/tools modality|echo\/echo/i.test(s) && /tools modality|echo\/echo/i.test(source)) {
    return true;
  }
  if (key.length < 4) return source.includes(s);
  return source.includes(key);
}

function insertAfterLine(source, pattern, block, options = {}) {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) {
      if (options.skipIfNextMatches && i + 1 < lines.length && options.skipIfNextMatches.test(lines[i + 1])) {
        return { text: source, changed: false, reason: 'already_present' };
      }
      const indent = options.indent ?? (lines[i].match(/^(\s*)/)?.[1] || '');
      const payload = block.split('\n').map((l) => (l ? indent + l.replace(/^\s+/, '') : l)).join('\n');
      lines.splice(i + 1, 0, payload);
      return { text: lines.join('\n'), changed: true, at: i + 2 };
    }
  }
  return { text: source, changed: false, reason: 'anchor_not_found' };
}

function insertBeforePattern(source, pattern, block) {
  const idx = source.search(pattern);
  if (idx === -1) return { text: source, changed: false, reason: 'anchor_not_found' };
  return {
    text: `${source.slice(0, idx)}${block}\n${source.slice(idx)}`,
    changed: true,
    at: idx
  };
}

function isProgramBlockSource(source) {
  return /program\s+\w+\s*\{/i.test(source);
}

function adaptSnippetToSurface(source, snippet) {
  if (!isProgramBlockSource(source)) return snippet;
  const first = snippet.trim().split('\n')[0].trim();
  if (/^POLICY\b/i.test(first)) {
    return 'observe policy modality=governance source="require_citation audit"';
  }
  if (/^FUSE relay/i.test(first)) {
    return 'observe governance modality=relay source="human_must_approve external_send"';
  }
  if (/^TOOLS\b/i.test(first)) {
    return 'observe tools modality=text source="echo/echo mcp"';
  }
  if (/^GOAL\b/i.test(first)) {
    const goal = first.match(/GOAL\s+"([^"]+)"/i)?.[1];
    return goal ? `objective "${goal}"` : 'objective "Declare measurable goal"';
  }
  if (/^\s+(PERCEIVE|REASON|ACT|DECIDE|REFLECT)\b/i.test(snippet)) {
    return snippet.trim().split('\n').map((l) => l.trim()).join('\n  ');
  }
  return null;
}

function insertInsideProgramBlock(source, block, marker) {
  const closeIdx = source.lastIndexOf('}');
  if (closeIdx <= 0) return { text: source, changed: false, reason: 'no_program_block' };
  const tag = marker ? `\n  # SELF-improve: ${marker}\n  ` : '\n  ';
  const payload = block.split('\n').map((l) => l.trim()).join('\n  ');
  return {
    text: `${source.slice(0, closeIdx)}${tag}${payload}\n${source.slice(closeIdx)}`,
    changed: true,
    at: closeIdx,
    strategy: 'program_block'
  };
}

function appendBlock(source, block, marker) {
  const trimmed = source.replace(/\s+$/, '');
  const tag = marker ? `\n# --- SELF-improve: ${marker} ---\n` : '\n';
  return { text: `${trimmed}${tag}${block}\n`, changed: true, at: 'eof' };
}

function applySinglePatch(source, patch) {
  let snippet = String(patch.snippet || '').trim();
  if (!snippet || snippetAlreadyPresent(source, snippet)) {
    return { text: source, changed: false, patchId: patch.id, reason: 'skip' };
  }

  const adapted = adaptSnippetToSurface(source, snippet);
  if (adapted === null) {
    return { text: source, changed: false, patchId: patch.id, reason: 'incompatible_surface' };
  }
  snippet = adapted;

  const firstLine = snippet.split('\n')[0].trim();

  if (isProgramBlockSource(source) && !/^\s*AGENT\b/i.test(source)) {
    const r = insertInsideProgramBlock(source, snippet, patch.id);
    if (r.changed) return { ...r, patchId: patch.id };
  }

  if (/^GOAL\b|^objective\b/i.test(firstLine)) {
    const r = insertAfterLine(source, /^\s*AGENT\b/i, snippet, { indent: '  ' });
    if (r.changed) return { ...r, patchId: patch.id, strategy: 'after_agent' };
  }

  if (/^POLICY\b/i.test(firstLine)) {
    let r = insertAfterLine(source, /^\s*GOAL\b/i, snippet, { indent: '  ' });
    if (!r.changed) r = insertAfterLine(source, /^\s*AGENT\b/i, snippet, { indent: '  ' });
    if (r.changed) return { ...r, patchId: patch.id, strategy: 'after_goal' };
  }

  if (/^FUSE relay/i.test(firstLine)) {
    const r = insertBeforePattern(source, /^\s*AGENT\b/im, `${snippet}\n\n`);
    if (r.changed) return { ...r, patchId: patch.id, strategy: 'before_agent' };
  }

  if (/^BUDGET\b/i.test(firstLine)) {
    let r = insertAfterLine(source, /^VERSION\b/i, snippet);
    if (!r.changed) r = insertAfterLine(source, /^PROFILE\b/i, snippet);
    if (r.changed) return { ...r, patchId: patch.id, strategy: 'after_header' };
  }

  if (/^\s+(PERCEIVE|REASON|ACT|DECIDE|REFLECT)\b/i.test(snippet)) {
    const r = insertBeforePattern(source, /^\s+REFLECT\b/im, `${snippet}\n`);
    if (r.changed) return { ...r, patchId: patch.id, strategy: 'before_reflect' };
    const flow = insertBeforePattern(source, /^\s+FLOW\s*$/im, `  FLOW\n${snippet}\n`);
    if (flow.changed) return { ...flow, patchId: patch.id, strategy: 'new_flow' };
    const r2 = insertAfterLine(source, /^\s+FLOW\s*$/i, snippet);
    if (r2.changed) return { ...r2, patchId: patch.id, strategy: 'in_flow' };
  }

  if (/^\s+TOOLS\b/i.test(firstLine)) {
    const r = insertAfterLine(source, /^\s*MEMORY\b/i, snippet, { indent: '  ' });
    if (!r.changed) {
      const r2 = insertAfterLine(source, /^\s*GOAL\b/i, snippet, { indent: '  ' });
      if (r2.changed) return { ...r2, patchId: patch.id, strategy: 'after_goal' };
    } else {
      return { ...r, patchId: patch.id, strategy: 'after_memory' };
    }
  }

  const r = appendBlock(source, snippet, patch.id);
  return { ...r, patchId: patch.id, strategy: 'append' };
}

function applyPatchesToSource(source, patches = []) {
  let text = normalizeNewlines(source);
  const applied = [];
  const skipped = [];

  for (const patch of patches) {
    if (!patch?.snippet) {
      skipped.push({ id: patch?.id, reason: 'no_snippet' });
      continue;
    }
    const out = applySinglePatch(text, patch);
    if (out.changed) {
      text = out.text;
      applied.push({
        id: patch.id,
        priority: patch.priority,
        action: patch.action,
        strategy: out.strategy,
        line: out.at
      });
    } else {
      skipped.push({ id: patch.id, reason: out.reason || 'unchanged' });
    }
  }

  return { text, applied, skipped, changed: applied.length > 0 };
}

function buildLineDiff(before, after) {
  const a = normalizeNewlines(before).split('\n');
  const b = normalizeNewlines(after).split('\n');
  const hunks = [];
  const max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) continue;
    if (left !== undefined) hunks.push({ type: 'remove', line: i + 1, text: left });
    if (right !== undefined) hunks.push({ type: 'add', line: i + 1, text: right });
  }

  return hunks;
}

function formatUnifiedDiff(before, after, filename = 'program.noeon') {
  const hunks = buildLineDiff(before, after);
  if (!hunks.length) return '';

  const lines = [`--- a/${filename}`, `+++ b/${filename}`];
  let removeStart = null;
  let addStart = null;

  for (const h of hunks) {
    if (h.type === 'remove') {
      if (removeStart == null) removeStart = h.line;
      lines.push(`-${h.text}`);
    } else {
      if (addStart == null) addStart = h.line;
      lines.push(`+${h.text}`);
    }
  }

  if (removeStart != null || addStart != null) {
    const start = Math.min(removeStart ?? addStart, addStart ?? removeStart);
    lines.splice(2, 0, `@@ -${start},${hunks.filter((x) => x.type === 'remove').length} +${start},${hunks.filter((x) => x.type === 'add').length} @@`);
  }

  return lines.join('\n');
}

function buildPatchPreview(source, selfImprove, options = {}) {
  const before = normalizeNewlines(source);
  const patches = selfImprove?.patches || [];
  const primary = patches.find((p) => p.snippet && p.id !== 'patch_ok') || patches[0];
  const merge = applyPatchesToSource(before, patches);
  const after = merge.text;
  const diff = formatUnifiedDiff(before, after, options.filename || 'program.noeon');

  return {
    schema: PATCH_PREVIEW_SCHEMA,
    changed: merge.changed,
    primaryPatch: primary
      ? { id: primary.id, priority: primary.priority, action: primary.action }
      : null,
    applied: merge.applied,
    skipped: merge.skipped,
    diff,
    suggestedSource: merge.changed ? after : null,
    previewBrief: merge.changed
      ? [
          '# Patch Preview',
          `patches_applied: ${merge.applied.length}`,
          `primary: ${primary?.id || '—'}`,
          '',
          '```diff',
          diff,
          '```'
        ].join('\n')
      : 'No applicable patches — program already contains suggested snippets or patch_ok.'
  };
}

module.exports = {
  PATCH_PREVIEW_SCHEMA,
  applyPatchesToSource,
  applySinglePatch,
  buildLineDiff,
  formatUnifiedDiff,
  buildPatchPreview
};
