'use strict';

const { isGeneralSyntax } = require('./detect');
const { parseGeneralProgram } = require('./general-parser');
const { lowerGeneralProgram } = require('./lower');

function parseGeneralSource(source, options = {}) {
  const general = parseGeneralProgram(source, options);
  return lowerGeneralProgram(general);
}

function tryParseGeneral(source, options = {}) {
  if (!isGeneralSyntax(source, options)) return null;
  return parseGeneralSource(source, options);
}

module.exports = {
  isGeneralSyntax,
  parseGeneralProgram,
  lowerGeneralProgram,
  parseGeneralSource,
  tryParseGeneral
};
