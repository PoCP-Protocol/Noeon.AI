'use strict';

const { createLegacyAstShell } = require('../lower');

/**
 * Lower Liminal Profile → legacy AST (Cognitive IR via unified pipeline).
 *
 * Covenant  → META rules + cognition.goal + constraints
 * Belief    → cognition.hypotheses + context belief field
 * Resonate  → PERCEIVE + UNDERSTAND + llm.asks (dialogue gate)
 * Hypotheses→ cognition.hypotheses (prior-weighted)
 * Propose   → cognition.acts (approval-gated)
 * Morph     → evolution.evolves + META governance
 */

function covenantToMetaRules(covenant) {
  const rules = [];

  for (const item of covenant.never || []) {
    rules.push({
      type: 'forbidden',
      condition: `action=${item}`,
      action: 'halt',
      priority: 1.0,
      source: 'liminal.covenant'
    });
  }

  for (const item of covenant.humanMustApprove || []) {
    rules.push({
      type: 'human_approval',
      condition: `action=${item}`,
      action: 'require_approve',
      priority: 0.95,
      source: 'liminal.covenant'
    });
  }

  if (covenant.resonanceFloor != null) {
    rules.push({
      type: 'resonance_floor',
      condition: `alignment < ${covenant.resonanceFloor}`,
      action: 'dialogue',
      priority: 0.9,
      source: 'liminal.covenant'
    });
  }

  if (covenant.whenUncertain) {
    rules.push({
      type: 'uncertainty_gate',
      condition: covenant.whenUncertain.condition,
      action: covenant.whenUncertain.actions.join('; '),
      priority: 0.85,
      source: 'liminal.covenant'
    });
  }

  return rules;
}

function beliefToHypothesis(belief) {
  return {
    id: belief.name,
    confidence: belief.confidence,
    type: 'diagnostic',
    claim: belief.claim,
    sources: belief.sources,
    decay: belief.decay,
    dispute: belief.dispute,
    source: 'liminal.belief'
  };
}

function lowerLiminalProgram(liminal) {
  const ast = createLegacyAstShell({
    profile: 'liminal',
    version: liminal.version,
    module: liminal.module,
    entry: liminal.entry
  });

  ast.profile = 'liminal';
  ast.languageProfile = 'liminal';
  ast.language = 'Liminal Symbiotic Language';
  ast.task = liminal.covenant.name;

  ast.liminal = {
    covenant: liminal.covenant,
    beliefs: liminal.beliefs,
    resonates: liminal.resonates,
    hypotheses: liminal.hypotheses,
    proposals: liminal.proposals,
    morphs: liminal.morphs,
    effects: liminal.effects,
    machine: liminal.machine || null
  };

  if (liminal.covenant.intent) {
    ast.cognition.goal = liminal.covenant.intent;
  }

  ast.cognition.constraints = {
    ...ast.cognition.constraints,
    resonance_floor: liminal.covenant.resonanceFloor,
    never: liminal.covenant.never,
    human_must_approve: liminal.covenant.humanMustApprove
  };

  ast.metaRules.push(...covenantToMetaRules(liminal.covenant));

  for (const belief of liminal.beliefs) {
    ast.cognition.hypotheses.push(beliefToHypothesis(belief));
    ast.cognition.context[`belief_${belief.name}`] = belief.claim;
    if (belief.sources?.length) {
      ast.cognition.evidences.push({
        id: `${belief.name}_evidence`,
        supports: belief.name,
        source: String(belief.sources[0]),
        quality: 'medium',
        weight: belief.confidence
      });
    }
  }

  for (const res of liminal.resonates) {
    ast.cognitive.perceptions.push({
      source: res.source,
      modality: 'intent',
      filter: res.target
    });

    ast.cognition.understandings.push({
      source: res.source,
      target: res.target,
      mirror: res.mirror,
      alignment_floor: res.alignmentFloor || liminal.covenant.resonanceFloor,
      method: 'resonance'
    });

    if (res.mirror) {
      ast.llm.asks.push({
        prompt: res.mirror,
        context: `${res.source}->${res.target}`,
        mode: 'alignment_check'
      });
    }

    for (const line of res.dialogue || []) {
      if (/^ask\s+/i.test(line)) {
        ast.llm.asks.push({
          prompt: line.replace(/^ask\s+/i, ''),
          context: 'resonance_dialogue',
          mode: 'dialogue'
        });
      }
    }
  }

  for (const hyp of liminal.hypotheses) {
    for (const item of hyp.items) {
      ast.cognition.hypotheses.push({
        id: `${hyp.name}_${item.id}`,
        confidence: item.prior,
        type: 'predictive',
        label: item.label,
        group: hyp.name,
        source: 'liminal.hypotheses'
      });
    }

    for (const obs of hyp.observe || []) {
      ast.cognitive.perceptions.push({
        source: obs,
        modality: 'evidence',
        filter: hyp.name
      });
    }

    if (hyp.commit) {
      ast.cognitive.decisions.push({
        action: `commit_${hyp.name}`,
        threshold: parseCommitThreshold(hyp.commit),
        strategy: 'posterior',
        options: hyp.items.map((i) => i.label),
        fallback: /ask\s+human/i.test(hyp.commit) ? 'escalate' : 'hold'
      });
    }
  }

  for (const prop of liminal.proposals) {
    ast.cognition.acts.push({
      action: prop.name,
      channel: 'proposal',
      requires: prop.requires,
      on_approve: prop.onApprove?.action,
      on_veto: prop.onVeto?.action,
      plugin: 'human_gate'
    });

    if (prop.onApprove) {
      ast.metaRules.push({
        type: 'proposal_approve',
        condition: `proposal=${prop.name}`,
        action: prop.onApprove.action,
        priority: 0.8,
        source: 'liminal.propose'
      });
    }

    if (prop.onVeto) {
      ast.cognitive.reflections.push({
        target: prop.name,
        criteria: prop.onVeto.action
      });
    }
  }

  for (const morph of liminal.morphs) {
    ast.evolution.evolves.push({
      trigger: morph.when,
      mutation: morph.suggest,
      sandbox: morph.trial || 'sandbox',
      promote: morph.promote,
      require_human_sign: morph.requireHumanSign
    });

    ast.metaRules.push({
      type: 'morph_governance',
      condition: morph.when || 'always',
      action: morph.suggest || 'evolve',
      priority: morph.requireHumanSign ? 0.99 : 0.5,
      source: 'liminal.morph'
    });
  }

  ast.cognitive.drives.push({
    name: liminal.covenant.name,
    goal: liminal.covenant.intent,
    importance: 1.0
  });

  return ast;
}

function parseCommitThreshold(commitStr) {
  const m = commitStr.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0.6;
}

module.exports = {
  lowerLiminalProgram,
  covenantToMetaRules
};
