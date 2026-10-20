## Validation Expectations

For `fssstack/shell/` changes, prefer:

```bash
pnpm -C fssstack/shell install
pnpm -C fssstack/shell typecheck
pnpm -C fssstack/shell test
pnpm -C fssstack/shell build
```

When validating local run behavior, use Zapper:

```bash
zap t setup
zap up
zap o
```

For `fssstack/` changes, compare the setup instructions against the actual
`fssstack/shell/` shape. The docs must not assume this authoring checkout exists
inside the generated target repo.

When a change alters the basic `fssstack.yaml` input contract, update the
separate [FSS Stack Start repository](https://github.com/mp-lb/fssstack-start)
as part of that work.
