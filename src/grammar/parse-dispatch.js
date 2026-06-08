'use strict';

/**
 * Single surface parse dispatch — liminal → next → general (agent/block) → null (AEL fallback).
 */

const {
  detectSurface,
  SURFACES,
  hasAgentSyntax,
  isGeneralSyntax,
  isNextSyntax
} = require('./detect');
const { buildStackManifest } = require('../core/noeon-unified');
const { tryParseLiminal } = require('./liminal');
const { parseGeneralAgentFile } = require('./agent-block');
const { parseGeneralProgram } = require('./general-parser');
const { lowerGeneralProgram } = require('./lower');
const { parseNextProgram } = require('./next-parser');
const { lowerNextProgram } = require('./lower-next');

function tryParseNextLocal(source, options) {
  if (!isNextSyntax(source, options)) return null;
  const { expandNextSource } = require('./next/macro-registry');
  const expanded = expandNextSource(source, options);
  const next = parseNextProgram(expanded.source, { ...options, expandMacros: false });
  const ast = lowerNextProgram(next);
  ast.next.macrosExpanded = expanded.macrosUsed;
  return ast;
}

function tryParseGeneralLocal(source, options) {
  if (!isGeneralSyntax(source, options)) return null;
  return lowerGeneralProgram(parseGeneralProgram(source, options));
}

function tryParseAgentLocal(source, options) {
  if (!hasAgentSyntax(source)) return null;
  return parseGeneralAgentFile(source, options);
}

function dispatchParseSurface(source, options = {}) {
  if (!source || typeof source !== 'string') return null;

  const surface = detectSurface(source, options);
  let ast = null;

  if (surface === SURFACES.LIMINAL) ast = tryParseLiminal(source, options);
  else if (surface === SURFACES.NEXT) ast = tryParseNextLocal(source, options);
  else if (surface === SURFACES.GENERAL && hasAgentSyntax(source)) ast = tryParseAgentLocal(source, options);
  else if (surface === SURFACES.GENERAL) ast = tryParseGeneralLocal(source, options);

  if (!ast && surface === SURFACES.LIMINAL) ast = tryParseLiminal(source, options);
  if (!ast && surface === SURFACES.NEXT) ast = tryParseNextLocal(source, options);
  if (!ast && hasAgentSyntax(source)) ast = tryParseAgentLocal(source, options);
  if (!ast) ast = tryParseGeneralLocal(source, options);

  if (ast) {
    ast.detectedSurface = ast.detectedSurface || surface;
    ast.noeonStack = ast.noeonStack || buildStackManifest(ast);
  }

  return ast;
}

module.exports = {
  dispatchParseSurface,
  detectSurface,
  SURFACES
};
