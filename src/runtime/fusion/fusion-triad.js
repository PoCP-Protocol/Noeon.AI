'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../../parser');
const { runUnifiedFusion, detectFusionPlan } = require('./unified-fusion');
const { recordFusionRun } = require('./fusion-history');
const { buildFusionGraph, formatFusionMermaid } = require('./fusion-graph');

function expandTriadFusionBlocks(cfg = {}) {
  const nextFile = cfg.next || cfg.file || cfg.next_file || 'genesis.next';
  const inject = cfg.inject || ['dominant', 'narrative', 'summary'];
  const injectList = Array.isArray(inject) ? inject : String(inject).split(',').map((s) => s.trim());

  return [
    {
      target: 'next',
      mode: cfg.next_mode || 'field',
      file: nextFile,
      enabled: true,
      inject: injectList,
      from_triad: true
    },
    {
      target: 'liminal',
      mode: cfg.liminal || cfg.liminal_mode || 'observe',
      enabled: true,
      resonance_floor: cfg.resonance_floor ?? 0.55,
      from_triad: true
    },
    {
      target: 'general',
      mode: cfg.general || cfg.general_mode || 'bridge',
      enabled: true,
      relay: cfg.relay !== false,
      from_triad: true
    }
  ];
}

function isTriadFusionBlock(fuse) {
  return fuse?.target === 'triad';
}

function resolveTriadNextFile(hubAst, options = {}) {
  const fromBlock = (hubAst.fusion || []).find((f) => f.target === 'next');
  const file = options.next_file || fromBlock?.file || fromBlock?.path || 'genesis.next';
  if (path.isAbsolute(file)) return file;

  const fromCwd = path.resolve(process.cwd(), file);
  if (fs.existsSync(fromCwd)) return fromCwd;

  if (options.filename) {
    const fromHub = path.resolve(path.dirname(path.resolve(options.filename)), file);
    if (fs.existsSync(fromHub)) return fromHub;
  }

  return fromCwd;
}

function dominantSnapshot(result) {
  return result?.next?.dominant ||
    result?.nextField?.dominant ||
    result?.nextField?.fusions?.find((f) => f.ok)?.next?.dominant ||
    result?.nextField?.fusions?.find((f) => f.ok)?.injected?.dominant ||
    null;
}

function computeTriadCoherence(forward, reverse) {
  const fwdDom = dominantSnapshot(forward);
  const revDom = dominantSnapshot(reverse);
  if (!fwdDom || !revDom) {
    return { score: null, aligned: false, reason: 'missing-dominant' };
  }

  const nameMatch = fwdDom.name === revDom.name;
  const fwdE = typeof fwdDom.energy === 'number' ? fwdDom.energy : 0.5;
  const revE = typeof revDom.energy === 'number' ? revDom.energy : 0.5;
  const energyDelta = Math.abs(fwdE - revE);
  const score = nameMatch
    ? Math.max(0, 1 - energyDelta)
    : Math.max(0, 0.5 - energyDelta);

  return {
    score: Number(score.toFixed(4)),
    aligned: nameMatch && energyDelta < 0.15,
    forward: fwdDom.name,
    reverse: revDom.name,
    energy_delta: Number(energyDelta.toFixed(4)),
    name_match: nameMatch
  };
}

function computeFusionRelay(forward, reverse, options = {}) {
  const threshold = options.relay_threshold ?? 0.12;
  const fwdDom = dominantSnapshot(forward);
  const revDom = dominantSnapshot(reverse);
  if (!fwdDom || !revDom) return { triggered: false };

  const delta = Math.abs((fwdDom.energy ?? 0) - (revDom.energy ?? 0));
  const shifted = fwdDom.name !== revDom.name;

  return {
    triggered: shifted || delta >= threshold,
    threshold,
    delta: Number(delta.toFixed(4)),
    shifted,
    from: fwdDom.name,
    to: revDom.name,
    action: shifted ? 'dominant_shift' : 'energy_pulse'
  };
}

function injectTriadContext(hubAst, triadResult) {
  hubAst.cognition = hubAst.cognition || {};
  hubAst.cognition.context = hubAst.cognition.context || {};

  const coherence = triadResult.coherence;
  const relay = triadResult.relay;

  hubAst.cognition.context.triad_coherence = coherence.score;
  hubAst.cognition.context.triad_aligned = coherence.aligned;
  hubAst.cognition.context.triad_relay = relay.triggered ? relay.action : null;

  if (triadResult.forward?.fusion?.general?.bridge?.artifact?.summary) {
    hubAst.cognition.context.triad_forward_summary = triadResult.forward.fusion.general.bridge.artifact.summary;
  }

  return hubAst.cognition.context;
}

async function runFusionTriad(hubAst, options = {}) {
  const hubPath = options.filename || options.source_path;
  const nextPath = resolveTriadNextFile(hubAst, options);
  const plan = detectFusionPlan(hubAst, { ...options, filename: hubPath });

  if (!fs.existsSync(nextPath)) {
    return {
      triad: true,
      success: false,
      error: 'next-file-not-found',
      next_path: nextPath
    };
  }

  const nextAst = parseAel(fs.readFileSync(nextPath, 'utf8'));

  const forward = await runUnifiedFusion(nextAst, {
    ...options,
    filename: nextPath,
    source_path: nextPath,
    quiet: true,
    with_protocol: 'off'
  });

  if (forward.blocked) {
    return {
      triad: true,
      success: false,
      blocked: true,
      blockReason: forward.blockReason,
      leg: 'forward',
      forward,
      next_path: nextPath
    };
  }

  const reverse = await runUnifiedFusion(hubAst, {
    ...options,
    filename: hubPath,
    source_path: hubPath,
    quiet: true,
    with_protocol: 'off',
    mutate: true
  });

  const coherence = computeTriadCoherence(forward, reverse);
  const relay = computeFusionRelay(forward, reverse, options);
  injectTriadContext(hubAst, { coherence, relay, forward });

  const result = {
    triad: true,
    cross_file: true,
    success: forward.success && reverse.success && !reverse.blocked,
    blocked: reverse.blocked || false,
    blockReason: reverse.blockReason || null,
    profile: 'triad',
    layers: ['next', 'liminal', 'general'],
    phases: [...(forward.phases || []), 'triad-link', ...(reverse.phases || [])],
    plan: plan.plan,
    bidirectional: plan.bidirectional,
    next_path: nextPath,
    hub_path: hubPath,
    forward: {
      profile: forward.profile,
      phases: forward.phases,
      dominant: dominantSnapshot(forward),
      fusion: forward.fusion ? {
        layers: forward.fusion.layers,
        liminal: forward.fusion.liminal?.mode,
        general: forward.fusion.general?.bridge?.artifact?.summary
      } : null
    },
    reverse: {
      profile: reverse.profile,
      phases: reverse.phases,
      dominant: dominantSnapshot(reverse),
      context: hubAst.cognition?.context || null
    },
    coherence,
    relay,
    summary: coherence.aligned
      ? `Triad aligned on ${coherence.forward} (coherence ${coherence.score})`
      : `Triad drift: ${coherence.forward} → ${coherence.reverse} (ΔE ${coherence.energy_delta})`
  };

  if (options.record || options.save) {
    recordFusionRun({
      file: hubPath,
      profile: 'triad',
      layers: result.layers,
      phases: result.phases,
      success: result.success,
      summary: result.summary,
      triad: true,
      coherence: coherence.score,
      relay: relay.triggered
    }, options);
  }

  return result;
}

function buildTriadGraph(triadResult) {
  const graph = {
    title: 'Triad Fusion',
    kind: 'triad',
    nodes: [],
    edges: []
  };

  const add = (id, label, kind) => graph.nodes.push({ id, label, kind });
  const link = (from, to, label) => graph.edges.push({ from, to, label });

  add('hub_general', `Hub: ${path.basename(triadResult.hub_path || 'hub.noeon')}`, 'general');
  add('leg_next', `Next: ${path.basename(triadResult.next_path || 'field.next')}`, 'next');
  add('layer_liminal', 'Liminal observe', 'liminal');
  add('layer_general', 'General bridge', 'general');

  link('hub_general', 'leg_next', 'FUSE next');
  link('hub_general', 'layer_liminal', 'FUSE liminal');
  link('leg_next', 'layer_liminal', 'sidecar/synth');
  link('leg_next', 'layer_general', 'FUSE general');

  const dom = triadResult.forward?.dominant || triadResult.reverse?.dominant;
  if (dom?.name) {
    const domId = `dom_${dom.name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    add(domId, `Dominant: ${dom.name}`, 'dominant');
    link('leg_next', domId, 'field');
    link(domId, 'hub_general', 'inject');
  }

  if (triadResult.coherence?.score != null) {
    add('coherence', `Coherence: ${triadResult.coherence.score}`, 'bridge');
    link('hub_general', 'coherence', triadResult.coherence.aligned ? 'aligned' : 'drift');
  }

  if (triadResult.relay?.triggered) {
    add('relay', `Relay: ${triadResult.relay.action}`, 'resonance_pass');
    link('coherence', 'relay', 'pulse');
  }

  return {
    graph,
    mermaid: formatFusionMermaid(graph)
  };
}

module.exports = {
  expandTriadFusionBlocks,
  isTriadFusionBlock,
  resolveTriadNextFile,
  computeTriadCoherence,
  computeFusionRelay,
  injectTriadContext,
  runFusionTriad,
  buildTriadGraph
};
