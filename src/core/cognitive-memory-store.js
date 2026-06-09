'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_SCHEMA = 'noeon.cognitive.memory/v1';

function memoryDir(options = {}) {
  const base = options.memory_dir
    || options.memoryDir
    || process.env.NOEON_MEMORY_DIR
    || path.join(process.cwd(), '.noeon', 'memory');
  const agentId = sanitizeId(options.agent_id || options.agentId || options.task || 'default');
  return path.join(base, agentId);
}

function memoryFile(options = {}) {
  return path.join(memoryDir(options), 'world-model.json');
}

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'default';
}

function loadWorldModelMemory(options = {}) {
  const file = memoryFile(options);
  if (!fs.existsSync(file)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (payload.schema !== MEMORY_SCHEMA) return null;
    return payload;
  } catch {
    return null;
  }
}

function saveWorldModelMemory(snapshot, options = {}) {
  if (!snapshot) return null;
  const dir = memoryDir(options);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = memoryFile(options);
  const payload = {
    schema: MEMORY_SCHEMA,
    savedAt: new Date().toISOString(),
    agent_id: sanitizeId(options.agent_id || options.agentId || options.task || 'default'),
    worldModel: snapshot
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return file;
}

function resolveMemoryOptions(ast, options = {}) {
  const agentId = options.agent_id
    || options.agentId
    || ast?.task
    || ast?.agents?.[0]?.name
    || ast?.cognition?.goal?.slice(0, 48)
    || options.filename
    || 'default';
  return {
    ...options,
    agent_id: sanitizeId(agentId),
    persist: options.persistMemory
      ?? options.persist_memory
      ?? process.env.NOEON_MEMORY_PERSIST === '1'
  };
}

module.exports = {
  MEMORY_SCHEMA,
  memoryDir,
  memoryFile,
  loadWorldModelMemory,
  saveWorldModelMemory,
  resolveMemoryOptions
};
