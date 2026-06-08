'use strict';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function resolvePath(obj, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function parseOperand(token, env) {
  const trimmed = String(token || '').trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return resolvePath(env, trimmed);
}

function evaluateExpr(expr, env) {
  const text = String(expr || '').trim();
  const m = text.match(/^(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)$/);
  if (!m) return { status: 'unknown', reason: 'unsupported expression format' };
  const left = parseOperand(m[1], env);
  const right = parseOperand(m[3], env);
  if (left === undefined || right === undefined) {
    return { status: 'unknown', reason: 'missing data for expression operands' };
  }
  let passed = false;
  switch (m[2]) {
    case '<=': passed = left <= right; break;
    case '>=': passed = left >= right; break;
    case '==': passed = left === right; break;
    case '!=': passed = left !== right; break;
    case '<': passed = left < right; break;
    case '>': passed = left > right; break;
    default: return { status: 'unknown', reason: 'unsupported operator' };
  }
  return { status: 'evaluated', passed, left, right, operator: m[2] };
}

function evaluateRituals(rituals, env, memory) {
  const parseRefs = (value) => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    const text = String(value || '').trim();
    if (!text) return [];
    return text.split(',').map((v) => v.trim()).filter(Boolean);
  };
  const list = Array.isArray(rituals) ? rituals : [];
  const currentRun = (Number(memory?.runCount) || 0) + 1;
  return list.map((r, index) => {
    const name = String(r.name || 'ritual');
    const stat = memory?.ritualStats?.[name] || {};
    const learnedPriority = Number.isFinite(Number(stat.learnedPriority)) ? Number(stat.learnedPriority) : 0;
    const cadenceRaw = Number(r.cadence);
    const cadence = Number.isFinite(cadenceRaw) && cadenceRaw > 0 ? Math.floor(cadenceRaw) : 1;
    const cadenceMatch = currentRun % cadence === 0;
    const trigger = r.trigger ? evaluateExpr(r.trigger, env) : { status: 'evaluated', passed: true };

    let status = 'deferred';
    let active = false;
    if (cadenceMatch) {
      if (trigger.status === 'unknown') {
        status = 'unknown';
      } else if (trigger.passed === true) {
        status = 'active';
        active = true;
      } else {
        status = 'suspended';
      }
    }

    return {
      name,
      action: r.action || null,
      mode: String(r.mode || 'adaptive').toLowerCase(),
      priority: Number.isFinite(Number(r.priority)) ? Number(r.priority) : 0,
      effectivePriority: (Number.isFinite(Number(r.priority)) ? Number(r.priority) : 0) + learnedPriority,
      learnedPriority,
      declarationOrder: index,
      overrides: parseRefs(r.overrides),
      dependsOn: parseRefs(r.depends_on || r.dependsOn),
      cadence,
      cadenceMatch,
      triggerExpr: r.trigger || null,
      trigger,
      status,
      active
    };
  });
}

function resolveRitualGovernance(rituals) {
  const conflicts = [];
  const list = (Array.isArray(rituals) ? rituals : []).map((r) => ({ ...r }));
  const byName = new Map(list.map((r) => [String(r.name || '').toLowerCase(), r]));

  for (let i = 0; i < list.length; i += 1) {
    let changed = false;
    for (const ritual of list) {
      if (!ritual.active) continue;
      if (!Array.isArray(ritual.dependsOn) || ritual.dependsOn.length === 0) continue;

      const missing = ritual.dependsOn.filter((dep) => {
        const depRitual = byName.get(String(dep).toLowerCase());
        return !depRitual || depRitual.active !== true;
      });

      if (missing.length > 0) {
        ritual.status = 'dependency-blocked';
        ritual.active = false;
        ritual.dependencyMissing = missing;
        conflicts.push({
          type: 'dependency-blocked',
          ritual: ritual.name,
          missing
        });
        changed = true;
      }
    }
    if (!changed) break;
  }

  const modeScore = (ritual) => {
    const mode = ritual.mode === 'strict' ? 2 : 1;
    return mode;
  };
  const compareRitualPriority = (a, b) => {
    const modeDelta = modeScore(b) - modeScore(a);
    if (modeDelta !== 0) return modeDelta;
    const prioDelta = Number(b.effectivePriority ?? b.priority ?? 0) - Number(a.effectivePriority ?? a.priority ?? 0);
    if (prioDelta !== 0) return prioDelta;
    return Number(a.declarationOrder || 0) - Number(b.declarationOrder || 0);
  };

  const activeControllers = list
    .filter((r) => r.active && Array.isArray(r.overrides) && r.overrides.length > 0)
    .sort(compareRitualPriority);

  for (const controller of activeControllers) {
    for (const targetName of controller.overrides) {
      const target = byName.get(String(targetName).toLowerCase());
      if (!target || !target.active) continue;
      if (String(target.name || '').toLowerCase() === String(controller.name || '').toLowerCase()) {
        conflicts.push({
          type: 'self-override-ignored',
          ritual: controller.name
        });
        continue;
      }
      target.active = false;
      target.status = 'overridden';
      target.overriddenBy = controller.name;
      conflicts.push({
        type: 'override',
        controller: controller.name,
        target: target.name,
        mode: controller.mode,
        priority: Number(controller.priority || 0),
        effectivePriority: Number(controller.effectivePriority ?? controller.priority ?? 0),
        declarationOrder: Number(controller.declarationOrder || 0)
      });
    }
  }

  for (const controller of activeControllers) {
    for (const targetName of controller.overrides) {
      const target = byName.get(String(targetName).toLowerCase());
      if (!target || target.active) continue;
      if (target.overriddenBy && target.overriddenBy !== controller.name) {
        conflicts.push({
          type: 'override-contended',
          controller: controller.name,
          target: target.name,
          winner: target.overriddenBy
        });
      }
    }
  }

  return { rituals: list, conflicts };
}

function evaluateConstitutions(constitutions, env) {
  const list = Array.isArray(constitutions) ? constitutions : [];
  return list.map((c) => {
    const evalResult = evaluateExpr(c.expr, env);
    return {
      name: c.name || 'constitution',
      expr: c.expr,
      level: String(c.level || 'soft').toLowerCase(),
      action: c.action || null,
      principle: c.principle || null,
      ...evalResult
    };
  });
}

function planActsWithRituals(acts, rituals, constitutions) {
  const baseActs = Array.isArray(acts) ? acts : [];
  const ritualList = Array.isArray(rituals) ? rituals : [];
  const constitutionList = Array.isArray(constitutions) ? constitutions : [];
  const planned = baseActs.map((act) => ({ ...act, ritualBoost: 0, rituals: [] }));

  for (const ritual of ritualList) {
    if (!ritual.active || !ritual.action) continue;
    for (const act of planned) {
      if (String(act.action || '').toLowerCase() === String(ritual.action).toLowerCase()) {
        act.ritualBoost += ritual.mode === 'strict' ? 0.35 : 0.2;
        act.rituals.push(ritual.name);
      }
    }
  }

  for (const constitution of constitutionList) {
    if (!constitution.action) continue;
    if (constitution.status !== 'evaluated' || constitution.passed !== false) continue;
    for (const act of planned) {
      if (String(act.action || '').toLowerCase() === String(constitution.action).toLowerCase()) {
        const penalty = constitution.level === 'hard' ? 1 : 0.45;
        act.ritualBoost -= penalty;
        act.constitutionPenalty = Number((act.constitutionPenalty || 0) + penalty);
      }
    }
  }

  planned.sort((a, b) => Number(b.ritualBoost || 0) - Number(a.ritualBoost || 0));
  return planned;
}

function buildGovernanceDecision(input) {
  const {
    guarantees,
    vows,
    constitutions,
    rituals,
    actsPlanned,
    ritualConflicts,
    strict,
    hasUnknownGuarantee,
    hasHardVowUnknown,
    hasHardConstitutionUnknown
  } = input;

  const order = ['constitution', 'vow', 'ritual', 'strategy'];
  const guaranteesList = Array.isArray(guarantees) ? guarantees : [];
  const vowsList = Array.isArray(vows) ? vows : [];
  const constitutionsList = Array.isArray(constitutions) ? constitutions : [];
  const ritualsList = Array.isArray(rituals) ? rituals : [];
  const ritualConflictsList = Array.isArray(ritualConflicts) ? ritualConflicts : [];

  const hardFailedConstitution = constitutionsList.find((c) => c.level === 'hard' && c.status === 'evaluated' && c.passed === false) || null;
  const hardFailedVow = vowsList.find((v) => v.level === 'hard' && v.status === 'evaluated' && v.passed === false) || null;
  const failedGuarantee = guaranteesList.find((g) => g.status === 'evaluated' && g.passed === false) || null;

  if (hardFailedConstitution) {
    return {
      blocked: true,
      blockReason: 'constitution-failed-hard',
      winner: 'constitution',
      precedence: order,
      detail: hardFailedConstitution.name || 'constitution',
      conflictCount: ritualConflictsList.length
    };
  }

  if (hardFailedVow) {
    return {
      blocked: true,
      blockReason: 'vow-failed-hard',
      winner: 'vow',
      precedence: order,
      detail: hardFailedVow.name || 'vow',
      conflictCount: ritualConflictsList.length
    };
  }

  if (failedGuarantee) {
    return {
      blocked: true,
      blockReason: 'guarantee-failed',
      winner: 'strategy',
      precedence: order,
      detail: failedGuarantee.name || 'guarantee',
      conflictCount: ritualConflictsList.length
    };
  }

  if (strict && hasHardConstitutionUnknown) {
    return {
      blocked: true,
      blockReason: 'constitution-unknown-hard',
      winner: 'constitution',
      precedence: order,
      detail: 'strict+unknown',
      conflictCount: ritualConflictsList.length
    };
  }

  if (strict && hasHardVowUnknown) {
    return {
      blocked: true,
      blockReason: 'vow-unknown-hard',
      winner: 'vow',
      precedence: order,
      detail: 'strict+unknown',
      conflictCount: ritualConflictsList.length
    };
  }

  if (strict && hasUnknownGuarantee && guaranteesList.length > 0) {
    return {
      blocked: true,
      blockReason: 'guarantee-unknown',
      winner: 'strategy',
      precedence: order,
      detail: 'strict+unknown',
      conflictCount: ritualConflictsList.length
    };
  }

  const activeRitual = ritualsList.find((r) => r.active) || null;
  if (activeRitual) {
    const dominantRitual = ritualsList
      .filter((r) => r.active)
      .sort((a, b) => {
        const modeDelta = (b.mode === 'strict' ? 2 : 1) - (a.mode === 'strict' ? 2 : 1);
        if (modeDelta !== 0) return modeDelta;
        const prioDelta = Number(b.effectivePriority ?? b.priority ?? 0) - Number(a.effectivePriority ?? a.priority ?? 0);
        if (prioDelta !== 0) return prioDelta;
        return Number(a.declarationOrder || 0) - Number(b.declarationOrder || 0);
      })[0] || activeRitual;
    const topAction = (Array.isArray(actsPlanned) ? actsPlanned : []).find((a) => Number(a.ritualBoost || 0) > 0) || null;
    return {
      blocked: false,
      blockReason: null,
      winner: 'ritual',
      precedence: order,
      detail: dominantRitual?.name || topAction?.action || activeRitual.name || null,
      conflictCount: ritualConflictsList.length
    };
  }

  return {
    blocked: false,
    blockReason: null,
    winner: guaranteesList.length > 0 ? 'strategy' : 'none',
    precedence: order,
    detail: null,
    conflictCount: ritualConflictsList.length
  };
}

module.exports = {
  toNumber,
  resolvePath,
  parseOperand,
  evaluateExpr,
  evaluateRituals,
  resolveRitualGovernance,
  evaluateConstitutions,
  planActsWithRituals,
  buildGovernanceDecision
};
