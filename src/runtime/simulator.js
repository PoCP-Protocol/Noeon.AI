const path = require('node:path');
const { spawnSync } = require('node:child_process');

/**
 * Legacy simulator entry — sync compatibility wrapper around unified protocol phase.
 * @deprecated Use src/vm/unified-executor.js executeProgram(mode: 'protocol')
 */
function runSuperBrainCycle(compiled, feedback) {
  const runner = path.resolve(__dirname, '..', 'vm', 'protocol-phase-runner.js');
  const payload = JSON.stringify({
    compiled,
    feedback: feedback || {},
    options: {}
  });

  const child = spawnSync(process.execPath, [runner], {
    input: payload,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });

  if (child.error) {
    throw child.error;
  }

  if (child.status !== 0) {
    const message = child.stderr || child.stdout || 'protocol phase runner failed';
    throw new Error(message.trim());
  }

  const output = JSON.parse(child.stdout || '{}');
  if (!output.ok) {
    throw new Error(output.error || 'protocol phase runner failed');
  }

  return output.cycle;
}

module.exports = {
  runSuperBrainCycle
};
