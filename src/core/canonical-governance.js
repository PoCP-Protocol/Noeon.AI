'use strict';

const { GOVERNANCE_TIERS } = require('./canonical-ir');

const TIER_RANK = Object.fromEntries(GOVERNANCE_TIERS.map((t, i) => [t, i]));

function collectGovernanceRules(canonical) {
  const g = canonical.governance || {};
  const rules = [];

  for (const c of g.constitutions || []) {
    rules.push({ tier: 'constitution', rule: c, priority: c.priority ?? 1.0 });
  }
  for (const v of g.vows || []) {
    rules.push({ tier: 'vow', rule: v, priority: v.priority ?? 0.95 });
  }
  for (const r of g.rituals || []) {
    rules.push({ tier: 'ritual', rule: r, priority: r.priority ?? 0.85 });
  }
  for (const s of g.strategies || []) {
    rules.push({ tier: 'strategy', rule: s, priority: s.priority ?? 0.75 });
  }
  for (const p of g.policies || []) {
    rules.push({ tier: 'policy', rule: p, priority: p.priority ?? 0.6 });
  }

  for (const rule of canonical.alignment?.covenant ? covenantRules(canonical.alignment) : []) {
    rules.push(rule);
  }

  return rules.sort((a, b) => {
    const ta = TIER_RANK[a.tier] ?? 99;
    const tb = TIER_RANK[b.tier] ?? 99;
    if (ta !== tb) return ta - tb;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}

function covenantRules(alignment) {
  const cov = alignment.covenant;
  if (!cov) return [];
  const rules = [];

  for (const item of cov.never || []) {
    rules.push({
      tier: 'constitution',
      rule: { type: 'forbidden', condition: item, source: 'liminal.covenant' },
      priority: 1.0
    });
  }

  for (const item of cov.humanMustApprove || cov.human_must_approve || []) {
    rules.push({
      tier: 'vow',
      rule: { type: 'human_approval', condition: item, source: 'liminal.covenant' },
      priority: 0.95
    });
  }

  if (cov.resonanceFloor != null || cov.resonance_floor != null) {
    rules.push({
      tier: 'ritual',
      rule: {
        type: 'resonance_floor',
        floor: cov.resonanceFloor ?? cov.resonance_floor,
        source: 'liminal.covenant'
      },
      priority: 0.9
    });
  }

  return rules;
}

function arbitrateGovernance(canonical, options = {}) {
  const rules = collectGovernanceRules(canonical);
  const winner = rules[0] || null;
  const conflicts = [];

  for (let i = 1; i < rules.length; i += 1) {
    if (rules[i].tier !== winner?.tier) {
      conflicts.push({
        higher: winner?.tier,
        lower: rules[i].tier,
        higher_rule: winner?.rule?.type || winner?.rule?.name,
        lower_rule: rules[i].rule?.type || rules[i].rule?.name
      });
    }
  }

  const precedence = GOVERNANCE_TIERS.filter((tier) =>
    rules.some((r) => r.tier === tier)
  );

  const enforcement = evaluateGovernanceEnforcement(rules, options);

  return {
    precedence,
    winner: winner ? { tier: winner.tier, rule: winner.rule } : null,
    rule_count: rules.length,
    conflicts,
    blocked: enforcement.blocked,
    blockReason: enforcement.blockReason,
    model: 'constitution > vow > ritual > strategy > policy'
  };
}

function evaluateGovernanceEnforcement(rules, options = {}) {
  if (options.enforce_governance === false || options.strict_governance !== true) {
    return { blocked: false, blockReason: null };
  }

  for (const entry of rules) {
    if (entry.tier === 'constitution' && entry.rule?.type === 'forbidden') {
      return {
        blocked: true,
        blockReason: `Governance blocked: forbidden — ${entry.rule.condition || 'covenant violation'}`
      };
    }
  }

  return { blocked: false, blockReason: null };
}

function governanceFingerprint(arbitration) {
  return {
    winner_tier: arbitration.winner?.tier || null,
    winner_type: arbitration.winner?.rule?.type || arbitration.winner?.rule?.name || null,
    rule_count: arbitration.rule_count,
    conflict_count: arbitration.conflicts.length,
    precedence: arbitration.precedence
  };
}

module.exports = {
  collectGovernanceRules,
  arbitrateGovernance,
  evaluateGovernanceEnforcement,
  governanceFingerprint,
  covenantRules
};
