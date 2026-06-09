'use strict';

module.exports = {
  module: 'std.fs',
  effect: 'io',
  exports: {
    read: {
      effect: 'io',
      fsKind: 'read',
      params: ['path', 'mock', 'allow_paths']
    },
    write: {
      effect: 'io',
      fsKind: 'write',
      params: ['path', 'content', 'mock', 'allow_write']
    },
    list: {
      effect: 'io',
      fsKind: 'list',
      params: ['path', 'mock', 'allow_paths']
    }
  }
};
