'use strict';

const fs = require('fs');
const path = require('path');

function projectPath(...parts) {
  return path.resolve(__dirname, '..', '..', ...parts);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { _readError: error.message };
  }
}

function normalize(status) {
  return String(status || '').toUpperCase();
}

function collectSignals() {
  const pkg = readJson(projectPath('package.json'), { scripts: {} });
  const gate = readJson(projectPath('artifacts', 'release-gate', 'release-gate.latest.json'), null);
  const scorecard = readJson(projectPath('artifacts', 'scorecard.90d.json'), null);
  const quality = readJson(projectPath('artifacts', 'quality.unified.json'), null);
  const selfEval = readJson(projectPath('artifacts', 'ai-self-eval', 'self-eval.latest.json'), null);

  return {
    timestamp: new Date().toISOString(),
    scripts: pkg.scripts || {},
    gate,
    scorecard,
    quality,
    selfEval
  };
}

function scoreReadiness(signals) {
  let score = 45;
  const scripts = signals.scripts;

  if (scripts['gate:all']) score += 10;
  if (scripts['ai:self-eval']) score += 8;
  if (scripts['quality:90d']) score += 8;
  if (scripts['test:canonical']) score += 6;
  if (scripts['test:fusion']) score += 6;

  if (normalize(signals.gate?.decision?.status) === 'PASS') score += 8;
  if (normalize(signals.quality?.gateStatus) === 'HEALTHY') score += 5;
  if (normalize(signals.scorecard?.decision) === 'ESTABLISHED') score += 4;

  return Math.max(0, Math.min(100, score));
}

function buildCognitiveDesignContract() {
  return {
    thesis: 'Noeon is designed as a brain-inspired language where program execution follows cognition loops rather than linear command dispatch.',
    loop: ['perceive', 'attend', 'reason', 'decide', 'act', 'reflect', 'learn'],
    invariants: [
      'Every program must compile into a cognitive IR with explicit intent and constraints.',
      'Runtime must emit observation signals that can be fed back into adaptation and governance.',
      'Self-reflection and remediation paths are first-class capabilities, not external tooling.',
      'Policy and verification must guard every high-impact decision path.'
    ]
  };
}

function buildCreatorCharter() {
  return {
    name: 'Noeon Creator Charter',
    purpose: 'Keep human and AI contributors aligned while Noeon evolves.',
    invariants: [
      'One language, multiple capability entry modes; no parallel language branches.',
      'Every surface must lower through Canonical Semantic IR before runtime execution.',
      'AI autonomy must remain governable through policy, alignment, human gates, and audit trails.',
      'New concepts must ship with executable examples, tests, and a clear capability bucket.',
      'Generated artifacts must stay separate from source so learning does not obscure design intent.'
    ],
    decisionRules: [
      'Reject new syntax unless it maps to an existing capability bucket or has an ADR.',
      'Prefer strengthening canonical semantics over adding another runtime shortcut.',
      'Treat reflection, memory, and evolution as auditable loops, not mystical claims.',
      'Promote features only after they pass core, canonical, fusion, surface, creator, and conformance gates.'
    ]
  };
}

function buildWorkstreams(signals) {
  const decision = normalize(signals.gate?.decision?.status);
  const scorecardDecision = normalize(signals.scorecard?.decision);

  const streamA = {
    id: 'native-semantics',
    title: 'Native Semantics Contract',
    objective: 'Stabilize AI-native semantics as the source of truth across all surfaces.',
    milestones: [
      'Lock Canonical Semantic IR invariants and undefined behavior boundaries',
      'Publish conformance profile for governance precedence and strict unknown handling',
      'Generate compatibility deltas for every release candidate'
    ]
  };

  const streamB = {
    id: 'self-evolving-runtime',
    title: 'Self-Evolving Runtime Loop',
    objective: 'Make runtime outputs automatically feed the improvement cycle.',
    milestones: [
      'Keep release gate + AI self-eval coupled as one decision surface',
      'Emit deterministic remediation actions from gate outcomes',
      'Track improvement trend via scorecard snapshots and audit replay metrics'
    ]
  };

  const streamC = {
    id: 'ecosystem-native-ai',
    title: 'AI-Native Ecosystem Surface',
    objective: 'Turn Noeon from runtime into platform with interoperable AI capabilities.',
    milestones: [
      'Ship package and capability contracts for reusable AI modules',
      'Strengthen MCP/tool integration as first-class language affordance',
      'Expose creator dashboard for architecture + quality + policy in one view'
    ]
  };

  const streamD = {
    id: 'brain-inspired-cognition',
    title: 'Brain-Inspired Cognition Loop',
    objective: 'Keep language design aligned with human-like cognitive loops as a hard architectural requirement.',
    milestones: [
      'Define executable perceive-attend-reason-decide-act-reflect-learn protocol in IR contracts',
      'Add acceptance tests that assert loop completeness on representative programs',
      'Expose loop telemetry in release reports as evidence of cognitive fidelity'
    ]
  };

  const priorityActions = [];
  if (decision !== 'PASS') {
    priorityActions.push('Keep release gate in PASS before enabling aggressive feature expansion.');
  }
  if (scorecardDecision !== 'ESTABLISHED') {
    priorityActions.push('Promote scorecard evidence from pending to established with deterministic sources.');
  }
  if (normalize(signals.selfEval?.verdict) !== 'STRONG') {
    priorityActions.push('Raise AI self-eval verdict to strong by closing top-risk recommendations.');
  }
  if (priorityActions.length === 0) {
    priorityActions.push('Start phase-2 innovation: effect system and AI capability type contracts.');
    priorityActions.push('Implement cognitive-loop acceptance tests to lock brain-inspired behavior.');
  }

  return {
    workstreams: [streamA, streamB, streamC, streamD],
    priorityActions
  };
}

function buildCreatorBlueprint() {
  const signals = collectSignals();
  const readinessScore = scoreReadiness(signals);
  const readinessTier = readinessScore >= 85 ? 'alpha-ready' : readinessScore >= 70 ? 'pilot-ready' : 'build-up';
  const streams = buildWorkstreams(signals);
  const cognitiveDesignContract = buildCognitiveDesignContract();
  const creatorCharter = buildCreatorCharter();

  return {
    schema: 'noeon.ai.creator.blueprint/v1',
    timestamp: signals.timestamp,
    readiness: {
      score: readinessScore,
      tier: readinessTier,
      releaseGate: signals.gate?.decision?.status || 'unknown',
      qualityGate: signals.quality?.gateStatus || 'unknown',
      scorecard: signals.scorecard?.decision || 'unknown',
      selfEval: signals.selfEval?.verdict || 'unknown'
    },
    vision: 'Noeon evolves into an AI-native general programming language grounded in brain-inspired cognition loops, where semantics, governance, adaptation, and interoperability are first-class language concerns.',
    principles: [
      'Brain-inspired cognition loop over linear instruction chaining',
      'Semantics-first over implementation-first',
      'Deterministic evidence over subjective claims',
      'Self-improvement loops over one-shot optimization',
      'Interoperable AI capabilities over closed runtime islands'
    ],
    cognitiveDesignContract,
    creatorCharter,
    ...streams
  };
}

function toMarkdown(blueprint) {
  const lines = [];
  lines.push('# Noeon AI Creator Blueprint');
  lines.push('');
  lines.push(`- Timestamp: ${blueprint.timestamp}`);
  lines.push(`- Readiness Score: ${blueprint.readiness.score}/100`);
  lines.push(`- Tier: **${blueprint.readiness.tier}**`);
  lines.push(`- Release Gate: ${blueprint.readiness.releaseGate}`);
  lines.push(`- Quality Gate: ${blueprint.readiness.qualityGate}`);
  lines.push(`- Scorecard: ${blueprint.readiness.scorecard}`);
  lines.push(`- Self Eval: ${blueprint.readiness.selfEval}`);
  lines.push('');
  lines.push('## Vision');
  lines.push(blueprint.vision);
  lines.push('');
  lines.push('## Principles');
  for (const p of blueprint.principles) lines.push(`- ${p}`);
  if (blueprint.cognitiveDesignContract) {
    lines.push('');
    lines.push('## Cognitive Design Contract');
    lines.push(`- Thesis: ${blueprint.cognitiveDesignContract.thesis}`);
    lines.push(`- Loop: ${(blueprint.cognitiveDesignContract.loop || []).join(' -> ')}`);
    lines.push('- Invariants:');
    for (const inv of blueprint.cognitiveDesignContract.invariants || []) {
      lines.push(`  - ${inv}`);
    }
  }
  if (blueprint.creatorCharter) {
    lines.push('');
    lines.push('## Creator Charter');
    lines.push(blueprint.creatorCharter.purpose);
    lines.push('');
    lines.push('### Invariants');
    for (const item of blueprint.creatorCharter.invariants || []) lines.push(`- ${item}`);
    lines.push('');
    lines.push('### Decision Rules');
    for (const item of blueprint.creatorCharter.decisionRules || []) lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## Workstreams');
  for (const ws of blueprint.workstreams) {
    lines.push('');
    lines.push(`### ${ws.title}`);
    lines.push(`- Objective: ${ws.objective}`);
    lines.push('- Milestones:');
    for (const m of ws.milestones) lines.push(`  - ${m}`);
  }
  lines.push('');
  lines.push('## Priority Actions');
  for (const a of blueprint.priorityActions) lines.push(`- ${a}`);
  lines.push('');
  return lines.join('\n');
}

function writeCreatorBlueprint(blueprint, options = {}) {
  const outDir = options.outDir || projectPath('artifacts', 'ai-creator');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const jsonPath = path.join(outDir, `creator.blueprint.${stamp}.json`);
  const mdPath = path.join(outDir, `creator.blueprint.${stamp}.md`);
  const latestJson = path.join(outDir, 'creator.blueprint.latest.json');
  const latestMd = path.join(outDir, 'creator.blueprint.latest.md');

  const markdown = toMarkdown(blueprint);
  const json = JSON.stringify(blueprint, null, 2);

  fs.writeFileSync(jsonPath, json, 'utf8');
  fs.writeFileSync(mdPath, markdown, 'utf8');
  fs.writeFileSync(latestJson, json, 'utf8');
  fs.writeFileSync(latestMd, markdown, 'utf8');

  return { jsonPath, mdPath, latestJson, latestMd };
}

module.exports = {
  buildCreatorBlueprint,
  buildCreatorCharter,
  buildCognitiveDesignContract,
  writeCreatorBlueprint,
  toMarkdown
};
