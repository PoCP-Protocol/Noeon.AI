'use strict';

const fs = require('fs');
const path = require('path');
const { isLiminalSyntax } = require('./detect');
const { parseLiminalProgram } = require('./parser');
const { lowerLiminalProgram } = require('./lower');
const { mergeDualSource, resolveDualSourcePaths } = require('./dual-source');

function parseLiminalSource(source, options = {}) {
  const liminal = parseLiminalProgram(source, options);
  return lowerLiminalProgram(liminal);
}

function parseLiminalDualSource(humanSource, machineSource, options = {}) {
  const { program, conflicts } = mergeDualSource(humanSource, machineSource, options);
  const ast = lowerLiminalProgram(program);
  ast.liminal.dualSource = {
    conflicts,
    merged: true
  };
  return ast;
}

function loadLiminalFromFile(filePath, options = {}) {
  const resolved = path.resolve(filePath);
  const { humanPath, machinePath } = resolveDualSourcePaths(resolved);

  if (fs.existsSync(humanPath)) {
    const humanSource = fs.readFileSync(humanPath, 'utf8');
    const machineSource = fs.existsSync(machinePath) ? fs.readFileSync(machinePath, 'utf8') : '';
    const ast = parseLiminalDualSource(humanSource, machineSource, {
      ...options,
      filename: humanPath
    });
    ast.liminal.dualSource = {
      ...ast.liminal.dualSource,
      humanPath,
      machinePath: fs.existsSync(machinePath) ? machinePath : null
    };
    return ast;
  }

  const source = fs.readFileSync(resolved, 'utf8');
  return parseLiminalSource(source, { ...options, filename: resolved });
}

function tryParseLiminal(source, options = {}) {
  if (!isLiminalSyntax(source, options)) return null;
  return parseLiminalSource(source, options);
}

module.exports = {
  isLiminalSyntax,
  parseLiminalProgram,
  lowerLiminalProgram,
  parseLiminalSource,
  parseLiminalDualSource,
  loadLiminalFromFile,
  tryParseLiminal,
  mergeDualSource,
  resolveDualSourcePaths
};
