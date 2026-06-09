'use strict';

module.exports = {
  module: 'std.http',
  effect: 'external',
  exports: {
    get: {
      effect: 'external',
      httpKind: 'get',
      params: ['url', 'timeout_ms', 'allow_hosts', 'mock']
    },
    post: {
      effect: 'external',
      httpKind: 'post',
      params: ['url', 'body', 'timeout_ms', 'allow_hosts', 'mock']
    },
    fetch: {
      effect: 'external',
      httpKind: 'fetch',
      params: ['url', 'method', 'body', 'timeout_ms', 'allow_hosts', 'mock']
    }
  }
};
