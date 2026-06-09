'use strict';

module.exports = {
  module: 'std.github',
  effect: 'external',
  exports: {
    get: {
      effect: 'external',
      githubKind: 'get',
      params: ['path', 'mock', 'timeout_ms']
    },
    post: {
      effect: 'external',
      githubKind: 'post',
      params: ['path', 'body', 'mock', 'timeout_ms']
    },
    repo: {
      effect: 'external',
      githubKind: 'repo',
      params: ['path', 'mock']
    }
  }
};
