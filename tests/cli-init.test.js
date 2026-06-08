'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseAel } = require('../src/parser');
const { validateAel } = require('../src/validator');
const { runProgram } = require('../src/runtime/unified-runtime');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`);
  }
}

console.log('\n\x1b[36m═══ CLI Init Tests ═══\x1b[0m\n');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noeon-init-'));
  const project = 'thought_app';
  const cliPath = path.join(__dirname, '..', 'src', 'cli.js');

  try {
    const init = spawnSync(process.execPath, [cliPath, 'init', project, '--profile', 'general'], {
      cwd: tmp,
      encoding: 'utf8'
    });

    assert(init.status === 0, 'init --profile general exits successfully');

    const projectDir = path.join(tmp, project);
    const entry = path.join(projectDir, 'main.noeon');
    const configPath = path.join(projectDir, '.noeonrc.json');
    const manifestPath = path.join(projectDir, 'noeon.json');
    assert(fs.existsSync(entry), 'general init creates main.noeon');
    assert(fs.existsSync(configPath), 'general init creates .noeonrc.json');
    assert(fs.existsSync(manifestPath), 'general init creates noeon.json');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert(config.profile === 'general', 'config records general profile');
    assert(config.entry === 'main.noeon', 'config records entry file');
    assert(config.cognition.with_protocol === 'off', 'general init defaults protocol off');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert(manifest.dependencies['std.ai'] === 'builtin', 'manifest includes std.ai');

    const ast = parseAel(fs.readFileSync(entry, 'utf8'));
    const validation = validateAel(ast, { cwd: projectDir });
    assert(ast.profile === 'general', 'generated main.noeon parses as general');
    assert(ast.general?.functions?.length >= 1, 'generated main.noeon includes fn block');
    assert(ast.general.functions.some((f) => f.name === 'main'), 'generated fn main exists');
    assert(ast.llm.asks.length >= 1, 'generated main.noeon includes std.ai ask');
    assert(ast.cognitive.reasonings.length >= 1, 'generated main.noeon includes REASON');
    assert(ast.cognitive.decisions.length >= 1, 'generated main.noeon includes DECIDE');
    assert(ast.cognition.acts.length >= 1, 'generated main.noeon includes ACT');
    assert(ast.cognitive.reflections.length >= 1, 'generated main.noeon includes REFLECT');
    assert(validation.valid === true, 'generated main.noeon validates');

    const run = await runProgram(ast, {
      quiet: true,
      console: false,
      with_protocol: 'off',
      filename: 'main.noeon'
    });
    assert(run.success === true && run.profile === 'general', 'generated main.noeon runs');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
