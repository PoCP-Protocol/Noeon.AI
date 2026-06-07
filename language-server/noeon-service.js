'use strict';

const path = require('path');
const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');

const KEYWORDS = [
  'PROFILE', 'MODULE', 'VERSION', 'NETWORK', 'PROGRAM', 'TASK', 'OBJECTIVE', 'GOAL',
  'CONTEXT', 'BUDGET', 'DEADLINE', 'VERIFY',
  'PERCEIVE', 'ATTEND', 'PREDICT', 'INTUIT', 'REASON', 'DECIDE', 'REFLECT',
  'OBSERVE', 'UNDERSTAND', 'ACT', 'FEEDBACK',
  'CONSOLIDATE', 'KNOW', 'MONITOR', 'ADAPT', 'DRIVE_CMD', 'WORKSPACE', 'EMOTION',
  'FOCUS', 'META_RULE', 'META_PROFILE', 'COMPUTE', 'FLOW', 'PLUGIN', 'ON_SUCCESS', 'ON_SLASH',
  'SOLVER_COLLATERAL', 'VERIFIER_COLLATERAL', 'PLAN', 'ACTION', 'LEARN', 'MEMORY', 'RISK',
  'STREAM', 'THINK_UNTIL', 'WHEN_CONFIDENT', 'DEBATE', 'EVOLVE', 'MUTATE', 'SYNTHESIZE'
];

const HOVER_DOCS = {
  PERCEIVE: 'Gather sensory input from a source/modality.',
  REASON: 'System 2 analytical processing (strategy, depth).',
  INTUIT: 'System 1 fast pattern matching.',
  PREDICT: 'Generate anticipatory model before perception.',
  DECIDE: 'Choose action based on confidence threshold.',
  REFLECT: 'Metacognitive self-check on reasoning quality.',
  VERIFY: 'Contract verification criteria (protocol layer).',
  META_RULE: 'Governance rule enforced at runtime.',
  COMPUTE: 'Deterministic compute block with CALL receipts.',
  TASK: 'Primary intent / goal identifier for the program.',
  PROGRAM: 'General-profile program identity.',
  OBJECTIVE: 'Human-level goal the program is trying to satisfy.',
  CONTEXT: 'Structured situation or domain context.',
  UNDERSTAND: 'Semantic/contextual understanding step before reasoning.',
  ACT: 'Action boundary for tool, runtime, or human-visible effects.',
  FEEDBACK: 'Measured result signal used for learning.'
};

function validateSource(source) {
  const diagnostics = [];
  try {
    const ast = parseAel(source);
    const result = validateAel(ast);
    for (const err of result.errors || []) {
      const lineMatch = String(err).match(/Line (\d+)/i);
      diagnostics.push({
        line: lineMatch ? Number(lineMatch[1]) : 1,
        message: String(err),
        severity: 'error'
      });
    }
    for (const warn of result.warnings || []) {
      diagnostics.push({ line: 1, message: String(warn), severity: 'warning' });
    }
  } catch (e) {
    const lineMatch = e.message.match(/Line (\d+)/i);
    diagnostics.push({
      line: lineMatch ? Number(lineMatch[1]) : 1,
      message: e.message,
      severity: 'error'
    });
  }
  return diagnostics;
}

function getCompletions(source, line, character) {
  const lines = source.split('\n');
  const current = lines[line] || '';
  const prefix = current.slice(0, character).trim().split(/\s+/).pop() || '';
  return KEYWORDS
    .filter((k) => k.startsWith(prefix.toUpperCase()) || prefix === '')
    .slice(0, 40);
}

function getHover(source, line, character) {
  const lines = source.split('\n');
  const current = lines[line] || '';
  const before = current.slice(0, character);
  const match = before.match(/([A-Z_]{3,})\s*$/);
  if (!match) return null;
  const word = match[1];
  const doc = HOVER_DOCS[word];
  if (!doc) return { keyword: word, doc: `Noeon primitive: ${word}` };
  return { keyword: word, doc };
}

function getDocumentSymbols(source) {
  const symbols = [];
  const lines = source.split('\n');
  lines.forEach((line, idx) => {
    const task = line.match(/^(?:TASK|PROGRAM)\s+"([^"]+)"/);
    if (task) symbols.push({ name: task[1], kind: 'intent', line: idx + 1 });
    const goal = line.match(/^(?:GOAL|OBJECTIVE)\s+"([^"]+)"/);
    if (goal) symbols.push({ name: goal[1], kind: 'goal', line: idx + 1 });
    for (const kw of ['PERCEIVE', 'OBSERVE', 'UNDERSTAND', 'REASON', 'INTUIT', 'DECIDE', 'ACT', 'FEEDBACK', 'PREDICT', 'REFLECT', 'VERIFY']) {
      if (line.trimStart().startsWith(kw)) {
        symbols.push({ name: kw, kind: 'cognitive', line: idx + 1 });
      }
    }
  });
  return symbols;
}

module.exports = {
  validateSource,
  getCompletions,
  getHover,
  getDocumentSymbols,
  KEYWORDS,
  HOVER_DOCS
};
