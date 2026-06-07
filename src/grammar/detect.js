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

module.exports = {
  isGeneralSyntax
};
