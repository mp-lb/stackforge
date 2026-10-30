# Project README

This repository is an FSS Stack project. It is a pnpm workspace with applications in `apps/`, shared packages in `packages/`, and project documentation in `docs/`.

## Prerequisites

- Node.js 22.13 or newer; use the exact development version in `.node-version`
- The exact pnpm version in `package.json#packageManager`
- Zapper (`zap`) for local service orchestration

## Install

Install workspace dependencies from the repository root:

```bash
pnpm install
```

If the project uses private packages or external services, make sure the required secrets are available in `.env`. Non-secret local defaults live in `.env.local`.

## Run Locally

Start the local services with Zapper:

```bash
zap up
```

Open the configured homepage:

```bash
zap o
```

Run a single package or app directly with pnpm filters when you need to work outside the full service set:

```bash
pnpm --filter <package-name> dev
```

## Validate

Use the same checks before handing off work:

```bash
pnpm lint
pnpm modules:map
pnpm typecheck
pnpm test
pnpm build
```

The Zapper task wrapper also runs the standard lint and typecheck flow:

```bash
zap task check
```

## Audit

Ask a coding agent to follow [audit.md](audit.md) to compare this project with a
committed, verified HelloWorld reference in the resolved Stackforge checkout. The audit prioritizes root configuration and
folder structure, distinguishes justified differences from drift, and writes
its findings to `docs/audits/YYYY-MM-DD-fssstack.md` in an isolated worktree for project-owner integration, without applying fixes.

## Workspace

- `apps/` contains runnable services and frontend applications.
- `packages/` contains shared libraries, server helpers, API contracts, and publishable packages.
- `etc/` contains shared TypeScript, Vitest, and tooling configuration.
- `docs/` contains a project documentation index and internal implementation
  examples. Published library docs belong under `docs/public/` only when a docs
  site is added.
- `zap.yaml` defines local services, ports, and common development tasks.

## Development Notes

- Keep non-secret local configuration in `.env.local`.
- Keep secrets in `.env`; do not commit them.
- Use workspace package names with `pnpm --filter` for focused commands.
- Check service logs and port assignments through Zapper while debugging local runs.
- Update the docs in `docs/` when changing project conventions or release behavior.

## Tool versions

`.node-version` is the exact development and CI Node pin. `engines.node` in
`package.json` declares compatibility; it does not install or select Node.
`packageManager` in that file is the exact pnpm pin. Keep `pnpm-lock.yaml`
committed and use `pnpm install --frozen-lockfile` in CI.

Use a version manager of your choice. For nvm, run
`nvm install "$(cat .node-version)"` and `nvm use "$(cat .node-version)"`.
Install the pinned pnpm version before installing dependencies. Mise integration
is provided by the house augmentation, not required by this public shell.

Dependency policy belongs in `pnpm-workspace.yaml`: `saveExact: true` for
external dependencies and explicit `workspace:*` references for internal ones.
The base has no `.npmrc`; add one only for a concrete npm or registry/auth need,
and never commit credentials. pnpm 11 ignores general settings in `.npmrc`.

When changing the Node pin, check dependency engine requirements and rerun the
project checks. CI reads `.node-version`; deployment providers and container
images must use a compatible Node major, configured by the deployment layer.
