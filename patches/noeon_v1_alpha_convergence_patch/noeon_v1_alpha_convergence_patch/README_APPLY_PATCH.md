# How to apply this patch package

## Option A: Copy files manually

Copy the contents of `files/` into the root of your Noeon.AI repository.

Then run:

```bash
npm test
npm run test:golden
node src/cli.js compile examples/code_review_agent.noeon --format ir
node src/cli.js run examples/code_review_agent.noeon --trace
```

## Option B: Apply patch

From the repository root:

```bash
git apply /path/to/noeon-v1-alpha-convergence.patch
npm test
npm run test:golden
```

If `git apply` fails because your local files have changed, use Option A.
