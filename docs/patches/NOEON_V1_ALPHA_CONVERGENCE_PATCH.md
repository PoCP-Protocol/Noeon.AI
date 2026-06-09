# Noeon v1.0-alpha Convergence Patch

This patch moves Noeon from a broad cognitive-language prototype toward a developer-readable v1.0-alpha baseline.

## Changes

1. Align `package.json` metadata with v1.0-alpha positioning.
2. Add Cognitive IR schema documentation.
3. Add a practical Code Review Agent example.

## Commands to verify

```bash
npm test
npm run test:golden
node src/cli.js compile examples/code_review_agent.noeon --format ir
node src/cli.js run examples/code_review_agent.noeon --trace
```

## Recommended next patch

Implement real tool bindings for:

```text
file.read
http.request
github.fetch_pr
```

Then `ACT` and `PERCEIVE` can move from symbolic execution toward real task execution.
