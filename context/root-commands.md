## Root Commands

The root has no `package.json`. Use the owning folder:

- Landing page dev: `pnpm -C fssstack-start dev`
- Landing page build: `pnpm -C fssstack-start build`
- Landing page lint: `pnpm -C fssstack-start lint`
- Landing page test: `pnpm -C fssstack-start test`
- Shell install: `pnpm -C flatpack-shell install`
- Shell typecheck: `pnpm -C flatpack-shell typecheck`
- Shell test: `pnpm -C flatpack-shell test`
- Shell build: `pnpm -C flatpack-shell build`

The root `zap.yaml` is only a convenience wrapper for quickly running the shell example. The target repo shell also has its own `flatpack-shell/zap.yaml`.
