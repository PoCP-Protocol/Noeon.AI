'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildCreatorBlueprint,
  buildCreatorCharter,
  writeCreatorBlueprint,
  toMarkdown
} = require('../src/core/ai-creator');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ AI Creator Blueprint ═══\x1b[0m\n');

const blueprint = buildCreatorBlueprint();
const charter = buildCreatorCharter();

assert(blueprint.schema === 'noeon.ai.creator.blueprint/v1', 'blueprint schema');
assert(blueprint.vision.includes('AI-native general programming language'), 'vision names language ambition');
assert(Array.isArray(blueprint.principles) && blueprint.principles.length >= 4, 'principles captured');
assert(blueprint.principles.some((p) => p.includes('Semantics-first')), 'semantics-first principle');
assert(blueprint.principles.some((p) => p.includes('Brain-inspired cognition loop')), 'brain-inspired principle');
assert(Array.isArray(blueprint.workstreams) && blueprint.workstreams.length >= 4, 'expanded workstreams');
assert(blueprint.workstreams.some((w) => w.id === 'native-semantics'), 'native semantics workstream');
assert(blueprint.workstreams.some((w) => w.id === 'self-evolving-runtime'), 'self-evolving runtime workstream');
assert(blueprint.workstreams.some((w) => w.id === 'ecosystem-native-ai'), 'ecosystem workstream');
assert(blueprint.workstreams.some((w) => w.id === 'brain-inspired-cognition'), 'brain-inspired cognition workstream');
assert(blueprint.cognitiveDesignContract && typeof blueprint.cognitiveDesignContract === 'object', 'cognitive design contract present');
assert(Array.isArray(blueprint.cognitiveDesignContract.loop) && blueprint.cognitiveDesignContract.loop.length === 7, 'cognitive loop has seven stages');
assert(blueprint.cognitiveDesignContract.loop.join('->') === 'perceive->attend->reason->decide->act->reflect->learn', 'cognitive loop order fixed');
assert(Array.isArray(blueprint.cognitiveDesignContract.invariants) && blueprint.cognitiveDesignContract.invariants.length >= 4, 'cognitive invariants captured');
assert(blueprint.creatorCharter && blueprint.creatorCharter.name === 'Noeon Creator Charter', 'creator charter present');
assert(charter.invariants.some((x) => x.includes('One language')), 'charter protects one-language invariant');
assert(charter.invariants.some((x) => x.includes('Canonical Semantic IR')), 'charter protects canonical lowering');
assert(charter.decisionRules.some((x) => x.includes('ADR')), 'charter requires ADR for new syntax');
assert(charter.decisionRules.some((x) => x.includes('conformance gates')), 'charter requires gate promotion');
assert(blueprint.readiness.score >= 0 && blueprint.readiness.score <= 100, 'readiness score bounded');
assert(Array.isArray(blueprint.priorityActions) && blueprint.priorityActions.length >= 1, 'priority actions generated');

const markdown = toMarkdown(blueprint);
assert(markdown.includes('# Noeon AI Creator Blueprint'), 'markdown title');
assert(markdown.includes('## Cognitive Design Contract'), 'markdown cognitive contract section');
assert(markdown.includes('## Creator Charter'), 'markdown creator charter section');
assert(markdown.includes('## Workstreams'), 'markdown workstreams');
assert(markdown.includes('## Priority Actions'), 'markdown priority actions');

const outDir = path.join(__dirname, '../artifacts/ai-creator-test');
fs.rmSync(outDir, { recursive: true, force: true });
const written = writeCreatorBlueprint(blueprint, { outDir });

assert(fs.existsSync(written.latestJson), 'latest json written');
assert(fs.existsSync(written.latestMd), 'latest markdown written');
assert(JSON.parse(fs.readFileSync(written.latestJson, 'utf8')).schema === blueprint.schema, 'written json parses');
assert(fs.readFileSync(written.latestMd, 'utf8').includes(blueprint.vision), 'written markdown includes vision');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
