'use strict';

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function isGeneralCanonicalEnabled(options = {}) {
  if (options.general_canonical != null) {
    return parseBoolean(options.general_canonical, false);
  }
  return parseBoolean(process.env.NOEON_GENERAL_CANONICAL, false);
}

function resolveCompilePresentation(ast, cognitiveProgram, options = {}) {
  const canonicalIr = ast?.general?.canonicalIr || null;
  const enabled = isGeneralCanonicalEnabled(options) && Boolean(canonicalIr);

  return {
    compileMode: enabled ? 'canonical-primary' : 'cognitive-primary',
    primaryIr: enabled ? 'canonical' : 'cognitive',
    canonicalIr,
    cognitiveProgram
  };
}

module.exports = {
  isGeneralCanonicalEnabled,
  resolveCompilePresentation
};
