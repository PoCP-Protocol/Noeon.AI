'use strict';

/**
 * Attach parse-time Canonical IR snapshot for any lowered AST (General fn + AGENT/AEL).
 */

function attachGeneralCanonicalSnapshot(ast) {
  if (!ast) return ast;
  try {
    const { lowerToCanonical } = require('./canonical-lower');
    ast.general = ast.general || {};
    if (!ast.general.canonicalIr) {
      ast.general.canonicalIr = lowerToCanonical(ast);
    }
  } catch {
    // non-fatal — legacy AST remains execution path
  }
  return ast;
}

module.exports = {
  attachGeneralCanonicalSnapshot
};
