'use strict';

const { buildRuntimeModeReport, resolveEffectiveCognitionMode, formatRuntimeModeLine } = require('../src/core/runtime-mode');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32mPASS\x1b[0m ${msg}`); }
  else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); }
}

console.log('\n\x1b[36m═══ Runtime Mode (mock/live) ═══\x1b[0m\n');

const prev = process.env.NOEON_LLM_MODE;
process.env.NOEON_LLM_MODE = 'mock';
const mockMode = resolveEffectiveCognitionMode({}, {});
assert(mockMode.effective === 'mock', 'NOEON_LLM_MODE=mock → mock');

process.env.NOEON_LLM_MODE = 'off';
const detMode = resolveEffectiveCognitionMode({}, {});
assert(detMode.effective === 'deterministic', 'NOEON_LLM_MODE=off → deterministic');

process.env.NOEON_LLM_MODE = 'auto';
delete process.env.OPENAI_API_KEY;
delete process.env.NOEON_API_KEY;
const autoNoKey = resolveEffectiveCognitionMode({}, {});
assert(autoNoKey.effective === 'mock', 'auto without key → mock');

const report = buildRuntimeModeReport({ success: true, profile: 'general' }, null, {});
assert(report.schema === 'noeon.runtime.mode/v1', 'runtime mode schema');
assert(report.cognition?.effective, 'report has effective cognition mode');
assert(report.disclaimer?.includes('mock'), 'report includes disclaimer');
assert(formatRuntimeModeLine(report)?.includes('运行时'), 'format line in Chinese');

if (prev !== undefined) process.env.NOEON_LLM_MODE = prev;
else delete process.env.NOEON_LLM_MODE;

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
