'use strict';

const { SURFACES } = require('../core/surfaces');
const { assertFrozenFilename } = require('../core/canonical-architecture');

function hasUniversalSyntax(source) {
  return /^\s*UNIVERSAL\s+"/im.test(source) || /^\s*profile\s+"universal"/im.test(source);
}

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

function hasUnifiedCapabilityBlocks(source) {
  return /^\s*(CONTRACT|ALIGN|GOVERNANCE)\s*\{/im.test(source);
}

function isUnifiedNoeonAuthoring(source, options = {}) {
  if (!options.filename || !String(options.filename).endsWith('.noeon')) return false;
  return (
    hasGeneralProfileHeader(source) ||
    hasAgentSyntax(source) ||
    hasUnifiedCapabilityBlocks(source)
  );
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
  if (isUnifiedNoeonAuthoring(source, options)) return false;
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

function isLiminalFilename(filename) {
  if (!filename) return false;
  const lower = String(filename).toLowerCase();
  return lower.endsWith('.lim') || lower.endsWith('.lim.human') || lower.endsWith('.lim.machine');
}

function isLiminalSyntaxQuick(source, options = {}) {
  if (isLiminalFilename(options.filename)) return true;
  if (isUnifiedNoeonAuthoring(source, options)) return false;
  return /^\s*covenant\s*\{/im.test(source) || /^\s*belief\s+/im.test(source);
}

/**
 * Unified surface detection — parse dispatch order: liminal → next → general → ael.
 */
function detectSurface(source, options = {}) {
  if (options.filename) assertFrozenFilename(options.filename, options);
  const filename = String(options.filename || '');
  const isNextFile = filename.endsWith('.next');
  const isNoeonFile = filename.endsWith('.noeon');
  const isAelFile = filename.endsWith('.ael');

  if (isLiminalFilename(filename)) return SURFACES.LIMINAL;
  if (isNextFile) return SURFACES.NEXT;

  if (!source || typeof source !== 'string') return SURFACES.AEL;

  // .noeon is a unified container: detect concrete surface by syntax first.
  if (isNoeonFile) {
    if (isLiminalSyntaxQuick(source, options)) return SURFACES.LIMINAL;
    if (hasUniversalSyntax(source)) return SURFACES.UNIVERSAL;
    if (
      isGeneralSyntax(source, options) ||
      hasGeneralBlockSyntax(source) ||
      hasGeneralProfileHeader(source)
    ) {
      return SURFACES.GENERAL;
    }
    if (isNextSyntax(source, options)) return SURFACES.NEXT;
    if (hasAgentSyntax(source)) return SURFACES.GENERAL;
    return SURFACES.GENERAL;
  }

  if (isAelFile) return SURFACES.AEL;

  if (isLiminalSyntaxQuick(source, options)) return SURFACES.LIMINAL;
  if (hasUniversalSyntax(source)) return SURFACES.UNIVERSAL;
  if (isNextSyntax(source, options)) return SURFACES.NEXT;
  if (hasAgentSyntax(source)) return SURFACES.GENERAL;
  if (isGeneralSyntax(source, options)) return SURFACES.GENERAL;
  if (hasGeneralProfileHeader(source)) return SURFACES.GENERAL;
  return SURFACES.AEL;
}

module.exports = {
  SURFACES,
  isGeneralSyntax,
  isNextSyntax,
  isLiminalSyntaxQuick,
  isLiminalFilename,
  detectSurface,
  hasAgentSyntax,
  hasUniversalSyntax,
  hasGeneralBlockSyntax,
  hasUnifiedCapabilityBlocks,
  isUnifiedNoeonAuthoring
};
