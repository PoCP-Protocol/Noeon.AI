'use strict';

/**
 * Liminal execution transcript — auditable human-AI co-execution narrative.
 */

function buildTranscript(runResult, ast, options = {}) {
  const liminal = ast?.liminal || {};
  const transcript = {
    version: '0.1',
    program: {
      module: ast?.module || null,
      covenant: liminal.covenant?.name || ast?.task || null,
      intent: liminal.covenant?.intent || ast?.cognition?.goal || null
    },
    timestamp: new Date().toISOString(),
    success: runResult.success === true,
    profile: runResult.profile || ast?.profile || null,
    profileInfo: runResult.profileInfo || null,
    phases: runResult.phases || [],
    alignment: runResult.alignment || null,
    resonance: runResult.resonance || null,
    beliefs: snapshotBeliefs(liminal.beliefs || [], runResult),
    proposals: snapshotProposals(liminal.proposals || [], runResult),
    vetoes: runResult.vetoes || [],
    trace: summarizeTrace(runResult),
    machine_layer: liminal.machine || null
  };

  if (options.include_cognitive_trace && runResult.trace) {
    transcript.cognitive_trace = runResult.trace;
  }

  return transcript;
}

function snapshotBeliefs(beliefs, runResult) {
  const runtime = runResult.beliefs;
  return beliefs.map((b) => ({
    name: b.name,
    claim: b.claim,
    confidence: b.confidence,
    sources: b.sources || [],
    runtime: runtime && typeof runtime === 'object' ? runtime[b.name] : undefined
  }));
}

function snapshotProposals(proposals, runResult) {
  const approved = runResult.approvals || [];
  return proposals.map((p) => ({
    name: p.name,
    requires: p.requires,
    status: approved.includes(p.name) ? 'approved' : 'pending',
    on_approve: p.onApprove?.action || null,
    on_veto: p.onVeto?.action || null
  }));
}

function summarizeTrace(runResult) {
  const items = [];
  if (runResult.resonance?.alignments) {
    for (const a of runResult.resonance.alignments) {
      items.push({
        kind: 'resonance',
        key: a.key,
        alignment: a.alignment,
        pass: a.pass
      });
    }
  }
  if (Array.isArray(runResult.trace)) {
    for (const t of runResult.trace.slice(-20)) {
      items.push({
        kind: 'cognitive',
        phase: t.phase,
        operation: t.operation
      });
    }
  }
  return items;
}

function formatTranscriptMarkdown(transcript) {
  const lines = [
    `# Liminal Transcript`,
    ``,
    `**Covenant:** ${transcript.program.covenant}`,
    `**Intent:** ${transcript.program.intent}`,
    `**Success:** ${transcript.success}`,
    `**Phases:** ${(transcript.phases || []).join(' → ')}`,
    ``
  ];

  if (transcript.resonance) {
    lines.push(`## Resonance`);
    for (const a of transcript.resonance.alignments || []) {
      lines.push(`- \`${a.key}\`: ${a.alignment} / floor ${a.floor} → ${a.pass ? 'PASS' : 'BLOCK'}`);
    }
    if (transcript.resonance.blocked) {
      lines.push(`- **Blocked:** ${transcript.resonance.blockReason}`);
    }
    lines.push('');
  }

  lines.push(`## Beliefs`);
  for (const b of transcript.beliefs || []) {
    lines.push(`- **${b.name}** (${b.confidence}): ${b.claim}`);
  }
  lines.push('');

  lines.push(`## Proposals`);
  for (const p of transcript.proposals || []) {
    lines.push(`- **${p.name}** [${p.status}]: requires ${p.requires}`);
  }

  return lines.join('\n');
}

module.exports = {
  buildTranscript,
  formatTranscriptMarkdown
};
