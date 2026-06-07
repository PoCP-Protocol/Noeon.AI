'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_BUS_DIR = path.join(process.cwd(), 'artifacts', 'mycelium');
const EVENTS_SUBDIR = 'events';

function eventsDir(dir = DEFAULT_BUS_DIR) {
  const root = path.join(dir || DEFAULT_BUS_DIR, EVENTS_SUBDIR);
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return root;
}

function eventPath(cluster, dir = DEFAULT_BUS_DIR) {
  const safe = String(cluster).replace(/[^\w.-]+/g, '_');
  return path.join(eventsDir(dir), `${safe}.jsonl`);
}

function publishEvent(cluster, event, options = {}) {
  const file = eventPath(cluster, options.dir);
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    cluster,
    ts: new Date().toISOString(),
    ...event
  };
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

function readEvents(cluster, options = {}) {
  const file = eventPath(cluster, options.dir);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const events = lines.map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  if (options.sinceId) {
    const idx = events.findIndex((e) => e.id === options.sinceId);
    return idx >= 0 ? events.slice(idx + 1) : events;
  }
  if (options.sinceTs) {
    return events.filter((e) => e.ts > options.sinceTs);
  }
  if (options.limit) return events.slice(-options.limit);
  return events;
}

function subscribePoll(cluster, handler, options = {}) {
  let lastTs = options.sinceTs || null;
  const interval = options.intervalMs || 2000;
  const dir = options.dir;

  const tick = () => {
    const batch = readEvents(cluster, { dir, sinceTs: lastTs || undefined });
    for (const event of batch) {
      handler(event);
      lastTs = event.ts;
    }
  };

  tick();
  const timer = setInterval(tick, interval);
  return () => clearInterval(timer);
}

module.exports = {
  EVENTS_SUBDIR,
  eventsDir,
  eventPath,
  publishEvent,
  readEvents,
  subscribePoll
};
