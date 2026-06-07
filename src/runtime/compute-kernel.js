function tokenizeComputeExpr(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const rest = expr.slice(i);

    const ws = rest.match(/^\s+/);
    if (ws) {
      i += ws[0].length;
      continue;
    }

    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      i += number[0].length;
      continue;
    }

    const bool = rest.match(/^(true|false)\b/i);
    if (bool) {
      tokens.push({ type: "boolean", value: bool[1].toLowerCase() === "true" });
      i += bool[0].length;
      continue;
    }

    const identifier = rest.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      i += identifier[0].length;
      continue;
    }

    const operator = rest.match(/^(\|\||&&|==|!=|>=|<=|>|<|\+|-|\*|\/|!|\(|\)|,)/);
    if (operator) {
      tokens.push({ type: "operator", value: operator[1] });
      i += operator[1].length;
      continue;
    }

    throw new Error(`invalid token near '${rest.slice(0, 16)}'`);
  }

  return tokens;
}

function parseComputeExpr(tokens, env, functions = {}, callDepth = 0) {
  let index = 0;

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function peek() {
    return tokens[index] || null;
  }

  function consume(value) {
    const t = peek();
    if (!t || (value !== undefined && t.value !== value)) {
      return null;
    }
    index += 1;
    return t;
  }

  function expect(value) {
    const t = consume(value);
    if (!t) {
      throw new Error(`expected '${value}'`);
    }
    return t;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) {
      throw new Error("unexpected end of expression");
    }

    if (consume("(")) {
      const value = parseOr();
      expect(")");
      return value;
    }

    if (t.type === "number") {
      index += 1;
      return t.value;
    }

    if (t.type === "boolean") {
      index += 1;
      return t.value;
    }

    if (t.type === "identifier") {
      index += 1;

      if (consume("(")) {
        if (!hasOwn(functions, t.value)) {
          throw new Error(`undefined compute function '${t.value}'`);
        }

        const fn = functions[t.value];
        const args = [];
        if (!consume(")")) {
          while (true) {
            args.push(parseOr());
            if (consume(")")) {
              break;
            }
            expect(",");
          }
        }

        if (args.length !== fn.params.length) {
          throw new Error(
            `compute function '${t.value}' expects ${fn.params.length} args, got ${args.length}`
          );
        }

        if (callDepth >= 32) {
          throw new Error(`compute function call depth exceeded at '${t.value}'`);
        }

        const localEnv = {
          ...env
        };
        for (let i = 0; i < fn.params.length; i += 1) {
          localEnv[fn.params[i]] = args[i];
        }

        return evalComputeExpr(fn.expr, localEnv, functions, callDepth + 1);
      }

      if (!hasOwn(env, t.value)) {
        throw new Error(`undefined compute symbol '${t.value}'`);
      }
      return env[t.value];
    }

    throw new Error(`unexpected token '${t.value}'`);
  }

  function parseUnary() {
    if (consume("!")) {
      const value = parseUnary();
      if (typeof value !== "boolean") {
        throw new Error("operator ! requires boolean operand");
      }
      return !value;
    }

    if (consume("-")) {
      const value = parseUnary();
      if (typeof value !== "number") {
        throw new Error("unary - requires numeric operand");
      }
      return -value;
    }

    return parsePrimary();
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (true) {
      if (consume("*")) {
        const right = parseUnary();
        if (typeof left !== "number" || typeof right !== "number") {
          throw new Error("operator * requires numeric operands");
        }
        left *= right;
        continue;
      }
      if (consume("/")) {
        const right = parseUnary();
        if (typeof left !== "number" || typeof right !== "number") {
          throw new Error("operator / requires numeric operands");
        }
        left /= right;
        continue;
      }
      break;
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (true) {
      if (consume("+")) {
        const right = parseMulDiv();
        if (typeof left !== "number" || typeof right !== "number") {
          throw new Error("operator + requires numeric operands");
        }
        left += right;
        continue;
      }
      if (consume("-")) {
        const right = parseMulDiv();
        if (typeof left !== "number" || typeof right !== "number") {
          throw new Error("operator - requires numeric operands");
        }
        left -= right;
        continue;
      }
      break;
    }
    return left;
  }

  function parseCompare() {
    let left = parseAddSub();
    while (true) {
      if (consume(">")) {
        left = left > parseAddSub();
        continue;
      }
      if (consume("<")) {
        left = left < parseAddSub();
        continue;
      }
      if (consume(">=")) {
        left = left >= parseAddSub();
        continue;
      }
      if (consume("<=")) {
        left = left <= parseAddSub();
        continue;
      }
      if (consume("==")) {
        left = left === parseAddSub();
        continue;
      }
      if (consume("!=")) {
        left = left !== parseAddSub();
        continue;
      }
      break;
    }
    return left;
  }

  function parseAnd() {
    let left = parseCompare();
    while (consume("&&")) {
      const right = parseCompare();
      if (typeof left !== "boolean" || typeof right !== "boolean") {
        throw new Error("operator && requires boolean operands");
      }
      left = left && right;
    }
    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (consume("||")) {
      const right = parseAnd();
      if (typeof left !== "boolean" || typeof right !== "boolean") {
        throw new Error("operator || requires boolean operands");
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

function evalComputeExpr(expr, env, functions = {}, callDepth = 0) {
  const tokens = tokenizeComputeExpr(expr);
  return parseComputeExpr(tokens, env, functions, callDepth);
}

function executeComputeKernel(compiled, feedback, context) {
  const compute = compiled?.contract?.compute || {};
  const functions = Array.isArray(compute.functions) ? compute.functions : [];
  const bindings = Array.isArray(compute.bindings) ? compute.bindings : [];
  const branches = Array.isArray(compute.branches) ? compute.branches : [];
  const assertions = Array.isArray(compute.assertions) ? compute.assertions : [];
  const calls = Array.isArray(compute.calls) ? compute.calls : [];

  const env = {};
  const receipts = [];
  const diagnostics = [];
  const functionTable = {};

  for (const fn of functions) {
    if (!fn?.name || !Array.isArray(fn?.params) || !fn?.expr) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_DEF_INVALID",
        message: "DEF requires name, params and expr"
      });
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(functionTable, fn.name)) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_DEF_DUPLICATE",
        message: `DEF function '${fn.name}' cannot be redefined`
      });
      continue;
    }

    const duplicated = new Set();
    for (const param of fn.params) {
      if (duplicated.has(param)) {
        diagnostics.push({
          level: "error",
          code: "COMPUTE_DEF_PARAM_DUPLICATE",
          message: `DEF '${fn.name}' has duplicated parameter '${param}'`
        });
      }
      duplicated.add(param);
    }

    functionTable[fn.name] = {
      params: [...fn.params],
      expr: fn.expr
    };
  }

  for (const binding of bindings) {
    try {
      env[binding.name] = evalComputeExpr(binding.expr, env, functionTable);
      receipts.push({
        kind: binding.kind || "COMPUTE",
        name: binding.name,
        status: "done",
        expr: binding.expr,
        value: env[binding.name]
      });
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_BINDING_INVALID",
        message: `compute '${binding.name}' invalid: ${err.message}`
      });
      receipts.push({
        kind: binding.kind || "COMPUTE",
        name: binding.name,
        status: "failed",
        expr: binding.expr,
        error: err.message
      });
    }
  }

  for (const branch of branches) {
    if (!branch?.name || !branch?.condExpr || !branch?.thenExpr || !branch?.elseExpr) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_IF_INVALID",
        message: "IF requires name, condExpr, thenExpr and elseExpr"
      });
      receipts.push({
        kind: "IF",
        name: branch?.name || null,
        status: "failed",
        error: "invalid IF structure"
      });
      continue;
    }

    let condValue = null;
    try {
      condValue = evalComputeExpr(branch.condExpr, env, functionTable);
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_IF_CONDITION_INVALID",
        message: `IF '${branch.name}' condition invalid: ${err.message}`
      });
      receipts.push({
        kind: "IF",
        name: branch.name,
        status: "failed",
        condExpr: branch.condExpr,
        error: err.message
      });
      continue;
    }

    if (typeof condValue !== "boolean") {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_IF_CONDITION_NOT_BOOLEAN",
        message: `IF '${branch.name}' condition must be boolean`
      });
      receipts.push({
        kind: "IF",
        name: branch.name,
        status: "failed",
        condExpr: branch.condExpr,
        value: condValue,
        error: "non-boolean condition"
      });
      continue;
    }

    const selectedExpr = condValue ? branch.thenExpr : branch.elseExpr;
    try {
      const selectedValue = evalComputeExpr(selectedExpr, env, functionTable);
      env[branch.name] = selectedValue;
      receipts.push({
        kind: "IF",
        name: branch.name,
        status: "done",
        condExpr: branch.condExpr,
        conditionValue: condValue,
        selectedBranch: condValue ? "then" : "else",
        selectedExpr,
        value: selectedValue
      });
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_IF_BRANCH_INVALID",
        message: `IF '${branch.name}' selected branch invalid: ${err.message}`
      });
      receipts.push({
        kind: "IF",
        name: branch.name,
        status: "failed",
        condExpr: branch.condExpr,
        conditionValue: condValue,
        selectedBranch: condValue ? "then" : "else",
        selectedExpr,
        error: err.message
      });
    }
  }

  for (const assertion of assertions) {
    try {
      const result = evalComputeExpr(assertion.expr, env, functionTable);
      if (typeof result !== "boolean") {
        diagnostics.push({
          level: "error",
          code: "COMPUTE_ASSERT_NOT_BOOLEAN",
          message: `ASSERT must be boolean: '${assertion.expr}'`
        });
        receipts.push({
          kind: "ASSERT",
          status: "failed",
          expr: assertion.expr,
          message: assertion.message || null,
          error: "non-boolean assertion"
        });
        continue;
      }

      receipts.push({
        kind: "ASSERT",
        status: result ? "done" : "failed",
        expr: assertion.expr,
        message: assertion.message || null,
        value: result
      });

      if (!result) {
        diagnostics.push({
          level: "warning",
          code: "COMPUTE_ASSERT_FALSE",
          message: assertion.message || `ASSERT is false: '${assertion.expr}'`
        });
      }
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_ASSERT_INVALID",
        message: `ASSERT invalid: ${err.message}`
      });
      receipts.push({
        kind: "ASSERT",
        status: "failed",
        expr: assertion.expr,
        message: assertion.message || null,
        error: err.message
      });
    }
  }

  for (const call of calls) {
    let inputValue = null;
    if (call.inputExpr) {
      try {
        inputValue = evalComputeExpr(call.inputExpr, env, functionTable);
      } catch (err) {
        diagnostics.push({
          level: "error",
          code: "COMPUTE_CALL_INPUT_INVALID",
          message: `CALL '${call.step}' input invalid: ${err.message}`
        });
      }
    }

    const binding = {
      ...(call.binding || {}),
      plugin: call.plugin,
      latencyMs: call.timeoutMs || 1000,
      budgetMs: call.budgetMs,
      inputValue
    };

    const actionResult = context.runActionStep(call.step, {
      network: context.network,
      task: context.task,
      feedback: feedback || {},
      adaptiveProfile: context.adaptiveProfile,
      actionBindings: { [call.step]: binding },
      pluginPolicy: context.pluginPolicy
    });

    receipts.push({
      kind: "CALL",
      step: call.step,
      plugin: call.plugin,
      budgetMs: call.budgetMs,
      timeoutMs: call.timeoutMs,
      inputExpr: call.inputExpr,
      inputValue,
      status: actionResult.status,
      reason: actionResult.reason,
      failureCategory: actionResult.failureCategory || null,
      receipt: actionResult.receipt
    });

    if (actionResult.status === "failed") {
      diagnostics.push({
        level: "warning",
        code: "COMPUTE_CALL_FAILED",
        message: `CALL '${call.step}' failed: ${actionResult.reason}`
      });
    }
  }

  let result = null;
  if (compute.returnExpr?.expr) {
    try {
      result = evalComputeExpr(compute.returnExpr.expr, env, functionTable);
      receipts.push({
        kind: "RETURN",
        status: "done",
        expr: compute.returnExpr.expr,
        value: result
      });
    } catch (err) {
      diagnostics.push({
        level: "error",
        code: "COMPUTE_RETURN_INVALID",
        message: `RETURN invalid: ${err.message}`
      });
      receipts.push({
        kind: "RETURN",
        status: "failed",
        expr: compute.returnExpr.expr,
        error: err.message
      });
    }
  }

  return {
    env,
    result,
    receipts,
    diagnostics
  };
}

module.exports = {
  executeComputeKernel
};