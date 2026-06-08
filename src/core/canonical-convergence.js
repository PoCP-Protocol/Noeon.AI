'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../parser');
const { lowerToCanonical } = require('./canonical-lower');
const { arbitrateGovernance, governanceFingerprint } = require('./canonical-governance');
const { canonicalSnapshot } = require('./canonical-ir');

const MATRIX_SCHEMA = 'noeon.convergence.matrix/v1';

const TIER_RANK = {
  constitution: 0,
  vow: 1,
  ritual: 2,
  strategy: 3,
  policy: 4
};

const DEFAULT_PARITY = [
  { surface: 'general', file: 'risk_assess.noeon' },
  { surface: 'next', file: 'risk_assess.next' },
  { surface: 'ael', file: 'risk_assess.ael' },
  { surface: 'liminal', file: 'risk_assess.lim' }
];

function normalizeGoal(goal) {
  return String(goal || '').trim().toLowerCase();
}

function capabilityOverlap(a, b) {
  const capsA = a?.capabilities || {};
  const capsB = b?.capabilities || {};
  const keys = new Set([...Object.keys(capsA), ...Object.keys(capsB)]);
  if (!keys.size) return 1;
  let shared = 0;
  for (const k of keys) {
    if (capsA[k] && capsB[k]) shared += 1;
  }
  return shared / keys.size;
}

function governanceTierScore(tierA, tierB) {
  if (!tierA || !tierB) return tierA === tierB ? 1 : 0.4;
  if (tierA === tierB) return 1;
  const diff = Math.abs((TIER_RANK[tierA] ?? 99) - (TIER_RANK[tierB] ?? 99));
  if (diff === 1) return 0.75;
  if (diff === 2) return 0.5;
  return 0.25;
}

function loadSurfaceEntry(filePath, surfaceHint = null) {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parseAel(source, { filename: filePath });
  const canonical = lowerToCanonical(ast, { filename: filePath });
  const governance = arbitrateGovernance(canonical);
  const fingerprint = governanceFingerprint(governance);
  const snapshot = canonicalSnapshot(canonical);

  return {
    file: filePath,
    surface: surfaceHint || canonical.surface || path.basename(filePath),
    canonical,
    snapshot,
    governance,
    fingerprint
  };
}

function pairConvergence(left, right) {
  const goalA = normalizeGoal(left.snapshot.goal);
  const goalB = normalizeGoal(right.snapshot.goal);
  const goalMatch = goalA.length > 0 && goalA === goalB;
  const govScore = governanceTierScore(left.fingerprint.winner_tier, right.fingerprint.winner_tier);
  const capScore = capabilityOverlap(left.canonical, right.canonical);
  const score = Number(
    ((goalMatch ? 0.5 : 0) + govScore * 0.35 + capScore * 0.15).toFixed(4)
  );

  return {
    a: left.surface,
    b: right.surface,
    score,
    goal_match: goalMatch,
    governance_aligned: govScore >= 0.75,
    governance_delta: left.fingerprint.winner_tier === right.fingerprint.winner_tier
      ? 0
      : Math.abs((TIER_RANK[left.fingerprint.winner_tier] ?? 99) -
          (TIER_RANK[right.fingerprint.winner_tier] ?? 99)),
    goals: { a: left.snapshot.goal, b: right.snapshot.goal }
  };
}

function detectDrift(entries, pairs) {
  const drift = [];
  const goals = new Set(entries.map((e) => normalizeGoal(e.snapshot.goal)).filter(Boolean));
  if (goals.size > 1) {
    drift.push({
      type: 'intent_drift',
      surfaces: entries.map((e) => e.surface),
      goals: [...goals]
    });
  }

  for (const pair of pairs) {
    if (pair.score < 0.5) {
      drift.push({
        type: 'semantic_misalignment',
        pair: [pair.a, pair.b],
        score: pair.score,
        reason: !pair.goal_match ? 'goal_mismatch' : 'governance_gap'
      });
    }
  }

  return drift;
}

function computeMatrixCoherence(pairs, entries) {
  const avg = pairs.length
    ? pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length
    : 1;
  const goals = entries.map((e) => normalizeGoal(e.snapshot.goal)).filter(Boolean);
  const unanimous = goals.length > 0 && goals.every((g) => g === goals[0]);
  return {
    score: Number(avg.toFixed(4)),
    unanimous_goal: unanimous,
    pair_count: pairs.length,
    surface_count: entries.length
  };
}

function formatConvergenceMermaid(entries, pairs) {
  const nodes = entries.map((e) => {
    const tier = e.fingerprint.winner_tier || 'none';
    return `  ${e.surface}["${e.surface}<br/>${tier}"]`;
  }).join('\n');

  const edges = pairs.map((p) => {
    const style = p.score >= 0.75 ? '==>' : p.score >= 0.5 ? '-->' : '-.->';
    return `  ${p.a} ${style}|${p.score}| ${p.b}`;
  }).join('\n');

  const styles = entries.map((e) => `  style ${e.surface} fill:#1a2332,stroke:#58a6ff`).join('\n');

  return [
    'flowchart LR',
    nodes,
    edges,
    styles
  ].filter(Boolean).join('\n');
}

function buildConvergenceMatrix(entries) {
  const pairs = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      pairs.push(pairConvergence(entries[i], entries[j]));
    }
  }

  const coherence = computeMatrixCoherence(pairs, entries);
  const drift = detectDrift(entries, pairs);

  return {
    schema: MATRIX_SCHEMA,
    generatedAt: new Date().toISOString(),
    surfaces: entries.map((e) => ({
      surface: e.surface,
      file: e.file,
      goal: e.snapshot.goal,
      governance: e.fingerprint,
      capabilities: e.canonical.capabilities
    })),
    pairs,
    coherence,
    drift,
    aligned: drift.length === 0 && coherence.score >= 0.75,
    mermaid: formatConvergenceMermaid(entries, pairs)
  };
}

function loadConvergenceFromDir(dir, manifest = DEFAULT_PARITY) {
  const entries = [];
  for (const item of manifest) {
    const filePath = path.join(dir, item.file);
    if (!fs.existsSync(filePath)) continue;
    entries.push(loadSurfaceEntry(filePath, item.surface));
  }
  if (!entries.length) {
    throw new Error(`No convergence fixtures found in ${dir}`);
  }
  return buildConvergenceMatrix(entries);
}

function loadConvergenceFromFiles(filePaths) {
  const entries = filePaths.map((fp) => loadSurfaceEntry(path.resolve(fp)));
  return buildConvergenceMatrix(entries);
}

function formatConvergenceText(matrix) {
  const lines = [
    `Semantic Convergence Matrix (${matrix.schema})`,
    `Coherence: ${matrix.coherence.score} | Surfaces: ${matrix.coherence.surface_count} | Aligned: ${matrix.aligned}`,
    ''
  ];

  for (const s of matrix.surfaces) {
    lines.push(`  ${s.surface.padEnd(10)} goal=${JSON.stringify(s.goal)} gov=${s.governance.winner_tier || '—'}`);
  }

  lines.push('', 'Pairs:');
  for (const p of matrix.pairs) {
    lines.push(`  ${p.a} ↔ ${p.b}  score=${p.score}  goal=${p.goal_match ? '✓' : '✗'}`);
  }

  if (matrix.drift.length) {
    lines.push('', 'Drift:');
    for (const d of matrix.drift) {
      lines.push(`  [${d.type}] ${JSON.stringify(d.pair || d.surfaces || d.goals)}`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  MATRIX_SCHEMA,
  DEFAULT_PARITY,
  loadSurfaceEntry,
  buildConvergenceMatrix,
  loadConvergenceFromDir,
  loadConvergenceFromFiles,
  formatConvergenceText,
  pairConvergence,
  computeMatrixCoherence
};
