'use strict';

const { isGeneralSyntax, isNextSyntax } = require('./detect');
const { parseGeneralProgram } = require('./general-parser');
const { lowerGeneralProgram } = require('./lower');
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

module.exports = {
  isGeneralSyntax,
  isNextSyntax,
  parseGeneralProgram,
  lowerGeneralProgram,
  parseGeneralSource,
  tryParseGeneral,
  parseNextProgram,
  lowerNextProgram,
  parseNextSource,
  tryParseNext,
  isLiminalSyntax,
  parseLiminalProgram,
  lowerLiminalProgram,
  parseLiminalSource,
  tryParseLiminal
};
