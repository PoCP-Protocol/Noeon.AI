'use strict';

const { UNIVERSAL_FORMULA, DIMENSIONS } = require('./universal-kernel');

function quoteList(items) {
  return `[${(items || []).map((x) => `"${x}"`).join(', ')}]`;
}

function buildUniversalTemplate(options = {}) {
  const name = options.name || 'MyUniversalAgent';
  const intent = options.intent || 'Declare a measurable AI-native outcome';
  const tools = options.tools || ['echo/echo'];
  const confidence = options.confidence_floor ?? 0.7;

  return `PROFILE "universal"
VERSION "1.0.0"

import std.universal

UNIVERSAL "${name}"
  INTENT "${intent}"

  EPISTEMIC
    require_citation true
    confidence_floor ${confidence}
    evidence_sources ["memory", "tools"]

  COGNITION
    FLOW
      PERCEIVE source=input modality=text
      REASON strategy=abductive depth=3
      DECIDE action=respond threshold=${confidence}
      ACT action=respond channel=console
      REFLECT depth=standard

  CAPABILITY
    TOOLS ${quoteList(tools)}

  GOVERNANCE
    POLICY audit=true
    BUDGET tokens=4000

  EVOLUTION
    LEARN signal=feedback rate=0.1
    SELF improve=true dream=false
`;
}

function buildMinimalUniversal(name, intent) {
  return buildUniversalTemplate({ name, intent, tools: ['echo/echo'] });
}

module.exports = {
  UNIVERSAL_FORMULA,
  DIMENSIONS,
  buildUniversalTemplate,
  buildMinimalUniversal
};
