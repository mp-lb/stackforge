# Fssstack augmentation


## When to use

Apply this after creating a new fssstack project.

## Instructions

### Agent context

Keep all nine public-shell context blocks, including `standards.md` and `code-style.md`: FSS Stack ships MAP Lab's public standards by default. Install MapLab's focused payloads from this store after base setup:

```sh
set -e
mkdir -p context
fm read context/maplab-workflow.md --store mp-lb/augmentations > context/maplab-workflow.md
fm read context/maplab-toolchain.md --store mp-lb/augmentations > context/maplab-toolchain.md
```

For each file, add its `@filename.md` import to `context/index.md` exactly once. Merge existing customized blocks instead of overwriting them. Install mise configuration and the toolchain block in every project receiving this augmentation; do not make it an optional per-project choice. Record the project's actual Forum store/sync mapping (or lack of one) in `context/documentation.md`. Run `zap task context-build` and commit sources plus all three outputs. Never import the old mixed global block.

Capability-specific MapLab additions belong with their Clerk, Electron or Shad augmentation. Public extension instructions and payloads live at `extensions/<extension>/README.md` and `extensions/<extension>/context/` in `mp-lb/fssstack`.

### Reconcile existing context

Use the public [context contract](https://github.com/mp-lb/stackforge/blob/main/fssstack/standards/context-files.md) when aligning an existing project. The base is nine blocks, including MAP Lab’s public standards and code style. This augmentation adds workflow and mise toolchain guidance to every project. Consolidate legacy running, package-map, project-mode and agent-responsibility blocks into their standard homes. Preserve product-specific rules and testing restrictions. Do not copy every augmentation or extension into every project.

### Loading screen

For each React frontend, apply the [Shad augmentation](shad.md) after shadcn/ui
and Tailwind are initialized. Wire its `FullScreenLoading` into application
and session readiness gates, including root Suspense fallbacks where present.

### Local tool selection with mise

Mise is mandatory for all projects receiving this augmentation. Preserve each project’s package manager and version pins; the policy is uniform tool selection, not a forced pnpm migration. Track adoption and extension coverage in [Context inventory](context-inventory.md).

The public shell owns `.node-version`, `package.json#engines.node`,
`package.json#packageManager`, and `pnpm-workspace.yaml`. Preserve those as the
sources of truth. Add the following root `mise.toml` for our local workflow:

```toml
# Read the canonical versions; do not duplicate pins here.
[settings]
idiomatic_version_file_enable_tools = ["node", "pnpm"]
```

For an npm project, enable only `node` in that setting and use npm bundled with the selected Node. Preserve an existing runtime version from the project’s build configuration when introducing `.node-version`; align explicit CI/build pins deliberately, without silently upgrading them.

Run `mise trust` and `mise install`, then verify `mise exec -- node --version`
and `mise exec -- pnpm --version` match the pins (use `mise exec -- npm --version` for npm projects). Use an activated mise shell
or `mise exec -- zap ...` so services and tasks inherit the selected tools.
Do not add duplicate `[tools]` pins, `.nvmrc`, or `.tool-versions` files.
Zapper remains the task/process runner; mise only selects tools. Keep shared local CLI entrypoints such as `zap` and `fm` in a version-independent PATH directory (for example `~/.local/bin`), linked to their owning local builds, rather than only inside one Node installation. Verify `mise exec -- zap --version` and `mise exec -- fm --version` after changing tool selection.

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

### Existing project audit

When adding an extension, install and specialize its context payload in the same change, add the import once, rebuild, and update [Context inventory](context-inventory.md). Check implementation and configuration rather than relying on a possibly stale `fssstack.yaml` list. Keep project-specific blocks and record their purpose; do not replace them with generic defaults.
