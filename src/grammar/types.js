'use strict';

const PRIMITIVE_TYPES = new Set(['any', 'number', 'bool', 'boolean', 'string', 'void', 'int', 'float']);

function normalizeType(typeName) {
  if (!typeName || typeName === 'any') return 'any';
  const lower = String(typeName).toLowerCase();
  if (lower === 'boolean') return 'bool';
  if (lower === 'int' || lower === 'float') return 'number';
  return lower;
}

function isKnownType(typeName) {
  const normalized = normalizeType(typeName);
  return normalized === 'any' || PRIMITIVE_TYPES.has(normalized);
}

function isAssignable(from, to) {
  const src = normalizeType(from);
  const dst = normalizeType(to);
  if (dst === 'any' || src === 'any') return true;
  return src === dst;
}

function validateGeneralTypes(ast, errors) {
  const functions = ast.general?.functions;
  if (!Array.isArray(functions) || functions.length === 0) return;

  for (const fn of functions) {
    for (const param of fn.params || []) {
      if (!isKnownType(param.type)) {
        errors.push(`fn '${fn.name}': unknown type '${param.type}' on param '${param.name}'`);
      }
    }
    if (fn.returnType && !isKnownType(fn.returnType)) {
      errors.push(`fn '${fn.name}': unknown return type '${fn.returnType}'`);
    }
  }
}

module.exports = {
  normalizeType,
  isKnownType,
  isAssignable,
  validateGeneralTypes
};
