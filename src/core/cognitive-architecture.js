'use strict';

/**
 * Cognitive architecture map — functional brain regions → Noeon modules.
 *
 * Not neuron simulation: borrows organizational principles from neuroscience
 * (executive control, memory consolidation, salience gating, cross-hemisphere
 * integration, predictive field) and maps them onto the unified Next-centric stack.
 */

const BRAIN_REGIONS = {
  prefrontal_cortex: {
    id: 'prefrontal_cortex',
    role: 'executive',
    function: 'Goals, governance, planning, decision policy',
    noeon: ['GOAL', 'CONSTITUTION', 'VOW', 'DECIDE', 'POLICY', 'governance'],
    modules: ['core/canonical-governance', 'grammar/agent-block']
  },
  sensory_cortex: {
    id: 'sensory_cortex',
    role: 'perception',
    function: 'Sensory intake and modality binding',
    noeon: ['PERCEIVE', 'OBSERVE', 'SENSE', 'FIELD ingest'],
    modules: ['core/kernel', 'runtime/cognitive']
  },
  association_cortex: {
    id: 'association_cortex',
    role: 'reasoning',
    function: 'Conceptual integration and inference',
    noeon: ['REASON', 'UNDERSTAND', 'INFER', 'PROCESS'],
    modules: ['core/kernel', 'runtime/cognitive/dual-process']
  },
  motor_cortex: {
    id: 'motor_cortex',
    role: 'action',
    function: 'Motor plans and external acts',
    noeon: ['ACT', 'EXECUTE', 'http_call'],
    modules: ['runtime/action-runner', 'runtime/plugins']
  },
  hippocampus: {
    id: 'hippocampus',
    role: 'memory',
    function: 'Episodic encoding and consolidation',
    noeon: ['MEMORY', 'ECHO', 'CONSOLIDATE', 'REMEMBER', 'next_memory'],
    modules: ['runtime/next/field-memory', 'runtime/cognitive/memory-system']
  },
  amygdala: {
    id: 'amygdala',
    role: 'salience',
    function: 'Threat/safety appraisal and emotional weight',
    noeon: ['RISK', 'resonance_floor', 'never', 'POLICY audit'],
    modules: ['runtime/liminal/resonance-gate']
  },
  basal_ganglia: {
    id: 'basal_ganglia',
    role: 'selection',
    function: 'Action selection, habits, go/no-go',
    noeon: ['DECIDE', 'HABITUATE', 'threshold', 'strategy'],
    modules: ['core/kernel', 'runtime/cognitive']
  },
  cerebellum: {
    id: 'cerebellum',
    role: 'correction',
    function: 'Prediction error, refinement, feedback',
    noeon: ['REFLECT', 'FEEDBACK', 'VALIDATE', 'SELF_CHECK'],
    modules: ['core/kernel', 'runtime/cognitive/metacognition']
  },
  thalamus: {
    id: 'thalamus',
    role: 'routing',
    function: 'Attention gate and phase routing',
    noeon: ['FOCUS', 'ATTEND', 'consciousness', 'canonical-route'],
    modules: ['vm/consciousness-scheduler', 'core/canonical-route']
  },
  corpus_callosum: {
    id: 'corpus_callosum',
    role: 'integration',
    function: 'Cross-surface binding (general ↔ next ↔ liminal)',
    noeon: ['FUSE', 'fusion', 'bridge', 'triad'],
    modules: ['runtime/fusion/unified-fusion']
  },
  default_mode_network: {
    id: 'default_mode_network',
    role: 'field',
    function: 'Background world model, dreams, spontaneous simulation',
    noeon: ['FIELD', 'DREAM', 'WEAVE', 'next field', 'epoch'],
    modules: ['runtime/next/field-engine', 'vm/next-phase']
  },
  neuromodulatory: {
    id: 'neuromodulatory',
    role: 'evolution',
    function: 'Plasticity, learning, long-term adaptation',
    noeon: ['EVOLVE', 'LEARN', 'ADAPT', 'FLUX', 'REFLECT depth'],
    modules: ['runtime/next/field-epoch', 'core/kernel']
  }
};

const PRIMITIVE_TO_REGION = {
  perceive: 'sensory_cortex',
  observe: 'sensory_cortex',
  reason: 'association_cortex',
  understand: 'association_cortex',
  process: 'association_cortex',
  decide: 'basal_ganglia',
  act: 'motor_cortex',
  reflect: 'cerebellum',
  feedback: 'cerebellum',
  consolidate: 'hippocampus',
  remember: 'hippocampus',
  memory: 'hippocampus',
  predict: 'default_mode_network',
  focus: 'thalamus',
  attend: 'thalamus',
  adapt: 'neuromodulatory',
  evolve: 'neuromodulatory',
  learn: 'neuromodulatory',
  emotion: 'amygdala',
  risk: 'amygdala'
};

const GOVERNANCE_TIER_TO_REGION = {
  constitution: 'prefrontal_cortex',
  vow: 'prefrontal_cortex',
  ritual: 'thalamus',
  strategy: 'basal_ganglia',
  policy: 'prefrontal_cortex'
};

const {
  PIPELINE_PHASE_TO_REGIONS,
  regionsForPhase,
  buildPipelinePhaseEntries
} = require('../vm/phases');

const COGNITIVE_CYCLE = [
  { phase: 'perceive', region: 'sensory_cortex', primitive: 'PERCEIVE' },
  { phase: 'predict', region: 'default_mode_network', primitive: 'PREDICT' },
  { phase: 'reason', region: 'association_cortex', primitive: 'REASON' },
  { phase: 'decide', region: 'basal_ganglia', primitive: 'DECIDE' },
  { phase: 'act', region: 'motor_cortex', primitive: 'ACT' },
  { phase: 'reflect', region: 'cerebellum', primitive: 'REFLECT' },
  { phase: 'consolidate', region: 'hippocampus', primitive: 'CONSOLIDATE' }
];

function regionForPrimitive(name) {
  const key = String(name || '').toLowerCase();
  return PRIMITIVE_TO_REGION[key] || 'association_cortex';
}

function regionForFlowStep(step) {
  if (!step) return null;
  return regionForPrimitive(step.kind || step);
}

function annotateFlowSteps(steps) {
  return (steps || []).map((step, index) => ({
    index,
    kind: step.kind,
    region: regionForFlowStep(step),
    ...step
  }));
}

function activeRegionsFromAst(ast) {
  const active = new Set(['prefrontal_cortex']);

  if (ast.cognition?.goal || ast.next?.goal || ast.agents?.[0]?.goal) {
    active.add('prefrontal_cortex');
  }
  if (ast.cognitive?.perceptions?.length || ast.next?.fields?.length) {
    active.add('sensory_cortex');
  }
  if (ast.cognitive?.reasonings?.length || ast.cognition?.understandings?.length) {
    active.add('association_cortex');
  }
  if (ast.cognitive?.decisions?.length) active.add('basal_ganglia');
  if (ast.cognition?.acts?.length || ast.next?.acts?.length) active.add('motor_cortex');
  if (ast.cognitive?.reflections?.length) active.add('cerebellum');
  if (ast.cognition?.memory || ast.agents?.[0]?.memory || ast.next?.fieldMemory) {
    active.add('hippocampus');
  }
  if (ast.liminal || ast.alignment || ast.fusion?.some((f) => f.target === 'liminal')) {
    active.add('amygdala');
  }
  if (ast.fusion?.length || ast.fusionTriad?.enabled) active.add('corpus_callosum');
  if (ast.next && Object.keys(ast.next).length > 1) {
    active.add('default_mode_network');
    active.add('neuromodulatory');
  }
  if (ast.evolution?.evolves?.length || ast.next?.evolves?.length) {
    active.add('neuromodulatory');
  }

  for (const agent of ast.agents || []) {
    for (const step of agent.flow || []) {
      active.add(regionForFlowStep(step));
    }
  }

  return [...active];
}

function activeRegionsFromPlan(plan, route) {
  const active = new Set(['prefrontal_cortex', 'thalamus']);

  if (plan?.fusion || plan?.next_field) {
    active.add('corpus_callosum');
    active.add('default_mode_network');
  }
  if (plan?.alignment_gate) active.add('amygdala');
  if (plan?.cognitive !== false) {
    active.add('association_cortex');
    active.add('basal_ganglia');
    active.add('motor_cortex');
  }
  if (plan?.triad) active.add('corpus_callosum');

  for (const phase of route?.fusion_layers || plan?.fusion_layers || []) {
    if (phase === 'next') active.add('default_mode_network');
    if (phase === 'liminal') active.add('amygdala');
    if (phase === 'general') active.add('association_cortex');
  }

  return [...active];
}

function mapGovernanceToRegions(governance) {
  const winner = governance?.winner?.tier;
  const regions = [];
  if (winner && GOVERNANCE_TIER_TO_REGION[winner]) {
    regions.push(GOVERNANCE_TIER_TO_REGION[winner]);
  }
  return regions.length ? regions : ['prefrontal_cortex'];
}

function buildArchitectureMap(ast, extras = {}) {
  const { plan, route, governance, result } = extras;
  const astRegions = activeRegionsFromAst(ast);
  const planRegions = plan ? activeRegionsFromPlan(plan, route) : [];
  const govRegions = governance ? mapGovernanceToRegions(governance) : [];

  const active = [...new Set([...astRegions, ...planRegions, ...govRegions])];

  const agentFlows = (ast.agents || []).map((agent) => ({
    name: agent.name,
    goal: agent.goal,
    steps: annotateFlowSteps(agent.flow)
  }));

  const executedPhases = result?.phases || [];
  const phaseRegions = executedPhases.flatMap((p) => regionsForPhase(p));

  return {
    version: '1.0.0',
    model: 'functional-cognitive-map',
    disclaimer: 'Organizational metaphor — not biological simulation',
    core_field: 'default_mode_network',
    next_binding: 'default_mode_network + neuromodulatory',
    active_regions: active,
    governance_regions: govRegions,
    cognitive_cycle: COGNITIVE_CYCLE,
    agent_flows: agentFlows,
    pipeline_phases: executedPhases.length ? buildPipelinePhaseEntries(executedPhases) : null,
    phase_regions: phaseRegions.length ? [...new Set(phaseRegions)] : null,
    regions: Object.fromEntries(
      active.map((id) => [id, BRAIN_REGIONS[id] || null]).filter(([, v]) => v)
    )
  };
}

function attachArchitecture(ast, extras = {}) {
  const architecture = buildArchitectureMap(ast, extras);
  ast.cognitiveArchitecture = architecture;
  if (ast.noeonStack) {
    ast.noeonStack.architecture = {
      active_regions: architecture.active_regions,
      cognitive_cycle: architecture.cognitive_cycle.map((c) => c.phase),
      core_field: architecture.core_field,
      executive: 'prefrontal_cortex'
    };
  }
  return ast;
}

function sanitizeMermaidLabel(text) {
  return String(text || '')
    .replace(/"/g, "'")
    .replace(/[<>]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 48);
}

function buildArchitectureMermaid(architecture) {
  if (!architecture) return null;

  const lines = ['flowchart LR'];

  const cycle = architecture.cognitive_cycle || [];
  if (cycle.length) {
    lines.push('  subgraph cycle ["Cognitive Cycle"]');
    lines.push('    direction LR');
    for (let i = 0; i < cycle.length; i += 1) {
      const c = cycle[i];
      const nid = `c_${c.phase}`;
      const region = BRAIN_REGIONS[c.region]?.role || c.region || '';
      lines.push(`    ${nid}["${sanitizeMermaidLabel(c.primitive || c.phase)}<br/>${sanitizeMermaidLabel(region)}"]`);
      if (i > 0) lines.push(`    c_${cycle[i - 1].phase} --> ${nid}`);
    }
    lines.push('  end');
  }

  for (let ai = 0; ai < (architecture.agent_flows || []).length; ai += 1) {
    const agent = architecture.agent_flows[ai];
    const sgId = `agent_${ai}`;
    lines.push(`  subgraph ${sgId} ["${sanitizeMermaidLabel(agent.name || 'Agent')}"]`);
    lines.push('    direction LR');
    const steps = agent.steps || [];
    for (let si = 0; si < steps.length; si += 1) {
      const s = steps[si];
      const sid = `${sgId}_s${si}`;
      const role = BRAIN_REGIONS[s.region]?.role || s.region || '';
      lines.push(`    ${sid}["${sanitizeMermaidLabel((s.kind || 'step').toUpperCase())}<br/>${sanitizeMermaidLabel(role)}"]`);
      if (si > 0) lines.push(`    ${sgId}_s${si - 1} --> ${sid}`);
    }
    lines.push('  end');
  }

  const phases = architecture.pipeline_phases || [];
  if (phases.length) {
    lines.push('  subgraph pipe ["Pipeline Phases"]');
    lines.push('    direction LR');
    for (let pi = 0; pi < phases.length; pi += 1) {
      const p = phases[pi];
      const pid = `p_${pi}`;
      const regions = (p.regions || []).map((r) => BRAIN_REGIONS[r]?.role || r).join(', ');
      lines.push(`    ${pid}["${sanitizeMermaidLabel(p.phase)}<br/>${sanitizeMermaidLabel(regions)}"]`);
      if (pi > 0) lines.push(`    p_${pi - 1} --> ${pid}`);
    }
    lines.push('  end');
  }

  return lines.join('\n');
}

function attachExecutionArchitecture(result, ast, extras = {}) {
  const architecture = buildArchitectureMap(ast, {
    plan: extras.plan || result.executionPlan,
    route: extras.route || result.executionRoute,
    governance: extras.governance || result.governanceArbitration,
    result
  });
  result.architecture = architecture;
  attachArchitecture(ast, {
    plan: extras.plan || result.executionPlan,
    route: extras.route || result.executionRoute,
    governance: extras.governance || result.governanceArbitration,
    result
  });
  if (ast.noeonStack) {
    ast.noeonStack.runtime = {
      ...(ast.noeonStack.runtime || {}),
      success: result.success === true,
      phases: result.phases || [],
      blocked: result.blocked === true,
      architecture: {
        active_regions: architecture.active_regions,
        phase_regions: architecture.phase_regions,
        executive: 'prefrontal_cortex'
      }
    };
  }
  return result;
}

function buildRuntimeTraceFromResult(result) {
  if (!result) return null;

  const arch = result.architecture || null;
  const trace = {
    phases: result.phases || [],
    scheduler: result.scheduler || null,
    success: result.success !== false,
    blocked: result.blocked === true,
    vm: result.vm || null,
    consciousness_regions: result.consciousness?.activeRegions || null
  };

  if (arch) {
    trace.architecture = {
      active_regions: arch.active_regions || [],
      phase_regions: arch.phase_regions || [],
      pipeline_phases: arch.pipeline_phases || null,
      core_field: arch.core_field || null,
      executive: 'prefrontal_cortex'
    };
  }

  return trace.phases.length || trace.architecture ? trace : null;
}

module.exports = {
  BRAIN_REGIONS,
  PRIMITIVE_TO_REGION,
  GOVERNANCE_TIER_TO_REGION,
  PIPELINE_PHASE_TO_REGIONS,
  COGNITIVE_CYCLE,
  regionForPrimitive,
  regionForFlowStep,
  annotateFlowSteps,
  activeRegionsFromAst,
  buildArchitectureMap,
  attachArchitecture,
  attachExecutionArchitecture,
  buildArchitectureMermaid,
  buildRuntimeTraceFromResult
};
