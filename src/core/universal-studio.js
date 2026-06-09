'use strict';

const fs = require('fs');
const path = require('path');
const { parseUniversalSource } = require('../grammar/universal-lower');
const { validateUniversalProgram, UNIVERSAL_FORMULA, DIMENSIONS } = require('./universal-kernel');
const { buildUniversalStatusFromAst } = require('./universal-expand');
const { evaluateAiNative } = require('./ai-native-lens');
const { prepareCanonicalExecution } = require('./canonical-runtime');

const UNIVERSAL_STUDIO_SCHEMA = 'noeon.studio.universal/v1';

function listUniversalExampleFiles(root) {
  const dir = path.join(root, 'examples/universal');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.noeon'))
    .map((f) => path.join('examples/universal', f).replace(/\\/g, '/'));
}

function buildUniversalStudioStatus(options = {}) {
  const root = options.root || process.cwd();
  const programs = [];

  for (const file of listUniversalExampleFiles(root)) {
    const filePath = path.join(root, file);
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      const ast = parseUniversalSource(source, { filename: filePath });
      const prep = prepareCanonicalExecution(ast, { filename: filePath, source });
      const validation = validateUniversalProgram(ast.universal);
      const lens = evaluateAiNative(ast, prep, null);
      const status = buildUniversalStatusFromAst(ast);
      programs.push({
        file,
        name: ast.universal?.name,
        score: validation.score,
        ready: validation.ready,
        grade: lens.grade,
        checks: validation.checks,
        stdlib: ast.universal?.stdlib || null,
        mesh: status?.mesh || { spawns: 0, delegations: 0 },
        fragments: ast.general?.stdlibExpansion || []
      });
    } catch (e) {
      programs.push({ file, error: e.message, ready: false, score: 0 });
    }
  }

  const ready = programs.filter((p) => p.ready).length;
  const avgScore = programs.length
    ? programs.reduce((s, p) => s + (p.score || 0), 0) / programs.length
    : 0;

  const aggregateChecks = {};
  for (const dim of DIMENSIONS.map((d) => d.toLowerCase())) {
    const hits = programs.filter((p) => p.checks?.[dim]).length;
    aggregateChecks[dim] = programs.length ? hits / programs.length : 0;
  }

  return {
    schema: UNIVERSAL_STUDIO_SCHEMA,
    formula: UNIVERSAL_FORMULA,
    generatedAt: new Date().toISOString(),
    summary: { total: programs.length, ready, avgScore },
    aggregateChecks,
    programs
  };
}

module.exports = {
  UNIVERSAL_STUDIO_SCHEMA,
  buildUniversalStudioStatus,
  listUniversalExampleFiles
};
