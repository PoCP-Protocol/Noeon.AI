'use strict';

const path = require('path');
const { parseNoeonInput, planNoeonProgram } = require('../src/core/pipeline');
const { prepareCanonicalExecution } = require('../src/core/canonical-runtime');
const { buildCognitiveBridge, injectCanonicalBridge } = require('../src/core/canonical-cognitive-bridge');
const { AELtoIRCompiler } = require('../src/core/cognitive-ir');
const { routePhaseLabel } = require('../src/core/canonical-route');
const { PHASE } = require('../src/vm/phases');

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

console.log('\n\x1b[36m═══ Canonical → Cognitive IR Bridge ═══\x1b[0m\n');

const agentFile = path.join(__dirname, '../examples/agent_field.noeon');
const source = require('fs').readFileSync(agentFile, 'utf8');
const { ast } = parseNoeonInput(source, { filename: agentFile });

const prep = prepareCanonicalExecution(ast, { filename: agentFile });
assert(prep.cognitiveBridge?.intent?.goal != null, 'prepareCanonicalExecution attaches cognitive bridge');
assert(ast.cognition?.context?._cognitiveBridge != null, 'bridge stored on AST context');

const bridge = buildCognitiveBridge(prep.canonical, prep.governance, prep.plan);
assert(bridge.governance?.winner_tier != null || bridge.capabilities?.general, 'bridge captures governance or capabilities');

const compiler = new AELtoIRCompiler();
const { program: baseProgram } = compiler.compile(JSON.parse(JSON.stringify(ast)));
const baseMeta = baseProgram.metas.filter((n) => n.params?.metadata?.bridge).length;
const baseCanonical = baseProgram.intents.filter((n) => n.source === 'canonical').length;

const { program } = compiler.compile(ast);
const bridgedMeta = program.metas.filter((n) => n.params?.metadata?.bridge || n.params?.type === 'governance_arbitration').length;
const bridgedConstraints = program.constraints.filter((n) => n.source === 'canonical').length;
const bridgedIntents = program.intents.filter((n) => n.source === 'canonical').length;

assert(bridgedMeta >= baseMeta, 'compiler injects canonical governance META');
assert(bridgedIntents >= baseCanonical, 'compiler injects canonical INTENT when needed');

const plan = planNoeonProgram(ast, { filename: agentFile, with_protocol: 'off' });
const label = routePhaseLabel(plan.route);
assert(label.includes(PHASE.CANONICAL), 'route label includes canonical phase');
assert(label.includes(PHASE.COGNITIVE), 'route label includes cognitive phase');

const empty = injectCanonicalBridge(null, bridge);
assert(empty == null, 'inject handles null program');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
