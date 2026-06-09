'use strict';

const { KNOWN_EFFECTS, indexDeclarations } = require('../core/declaration-ir');
const { isStdAiExport, isStdUniversalExport } = require('../stdlib/registry');
const { inferBodyEffect } = require('./effects');

function validateDeclarations(ast, errors, warnings = []) {
  const bundle = ast.general?.declarations;
  if (!bundle) return;

  const idx = indexDeclarations(bundle);
  const names = { model: new Set(), tool: new Set(), data: new Set(), capability: new Set(), effect: new Set() };

  for (const m of bundle.models || []) {
    if (names.model.has(m.name)) errors.push(`duplicate MODEL declaration '${m.name}'`);
    names.model.add(m.name);
    if (!m.params?.type) warnings.push(`MODEL '${m.name}' should declare type=llm|embedding|vision|speech|reranker`);
  }

  for (const t of bundle.tools || []) {
    if (names.tool.has(t.name)) errors.push(`duplicate TOOL declaration '${t.name}'`);
    names.tool.add(t.name);
    const cap = t.params?.capability;
    if (cap && !idx.capabilities.has(String(cap))) {
      errors.push(`TOOL '${t.name}' references undeclared CAPABILITY '${cap}'`);
    }
  }

  for (const d of bundle.data || []) {
    if (names.data.has(d.name)) errors.push(`duplicate DATA declaration '${d.name}'`);
    names.data.add(d.name);
    if (!d.params?.type) warnings.push(`DATA '${d.name}' should declare type=document|table|vector|stream|memory`);
  }

  for (const c of bundle.capabilities || []) {
    if (names.capability.has(c.name)) errors.push(`duplicate CAPABILITY declaration '${c.name}'`);
    names.capability.add(c.name);
    for (const eff of c.params?.effects || []) {
      const e = String(eff);
      if (!KNOWN_EFFECTS.has(e) && !idx.effects.has(e)) {
        warnings.push(`CAPABILITY '${c.name}' effect '${e}' is not a known or declared EFFECT`);
      }
    }
  }

  for (const e of bundle.effects || []) {
    if (names.effect.has(e.name)) errors.push(`duplicate EFFECT declaration '${e.name}'`);
    names.effect.add(e.name);
  }

  const importContext = ast.general?.importContext || {};
  const localFunctions = new Set((ast.general?.functions || []).map((fn) => fn.name));
  for (const fn of ast.general?.functions || []) {
    const bodyEffect = inferBodyEffect(fn.body, importContext);
    for (const stmt of fn.body || []) {
      if (stmt.kind === 'call' && !isStdAiExport(stmt.callee, importContext) &&
          !isStdUniversalExport(stmt.callee, importContext)) {
        if (idx.tools.size > 0 && !idx.tools.has(stmt.callee) && !localFunctions.has(stmt.callee)) {
          errors.push(`fn '${fn.name}': call '${stmt.callee}()' without declared TOOL`);
        }
      }
    }
    if (bodyEffect === 'external' && idx.effects.has('external_send')) {
      const eff = idx.effects.get('external_send');
      if (eff.params?.requires === 'human_gate' && !ast.fusionRelay?.enabled &&
          !(ast.fusion || ast.general?.fusion || []).some((f) => f.target === 'relay')) {
        warnings.push(`fn '${fn.name}': external effect body should include FUSE relay human_gate per EFFECT external_send`);
      }
    }
  }

  if ((bundle.tools || []).length === 0 && (bundle.models || []).length === 0 && (bundle.data || []).length === 0) {
    warnings.push('program has declaration block but no MODEL, TOOL, or DATA defined');
  }
}

module.exports = {
  validateDeclarations
};
