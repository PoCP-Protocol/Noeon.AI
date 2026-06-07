'use strict';

/**
 * Detect Liminal Profile (symbiotic programming) syntax.
 */
function isLiminalSyntax(source, options = {}) {
  if (options.filename && String(options.filename).endsWith('.lim')) {
    return true;
  }
  return (
    /^\s*covenant\s+[a-zA-Z_][\w]*\s*\{/m.test(source) ||
    /^\s*belief\s+[a-zA-Z_][\w]*\s*\{/m.test(source) ||
    /^\s*resonate\s+/m.test(source) ||
    /^\s*propose\s+[a-zA-Z_][\w]*\s*\(/m.test(source) ||
    /profile\s+"liminal"/i.test(source)
  );
}

module.exports = {
  isLiminalSyntax
};
