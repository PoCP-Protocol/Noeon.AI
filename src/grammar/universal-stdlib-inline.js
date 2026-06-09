'use strict';

const { STDLIB_DEFAULT_FLOW } = require('../core/universal-expand');

const INLINE_SCHEMA = 'noeon.universal.inline/v1';

function parseToolsArg(arg) {
  if (Array.isArray(arg)) return arg;
  if (typeof arg === 'string') {
    try {
      const parsed = JSON.parse(arg);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return arg.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
  }
  return [];
}

function flowStepsToCognitive(steps) {
  const map = {
    perceive: 'PERCEIVE',
    reason: 'REASON',
    decide: 'DECIDE',
    act: 'ACT',
    reflect: 'REFLECT',
    feedback: 'FEEDBACK',
    understand: 'UNDERSTAND'
  };
  return steps.map((step) => ({
    kind: 'cognitive',
    keyword: map[step.kind] || String(step.kind || '').toUpperCase(),
    params: { ...step, kind: undefined, _stdlib: step._stdlib || 'std.universal/cognize' }
  }));
}

function expandUniversalStdlibCall(exportName, args = [], params = {}) {
  switch (exportName) {
    case 'cognize': {
      const flow = args[0] && typeof args[0] === 'object' && args[0].flow
        ? args[0].flow
        : STDLIB_DEFAULT_FLOW;
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: flowStepsToCognitive(flow),
        fragments: ['cognize.inline_flow']
      };
    }
    case 'intent': {
      const goal = args[0] || params.goal || 'Declare intent';
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: [{ kind: 'objective', value: String(goal) }],
        fragments: ['intent.inline']
      };
    }
    case 'epistemic': {
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: [{
          kind: 'context',
          params: {
            require_citation: params.require_citation ?? true,
            confidence_floor: params.confidence_floor ?? 0.7,
            _stdlib: 'std.universal/epistemic'
          }
        }],
        fragments: ['epistemic.inline']
      };
    }
    case 'equip': {
      const tools = parseToolsArg(args[0] || params.tools);
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: [{
          kind: 'context',
          params: { tools: tools.join(','), _stdlib: 'std.universal/equip' }
        }],
        fragments: ['equip.inline']
      };
    }
    case 'govern': {
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: [{
          kind: 'context',
          params: {
            audit: params.audit ?? true,
            governance: 'std.universal/govern',
            _stdlib: 'std.universal/govern'
          }
        }],
        fragments: ['govern.inline']
      };
    }
    case 'evolve': {
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: [{
          kind: 'cognitive',
          keyword: 'EVOLVE',
          params: {
            signal: params.signal || 'feedback',
            rate: params.rate || 0.1,
            _stdlib: 'std.universal/evolve'
          }
        }],
        fragments: ['evolve.inline']
      };
    }
    case 'scaffold':
      return {
        schema: INLINE_SCHEMA,
        exportName,
        statements: flowStepsToCognitive(STDLIB_DEFAULT_FLOW),
        fragments: ['scaffold.default_flow']
      };
    default:
      return { schema: INLINE_SCHEMA, exportName, statements: [], fragments: [] };
  }
}

module.exports = {
  INLINE_SCHEMA,
  expandUniversalStdlibCall,
  flowStepsToCognitive
};
