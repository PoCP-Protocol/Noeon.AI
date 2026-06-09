'use strict';

function resolveActPlugin(params = {}) {
  if (params.plugin) return params.plugin;
  if (params.channel === 'http' || params.channel === 'web') return 'http_call';
  if (params.channel === 'fs') return 'fs_call';
  return null;
}

function buildActBinding(params = {}) {
  const plugin = resolveActPlugin(params);
  if (!plugin) return null;

  if (plugin === 'fs_call') {
    const op = params.op || params.operation ||
      (params.action === 'write' ? 'write' : params.action === 'list' ? 'list' : 'read');
  return {
    plugin: 'fs_call',
    op,
    path: params.path || params.file || params.target,
    content: params.content ?? params.body ?? null,
    mock: params.mock === true || String(params.mock).toLowerCase() === 'true',
    allow_paths: params.allow_paths,
    allow_write: params.allow_write,
    root: params.root,
    version: params.version || null,
    signature: params.signature || null
  };
  }

  const method = params.method ||
    (params.action === 'post' ? 'POST' : params.action === 'fetch' ? (params.httpMethod || 'GET') : 'GET');

  return {
    plugin: 'http_call',
    endpoint: params.endpoint || params.url,
    url: params.url || params.endpoint,
    method: String(method).toUpperCase(),
    body: params.body != null ? String(params.body) : null,
    extract: params.extract || (params.channel === 'web' ? 'text' : null),
    mock: params.mock === true || String(params.mock).toLowerCase() === 'true',
    timeout_ms: params.timeout_ms != null ? Number(params.timeout_ms) : 5000,
    allow_hosts: params.allow_hosts,
    allow_private: params.allow_private,
    version: params.version || null,
    signature: params.signature || null
  };
}

function actCollaborateParams(act, extra = {}) {
  const step = act.step || act.action || act.name || 'act';
  const plugin = resolveActPlugin(act);
  return {
    mode: 'delegate',
    action: step,
    channel: act.channel || 'runtime',
    plugin,
    endpoint: act.url || act.endpoint,
    url: act.url || act.endpoint,
    path: act.path || act.file,
    op: act.op || act.operation,
    method: act.method,
    body: act.body,
    content: act.content,
    extract: act.extract,
    mock: act.mock,
    timeout_ms: act.timeout_ms,
    allow_hosts: act.allow_hosts,
    allow_private: act.allow_private,
    allow_paths: act.allow_paths,
    allow_write: act.allow_write,
    root: act.root,
    version: act.version,
    signature: act.signature,
    safety: act.safety || 'standard',
    ...extra
  };
}

module.exports = {
  resolveActPlugin,
  buildActBinding,
  actCollaborateParams
};
