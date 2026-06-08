'use strict';

const fs = require('fs');
const path = require('path');
const { runResonanceGate, resolveAlignment } = require('../src/runtime/liminal/resonance-gate');
const { buildTranscript, formatTranscriptMarkdown } = require('../src/runtime/liminal/transcript');
const { mergeDualSource, resolveDualSourcePaths } = require('../src/grammar/liminal/dual-source');
const { loadLiminalFromFile, parseLiminalDualSource } = require('../src/grammar/liminal');
const { executeProgram } = require('../src/vm/unified-executor');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Liminal v0.2 — Resonance + Dual Source ═══\x1b[0m\n');

const humanSrc = fs.readFileSync(path.join(__dirname, '../examples/code_reviewer.lim.human'), 'utf8');
const machineSrc = fs.readFileSync(path.join(__dirname, '../examples/code_reviewer.lim.machine'), 'utf8');

const merged = mergeDualSource(humanSrc, machineSrc);
assert(merged.program.beliefs[0].confidence === 0.62, 'machine layer updates belief confidence');
assert(merged.program.beliefs[0].claim.includes('breaking API'), 'human claim wins over machine');
assert(merged.program.resonates.length === 1, 'machine layer adds resonate block');
assert(merged.program.resonates[0].alignment === 0.81, 'machine layer supplies alignment score');
assert(merged.conflicts.length === 0, 'no claim conflicts in demo pair');

const ast = parseLiminalDualSource(humanSrc, machineSrc);
assert(ast.liminal.dualSource.merged === true, 'dual source flagged on AST');

const blocked = runResonanceGate(ast, {});
assert(blocked.blocked === false, 'merged alignment 0.81 passes floor 0.75');
assert(blocked.alignments[0].pass === true, 'resonance check passes');

const lowAst = parseLiminalDualSource(humanSrc, machineSrc.replace('0.81', '0.60'));
const blockedLow = runResonanceGate(lowAst, {});
assert(blockedLow.blocked === true, 'low alignment hard-blocks execution');
assert(blockedLow.blockReason === 'resonance_floor', 'block reason is resonance_floor');
assert((blockedLow.dialogues || []).length >= 1, 'dialogue prompts emitted on block');

const alignment = resolveAlignment(
  { source: 'a', target: 'b', mirror: 'hello world' },
  [{ name: 'b', claim: 'hello there world', confidence: 0.9 }],
  {},
  {}
);
assert(alignment > 0.5, 'heuristic alignment uses lexical overlap');

(async () => {
  const loaded = loadLiminalFromFile(path.join(__dirname, '../examples/code_reviewer.lim'));
  assert(loaded.liminal.dualSource?.humanPath != null, 'loadLiminalFromFile detects .human sidecar');

  const runPass = await executeProgram(loaded, {
    quiet: true,
    with_protocol: 'off',
    filename: 'code_reviewer.lim',
    uncertainty_resolved: true
  });
  assert(runPass.success === true, 'dual-source program runs when resonance passes');
  assert(runPass.phases.includes('alignment'), 'alignment phase precedes cognition');
  assert(runPass.alignment?.layer === 'liminal', 'liminal result is exposed as alignment layer');
  assert(runPass.transcript != null, 'transcript attached on success');

  const runBlock = await executeProgram(lowAst, {
    quiet: true,
    with_protocol: 'off',
    uncertainty_resolved: true
  });
  assert(runBlock.success === false, 'hard gate stops VM on low alignment');
  assert(runBlock.resonance.blocked === true, 'result carries resonance block state');
  assert(runBlock.alignment.blocked === true, 'result carries alignment block state');

  const transcript = buildTranscript(runPass, loaded, {});
  const md = formatTranscriptMarkdown(transcript);
  assert(md.includes('Resonance'), 'markdown transcript includes resonance section');
  assert(md.includes('CodeReviewer'), 'markdown transcript includes covenant name');

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
