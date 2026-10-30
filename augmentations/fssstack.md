# Fssstack augmentation


## When to use

Apply this after creating a new fssstack project.

## Instructions

- Docs folder

### Local tool selection with mise

The public shell owns `.node-version`, `package.json#engines.node`,
`package.json#packageManager`, and `pnpm-workspace.yaml`. Preserve those as the
sources of truth. Add the following root `mise.toml` for our local workflow:

```toml
# Read the canonical versions; do not duplicate pins here.
[settings]
idiomatic_version_file_enable_tools = ["node", "pnpm"]
```

Run `mise trust` and `mise install`, then verify `mise exec -- node --version`
and `mise exec -- pnpm --version` match the pins. Use an activated mise shell
or `mise exec -- zap ...` so services and tasks inherit the selected tools.
Do not add duplicate `[tools]` pins, `.nvmrc`, or `.tool-versions` files.
Zapper remains the task/process runner; mise only selects tools.

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

### ArcNet

Ask whether the project will deploy any applications through ArcNet. If yes, use **full ArcNet** and follow the `fm read SETUP.md --store mp-lb/arcnet`, including the shared secrets and variables setup and the selected deployment capabilities.

If no, ask whether to set up the basic ArcNet secrets and variables infrastructure. If yes, use **minimal ArcNet**: follow the `fm read SETUP.md --store mp-lb/arcnet` for its shared setup, with no application deployment services or Vercel sites. If no, choose **no ArcNet** and skip ArcNet configuration and provisioning entirely.

Use `projectSlug` and `githubRepository` from `fssstack.yaml` when following the ArcNet setup. Record the chosen implementation in the project's context so later work can extend it deliberately.

Deployment workflows should read `.node-version` with `actions/setup-node` and
let `pnpm/action-setup` read `package.json`. Align provider/container Node majors
with the project contract; never maintain independent tool pins in CI.
