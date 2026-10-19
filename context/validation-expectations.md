## Validation Expectations

For `flatpack-shell/` changes, prefer:

```bash
pnpm -C flatpack-shell install
pnpm -C flatpack-shell typecheck
pnpm -C flatpack-shell test
pnpm -C flatpack-shell build
```

When validating local run behavior, use Zapper:

```bash
zap t setup
zap up
zap o
```

For `fssstack-start/` changes, use the fssstack-start commands. Before changing framework-sensitive Next.js behavior, check the relevant guide in `fssstack-start/node_modules/next/dist/docs/`.

For `fssstack/` changes, read `TARGET_PROJECT_SHAPE.md` if present and compare the instructions against the actual `flatpack-shell/` shape. The docs must not assume this authoring checkout exists inside the generated target repo.
