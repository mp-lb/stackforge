## Root commands

The root has no `package.json`. Use the owning folder:

- Rebuild local agent instructions: `zap task context-build`
- Shell install: `pnpm -C fssstack/shell install`
- Shell typecheck: `pnpm -C fssstack/shell typecheck`
- Shell test: `pnpm -C fssstack/shell test`
- Shell build: `pnpm -C fssstack/shell build`

The root `zap.yaml` provides authoring tasks and mobile-script checks. Run
`zap t mobile-scripts-setup` once, then `zap t mobile-scripts-check`; use
`zap t mobile-apply-inputs -- <inputs.env> <target-directory>` for mobile setup.
Target projects use the separate `fssstack/shell/zap.yaml`.
