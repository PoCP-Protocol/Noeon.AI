'use strict';

const fs = require('fs');
const path = require('path');
const { parseNoeonInput, planNoeonProgram, runNoeonPipeline } = require('../src/core/pipeline');
const {
  buildArchitectureManifest,
  classifyExtension,
  assertFrozenEntryExtension,
  GOLDEN_MANIFEST_PATH
} = require('../src/core/canonical-architecture');
const { CORE_SURFACE, resolveIntentGoal } = require('../src/core/surfaces');

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

console.log('\n\x1b[36m═══ Golden Examples (Proof Set) ═══\x1b[0m\n');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, GOLDEN_MANIFEST_PATH), 'utf8'));

assert(manifest.programs?.length === 3, 'golden manifest defines three programs');
assert(buildArchitectureManifest().pipeline.length === 7, 'canonical architecture has seven stages');
assert(classifyExtension('.noeon') === 'general', 'frozen .noeon → general');

try {
  assertFrozenEntryExtension('.xyz');
  assert(false, 'frozen policy should throw');
} catch {
  assert(true, 'frozen policy throws on unknown extension');
}

assert(CORE_SURFACE === 'next', 'core surface remains next');

(async () => {
  for (const golden of manifest.programs) {
    const primaryPath = path.join(root, golden.primary);
    assert(fs.existsSync(primaryPath), `${golden.id}: primary exists (${golden.primary})`);

    const source = fs.readFileSync(primaryPath, 'utf8');
    const { ast } = parseNoeonInput(source, { filename: primaryPath });
    const plan = planNoeonProgram(ast, { filename: primaryPath, with_protocol: 'off' });

    assert(plan.canonical?.version != null, `${golden.id}: lowers to canonical IR`);
    assert(plan.routeLabel, `${golden.id}: derives execution route`);
    assert(plan.architecture?.active_regions?.includes('prefrontal_cortex'), `${golden.id}: executive region in architecture`);

    if (golden.sidecar) {
      const sidePath = path.join(root, golden.sidecar);
      assert(fs.existsSync(sidePath), `${golden.id}: sidecar exists (${golden.sidecar})`);
      const sideSource = fs.readFileSync(sidePath, 'utf8');
      const sideParsed = parseNoeonInput(sideSource, { filename: sidePath });
      assert(sideParsed.ast.liminal || sideParsed.ast.profile === 'liminal', `${golden.id}: sidecar is liminal alignment`);
    }

    const run = await runNoeonPipeline(source, {
      filename: primaryPath,
      with_protocol: 'off',
      quiet: true
    });
    assert(run.result?.success !== false, `${golden.id}: pipeline run succeeds`);
    assert(run.report?.schema?.includes('noeon.canonical.report'), `${golden.id}: emits canonical report`);
    assert(run.report?.observability?.runtime_trace?.phases?.length > 0, `${golden.id}: runtime trace recorded`);
  }

  if (manifest.parity?.files) {
    const parityGoal = manifest.parity.shared_goal;
    const goals = [];
    for (const [surface, relPath] of Object.entries(manifest.parity.files)) {
      const filePath = path.join(root, relPath);
      assert(fs.existsSync(filePath), `parity ${surface}: file exists (${relPath})`);
      const source = fs.readFileSync(filePath, 'utf8');
      const { ast } = parseNoeonInput(source, { filename: filePath });
      const goal = resolveIntentGoal(ast);
      goals.push(goal);
      assert(goal, `parity ${surface}: resolves intent goal`);
    }
    const uniqueGoals = [...new Set(goals.filter(Boolean))];
    assert(uniqueGoals.length === 1, 'parity: four surfaces share one canonical intent');
    assert(uniqueGoals[0] === parityGoal || uniqueGoals[0]?.includes('market risk'), 'parity: goal matches manifest');
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
