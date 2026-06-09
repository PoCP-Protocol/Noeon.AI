'use strict';

const DECLARATION_SCHEMA = 'noeon.declarations/v1';

const KNOWN_EFFECTS = new Set(['pure', 'io', 'ai', 'external', 'external_send', 'network', 'memory']);

function createDeclarationBundle() {
  return {
    schema: DECLARATION_SCHEMA,
    models: [],
    tools: [],
    data: [],
    capabilities: [],
    effects: []
  };
}

function normalizeDeclarationEntry(kind, name, params = {}) {
  return {
    kind,
    name: String(name),
    params: { ...params },
    source: 'general.declaration'
  };
}

function mergeDeclarationBundles(target, source) {
  if (!source) return target;
  for (const m of source.models || []) target.models.push(m);
  for (const t of source.tools || []) target.tools.push(t);
  for (const d of source.data || []) target.data.push(d);
  for (const c of source.capabilities || []) target.capabilities.push(c);
  for (const e of source.effects || []) target.effects.push(e);
  return target;
}

function indexDeclarations(bundle) {
  const models = new Map();
  const tools = new Map();
  const data = new Map();
  const capabilities = new Map();
  const effects = new Map();
  for (const m of bundle?.models || []) models.set(m.name, m);
  for (const t of bundle?.tools || []) tools.set(t.name, t);
  for (const d of bundle?.data || []) data.set(d.name, d);
  for (const c of bundle?.capabilities || []) capabilities.set(c.name, c);
  for (const e of bundle?.effects || []) effects.set(e.name, e);
  return { models, tools, data, capabilities, effects };
}

function buildDeclarationBrief(bundle) {
  if (!bundle) return null;
  return {
    schema: DECLARATION_SCHEMA,
    models: (bundle.models || []).map((m) => m.name),
    tools: (bundle.tools || []).map((t) => t.name),
    data: (bundle.data || []).map((d) => d.name),
    capabilities: (bundle.capabilities || []).map((c) => c.name),
    effects: (bundle.effects || []).map((e) => e.name),
    counts: {
      models: bundle.models?.length || 0,
      tools: bundle.tools?.length || 0,
      data: bundle.data?.length || 0,
      capabilities: bundle.capabilities?.length || 0,
      effects: bundle.effects?.length || 0
    }
  };
}

module.exports = {
  DECLARATION_SCHEMA,
  KNOWN_EFFECTS,
  createDeclarationBundle,
  normalizeDeclarationEntry,
  mergeDeclarationBundles,
  indexDeclarations,
  buildDeclarationBrief
};
