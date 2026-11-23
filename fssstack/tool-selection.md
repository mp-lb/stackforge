# Tool selection

FSS Stack uses mise for local tool selection. Preserve each project’s package manager and version pins; the policy is uniform tool selection, not a forced pnpm migration.

The shell owns `.node-version`, `package.json#engines.node`,
`package.json#packageManager`, and `pnpm-workspace.yaml`. Preserve those as the
sources of truth. The shell includes this root `mise.toml`:

```toml
# Read the canonical versions; do not duplicate pins here.
[settings]
idiomatic_version_file_enable_tools = ["node", "pnpm"]
```

For an npm project, enable only `node` in that setting and use npm bundled with the selected Node. Preserve an existing runtime version from the project’s build configuration when introducing `.node-version`; align explicit CI/build pins deliberately, without silently upgrading them.

Run `mise trust` and `mise install`, then verify `node --version` and
`pnpm --version` match the pins (use `npm --version` for npm projects).
With mise’s shell integration or shims configured, run commands normally. In a shell without that setup, use `mise exec -- <command>` so the project pins still apply.
Do not add duplicate `[tools]` pins, `.nvmrc`, or `.tool-versions` files.
Zapper remains the task/process runner; mise only selects tools. Keep shared local CLI entrypoints such as `zap` and `fm` in a version-independent PATH directory (for example `~/.local/bin`), linked to their owning local builds, rather than only inside one Node installation. Verify `zap --version` and `fm --version` after changing tool selection.

When aligning an existing project, preserve its pnpm version and choose an
exact Node release compatible with its dependencies and deployed runtime.
Move `save-exact=true` to `saveExact: true` in `pnpm-workspace.yaml`. Remove
`save-prefix=` and use `workspace:*` for internal dependencies rather than
`link-workspace-packages=true`. Audit ordinary internal version ranges before
removing automatic linking. Verify the effective setting with the pinned pnpm
version: older versions such as 10.0.0 still require `save-exact=true` in
`.npmrc`; retain that compatibility exception until pnpm is upgraded.
Delete `.npmrc` only when no npm-specific or
registry/auth settings remain. Do not copy credentials into committed config.

