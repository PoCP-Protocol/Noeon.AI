'use strict';

/**
 * Detect whether source uses General Profile block syntax (Phase 2).
 */
function isGeneralSyntax(source, options = {}) {
  if (options.filename && String(options.filename).endsWith('.noeon')) {
    if (/\bfn\s+[a-zA-Z_][\w]*\s*\(/.test(source)) return true;
    if (/^\s*import\s+/m.test(source)) return true;
    if (/^\s*export\s+fn\s+/m.test(source)) return true;
    if (/^\s*program\s+[a-zA-Z_][\w]*\s*\{/m.test(source)) return true;
  }
  return (
    /^\s*fn\s+[a-zA-Z_][\w]*\s*\(/m.test(source) ||
    /^\s*import\s+/m.test(source) ||
    /^\s*export\s+fn\s+/m.test(source) ||
    /^\s*program\s+[a-zA-Z_][\w]*\s*\{/m.test(source)
  );
}

/**
 * Detect whether source uses Next Profile syntax (v0.1).
 */
function isNextSyntax(source, options = {}) {
  if (!source || typeof source !== 'string') return false;
  if (options.filename && String(options.filename).endsWith('.next')) return true;
  if (/^\s*profile\s+"next"/im.test(source)) return true;
  if (
    /^\s*(field|cell|weave|echo|flux|bond|mycelium|autobond|dream|spawn)\s+/im.test(source) &&
    (/^\s*profile\s+/im.test(source) || (options.filename && String(options.filename).endsWith('.noeon')))
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

module.exports = {
  isGeneralSyntax,
  isNextSyntax
};
