## Root Commands

The root has no `package.json`. Use the owning folder:

- Rebuild local agent instructions: `zap task context-build`
- Shell install: `pnpm -C fssstack/shell install`
- Shell typecheck: `pnpm -C fssstack/shell typecheck`
- Shell test: `pnpm -C fssstack/shell test`
- Shell build: `pnpm -C fssstack/shell build`

The root `zap.yaml` is only a convenience wrapper for the shell example. The
target repo shell has its own `fssstack/shell/zap.yaml`.
