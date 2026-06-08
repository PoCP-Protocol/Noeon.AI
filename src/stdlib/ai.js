'use strict';

module.exports = {
  module: 'std.ai',
  effect: 'ai',
  exports: {
    ask: {
      effect: 'ai',
      llmKind: 'ask',
      params: ['query', 'model', 'temperature', 'max_tokens', 'context']
    },
    embed: {
      effect: 'ai',
      llmKind: 'embed',
      params: ['text', 'store_as', 'tags']
    },
    think_with: {
      effect: 'ai',
      llmKind: 'think_with',
      params: ['query', 'model', 'strategy', 'depth']
    }
  }
};
