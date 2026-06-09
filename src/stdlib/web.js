'use strict';

module.exports = {
  module: 'std.web',
  effect: 'external',
  exports: {
    fetch: {
      effect: 'external',
      webKind: 'fetch',
      params: ['url', 'mock', 'timeout_ms', 'allow_hosts']
    },
    text: {
      effect: 'external',
      webKind: 'text',
      params: ['url', 'mock', 'timeout_ms', 'allow_hosts']
    },
    title: {
      effect: 'external',
      webKind: 'title',
      params: ['url', 'mock', 'timeout_ms', 'allow_hosts']
    }
  }
};
