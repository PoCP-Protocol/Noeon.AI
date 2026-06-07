'use strict';

/**
 * Next macro registry — FLUX crystallizes syntax; programs expand @macros at parse time.
 */

const BUILTIN_MACROS = {
  cycle: {
    params: ['threshold'],
    body: [
      '# crystallized @cycle({{threshold}})',
      'CELL cycle_gate {',
      '  energy: {{threshold}}',
      '  claim: "Crystallized observe-reason-decide cycle"',
      '  when energy > 0.5 { emit narrative.cycle }',
      '}'
    ].join('\n')
  },
  pulse: {
    params: ['cell', 'boost'],
    body: [
      'CELL {{cell}}_pulse {',
      '  energy: {{boost}}',
      '  claim: "Crystallized pulse from flux"',
      '  when energy > 0.5 { emit narrative.pulse }',
      '}'
    ].join('\n')
  }
};

const runtimeRegistry = new Map();

function resetRuntimeRegistry() {
  runtimeRegistry.clear();
}

function registerMacro(name, spec) {
  const key = String(name).toLowerCase();
  runtimeRegistry.set(key, spec);
  return spec;
}

function parseCrystallizeSpec(spec) {
  const text = String(spec || '').trim();
  const macro = text.match(/^macro\s+([a-zA-Z_][\w]*)\s*(?:\(([^)]*)\))?$/i);
  if (macro) {
    const params = macro[2]
      ? macro[2].split(',').map((p) => p.trim()).filter(Boolean)
      : [];
    return registerMacro(macro[1], {
      params,
      body: BUILTIN_MACROS[macro[1].toLowerCase()]?.body || '',
      source: 'flux.crystallize',
      crystallized: spec
    });
  }
  return null;
}

function getMacro(name) {
  const key = String(name).toLowerCase();
  if (runtimeRegistry.has(key)) return runtimeRegistry.get(key);
  if (BUILTIN_MACROS[key]) {
    return { ...BUILTIN_MACROS[key], name: key, source: 'builtin' };
  }
  return null;
}

function getMacroRegistry() {
  return {
    builtin: Object.keys(BUILTIN_MACROS),
    runtime: [...runtimeRegistry.keys()]
  };
}

function substituteParams(body, args) {
  let out = body;
  for (const [k, v] of Object.entries(args)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
  }
  return out;
}

function expandMacroInvocation(match, lineNo) {
  const name = match[1];
  const rawArgs = match[2] || '';
  const macro = getMacro(name);
  if (!macro) {
    throw new Error(`Line ${lineNo}: unknown macro '@${name}'`);
  }
  const argValues = rawArgs.split(',').map((a) => a.trim()).filter(Boolean);
  const args = {};
  macro.params.forEach((p, idx) => {
    args[p] = argValues[idx] ?? (p === 'threshold' ? '0.6' : p === 'boost' ? '0.55' : 'auto');
  });
  if (macro.params.length === 0 && argValues.length === 1) {
    args.threshold = argValues[0];
  }
  return substituteParams(macro.body, args);
}

function expandNextSource(source, options = {}) {
  const lines = String(source || '').split(/\r?\n/);
  const expanded = [];
  const macrosUsed = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const invoke = trimmed.match(/^@([a-zA-Z_][\w]*)\s*\(([^)]*)\)\s*$/);
    if (invoke) {
      const body = expandMacroInvocation(invoke, i + 1);
      expanded.push(`# expanded @${invoke[1]} (line ${i + 1})`);
      expanded.push(body);
      macrosUsed.push({ name: invoke[1], line: i + 1 });
      continue;
    }
    expanded.push(line);
  }

  return {
    source: expanded.join('\n'),
    macrosUsed,
    registry: getMacroRegistry()
  };
}

function applyFluxCrystallizations(fluxResults) {
  const registered = [];
  for (const f of fluxResults || []) {
    if (f.crystallize) {
      const spec = parseCrystallizeSpec(f.crystallize);
      if (spec) registered.push({ flux: f.name, macro: spec });
    }
  }
  return registered;
}

module.exports = {
  BUILTIN_MACROS,
  expandNextSource,
  expandMacroInvocation,
  parseCrystallizeSpec,
  registerMacro,
  getMacro,
  getMacroRegistry,
  applyFluxCrystallizations,
  resetRuntimeRegistry
};
