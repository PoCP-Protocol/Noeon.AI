'use strict';

const PLUGIN_ACTS_STATUS_SCHEMA = 'noeon.plugin.acts.status/v1';

function describePluginAct(act = {}) {
  const plugin = act.plugin || act.binding?.plugin;
  if (!plugin) return null;
  const signature = act.signature || act.binding?.signature || null;
  const version = act.version || act.binding?.version || null;
  return {
    plugin,
    action: act.step || act.action || act.name || 'act',
    signed: Boolean(signature),
    version: version ? String(version) : null
  };
}

function summarizePluginActs(acts = []) {
  const bindings = (acts || []).map(describePluginAct).filter(Boolean);
  return {
    schema: PLUGIN_ACTS_STATUS_SCHEMA,
    total: bindings.length,
    signed: bindings.filter((entry) => entry.signed).length,
    unsigned: bindings.filter((entry) => !entry.signed).length,
    acts: bindings
  };
}

function summarizePluginActsFromCanonical(canonicalIr) {
  const acts = canonicalIr?.execution?.acts || [];
  return summarizePluginActs(acts);
}

function formatPluginActsLine(summary) {
  if (!summary?.total) return null;
  const parts = summary.acts.map((entry) => {
    const flags = [
      entry.signed ? 'signed' : 'unsigned',
      entry.version ? `v${entry.version}` : null
    ].filter(Boolean);
    return `${entry.plugin} (${flags.join(' · ')})`;
  });
  return `plugin acts (${summary.total}): ${parts.join(', ')}`;
}

function attachPluginActsToPayload(payload, canonicalIr) {
  if (!payload || !canonicalIr) return payload;
  const summary = summarizePluginActsFromCanonical(canonicalIr);
  if (summary.total) payload.pluginActs = summary;
  return payload;
}

function formatPluginActsStatusLines(summary) {
  if (!summary?.total) return [];
  const lines = ['Plugin ACTs:'];
  for (const entry of summary.acts) {
    const flags = [
      entry.signed ? 'signed' : 'unsigned',
      entry.version ? `v${entry.version}` : null
    ].filter(Boolean);
    lines.push(`  ${entry.plugin}: ${flags.join(' · ')}`);
  }
  if (summary.unsigned > 0) {
    lines.push('  hint: append version+signature for NOEON_ENV=production (see signed_act_demo.noeon)');
  }
  return lines;
}

module.exports = {
  PLUGIN_ACTS_STATUS_SCHEMA,
  describePluginAct,
  summarizePluginActs,
  summarizePluginActsFromCanonical,
  formatPluginActsLine,
  attachPluginActsToPayload,
  formatPluginActsStatusLines
};
