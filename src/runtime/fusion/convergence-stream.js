'use strict';

/**
 * In-memory convergence event stream for live drift monitoring (SSE/Web).
 */

const MAX_EVENTS = 200;
const events = [];

function recordConvergenceEvent(payload) {
  const entry = {
    ts: new Date().toISOString(),
    schema: 'noeon.convergence.event/v1',
    coherence: payload.coherence ?? payload.matrix?.coherence?.score ?? null,
    aligned: payload.aligned ?? payload.matrix?.aligned ?? null,
    drift_count: payload.drift_count ?? payload.matrix?.drift?.length ?? 0,
    pulse: payload.pulse?.action ?? payload.pulse ?? null,
    relay: payload.relay?.action ?? payload.relay ?? null,
    surface: payload.surface ?? null,
    file: payload.file ?? null,
    blocked: payload.blocked ?? false,
    ...payload
  };
  events.push(entry);
  while (events.length > MAX_EVENTS) events.shift();
  return entry;
}

function getConvergenceStream(limit = 30) {
  const n = Math.max(1, Math.min(limit, MAX_EVENTS));
  return events.slice(-n);
}

function getLatestConvergenceEvent() {
  return events.length ? events[events.length - 1] : null;
}

function clearConvergenceStream() {
  events.length = 0;
}

module.exports = {
  recordConvergenceEvent,
  getConvergenceStream,
  getLatestConvergenceEvent,
  clearConvergenceStream
};
