'use strict';

/**
 * Unified VM execution phase names and brain-region mapping.
 * Single source for executor phase recording and architecture traces.
 */

const PIPELINE_PHASE_TO_REGIONS = {
  canonical: ['prefrontal_cortex', 'thalamus'],
  triad: ['corpus_callosum', 'prefrontal_cortex'],
  coherence: ['corpus_callosum', 'hippocampus', 'prefrontal_cortex'],
  relay: ['prefrontal_cortex', 'thalamus', 'corpus_callosum'],
  'human-gate': ['prefrontal_cortex', 'amygdala'],
  fusion: ['corpus_callosum', 'default_mode_network'],
  'next-field': ['default_mode_network', 'hippocampus'],
  'liminal-field': ['amygdala', 'corpus_callosum'],
  next: ['default_mode_network', 'neuromodulatory'],
  alignment: ['amygdala', 'prefrontal_cortex'],
  consciousness: ['thalamus', 'association_cortex'],
  cognitive: ['association_cortex', 'basal_ganglia', 'motor_cortex'],
  protocol: ['prefrontal_cortex']
};

const PHASE = {
  CANONICAL: 'canonical',
  TRIAD: 'triad',
  COHERENCE: 'coherence',
  RELAY: 'relay',
  HUMAN_GATE: 'human-gate',
  FUSION: 'fusion',
  NEXT_FIELD: 'next-field',
  LIMINAL_FIELD: 'liminal-field',
  NEXT: 'next',
  ALIGNMENT: 'alignment',
  CONSCIOUSNESS: 'consciousness',
  COGNITIVE: 'cognitive',
  PROTOCOL: 'protocol'
};

const ALL_PIPELINE_PHASES = Object.keys(PIPELINE_PHASE_TO_REGIONS);

function regionsForPhase(phase) {
  return PIPELINE_PHASE_TO_REGIONS[phase] || ['thalamus'];
}

function buildPipelinePhaseEntries(phases) {
  return (phases || []).map((phase) => ({
    phase,
    regions: regionsForPhase(phase)
  }));
}

function recordPhase(result, phase) {
  if (!result.phases) result.phases = [];
  result.phases.push(phase);
  return result;
}

module.exports = {
  PIPELINE_PHASE_TO_REGIONS,
  PHASE,
  ALL_PIPELINE_PHASES,
  regionsForPhase,
  buildPipelinePhaseEntries,
  recordPhase
};
