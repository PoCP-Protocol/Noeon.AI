'use strict';

const { parseNextProgram } = require('./next-parser');
const { covenantToMetaRules } = require('./liminal/lower');

function parseBudgetValue(raw, lineNo) {
  const m = String(raw || '').match(/^(\d+)\s+msat$/i);
  if (!m) {
    throw new Error(`Line ${lineNo}: CONTRACT budget must be '<int> msat'`);
  }
  return Number(m[1]);
}

function parseVerifyFromConfig(cfg, lineNo) {
  const quorum = cfg.verify_quorum || cfg.quorum;
  const challenge = cfg.verify_challenge || cfg.challenge || cfg.challenge_seconds;
  if (!quorum || !/^\d+\/\d+$/.test(String(quorum))) {
    return null;
  }
  if (!challenge || !/^\d+$/.test(String(challenge))) {
    throw new Error(`Line ${lineNo}: CONTRACT verify requires verify_challenge=<seconds>`);
  }
  const mode = String(cfg.verify_mode || cfg.mode || 'auto').toLowerCase();
  const [numerator, denominator] = String(quorum).split('/').map(Number);
  return {
    quorum: { numerator, denominator },
    challengeSeconds: Number(challenge),
    mode
  };
}

function applyContractBlock(ast, capability) {
  const cfg = capability.cfg || {};
  const lineNo = capability.lineNo || 0;

  if (cfg.task) ast.task = String(cfg.task);
  if (cfg.network) ast.network = String(cfg.network);
  if (cfg.budget != null) ast.budget = parseBudgetValue(cfg.budget, lineNo);
  if (cfg.budget_amount != null) ast.budget = Number(cfg.budget_amount);

  const verify = parseVerifyFromConfig(cfg, lineNo);
  if (verify) ast.verify = verify;

  ast.inlineCapabilities = ast.inlineCapabilities || [];
  ast.inlineCapabilities.push({ kind: 'contract', source: 'inline' });
}

function applyAlignBlock(ast, capability) {
  const program = capability.program || {};
  const covenant = program.covenant;
  if (!covenant) return;

  ast.liminal = ast.liminal || {};
  ast.liminal.covenant = covenant;
  ast.liminal.beliefs = [...(ast.liminal.beliefs || []), ...(program.beliefs || [])];
  ast.liminal.resonates = [...(ast.liminal.resonates || []), ...(program.resonates || [])];

  if (covenant.intent) {
    ast.cognition = ast.cognition || {};
    ast.cognition.goal = ast.cognition.goal || covenant.intent;
  }

  ast.cognition = ast.cognition || {};
  ast.cognition.constraints = {
    ...(ast.cognition.constraints || {}),
    resonance_floor: covenant.resonanceFloor,
    never: covenant.never,
    human_must_approve: covenant.humanMustApprove
  };

  ast.metaRules = ast.metaRules || [];
  ast.metaRules.push(...covenantToMetaRules(covenant));

  for (const belief of program.beliefs || []) {
    ast.cognition.hypotheses = ast.cognition.hypotheses || [];
    ast.cognition.hypotheses.push({
      id: belief.name,
      confidence: belief.confidence,
      type: 'diagnostic',
      claim: belief.claim,
      sources: belief.sources,
      source: 'inline.align.belief'
    });
  }

  ast.inlineCapabilities = ast.inlineCapabilities || [];
  ast.inlineCapabilities.push({ kind: 'align', source: 'inline' });
}

function applyGovernanceBlock(ast, capability) {
  const body = capability.body || [];
  if (!body.length) return;

  const snippet = [
    'profile "next"',
    'version "1.0.0"',
    'program "inline_governance"',
    ...body
  ].join('\n');

  const program = parseNextProgram(snippet, { expandMacros: false });
  ast.next = ast.next || {};

  for (const tier of [
    'constitutions', 'vows', 'rituals', 'fields', 'cells', 'weaves', 'dreams', 'bonds', 'acts', 'reflects', 'evolves'
  ]) {
    if (program[tier]?.length) {
      ast.next[tier] = [...(ast.next[tier] || []), ...program[tier]];
    }
  }

  if (program.goal?.text && !ast.next.goal) {
    ast.next.goal = program.goal;
  }

  ast.inlineCapabilities = ast.inlineCapabilities || [];
  ast.inlineCapabilities.push({ kind: 'governance', source: 'inline' });
}

function applyInlineCapabilities(ast) {
  for (const capability of ast.pendingCapabilities || []) {
    switch (capability.kind) {
      case 'contract':
        applyContractBlock(ast, capability);
        break;
      case 'align':
        applyAlignBlock(ast, capability);
        break;
      case 'governance':
        applyGovernanceBlock(ast, capability);
        break;
      default:
        break;
    }
  }
  delete ast.pendingCapabilities;
  return ast;
}

module.exports = {
  applyInlineCapabilities,
  applyContractBlock,
  applyAlignBlock,
  applyGovernanceBlock,
  parseBudgetValue,
  parseVerifyFromConfig
};
