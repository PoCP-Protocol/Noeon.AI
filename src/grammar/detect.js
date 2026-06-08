'use strict';

const { SURFACES } = require('../core/surfaces');
const { assertFrozenFilename } = require('../core/canonical-architecture');

function hasGeneralBlockSyntax(source) {
  return (
    /^\s*fn\s+[a-zA-Z_][\w]*\s*\(/m.test(source) ||
    /^\s*import\s+/m.test(source) ||
    /^\s*export\s+fn\s+/m.test(source) ||
    /^\s*program\s+[a-zA-Z_][\w]*\s*\{/m.test(source)
  );
}

function hasAgentSyntax(source) {
  return /^\s*AGENT\s+"/im.test(source) || /^\s*agent\s+"/im.test(source);
}

function hasGeneralProfileHeader(source) {
  return /^\s*PROFILE\s+"general"/im.test(source) || /^\s*profile\s+"general"/im.test(source);
}

/**
 * Detect whether source uses General block grammar (program {}, fn) — not AGENT lines.
 * AGENT blocks use the unified line parser in parser.js but surface as general.
 */
function isGeneralSyntax(source, options = {}) {
  if (hasAgentSyntax(source) && !hasGeneralBlockSyntax(source)) {
    return false;
  }

  if (options.filename && String(options.filename).endsWith('.noeon')) {
    if (/\bfn\s+[a-zA-Z_][\w]*\s*\(/.test(source)) return true;
    if (/^\s*import\s+/m.test(source)) return true;
    if (/^\s*export\s+fn\s+/m.test(source)) return true;
    if (/^\s*program\s+[a-zA-Z_][\w]*\s*\{/m.test(source)) return true;
  }

  return (
    hasGeneralBlockSyntax(source) ||
    (/^\s*fuse\s+next\s*\{/im.test(source) && !hasAgentSyntax(source))
  );
}

/**
 * Detect whether source uses Next core surface.
 */
function isNextSyntax(source, options = {}) {
  if (!source || typeof source !== 'string') return false;
  if (options.filename && String(options.filename).endsWith('.next')) return true;
  if (/^\s*profile\s+"next"/im.test(source)) return true;
  if (/^\s*PROFILE\s+"next"/im.test(source)) return true;
  if (
    /^\s*(field|cell|weave|echo|flux|bond|mycelium|autobond|dream|spawn|ritual|constitution)\s+/im.test(source) &&
    (/^\s*profile\s+/im.test(source) || /^\s*PROFILE\s+/im.test(source) ||
      (options.filename && String(options.filename).endsWith('.noeon')))
  ) {
    return true;
  }
  if (options.filename && String(options.filename).endsWith('.noeon')) {
    if (/^\s*model\s+/im.test(source) && /^\s*strategy\s+/im.test(source)) return true;
    if (/^\s*guarantee\s+/im.test(source) && /^\s*evolve\s+/im.test(source)) return true;
  }
  return (
    /^\s*model\s+/im.test(source) &&
    /^\s*strategy\s+/im.test(source) &&
    /^\s*guarantee\s+/im.test(source)
  );
}

function isLiminalSyntaxQuick(source, options = {}) {
  if (options.filename && String(options.filename).endsWith('.lim')) return true;
  return /^\s*covenant\s*\{/im.test(source) || /^\s*belief\s+/im.test(source);
}

/**
 * Unified surface detection — parse dispatch order: liminal → next → general → ael.
 */
function detectSurface(source, options = {}) {
  if (!source || typeof source !== 'string') return SURFACES.AEL;
  if (options.filename) assertFrozenFilename(options.filename, options);
  if (options.filename && String(options.filename).endsWith('.lim')) return SURFACES.LIMINAL;
  if (options.filename && String(options.filename).endsWith('.next')) return SURFACES.NEXT;
  if (isLiminalSyntaxQuick(source, options)) return SURFACES.LIMINAL;
  if (isNextSyntax(source, options)) return SURFACES.NEXT;
  if (hasAgentSyntax(source)) return SURFACES.GENERAL;
  if (isGeneralSyntax(source, options)) return SURFACES.GENERAL;
  if (hasGeneralProfileHeader(source)) return SURFACES.GENERAL;
  if (options.filename && String(options.filename).endsWith('.noeon')) return SURFACES.GENERAL;
  if (options.filename && String(options.filename).endsWith('.ael')) return SURFACES.AEL;
  return SURFACES.AEL;
}

module.exports = {
  SURFACES,
  isGeneralSyntax,
  isNextSyntax,
  isLiminalSyntaxQuick,
  detectSurface,
  hasAgentSyntax,
  hasGeneralBlockSyntax
};
