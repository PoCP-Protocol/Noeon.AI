'use strict';

const { runProtocolCycle } = require('./protocol-phase');

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

(async () => {
  try {
    const raw = await readStdin();
    const payload = raw ? JSON.parse(raw) : {};
    const cycle = await runProtocolCycle(
      payload.compiled,
      payload.feedback || {},
      payload.options || {}
    );

    process.stdout.write(JSON.stringify({ ok: true, cycle }));
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: error?.stack || error?.message || 'protocol phase runner failed'
      })
    );
    process.exit(1);
  }
})();
