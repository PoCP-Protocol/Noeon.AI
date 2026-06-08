'use strict';

const { isGeneralSyntax, isNextSyntax, detectSurface, SURFACES, hasAgentSyntax } = require('./detect');
const { parseGeneralProgram } = require('./general-parser');
const { parseGeneralAgentFile } = require('./agent-block');
const { buildStackManifest } = require('../core/noeon-unified');
const { lowerGeneralProgram } = require('./lower');
const { validateGeneralProfile } = require('./validate-general');
const { parseNextProgram } = require('./next-parser');
const { lowerNextProgram } = require('./lower-next');
const {
  isLiminalSyntax,
  parseLiminalProgram,
  lowerLiminalProgram,
  parseLiminalSource,
  tryParseLiminal,
  mergeDualSource,
  resolveDualSourcePaths
} = require('./liminal');

function parseGeneralSource(source, options = {}) {
  const general = parseGeneralProgram(source, options);
  return lowerGeneralProgram(general);
}

function tryParseGeneral(source, options = {}) {
  if (!isGeneralSyntax(source, options)) return null;
  return parseGeneralSource(source, options);
}

function parseNextSource(source, options = {}) {
  const { expandNextSource } = require('./next/macro-registry');
  const expanded = expandNextSource(source, options);
  const next = parseNextProgram(expanded.source, { ...options, expandMacros: false });
  const ast = lowerNextProgram(next);
  ast.next.macrosExpanded = expanded.macrosUsed;
  return ast;
}

function tryParseNext(source, options = {}) {
  if (!isNextSyntax(source, options)) return null;
  return parseNextSource(source, options);
}

function tryParseAgentGeneral(source, options = {}) {
  if (!hasAgentSyntax(source)) return null;
  return parseGeneralAgentFile(source, options);
}

function parseNoeonSource(source, options = {}) {
  const { dispatchParseSurface } = require('./parse-dispatch');
  return dispatchParseSurface(source, options);
}

module.exports = {
  isGeneralSyntax,
  isNextSyntax,
  detectSurface,
  SURFACES,
  hasAgentSyntax,
  parseGeneralProgram,
  lowerGeneralProgram,
  parseGeneralSource,
  tryParseGeneral,
  validateGeneralProfile,
  parseNextProgram,
  lowerNextProgram,
  parseNextSource,
  tryParseNext,
  tryParseAgentGeneral,
  parseNoeonSource,
  dispatchParseSurface: require('./parse-dispatch').dispatchParseSurface,
  isLiminalSyntax,
  parseLiminalProgram,
  lowerLiminalProgram,
  parseLiminalSource,
  tryParseLiminal
};
