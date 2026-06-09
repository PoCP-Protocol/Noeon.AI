'use strict';

const { classifyDeclaredEffects, buildEffectReport, validateEffectPolicy } = require('../src/core/cognitive-effect');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Cognitive Effects ═══\x1b[0m\n');

const helloAst = {
  cognition: {
    goal: 'test',
    acts: [{ action: 'greet', channel: 'console', plugin: 'runtime' }]
  },
  cognitive: { reasonings: [{ strategy: 'deductive' }] }
};

assert(classifyDeclaredEffects(helloAst).includes('io'), 'console act is io');
assert(classifyDeclaredEffects(helloAst).includes('ai'), 'cognitive program includes ai');

const agentAst = {
  agents: [{
    name: 'A',
    policy: { human_must_approve: true },
    tools: ['http_call']
  }]
};
assert(classifyDeclaredEffects(agentAst).includes('governance'), 'human gate adds governance');
assert(classifyDeclaredEffects(agentAst).includes('external'), 'http tool is external');

const report = buildEffectReport(agentAst, { awaitingHuman: true, ast: agentAst });
assert(report.valid === true, 'runtime effects match declared for agent');

const blocked = validateEffectPolicy(agentAst, {}, { allow: ['ai', 'pure'] });
assert(blocked.policy_valid === false, 'policy can block external/io effects');

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
