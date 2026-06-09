function sumValues(obj) {
  return Object.values(obj || {}).reduce((acc, v) => acc + v, 0);
}

function quorumRatio(verify) {
  if (!verify || !verify.quorum || !verify.quorum.denominator) {
    return 0;
  }
  return verify.quorum.numerator / verify.quorum.denominator;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getValueByPath(root, dotPath) {
  if (!dotPath) {
    return { exists: false, value: undefined };
  }

  const parts = String(dotPath).split('.').filter(Boolean);
  let cursor = root;

  for (const part of parts) {
    if (cursor === null || cursor === undefined) {
      return { exists: false, value: undefined };
    }

    if (Array.isArray(cursor)) {
      if (!/^\d+$/.test(part)) {
        return { exists: false, value: undefined };
      }
      const index = Number(part);
      if (index < 0 || index >= cursor.length) {
        return { exists: false, value: undefined };
      }
      cursor = cursor[index];
      continue;
    }

    if (typeof cursor !== 'object' || !hasOwn(cursor, part)) {
      return { exists: false, value: undefined };
    }

    cursor = cursor[part];
  }

  return { exists: true, value: cursor };
}

function emitMeta(level, message, errors, warnings) {
  if (level === 'warning') {
    warnings.push(message);
  } else {
    errors.push(message);
  }
}

function resolveMetaProfile(ast) {
  if (!ast || !ast.metaProfile) {
    return null;
  }

  const profile = ast.metaProfile;
  return {
    name: String(profile.name || 'default'),
    namespace: String(profile.namespace || 'noeon.meta'),
    version: String(profile.version || '1.0'),
    mode: String(profile.mode || 'enforce').toLowerCase() === 'advisory' ? 'advisory' : 'enforce',
    extends: Array.isArray(profile.extends)
      ? profile.extends.map((item) => String(item))
      : []
  };
}

function decorateMetaMessage(profile, message) {
  if (!profile) {
    return message;
  }
  const tag = `${profile.namespace}/${profile.name}@${profile.version}`;
  return `[${tag}] ${message}`;
}

function metaRuleKey(rule) {
  if (!rule || !rule.kind) {
    return null;
  }

  if (rule.kind === 'relation') {
    const whenPath = normalizeValidationPath(rule.when?.path || '').path || '';
    const targetPath = normalizeValidationPath(rule.target?.path || '').path || '';
    return [
      'relation',
      whenPath,
      rule.when?.op || 'eq',
      JSON.stringify(rule.when?.value),
      targetPath,
      rule.target?.op || 'eq',
      JSON.stringify(rule.target?.value)
    ].join('|');
  }

  const normalizedPath = normalizeValidationPath(rule.path || '').path || '';
  return [rule.kind, normalizedPath].join('|');
}

function normalizeMetaRules(rules) {
  const selected = new Map();
  const conflicts = [];

  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i];
    const key = metaRuleKey(rule);
    if (!key) {
      continue;
    }

    if (selected.has(key)) {
      const previous = selected.get(key);
      conflicts.push({
        key,
        droppedIndex: previous.index,
        keptIndex: i
      });
    }

    selected.set(key, { index: i, rule });
  }

  const normalized = Array.from(selected.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.rule);

  return {
    rules: normalized,
    conflicts
  };
}

function normalizeValidationPath(dotPath) {
  const raw = String(dotPath || '');
  if (!raw) {
    return { evaluable: false, path: null };
  }

  if (raw.startsWith('runtime.') || raw.startsWith('feedback.')) {
    return { evaluable: false, path: null };
  }

  if (raw.startsWith('ast.')) {
    return { evaluable: true, path: raw.slice(4) };
  }

  if (raw.startsWith('contract.')) {
    const mapped = raw
      .replace(/^contract\.settlement\.slash\./, 'onSlash.')
      .replace(/^contract\.settlement\.success\./, 'onSuccess.')
      .replace(/^contract\./, '');
    return { evaluable: true, path: mapped };
  }

  return { evaluable: true, path: raw };
}

function compareValues(left, op, right) {
  const lNum = typeof left === 'number' ? left : Number(left);
  const rNum = typeof right === 'number' ? right : Number(right);
  const isNumeric = Number.isFinite(lNum) && Number.isFinite(rNum);

  const l = isNumeric ? lNum : String(left);
  const r = isNumeric ? rNum : String(right);

  switch (op) {
    case 'eq':
      return l === r;
    case 'ne':
      return l !== r;
    case 'gt':
      return l > r;
    case 'gte':
      return l >= r;
    case 'lt':
      return l < r;
    case 'lte':
      return l <= r;
    default:
      return false;
  }
}

function applyMetaRules(ast, errors, warnings) {
  const rules = Array.isArray(ast.metaRules) ? ast.metaRules : [];
  const profile = resolveMetaProfile(ast);
  const normalized = normalizeMetaRules(rules);

  for (const conflict of normalized.conflicts) {
    warnings.push(
      decorateMetaMessage(
        profile,
        `meta conflict resolved by last-win: ${conflict.key} (kept #${conflict.keptIndex + 1})`
      )
    );
  }

  for (const rule of normalized.rules) {
    if (!rule || !rule.kind) {
      continue;
    }

    const ruleLevel = rule.level === 'warning' ? 'warning' : 'error';
    const level = profile && profile.mode === 'advisory' ? 'warning' : ruleLevel;
    const pathForMsg = rule.path || rule.target?.path || 'unknown';
    const defaultPrefix = `meta.${rule.kind} failed for ${pathForMsg}`;
    const message = decorateMetaMessage(profile, rule.message || defaultPrefix);

    if (rule.kind === 'require') {
      const normalized = normalizeValidationPath(rule.path);
      if (!normalized.evaluable || !normalized.path) {
        continue;
      }
      const context = getValueByPath(ast, normalized.path);
      if (!context.exists || context.value === null || context.value === undefined) {
        emitMeta(level, message, errors, warnings);
      }
      continue;
    }

    if (rule.kind === 'range') {
      const normalized = normalizeValidationPath(rule.path);
      if (!normalized.evaluable || !normalized.path) {
        continue;
      }
      const context = getValueByPath(ast, normalized.path);
      if (!context.exists || context.value === null || context.value === undefined) {
        continue;
      }
      if (typeof context.value !== 'number' || context.value < rule.min || context.value > rule.max) {
        emitMeta(level, message, errors, warnings);
      }
      continue;
    }

    if (rule.kind === 'enum') {
      const normalized = normalizeValidationPath(rule.path);
      if (!normalized.evaluable || !normalized.path) {
        continue;
      }
      const context = getValueByPath(ast, normalized.path);
      if (!context.exists || context.value === null || context.value === undefined) {
        continue;
      }
      const allowed = new Set((rule.values || []).map((item) => String(item)));
      if (!allowed.has(String(context.value))) {
        emitMeta(level, message, errors, warnings);
      }
      continue;
    }

    if (rule.kind === 'relation') {
      let whenPassed = true;
      if (rule.when && rule.when.path) {
        const whenPath = normalizeValidationPath(rule.when.path);
        if (!whenPath.evaluable || !whenPath.path) {
          continue;
        }
        const whenContext = getValueByPath(ast, whenPath.path);
        whenPassed =
          whenContext.exists && compareValues(whenContext.value, rule.when.op || 'eq', rule.when.value);
      }

      if (!whenPassed) {
        continue;
      }

      const targetPath = normalizeValidationPath(rule.target?.path);
      if (!targetPath.evaluable || !targetPath.path) {
        continue;
      }
      const targetContext = getValueByPath(ast, targetPath.path);
      if (!targetContext.exists || !compareValues(targetContext.value, rule.target?.op || 'eq', rule.target?.value)) {
        emitMeta(level, message, errors, warnings);
      }
    }
  }
}

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

function parseComputeExpr(tokens, env, functions = {}, callDepth = 0) {
  let index = 0;

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
      throw new Error('unexpected end of expression');
    }

    if (consume('(')) {
      const value = parseOr();
      expect(')');
      return value;
    }

    if (t.type === 'number') {
      index += 1;
      return t.value;
    }

    if (t.type === 'boolean') {
      index += 1;
      return t.value;
    }

    if (t.type === 'identifier') {
      index += 1;

      if (consume('(')) {
        if (!hasOwn(functions, t.value)) {
          throw new Error(`undefined compute function '${t.value}'`);
        }

        const fn = functions[t.value];
        const args = [];
        if (!consume(')')) {
          while (true) {
            args.push(parseOr());
            if (consume(')')) {
              break;
            }
            expect(',');
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
    if (consume('!')) {
      const value = parseUnary();
      if (typeof value !== 'boolean') {
        throw new Error('operator ! requires boolean operand');
      }
      return !value;
    }

    if (consume('-')) {
      const value = parseUnary();
      if (typeof value !== 'number') {
        throw new Error('unary - requires numeric operand');
      }
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
        left *= right;
        continue;
      }
      if (consume('/')) {
        const right = parseUnary();
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error('operator / requires numeric operands');
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
      if (consume('+')) {
        const right = parseMulDiv();
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error('operator + requires numeric operands');
        }
        left += right;
        continue;
      }
      if (consume('-')) {
        const right = parseMulDiv();
        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error('operator - requires numeric operands');
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
      if (consume('>')) {
        left = left > parseAddSub();
        continue;
      }
      if (consume('<')) {
        left = left < parseAddSub();
        continue;
      }
      if (consume('>=')) {
        left = left >= parseAddSub();
        continue;
      }
      if (consume('<=')) {
        left = left <= parseAddSub();
        continue;
      }
      if (consume('==')) {
        left = left === parseAddSub();
        continue;
      }
      if (consume('!=')) {
        left = left !== parseAddSub();
        continue;
      }
      break;
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

function evalComputeExpr(expr, env, functions = {}, callDepth = 0) {
  const tokens = tokenizeComputeExpr(expr);
  return parseComputeExpr(tokens, env, functions, callDepth);
}

function validateComputeExprIdentifiers(expr, allowedIdentifiers, allowedFunctions = new Set()) {
  const tokens = tokenizeComputeExpr(expr);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === 'identifier' && !allowedIdentifiers.has(token.value)) {
      const next = tokens[i + 1] || null;
      if (next && next.value === '(') {
        if (!allowedFunctions.has(token.value)) {
          throw new Error(`undefined compute function '${token.value}'`);
        }
      } else {
        throw new Error(`undefined compute symbol '${token.value}'`);
      }
    }
  }
}

function validateComputeBlock(ast, errors, warnings) {
  const compute = ast.compute;
  if (!compute) {
    return;
  }

  const functions = Array.isArray(compute.functions) ? compute.functions : [];
  const bindings = Array.isArray(compute.bindings) ? compute.bindings : [];
  const branches = Array.isArray(compute.branches) ? compute.branches : [];
  const assertions = Array.isArray(compute.assertions) ? compute.assertions : [];
  const calls = Array.isArray(compute.calls) ? compute.calls : [];
  const functionNames = new Set();
  const functionTable = {};

  for (const fn of functions) {
    if (!fn?.name) {
      continue;
    }
    if (functionNames.has(fn.name)) {
      errors.push(`DEF function '${fn.name}' cannot be redefined`);
      continue;
    }
    functionNames.add(fn.name);
  }

  for (const fn of functions) {
    if (!fn?.name || !fn?.expr || !Array.isArray(fn?.params)) {
      errors.push('DEF requires name, params and expr');
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(functionTable, fn.name)) {
      continue;
    }

    const paramNames = new Set();
    let duplicatedParam = false;
    for (const param of fn.params) {
      if (paramNames.has(param)) {
        errors.push(`DEF '${fn.name}' has duplicated parameter '${param}'`);
        duplicatedParam = true;
        break;
      }
      paramNames.add(param);
    }

    if (!duplicatedParam) {
      try {
        validateComputeExprIdentifiers(fn.expr, paramNames, functionNames);
      } catch (err) {
        errors.push(`DEF '${fn.name}' invalid: ${err.message}`);
      }
    }

    functionNames.add(fn.name);
    functionTable[fn.name] = {
      params: [...fn.params],
      expr: fn.expr
    };
  }

  const seen = new Set();
  const env = {};

  for (const functionName of functionNames) {
    seen.add(functionName);
  }

  for (const binding of bindings) {
    if (!binding?.name || !binding?.expr) {
      errors.push('compute binding requires name and expr');
      continue;
    }

    if (seen.has(binding.name)) {
      errors.push(`compute symbol '${binding.name}' cannot be redefined in same scope`);
      continue;
    }

    try {
      const value = evalComputeExpr(binding.expr, env, functionTable);
      env[binding.name] = value;
      seen.add(binding.name);
    } catch (err) {
      errors.push(`compute '${binding.name}' invalid: ${err.message}`);
    }
  }

  for (const branch of branches) {
    if (!branch?.name || !branch?.condExpr || !branch?.thenExpr || !branch?.elseExpr) {
      errors.push('IF requires name, condExpr, thenExpr and elseExpr');
      continue;
    }

    if (seen.has(branch.name)) {
      errors.push(`compute symbol '${branch.name}' cannot be redefined in same scope`);
      continue;
    }

    let condValue;
    try {
      condValue = evalComputeExpr(branch.condExpr, env, functionTable);
    } catch (err) {
      errors.push(`IF '${branch.name}' condition invalid: ${err.message}`);
      continue;
    }

    if (typeof condValue !== 'boolean') {
      errors.push(`IF '${branch.name}' condition must evaluate to boolean`);
      continue;
    }

    let thenValue;
    let elseValue;
    let thenOk = true;
    let elseOk = true;

    try {
      thenValue = evalComputeExpr(branch.thenExpr, env, functionTable);
    } catch (err) {
      thenOk = false;
      errors.push(`IF '${branch.name}' thenExpr invalid: ${err.message}`);
    }

    try {
      elseValue = evalComputeExpr(branch.elseExpr, env, functionTable);
    } catch (err) {
      elseOk = false;
      errors.push(`IF '${branch.name}' elseExpr invalid: ${err.message}`);
    }

    if (!thenOk || !elseOk) {
      continue;
    }

    if (typeof thenValue !== typeof elseValue) {
      warnings.push(`IF '${branch.name}' branch types differ (${typeof thenValue} vs ${typeof elseValue})`);
    }

    env[branch.name] = condValue ? thenValue : elseValue;
    seen.add(branch.name);
  }

  for (const assertion of assertions) {
    if (!assertion?.expr) {
      errors.push('ASSERT requires expression');
      continue;
    }

    try {
      const result = evalComputeExpr(assertion.expr, env, functionTable);
      if (typeof result !== 'boolean') {
        errors.push(`ASSERT expression must evaluate to boolean: '${assertion.expr}'`);
        continue;
      }
      if (!result) {
        warnings.push(assertion.message || `ASSERT is statically false: '${assertion.expr}'`);
      }
    } catch (err) {
      errors.push(`ASSERT invalid: ${err.message}`);
    }
  }

  const callNames = new Set();
  for (const call of calls) {
    if (call?.fn && !call?.step) {
      continue;
    }
    if (!call?.step) {
      errors.push('CALL requires step name');
      continue;
    }
    if (callNames.has(call.step)) {
      errors.push(`CALL step '${call.step}' cannot be duplicated`);
      continue;
    }
    callNames.add(call.step);

    if (!call.plugin) {
      errors.push(`CALL '${call.step}' requires plugin`);
    }

    if (!Number.isInteger(call.budgetMs) || call.budgetMs <= 0) {
      errors.push(`CALL '${call.step}' requires budget_ms as positive integer`);
    }
    if (!Number.isInteger(call.timeoutMs) || call.timeoutMs <= 0) {
      errors.push(`CALL '${call.step}' requires timeout_ms as positive integer`);
    }

    if (call.inputExpr) {
      try {
        evalComputeExpr(call.inputExpr, env, functionTable);
      } catch (err) {
        errors.push(`CALL '${call.step}' input invalid: ${err.message}`);
      }
    }
  }

  if (compute.returnExpr?.expr) {
    try {
      evalComputeExpr(compute.returnExpr.expr, env, functionTable);
    } catch (err) {
      errors.push(`RETURN invalid: ${err.message}`);
    }
  }
}

function validateAgents(ast, errors, warnings) {
  if (!Array.isArray(ast.agents) || ast.agents.length === 0) {
    return;
  }

  const allowedFlowKinds = new Set([
    "perceive",
    "reason",
    "act",
    "reflect",
    "understand",
    "decide",
    "feedback"
  ]);

  for (const agent of ast.agents) {
    if (!agent.name) {
      errors.push("agent.name is required");
    }
    if (!agent.goal) {
      errors.push(`AGENT '${agent.name || "unknown"}' requires GOAL`);
    }

    if (Array.isArray(agent.tools)) {
      for (const tool of agent.tools) {
        if (!tool || !String(tool).trim()) {
          errors.push(`AGENT '${agent.name}' TOOLS entries must be non-empty strings`);
        }
      }
    }

    if (!Array.isArray(agent.flow) || agent.flow.length === 0) {
      warnings.push(`AGENT '${agent.name}' has no FLOW steps defined`);
    } else {
      for (let i = 0; i < agent.flow.length; i += 1) {
        const step = agent.flow[i];
        if (!step || !step.kind) {
          errors.push(`AGENT '${agent.name}' FLOW step ${i + 1} is missing kind`);
          continue;
        }
        if (!allowedFlowKinds.has(step.kind)) {
          errors.push(`AGENT '${agent.name}' FLOW step ${i + 1} has unsupported kind '${step.kind}'`);
        }
      }
    }
  }
}

function validateNextProfile(ast, errors, warnings) {
  if (!(ast.profile === 'next' || ast.languageProfile === 'next')) {
    return;
  }

  const next = ast.next || {};
  const models = Array.isArray(next.models) ? next.models : [];
  const strategies = Array.isArray(next.strategies) ? next.strategies : [];
  const guarantees = Array.isArray(next.guarantees) ? next.guarantees : [];
  const vows = Array.isArray(next.vows) ? next.vows : [];
  const constitutions = Array.isArray(next.constitutions) ? next.constitutions : [];
  const rituals = Array.isArray(next.rituals) ? next.rituals : [];
  const acts = Array.isArray(next.acts) ? next.acts : [];
  const selfModels = Array.isArray(next.selfModels) ? next.selfModels : [];
  const myths = Array.isArray(next.myths) ? next.myths : [];
  const fields = Array.isArray(next.fields) ? next.fields : [];
  const cells = Array.isArray(next.cells) ? next.cells : [];
  const weaves = Array.isArray(next.weaves) ? next.weaves : [];
  const dreams = Array.isArray(next.dreams) ? next.dreams : [];
  const fluxes = Array.isArray(next.fluxes) ? next.fluxes : [];
  const echoes = Array.isArray(next.echoes) ? next.echoes : [];
  const spawns = Array.isArray(next.spawns) ? next.spawns : [];

  const hasStrategicCore = models.length > 0 || strategies.length > 0 || guarantees.length > 0;
  const hasLivingFieldCore = fields.length > 0 || cells.length > 0 || weaves.length > 0 || dreams.length > 0 || fluxes.length > 0 || echoes.length > 0 || spawns.length > 0;
  const isStrategicMode = hasStrategicCore && !(hasLivingFieldCore && cells.length > 0);

  if (!hasStrategicCore && !hasLivingFieldCore && acts.length === 0) {
    errors.push('next profile requires either strategic blocks (MODEL/STRATEGY/GUARANTEE/ACT) or living-field blocks (FIELD/CELL/WEAVE/DREAM/FLUX/ECHO/SPAWN)');
  }

  if (!next.goal?.text && !ast.cognition?.goal) {
    errors.push('next profile requires GOAL');
  }

  if (isStrategicMode) {
    if (models.length === 0) {
      errors.push('next strategic mode requires at least one MODEL');
    }
    if (strategies.length === 0) {
      errors.push('next strategic mode requires at least one STRATEGY');
    }
    if (guarantees.length === 0) {
      warnings.push('next strategic mode has no GUARANTEE; execution will run without explicit safety constraints');
    }
    if (acts.length === 0) {
      errors.push('next strategic mode requires at least one ACT');
    }
  }

  if (hasLivingFieldCore) {
    if (cells.length === 0) {
      warnings.push('next living-field mode usually defines at least one CELL');
    }
    if (weaves.length === 0 && dreams.length === 0 && fluxes.length === 0) {
      warnings.push('next living-field mode has no WEAVE/DREAM/FLUX dynamics');
    }
  }

  for (const g of guarantees) {
    if (!g.name) errors.push('GUARANTEE name is required');
    if (!g.expr) errors.push(`GUARANTEE '${g.name || 'unknown'}' requires expr`);
  }

  for (const vow of vows) {
    if (!vow.name) errors.push('VOW name is required');
    if (!vow.expr) errors.push(`VOW '${vow.name || 'unknown'}' requires expr`);
    if (vow.level && !['soft', 'hard'].includes(String(vow.level).toLowerCase())) {
      errors.push(`VOW '${vow.name || 'unknown'}' level must be soft|hard`);
    }
  }

  for (const constitution of constitutions) {
    if (!constitution.name) errors.push('CONSTITUTION name is required');
    if (!constitution.expr) errors.push(`CONSTITUTION '${constitution.name || 'unknown'}' requires expr`);
    if (constitution.level && !['soft', 'hard'].includes(String(constitution.level).toLowerCase())) {
      errors.push(`CONSTITUTION '${constitution.name || 'unknown'}' level must be soft|hard`);
    }
  }

  for (const ritual of rituals) {
    if (!ritual.name) errors.push('RITUAL name is required');
    if (!ritual.action) warnings.push(`RITUAL '${ritual.name || 'unknown'}' should declare action for act scheduling`);
    if (ritual.cadence !== undefined && Number(ritual.cadence) <= 0) {
      errors.push(`RITUAL '${ritual.name || 'unknown'}' cadence must be > 0`);
    }
    if (ritual.mode && !['adaptive', 'strict'].includes(String(ritual.mode).toLowerCase())) {
      errors.push(`RITUAL '${ritual.name || 'unknown'}' mode must be adaptive|strict`);
    }
    if (ritual.priority !== undefined && !Number.isFinite(Number(ritual.priority))) {
      errors.push(`RITUAL '${ritual.name || 'unknown'}' priority must be a number`);
    }
  }

  const ritualNames = new Set(rituals.map((r) => String(r.name || '').trim()).filter(Boolean));
  for (const ritual of rituals) {
    const parseRefs = (value) => {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
      const text = String(value || '').trim();
      if (!text) return [];
      return text.split(',').map((v) => v.trim()).filter(Boolean);
    };

    const overrides = parseRefs(ritual.overrides);
    const dependsOn = parseRefs(ritual.depends_on || ritual.dependsOn);

    for (const target of overrides) {
      if (target === ritual.name) {
        warnings.push(`RITUAL '${ritual.name || 'unknown'}' overrides itself and will be ignored`);
      }
      if (!ritualNames.has(target)) {
        warnings.push(`RITUAL '${ritual.name || 'unknown'}' overrides unknown ritual '${target}'`);
      }
    }

    for (const dep of dependsOn) {
      if (dep === ritual.name) {
        warnings.push(`RITUAL '${ritual.name || 'unknown'}' depends_on itself and can deadlock activation`);
      }
      if (!ritualNames.has(dep)) {
        warnings.push(`RITUAL '${ritual.name || 'unknown'}' depends_on unknown ritual '${dep}'`);
      }
    }
  }

  for (const a of acts) {
    if (!a.action) errors.push('ACT action is required');
    if (!a.capability) warnings.push(`ACT '${a.action || 'unknown'}' should declare capability`);
    if (a.budget_ms !== undefined && Number(a.budget_ms) <= 0) {
      errors.push(`ACT '${a.action || 'unknown'}' budget_ms must be > 0`);
    }
  }

  const seenCellNames = new Set();
  for (const c of cells) {
    if (!c.name) {
      errors.push('CELL name is required');
      continue;
    }
    if (seenCellNames.has(c.name)) {
      errors.push(`duplicate CELL name '${c.name}'`);
    }
    seenCellNames.add(c.name);
    if (c.energy !== undefined && (Number(c.energy) < 0 || Number(c.energy) > 1)) {
      errors.push(`CELL '${c.name}' energy must be in [0,1]`);
    }
  }

  for (const w of weaves) {
    if (!w.pattern) errors.push('WEAVE pattern is required');
    if (!w.into) errors.push('WEAVE INTO target is required');
    if (w.max !== undefined && Number(w.max) <= 0) {
      errors.push(`WEAVE '${w.pattern || 'unknown'}' max must be > 0`);
    }
  }

  for (const d of dreams) {
    if (!d.name) errors.push('DREAM name is required');
    if (d.branches !== undefined && Number(d.branches) <= 0) {
      errors.push(`DREAM '${d.name || 'unknown'}' branches must be > 0`);
    }
    if (d.depth !== undefined && Number(d.depth) <= 0) {
      errors.push(`DREAM '${d.name || 'unknown'}' depth must be > 0`);
    }
  }

  for (const sm of selfModels) {
    if (!sm.id && !sm.identity) {
      errors.push('SELFMODEL requires id or identity');
    }
    if (!sm.creator) {
      warnings.push(`SELFMODEL '${sm.id || sm.identity || 'unknown'}' should declare creator`);
    }
    if (!sm.paradigm) {
      warnings.push(`SELFMODEL '${sm.id || sm.identity || 'unknown'}' should declare paradigm`);
    }
  }

  for (const myth of myths) {
    if (!myth.text || !String(myth.text).trim()) {
      errors.push('MYTH requires non-empty text');
    }
    if (!myth.tone) {
      warnings.push('MYTH should declare tone for reflective shaping');
    }
  }
}

function validateAel(ast, options = {}) {
  const errors = [];
  const warnings = [];
  const isGeneralProfile = ast.profile === "general" || ast.languageProfile === "general";
  const primaryAgent = Array.isArray(ast.agents) && ast.agents.length > 0 ? ast.agents[0] : null;
  const generalTask =
    ast.task ||
    ast.cognition?.goal ||
    (primaryAgent ? primaryAgent.name : null);

  // Cognitive-mode contracts have relaxed protocol requirements
  const isCognitiveMode = ast.cognitive && (
    ast.cognitive.drives.length > 0 ||
    ast.cognitive.predictions.length > 0 ||
    ast.cognitive.intuitions.length > 0 ||
    ast.cognitive.reasonings.length > 0
  );

  const required = isGeneralProfile
    ? [
        ["profile", ast.profile || ast.languageProfile],
        ["task", generalTask],
        ["version", ast.version]
      ]
    : isCognitiveMode
    ? [
        ["network", ast.network],
        ["task", ast.task],
        ["version", ast.version]
      ]
    : [
        ["network", ast.network],
        ["task", ast.task],
        ["version", ast.version],
        ["budget", ast.budget],
        ["deadline", ast.deadline],
        ["verify", ast.verify],
        ["collateral.solver", ast.collateral?.solver],
        ["collateral.verifier", ast.collateral?.verifier],
        ["onSuccess", ast.onSuccess],
        ["onSlash", ast.onSlash]
      ];

  for (const [name, value] of required) {
    if (value === null || value === undefined) {
      errors.push(`missing required field: ${name}`);
    }
  }

  if (ast.verify) {
    const { numerator, denominator } = ast.verify.quorum;
    if (denominator <= 0 || numerator <= 0 || numerator > denominator) {
      errors.push("verify.quorum must satisfy 0 < numerator <= denominator");
    }
    if (ast.verify.challengeSeconds < 30) {
      warnings.push("challenge window is very short (<30s)");
    }
    if (!["auto", "manual"].includes(ast.verify.mode)) {
      errors.push("verify.mode must be auto or manual");
    }
  }

  if (!ast.cognition || !ast.cognition.goal) {
    warnings.push("GOAL is not defined; intent layer will fall back to TASK");
  }

  if (ast.cognition && ast.cognition.risk) {
    const level = ast.cognition.risk.level;
    const ratio = quorumRatio(ast.verify);

    if (["high", "critical"].includes(level)) {
      if (ast.verify && ast.verify.challengeSeconds < 600) {
        warnings.push("high/critical risk recommends challenge >= 600s");
      }
      if (ratio < 2 / 3) {
        warnings.push("high/critical risk recommends quorum >= 2/3");
      }
      if (ast.onSlash && typeof ast.onSlash.malicious === "number" && ast.onSlash.malicious < 90) {
        warnings.push("high/critical risk recommends malicious slashing >= 90%");
      }
    }
  }

  if (typeof ast.budget === "number" && ast.budget <= 0) {
    errors.push("budget must be > 0");
  }

  if (ast.collateral && !isCognitiveMode && !isGeneralProfile) {
    if (ast.collateral.solver <= 0) {
      errors.push("solver collateral must be > 0");
    }
    if (ast.collateral.verifier <= 0) {
      errors.push("verifier collateral must be > 0");
    }
    if (typeof ast.budget === "number" && ast.collateral.solver > ast.budget) {
      warnings.push("solver collateral is greater than budget");
    }
  }

  if (ast.onSuccess) {
    const s = sumValues(ast.onSuccess);
    if (s !== 100) {
      errors.push(`ON_SUCCESS distribution must sum to 100, got ${s}`);
    }
    if (!["solver", "verifier", "protocol"].every((k) => k in ast.onSuccess)) {
      warnings.push("ON_SUCCESS usually includes solver, verifier, protocol");
    }
  }

  if (ast.onSlash) {
    for (const [k, v] of Object.entries(ast.onSlash)) {
      if (v < 0 || v > 100) {
        errors.push(`ON_SLASH '${k}' must be in [0, 100]`);
      }
    }
  }

  if (ast.cognition && ast.cognition.memory) {
    const mem = ast.cognition.memory;
    if (mem.shortSeconds <= 0) {
      errors.push("memory.short must be > 0 seconds");
    }
    if (mem.longDays <= 0) {
      errors.push("memory.long must be > 0 days");
    }
    if (mem.longDays * 86400 < mem.shortSeconds) {
      warnings.push("memory.long is shorter than memory.short horizon");
    }
  }

  if (ast.cognition && ast.cognition.learn) {
    const learn = ast.cognition.learn;
    if (learn.rate <= 0 || learn.rate > 1) {
      errors.push("learn.rate must be in (0, 1]");
    }
    if (learn.windowTasks < 1) {
      errors.push("learn.window must be >= 1");
    }
  }

  if (ast.cognition && ast.cognition.nativeAI) {
    const native = ast.cognition.nativeAI;
    if (!["symbolic", "neural", "hybrid"].includes(native.mode)) {
      errors.push("cognition.mode must be symbolic|neural|hybrid");
    }
    if (!["assist", "copilot", "native", "sovereign"].includes(native.autonomy)) {
      errors.push("cognition.autonomy must be assist|copilot|native|sovereign");
    }
    if (!["off", "on", "adaptive"].includes(native.reflection)) {
      errors.push("cognition.reflection must be off|on|adaptive");
    }
  }

  if (ast.cognition && ast.cognition.selfCheck) {
    const check = ast.cognition.selfCheck;
    if (!["uncertainty", "consistency", "risk"].includes(check.metric)) {
      errors.push("self_check.metric must be uncertainty|consistency|risk");
    }
    if (typeof check.threshold !== "number" || check.threshold < 0 || check.threshold > 1) {
      errors.push("self_check.threshold must be in [0, 1]");
    }
    if (!["escalate", "retry", "halt", "continue"].includes(check.action)) {
      errors.push("self_check.action must be escalate|retry|halt|continue");
    }
  }

  if (ast.cognition && ast.cognition.infer) {
    const infer = ast.cognition.infer;
    if (!["deductive", "abductive", "hybrid"].includes(infer.strategy)) {
      errors.push("infer.strategy must be deductive|abductive|hybrid");
    }
    if (typeof infer.depth !== "number" || infer.depth < 1 || infer.depth > 8) {
      errors.push("infer.depth must be in [1, 8]");
    }
    if (typeof infer.diversity !== "number" || infer.diversity < 1 || infer.diversity > 5) {
      errors.push("infer.diversity must be in [1, 5]");
    }
  }

  if (ast.cognition && ast.cognition.critic) {
    const critic = ast.cognition.critic;
    if (!["none", "self", "peer"].includes(critic.mode)) {
      errors.push("critic.mode must be none|self|peer");
    }
    if (typeof critic.strictness !== "number" || critic.strictness < 1 || critic.strictness > 5) {
      errors.push("critic.strictness must be in [1, 5]");
    }
    if (typeof critic.veto !== "boolean") {
      errors.push("critic.veto must be boolean");
    }
  }

  if (ast.cognition && Array.isArray(ast.cognition.hypotheses)) {
    for (const item of ast.cognition.hypotheses) {
      if (!item.id) {
        errors.push("hypothesis.id is required");
      }
      if (typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1) {
        errors.push("hypothesis.confidence must be in [0, 1]");
      }
      if (!["causal", "predictive", "diagnostic"].includes(item.type)) {
        errors.push("hypothesis.type must be causal|predictive|diagnostic");
      }
    }
  }

  if (ast.cognition && Array.isArray(ast.cognition.evidences)) {
    for (const item of ast.cognition.evidences) {
      if (!item.source) {
        errors.push("evidence.source is required");
      }
      if (!["low", "medium", "high"].includes(item.quality)) {
        errors.push("evidence.quality must be low|medium|high");
      }
      if (typeof item.weight !== "number" || item.weight < 0 || item.weight > 1) {
        errors.push("evidence.weight must be in [0, 1]");
      }
    }
  }

  if (ast.cognition && Array.isArray(ast.cognition.counterexamples)) {
    for (const item of ast.cognition.counterexamples) {
      if (!item.id) {
        errors.push("counterexample.id is required");
      }
      if (!item.against) {
        errors.push("counterexample.against is required");
      }
      if (!["low", "medium", "high"].includes(item.severity)) {
        errors.push("counterexample.severity must be low|medium|high");
      }
      if (typeof item.weight !== "number" || item.weight < 0 || item.weight > 1) {
        errors.push("counterexample.weight must be in [0, 1]");
      }
    }

    if (Array.isArray(ast.cognition.hypotheses) && ast.cognition.hypotheses.length > 0) {
      const ids = new Set(ast.cognition.hypotheses.map((h) => h.id));
      for (const item of ast.cognition.counterexamples) {
        if (!ids.has(item.against)) {
          warnings.push(`counterexample.against '${item.against}' does not match any hypothesis id`);
        }
      }
    }
  }

  if (ast.cognition && Array.isArray(ast.cognition.traces)) {
    const planSteps = new Set();
    for (const edge of ast.cognition.plan || []) {
      planSteps.add(edge.from);
      planSteps.add(edge.to);
    }

    const hypothesisIds = new Set((ast.cognition.hypotheses || []).map((h) => h.id));
    const evidenceIds = new Set((ast.cognition.evidences || []).map((e) => e.source));
    const counterexampleIds = new Set((ast.cognition.counterexamples || []).map((c) => c.id));

    for (const item of ast.cognition.traces) {
      if (!item.step) {
        errors.push("trace.step is required");
        continue;
      }

      if (planSteps.size > 0 && !planSteps.has(item.step)) {
        warnings.push(`trace.step '${item.step}' does not match known PLAN nodes`);
      }
      if (item.hypothesis && !hypothesisIds.has(item.hypothesis)) {
        warnings.push(`trace.hypothesis '${item.hypothesis}' not found in hypotheses`);
      }
      if (item.evidence && !evidenceIds.has(item.evidence)) {
        warnings.push(`trace.evidence '${item.evidence}' not found in evidences`);
      }
      if (item.counterexample && !counterexampleIds.has(item.counterexample)) {
        warnings.push(`trace.counterexample '${item.counterexample}' not found in counterexamples`);
      }
    }
  }

  if (ast.cognition && ast.cognition.debate) {
    const debate = ast.cognition.debate;
    if (!debate.topic) {
      errors.push("debate.topic is required");
    }
    if (typeof debate.sides !== "number" || debate.sides < 2 || debate.sides > 6) {
      errors.push("debate.sides must be in [2, 6]");
    }
    if (typeof debate.rounds !== "number" || debate.rounds < 1 || debate.rounds > 7) {
      errors.push("debate.rounds must be in [1, 7]");
    }
    if (!["adversarial", "socratic", "consensus"].includes(debate.protocol)) {
      errors.push("debate.protocol must be adversarial|socratic|consensus");
    }
  }

  if (ast.cognition && ast.cognition.arbitration) {
    const arbitration = ast.cognition.arbitration;
    if (!["threshold", "jury"].includes(arbitration.mode)) {
      errors.push("arbitration.mode must be threshold|jury");
    }
    if (
      typeof arbitration.accept !== "number" ||
      arbitration.accept < 0 ||
      arbitration.accept > 1
    ) {
      errors.push("arbitration.accept must be in [0, 1]");
    }
    if (
      typeof arbitration.revise !== "number" ||
      arbitration.revise < 0 ||
      arbitration.revise > 1
    ) {
      errors.push("arbitration.revise must be in [0, 1]");
    }
    if (arbitration.revise > arbitration.accept) {
      warnings.push("arbitration.revise should usually be <= arbitration.accept");
    }
    if (!["accept", "revise", "reject", "escalate"].includes(arbitration.fallback)) {
      errors.push("arbitration.fallback must be accept|revise|reject|escalate");
    }
  }

  if (ast.cognition && Array.isArray(ast.cognition.jurors)) {
    const ids = new Set();
    let totalWeight = 0;
    for (const juror of ast.cognition.jurors) {
      if (!juror.id) {
        errors.push("juror.id is required");
      }
      if (ids.has(juror.id)) {
        errors.push(`duplicate juror.id '${juror.id}'`);
      }
      ids.add(juror.id);

      if (typeof juror.weight !== "number" || juror.weight <= 0 || juror.weight > 1) {
        errors.push("juror.weight must be in (0, 1]");
      }
      if (!["reviewer", "risk", "domain", "ethics"].includes(juror.role)) {
        errors.push("juror.role must be reviewer|risk|domain|ethics");
      }
      totalWeight += Number(juror.weight || 0);
    }

    if (ast.cognition.arbitration?.mode === "jury") {
      if (ast.cognition.jurors.length === 0) {
        errors.push("arbitration.mode jury requires at least one JUROR");
      }
      if (totalWeight < 0.99) {
        warnings.push("jury total weight should be close to 1.0");
      }
    }
  }

  if (ast.cognition && Array.isArray(ast.cognition.plan) && ast.cognition.plan.length > 0) {
    const knownSteps = new Set();
    for (const edge of ast.cognition.plan) {
      knownSteps.add(edge.from);
      knownSteps.add(edge.to);
    }
    if (knownSteps.size < 2) {
      warnings.push("PLAN graph is too small to represent meaningful reasoning");
    }
  }

  if (ast.cognition && ast.cognition.actions) {
    for (const [step, binding] of Object.entries(ast.cognition.actions)) {
      if (!binding.plugin) {
        errors.push(`ACTION for step '${step}' is missing plugin`);
      }
    }
  }

  if (!Array.isArray(ast.stateFlow) || ast.stateFlow.length === 0) {
    const hasAgentFlow = Array.isArray(ast.agents) && ast.agents.some((agent) => agent.flow?.length > 0);
    if (!hasAgentFlow) {
      warnings.push("FLOW is not defined; default state transitions will be used");
    }
  } else {
    const seen = new Set();
    for (const edge of ast.stateFlow) {
      const key = `${edge.from}->${edge.to}:${edge.event}`;
      if (seen.has(key)) {
        errors.push(`duplicate FLOW transition '${key}'`);
      }
      seen.add(key);
    }

    const startsAtCreated = ast.stateFlow.some((edge) => edge.from === "CREATED");
    if (!startsAtCreated) {
      warnings.push("FLOW does not start from CREATED");
    }
  }

  validateComputeBlock(ast, errors, warnings);
  validateAgents(ast, errors, warnings);
  validateNextProfile(ast, errors, warnings);

  if (isGeneralProfile && ast.general) {
    const { validateGeneralProfile } = require('./grammar/validate-general');
    validateGeneralProfile(ast, errors, warnings, { cwd: options.cwd });
  }

  applyMetaRules(ast, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
module.exports = {
  validateAel
};
