'use strict';

const fs = require('fs');
const path = require('path');
const { parseAel } = require('../src/parser');
const { lowerToCanonical } = require('../src/core/canonical-lower');
const { buildStackManifest } = require('../src/core/noeon-unified');
const { parseGeneralAgentFile } = require('../src/grammar/agent-block');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ Unified Entry — CONTRACT / ALIGN / GOVERNANCE ═══\x1b[0m\n');

const parityDir = path.join(__dirname, '../examples/parity');
const unifiedPath = path.join(parityDir, 'risk_assess_unified.noeon');
const unifiedSource = fs.readFileSync(unifiedPath, 'utf8');

const ast = parseAel(unifiedSource, { filename: unifiedPath });
assert(ast.inlineCapabilities?.length === 3, 'parses three inline capability blocks');
assert(ast.inlineCapabilities.some((c) => c.kind === 'contract'), 'CONTRACT block applied');
assert(ast.inlineCapabilities.some((c) => c.kind === 'align'), 'ALIGN block applied');
assert(ast.inlineCapabilities.some((c) => c.kind === 'governance'), 'GOVERNANCE block applied');
assert(ast.budget === 1000, 'CONTRACT sets budget');
assert(ast.task === 'risk_assess', 'CONTRACT sets task');
assert(ast.liminal?.covenant?.intent === 'Assess market risk with evidence', 'ALIGN sets covenant intent');
assert(ast.liminal?.beliefs?.length === 1, 'ALIGN parses belief block');
assert(ast.next?.fields?.length === 1, 'GOVERNANCE parses field block');
assert(ast.next?.cells?.length === 1, 'GOVERNANCE parses cell block');
assert(ast.next?.constitutions?.length === 1, 'GOVERNANCE parses constitution');

const stack = buildStackManifest(ast);
assert(stack.capabilities.general === true, 'stack marks general capability');
assert(stack.capabilities.ael === true, 'stack marks ael from CONTRACT');
assert(stack.capabilities.liminal === true, 'stack marks liminal from ALIGN');
assert(stack.capabilities.next === true, 'stack marks next from GOVERNANCE');

const canonical = lowerToCanonical(ast, { filename: unifiedPath });
const PARITY_GOAL = 'Assess market risk with evidence';
assert(canonical.intent.goal === PARITY_GOAL, 'canonical intent matches parity goal');
assert(canonical.capabilities.general === true, 'canonical general capability');
assert(canonical.capabilities.ael === true, 'canonical ael capability');
assert(canonical.capabilities.liminal === true, 'canonical liminal capability');
assert(canonical.capabilities.next === true, 'canonical next capability');
assert(canonical.execution.budget === 1000, 'canonical execution budget');
assert(canonical.alignment.covenant?.intent === PARITY_GOAL, 'canonical alignment covenant');
assert(canonical.governance.constitutions.some((c) => c.name === 'no_unverified_claims'), 'canonical constitution');
assert(canonical.learning.field?.fields?.length === 1, 'canonical field from GOVERNANCE');

const basicPath = path.join(parityDir, 'risk_assess.noeon');
const basicCanon = lowerToCanonical(
  parseAel(fs.readFileSync(basicPath, 'utf8'), { filename: basicPath }),
  { filename: basicPath }
);
assert(basicCanon.intent.goal === canonical.intent.goal, 'unified AGENT goal matches basic parity .noeon');

const limPath = path.join(parityDir, 'risk_assess.lim');
const limCanon = lowerToCanonical(
  parseAel(fs.readFileSync(limPath, 'utf8'), { filename: limPath }),
  { filename: limPath }
);
assert(
  canonical.alignment.covenant?.intent === limCanon.alignment.covenant?.intent,
  'unified ALIGN intent matches risk_assess.lim'
);

const aelPath = path.join(parityDir, 'risk_assess.ael');
const aelCanon = lowerToCanonical(
  parseAel(fs.readFileSync(aelPath, 'utf8'), { filename: aelPath }),
  { filename: aelPath }
);
assert(canonical.execution.budget === aelCanon.execution.budget, 'unified CONTRACT budget matches risk_assess.ael');

const directAst = parseGeneralAgentFile(unifiedSource);
assert(directAst.pendingCapabilities === undefined, 'applyInlineCapabilities clears pending queue');
assert(directAst.agents[0]?.name === 'RiskAssessor', 'direct parse keeps AGENT block');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
