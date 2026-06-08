'use strict';

const governance = require('./governance-kernel');
const strategyMemory = require('./strategy-memory-kernel');
const evolution = require('./evolution-kernel');
const reflection = require('./reflection-kernel');
const executionContext = require('./execution-context-kernel');
const runtimeOrchestration = require('./runtime-orchestration-kernel');
const resultAssembly = require('./result-assembly-kernel');

module.exports = {
  ...governance,
  ...strategyMemory,
  ...evolution,
  ...reflection,
  ...executionContext,
  ...runtimeOrchestration,
  ...resultAssembly,
  kernels: {
    governance,
    strategyMemory,
    evolution,
    reflection,
    executionContext,
    runtimeOrchestration,
    resultAssembly
  }
};
