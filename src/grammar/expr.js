'use strict';

/**
 * General-profile expression tokenizer/evaluator (Phase 3).
 * Supports numbers, booleans, quoted strings, identifiers, and arithmetic/compare ops.
 */

function tokenizeExpr(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const rest = expr.slice(i);

    const ws = rest.match(/^\s+/);
    if (ws) {
      i += ws[0].length;
      continue;
    }

    const str = rest.match(/^"([\s\S]*)"/);
    if (str) {
      tokens.push({ type: 'string', value: str[1] });
      i += str[0].length;
      continue;
    }

    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      i += number[0].length;
      continue;
    }

    const bool = rest.match(/^(true|false)\b/i);
    if (bool) {
      tokens.push({ type: 'boolean', value: bool[1].toLowerCase() === 'true' });
      i += bool[0].length;
      continue;
    }

    const identifier = rest.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (identifier) {
      tokens.push({ type: 'identifier', value: identifier[0] });
      i += identifier[0].length;
      continue;
    }

    const operator = rest.match(/^(\|\||&&|==|!=|>=|<=|>|<|\+|-|\*|\/|!|\(|\)|,)/);
    if (operator) {
      tokens.push({ type: 'operator', value: operator[1] });
      i += operator[1].length;
      continue;
    }

    throw new Error(`invalid token near '${rest.slice(0, 16)}'`);
  }

  return tokens;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function parseExprTokens(tokens, env = {}, functions = {}, callDepth = 0) {
  let index = 0;

  function peek() {
    return tokens[index] || null;
  }

  function consume(value) {
    const t = peek();
    if (!t || (value !== undefined && t.value !== value)) return null;
    index += 1;
    return t;
  }

  function expect(value) {
    const t = consume(value);
    if (!t) throw new Error(`expected '${value}'`);
    return t;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('unexpected end of expression');

    if (consume('(')) {
      const value = parseOr();
      expect(')');
      return value;
    }

    if (t.type === 'number' || t.type === 'boolean' || t.type === 'string') {
      index += 1;
      return t.value;
    }

    if (t.type === 'identifier') {
      index += 1;
      if (consume('(')) {
        if (!hasOwn(functions, t.value)) {
          throw new Error(`undefined function '${t.value}'`);
        }
        const fn = functions[t.value];
        const args = [];
        if (!consume(')')) {
          while (true) {
            args.push(parseOr());
            if (consume(')')) break;
            expect(',');
          }
        }
        if (args.length !== fn.params.length) {
          throw new Error(`function '${t.value}' expects ${fn.params.length} args, got ${args.length}`);
        }
        if (callDepth >= 32) throw new Error(`call depth exceeded at '${t.value}'`);
        const localEnv = { ...env };
        for (let i = 0; i < fn.params.length; i += 1) {
          localEnv[fn.params[i]] = args[i];
        }
        return parseExprTokens(tokenizeExpr(fn.expr), localEnv, functions, callDepth + 1);
      }
      if (!hasOwn(env, t.value)) {
        throw new Error(`undefined symbol '${t.value}'`);
      }
      return env[t.value];
    }

    throw new Error(`unexpected token '${t.value}'`);
  }

  function parseUnary() {
    if (consume('!')) {
      const value = parseUnary();
      if (typeof value !== 'boolean') throw new Error('operator ! requires boolean operand');
      return !value;
    }
    if (consume('-')) {
      const value = parseUnary();
      if (typeof value !== 'number') throw new Error('unary - requires numeric operand');
      return -value;
    }
    return parsePrimary();
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (true) {
      if (consume('*')) {
        const right = parseUnary();
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error('operator * requires numeric operands');
        }
        left = left * right;
      } else if (consume('/')) {
        const right = parseUnary();
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error('operator / requires numeric operands');
        }
        left = left / right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (true) {
      if (consume('+')) {
        const right = parseMulDiv();
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else if (typeof left === 'number' && typeof right === 'number') {
          left = left + right;
        } else {
          throw new Error('operator + requires compatible operands');
        }
      } else if (consume('-')) {
        const right = parseMulDiv();
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error('operator - requires numeric operands');
        }
        left = left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseCompare() {
    let left = parseAddSub();
    while (true) {
      const op = peek();
      if (!op || op.type !== 'operator') break;
      if (!['>', '<', '>=', '<=', '==', '!='].includes(op.value)) break;
      index += 1;
      const right = parseAddSub();
      switch (op.value) {
        case '>': left = left > right; break;
        case '<': left = left < right; break;
        case '>=': left = left >= right; break;
        case '<=': left = left <= right; break;
        case '==': left = left === right; break;
        case '!=': left = left !== right; break;
        default: break;
      }
    }
    return left;
  }

  function parseAnd() {
    let left = parseCompare();
    while (consume('&&')) {
      const right = parseCompare();
      if (typeof left !== 'boolean' || typeof right !== 'boolean') {
        throw new Error('operator && requires boolean operands');
      }
      left = left && right;
    }
    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (consume('||')) {
      const right = parseAnd();
      if (typeof left !== 'boolean' || typeof right !== 'boolean') {
        throw new Error('operator || requires boolean operands');
      }
      left = left || right;
    }
    return left;
  }

  const value = parseOr();
  if (index !== tokens.length) {
    throw new Error(`unexpected token '${tokens[index].value}'`);
  }
  return value;
}

function evalExprSource(expr, env = {}, functions = {}) {
  return parseExprTokens(tokenizeExpr(expr), env, functions, 0);
}

function inferExprType(expr, env = {}) {
  try {
    const value = evalExprSource(expr, env);
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'string') return 'string';
    return 'any';
  } catch {
    return 'any';
  }
}

function tryParseExpr(raw, lineNo) {
  try {
    tokenizeExpr(raw);
    return { ok: true, source: raw.trim() };
  } catch (err) {
    throw new Error(`Line ${lineNo}: invalid expression '${raw.trim()}': ${err.message}`);
  }
}

module.exports = {
  tokenizeExpr,
  evalExprSource,
  inferExprType,
  tryParseExpr
};
