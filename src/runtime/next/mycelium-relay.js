'use strict';

const { publishEvent } = require('./mycelium-bus');

function relayEvent(fromCluster, toCluster, event, options = {}) {
  if (!fromCluster || !toCluster || fromCluster === toCluster) {
    return { relayed: false, reason: 'invalid-clusters' };
  }

  const record = publishEvent(toCluster, {
    ...event,
    type: event.type || 'relay',
    relay_from: fromCluster,
    relay_to: toCluster
  }, options);

  return { relayed: true, from: fromCluster, to: toCluster, event: record };
}

function relayToTargets(fromCluster, targets, event, options = {}) {
  const list = Array.isArray(targets) ? targets : [targets];
  return list.filter(Boolean).map((to) => relayEvent(fromCluster, to, event, options));
}

module.exports = {
  relayEvent,
  relayToTargets
};
