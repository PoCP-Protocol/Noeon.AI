'use strict';

const { evalExprSource, tryParseExpr } = require('./expr');
const { validateGeneralTypes } = require('./types');
const { validateGeneralEffects } = require('./effects');
const { validateImports, buildImportContext, isStdAiExport } = require('../stdlib/registry');
const { validateManifestImports } = require('../pkg/manifest');

function collectBindingsFromBody(body, env = {}) {
  for (const stmt of body || []) {
    if (stmt.kind === 'let' && stmt.exprSource) {
      try {
        env[stmt.name] = evalExprSource(stmt.exprSource, env);
      } catch {
        env[stmt.name] = 0;
      }
    }
  }
  return env;
}

function validateGeneralExpressions(ast, errors) {
  const functions = ast.general?.functions;
  if (!Array.isArray(functions)) return;

  for (const fn of functions) {
    const env = {};
    for (const param of fn.params || []) {
      env[param.name] = param.type === 'string' ? '' : 0;
    }

    for (const stmt of fn.body || []) {
      if (stmt.kind === 'let') {
        if (!stmt.exprSource) continue;
        try {
          tryParseExpr(stmt.exprSource, 0);
          env[stmt.name] = evalExprSource(stmt.exprSource, env);
        } catch (err) {
          errors.push(`fn '${fn.name}': ${err.message.replace(/^Line 0: /, '')}`);
        }
      }
      if (stmt.kind === 'assert') {
        try {
          tryParseExpr(stmt.exprSource, 0);
          const ok = evalExprSource(stmt.exprSource, env);
          if (typeof ok !== 'boolean') {
            errors.push(`fn '${fn.name}': assert expression must evaluate to boolean`);
          } else if (!ok) {
            errors.push(`fn '${fn.name}': assert failed at compile time: ${stmt.exprSource}`);
          }
        } catch (err) {
          errors.push(`fn '${fn.name}': ${err.message.replace(/^Line 0: /, '')}`);
        }
      }
      if (stmt.kind === 'stdlib') {
        const importContext = ast.general?.importContext || {};
        if (!isStdAiExport(stmt.exportName, importContext)) {
          errors.push(`fn '${fn.name}': std.ai export '${stmt.exportName}' used without import std.ai`);
        }
      }
      if (stmt.kind === 'call') {
        const importContext = ast.general?.importContext || {};
        if (isStdAiExport(stmt.callee, importContext)) {
          // validated via effect pass
        }
      }
    }
  }
}

function validateGeneralProfile(ast, errors, warnings, options = {}) {
  if (!ast.general) return;

  const importOptions = { cwd: options.cwd || process.cwd() };
  ast.general.importContext = buildImportContext(ast.general.imports || [], importOptions);
  validateImports(ast.general.imports || [], errors, importOptions);
  validateManifestImports(ast.general.imports || [], importOptions.cwd, errors);
  validateGeneralTypes(ast, errors);
  validateGeneralEffects(ast, errors);
  validateGeneralExpressions(ast, errors);

  if (ast.general.importContext.stdAi) {
    warnings.push('std.ai import resolved; LLM bindings active at lower time');
  }
}

module.exports = {
  validateGeneralProfile,
  collectBindingsFromBody
};
