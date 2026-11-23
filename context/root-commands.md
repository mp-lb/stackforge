## Root commands

The root has no `package.json`. Use the owning folder:

- Rebuild local agent instructions: `zap task context-build`
- Shell install: `pnpm -C fssstack/shell install`
- Shell typecheck: `pnpm -C fssstack/shell typecheck`
- Shell test: `pnpm -C fssstack/shell test`
- Shell build: `pnpm -C fssstack/shell build`

Shared Expo tooling lives in Tools. Start with `fastnative/README.md` for app setup and `arcnative/README.md` for CI and delivery.
Target projects use the separate `fssstack/shell/zap.yaml`.
