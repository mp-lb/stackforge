# fssstack Setup

Run this from a folder containing only the setup inputs (`fssstack.yaml` and `.forum/sync.yaml`). If other project files already exist, stop and ask the user for an empty folder or git repo.

## Project configuration

Read project values, apps, packages, and extensions from `fssstack.yaml`. Use `name`, `emoji`, and `description` for project metadata; `projectSlug` and `packagePrefix` for package naming; `githubRepository` for GitHub workflow templating; and `shadcnPreset` for frontend scaffolding. Each `frontends` entry provides the frontend slug in `name` and its framework in `type`. `backends` and `libs` contain backend and library slugs. Apply the selected `extensions` after the base project validates.

## Shell

Fetch the shell project files with the one-off CLI, then install Forum CLI as a local workspace dev dependency:

```bash
npx -y @mp-lb/forum-cli pull --direct --store mp-lb/fssstack --path shell --target .
```

Before running the install, select the exact Node version from `.node-version`
and install the exact pnpm version from `package.json#packageManager`. The shell
requires Node 22.13 or newer; `engines.node` is a compatibility declaration, not
a tool installer. The public setup does not require mise. Keep general pnpm
settings in `pnpm-workspace.yaml`, not `.npmrc`.

```bash
pnpm add -Dw --save-exact @mp-lb/forum-cli
```

Use `pnpm exec fm` for subsequent Forum CLI commands from the project root.

Template the shell before creating project packages: replace
`REPLACE_WITH_OWNER/REPOSITORY` in `.github/workflows/release.yaml` with the
`githubRepository` value from `fssstack.yaml`. This keeps the publish workflow
scoped to the target repository from the initial setup.

The shell is a working monorepo: the root workspace config, the `docs/`
baseline, the shared
`etc/` config that re-exports our published presets, the internal `core` /
`server` / `trpc` packages, an `apps/example-backend`, and a publishable
`packages/example-lib` + `packages/example-cli`. It already depends on and uses
the shared packages — there is nothing to install or wire at the foundation
level:

- **`@mp-lb/fssstack-config`** (devDep) — `etc/tsconfig.base.json` re-exports
  `@mp-lb/fssstack-config/tsconfig/base.json`, and the root `eslint.config.js`
  calls `createBaseEslintConfig`.
- **`@mp-lb/fssstack-testing`** (devDep) — `etc/vitest.{base,node,react}.config.ts`
  re-export the testing presets; each package's `vitest.config.ts` re-exports
  `../../etc/vitest.node.config`.
- **`@mp-lb/fssstack-platform`** (dep of `server` / `trpc`) — the server uses
  `createTrpc`, the structured logger, `AppError`, and the event schema.

Everything below is done by copying a shell example, running the selected
scaffolder, and applying the documented wiring by hand. There are no
Stackforge-only setup scripts to fetch or run.

## Package naming

Every app and package is named `<package-scope>/<project-slug>-<slug>`, where `<slug>` is the backend/frontend/library slug.

**Exception — collapse on match:** when a slug is identical to the project slug, drop the duplicate and name the package `<package-scope>/<project-slug>` (not `<package-scope>/<project-slug>-<project-slug>`). This applies to every step below.

## Backends

For each backend service, duplicate the example backend and edit it by hand:

```bash
cp -R apps/example-backend apps/<backend slug>
```

Then, in `apps/<backend slug>`:

- set `package.json` `name` to `<package-scope>/<project-slug>-<backend slug>`
  (collapsing to `<package-scope>/<project-slug>` when the backend slug equals
  the project slug — see Package naming);
- replace the `example-backend` service label in `src/index.ts` with the backend
  slug;
- replace `EXAMPLE_BACKEND_PORT` with `<BACKEND_SLUG>_PORT`;
- add or update the matching Zap native service in the root `zap.yaml`;
- keep `/health` returning the example greeting (or your own) so the service is
  verifiable.

The example backend already builds on `@mp-lb/fssstack-platform` (server context,
logger, tRPC router) — keep that wiring; you are only renaming.

If the project has multiple backends, repeat the copy + edit for every backend. Remove `apps/example-backend` after all requested backends exist, unless the requested backend slug is `example-backend`.

When the selected extensions include Clerk or MongoDB, apply
extensions/clerk.md and extensions/mongodb.md to each selected backend before
validation. Those instructions are part of assembly: do not defer their package,
route/provider, environment-placeholder, database-service, or reset-task wiring
to a later hand edit of the finished project.

**No backend at all?** The `core` / `server` / `trpc` packages exist to support tRPC backends. A project with no backend should remove `packages/server` and `packages/trpc` (and `packages/core` if nothing else uses it) so it carries no unused infra.

## Vite Frontends

For each React/Vite frontend client, generate the frontend with the shadcn CLI, then apply the narrow fssstack frontend wiring by hand:

```bash
mkdir -p apps
CI=1 npx shadcn@4.21.4 init --preset <shadcnPreset> --template vite --cwd apps --name <frontend slug> --yes
```

The shadcn CLI creates each app at `apps/<client-name>` when run with `--cwd apps --name <client-name>`. Do not run it with `--cwd apps/<client-name> --name <client-name>`, because that creates an accidental nested `apps/<client-name>/<client-name>` scaffold.

The shadcn CLI owns the generic Vite, React, Tailwind, and shadcn/ui scaffold. The fssstack overlay stays narrow — wire it to our shared config:

- **Package name + Fssstack deps** — set `apps/<frontend slug>/package.json`
  `name` per Package naming, then add the Fssstack dev dependencies:
  ```bash
  pnpm --filter <frontend-package> add -D @mp-lb/fssstack-config @mp-lb/fssstack-testing
  ```
  If the app has component tests, add the test helpers with the package manager:
  ```bash
  pnpm --filter <frontend-package> add -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
  ```
  `@vitejs/plugin-react` is normally installed by the shadcn Vite scaffold. If
  it is missing, add it with:
  ```bash
  pnpm --filter <frontend-package> add -D @vitejs/plugin-react
  ```
- **Shared tsconfig** — add the two re-export files to `etc/` (one line each)
  if they are not already present, then point the app's tsconfigs at them:
  ```jsonc
  // etc/tsconfig.react-vite-app.json
  { "extends": "@mp-lb/fssstack-config/tsconfig/react-vite-app.json" }
  // etc/tsconfig.react-vite-node.json
  { "extends": "@mp-lb/fssstack-config/tsconfig/react-vite-node.json" }
  ```
  The app's `tsconfig.app.json` extends `../../etc/tsconfig.react-vite-app.json`
  and its `tsconfig.node.json` extends `../../etc/tsconfig.react-vite-node.json`.
  Keep `noEmit: true` in both app tsconfigs so `tsc -b` typechecks without
  emitting stale `vite.config.js` / `.d.ts` files.
- **Vitest** — the app's `vitest.config.ts` merges the React preset (`@mp-lb/fssstack-testing/vitest/react`) with the Vite plugin / aliases it needs.
- **ESLint** — the root `eslint.config.js` already globs `apps/**`, so the app
  needs no eslint config of its own; remove the one shadcn generates.
- **Zap + ports** — add `<FRONTEND_SLUG>_PORT` to `zap.yaml` `ports:` and a
  native service that runs the dev server on that port:
  ```yaml
  ports:
    - <FRONTEND_SLUG>_PORT
  native:
    <frontend slug>:
      cmd: pnpm --filter <frontend-package> dev --host 0.0.0.0 --port ${<FRONTEND_SLUG>_PORT}
      env: "*"
  ```
- **Vercel static SPA config** — add `apps/<frontend slug>/vercel.json` for
  Vite SPAs. Vercel needs the rewrite for direct loads of client routes such as
  `/dashboard`:
  ```json
  {
    "cleanUrls": true,
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/"
      }
    ],
    "trailingSlash": false
  }
  ```
- **Cleanup** — title/favicon values and removal of scaffold noise; keep the app
  surface blank/disposable.

## Next.js Frontends

For each React/Next.js frontend client, generate the frontend with the shadcn CLI, then apply the narrow wiring by hand:

```bash
mkdir -p apps
CI=1 npx shadcn@4.21.4 init --preset <shadcnPreset> --template next --cwd apps --name <frontend slug> --no-monorepo --base radix --yes
```

The shadcn CLI owns the generic Next.js, React, Tailwind, and shadcn/ui scaffold. The fssstack overlay:

- **Package name** — set `package.json` `name` per Package naming; add
  `@mp-lb/fssstack-config` as a devDependency, plus `eslint-config-next` (the
  optional peer the Next eslint preset needs).
- **Shared tsconfig** — add `etc/tsconfig.react-nextjs.json`
  (`{ "extends": "@mp-lb/fssstack-config/tsconfig/react-nextjs.json" }`) if
  absent, and have the app's `tsconfig.json` extend `../../etc/tsconfig.react-nextjs.json`.
- **ESLint** — replace the generated `eslint.config.mjs` with:
  ```js
  import { createNextEslintConfig } from "@mp-lb/fssstack-config/eslint/next";

  export default createNextEslintConfig();
  ```
- **Zap + ports** — add `<FRONTEND_SLUG>_PORT` and a native service that runs the
  Next dev server on that port.
- **Cleanup** — title/favicon values; keep the scaffolded page disposable.

Frontend implementation and test examples live in:

```text
docs/internals/examples/frontend/web-request.md
docs/internals/examples/frontend/logging.md
```

## Docs Sites

For a library that publishes a documentation site, scaffold a **Fumadocs** app on
**React Router**, then apply the standard wiring directly:

```bash
mkdir -p apps
(cd apps && CI=1 npm create fumadocs-app@16.2.18 <docs slug> --template react-router --search orama --pm pnpm --no-git)
```

Fumadocs owns the generic React Router + MDX + search scaffold (the
`fumadocs-core` / `fumadocs-mdx` / `fumadocs-ui` stack with Orama local search),
prerendering every page to static HTML under `build/client`.

**`CI=1` is required, and run it from inside `apps/`.** `create-fumadocs-app`
prompts interactively (a linter `select`) even with flags passed, so `CI=1` makes
it take defaults and run unattended; it also ignores `--cwd` (it scaffolds into
`./<docs slug>` in the current directory), so run it from `apps/`.

Apply this wiring directly; it is intentionally ordinary setup work, not a
separate generator:

- **Scripts and static server** — in `apps/<docs slug>/package.json`, set
  `dev` to `react-router dev --host 0.0.0.0 --port ${<DOCS_SLUG>_PORT:-4315}`;
  `build` to `react-router build`; `start` to
  `serve ./build/client --config serve.json -l ${<DOCS_SLUG>_PORT:-4315}`;
  `typecheck` to `react-router typegen && fumadocs-mdx && tsc --noEmit`; and
  `postinstall` to `fumadocs-mdx`. Add `serve@14.2.6` as a dev dependency and
  pin the scaffolded dependency ranges.
- **Shared tsconfig** — create `etc/tsconfig.frontend.json` if it is absent:
  ```json
  { "extends": "@mp-lb/fssstack-config/tsconfig/frontend.json" }
  ```
  Then set `apps/<docs slug>/tsconfig.json` to extend
  `../../etc/tsconfig.frontend.json`, retain the scaffold's framework-specific
  compiler options, and include `**/*`, `**/.server/**/*`,
  `**/.client/**/*`, and `.react-router/types/**/*`.
- **Static-host config** — add `apps/<docs slug>/serve.json`:
  ```json
  { "rewrites": [{ "source": "/**", "destination": "/__spa-fallback.html" }] }
  ```

Finish the remaining project-specific wiring by hand:

- **Package name** — set `apps/<docs slug>/package.json` `name` to
  `<package-scope>/<project-slug>-<docs slug>`, collapsing to
  `<package-scope>/<project-slug>` when the docs slug equals the project slug
  (see Package naming).
- **Zap service** — add `<DOCS_SLUG>_PORT` to `ports:` and a native service
  (`cmd: pnpm --filter <package-name> dev`, `env: "*"`); a `homepage:` pointing at
  `http://localhost:${<DOCS_SLUG>_PORT}/docs` is handy.
- **Content boundary** — create `docs/public/index.mdx` and
  `docs/public/meta.json` in the project root. Replace the scaffold's sample
  pages under `apps/<docs slug>/content/docs/`; do not leave the site reading
  those sample pages. Point the Fumadocs source in the docs app at
  `../../docs/public` (relative to the app) and configure prerendering to
  enumerate the MDX pages there. Confirm the built site renders the root
  `docs/public/index.mdx` at `/docs` and that an internal file under
  `docs/internals/` is not rendered. The initial files can be minimal:

  ```mdx
  ---
  title: Project documentation
  ---

  # Project documentation

  Add the first public guide here.
  ```

  ```json
  { "pages": ["index"] }
  ```

A docs site renders the library's published `docs/public/` — hand-written guides
and any generated API reference. `docs/public/` is created only when a docs
site is selected; it is not the shell's default internal-docs folder. Generate
API pages with `docs:gen` into that folder and commit them; `docs:check` should
verify freshness in CI. The site build reads those committed pages rather than
creating them implicitly. Bringing a docs site up to internal house style
(shared theme and generated-reference wiring) is a separate augmented flow,
not part of this template.

### AGENTS.md docs layer

A project with a docs site also needs its `AGENTS.md` to tell agents how the
generated-docs workflow works. That guidance is a conditional layer, not part of
the base template — copy it into the project's `docs/agents-md/` layers folder:

```bash
pnpm exec fm pull --direct --store mp-lb/fssstack --path agents-md/docs-website.md --target docs/agents-md/docs-website.md
```

This is the conditional-snippet pattern: a project gets
`docs/agents-md/docs-website.md` only when it has a docs site. The AGENTS.md
compiler composes everything in `docs/agents-md/` into the final `AGENTS.md`, so
once the file is in place our responsibility ends.

## Delete examples

- `rm -rf apps/example-backend`
- `rm -rf packages/example-lib`
- `rm -rf packages/example-cli`

## Library Packages

For each library package, duplicate the example library and edit it by hand:

```bash
cp -R packages/example-lib packages/<library slug>
```

Then, in `packages/<library slug>`:

- set `package.json` `name` to `<package-scope>/<project-slug>-<library slug>`
  (collapsing to `<package-scope>/<project-slug>` when the library slug equals
  the project slug — see Package naming);
- keep `files`, `exports`, `types`, and the build scripts publish-safe (the
  example is already shaped this way — `tsconfig.json` for typecheck,
  `tsconfig.build.json` for the emitted `dist`);
- keep public exports small and explicit;
- set `private: false` and `publishConfig.access: public` only on packages that should publish to npm;
- configure `NPM_TOKEN` (or trusted publishing) for the target repository. The release workflow was templated from `githubRepository` during shell setup and compares packed files on every push to `main`; no changeset is needed.

A library that ships a command-line tool is still a library: add a package `bin`, a `#!/usr/bin/env node` shebang on the entrypoint, and `chmod +x dist/index.js` in the build (see `packages/example-cli` for the shape). There is no separate CLI package type. See `docs/standards/clis.md` for command-line behaviour on top of the library baseline.

Remove `packages/example-lib` and `packages/example-cli` after all requested libraries exist, unless a requested library slug matches one of them.

## Dependencies

After the apps/packages exist and have been renamed:

```bash
pnpm install
pnpm dlx shadcn@latest add -c apps/<frontend slug> button card --yes --overwrite
pnpm exec eslint . --fix
```

Only run shadcn component installs for frontend apps that actually exist, and use each real frontend slug. The `eslint . --fix` pass reformats anything the renames shifted (e.g. an import that now fits on one line), so the project lands lint-clean.

## Create context files

Keep the shell's root `audit.md` in every target project. It instructs future
agents to resolve and verify the committed HelloWorld reference in Stackforge, compare
root files and folder structure first, and write `docs/audits/YYYY-MM-DD-fssstack.md`. Include
a pointer to `audit.md` in the project's context source blocks so agents can
find the process. Keep `/tmp/` gitignored for scratch files; audit reports are
tracked and committed from an isolated worktree for project-owner integration.

Create the project's `context/` source blocks and `context/index.md`.
Retain the shell's `context/scripts.md` and import it with `@scripts.md`.
Keep `packages/scripts` private and included in workspace lint/typecheck; run
`zap t scripts` and `zap t scripts-check` to verify the convention. New project
scripts use TypeScript in their owning package or `packages/scripts`, with a
thin Zap entry point using `tsx`. When migrating existing scripts, add and verify
the replacement first, update all callers (including CI), then remove the old file.
Include a project-specific `context/delivery.md` based on
[`agents-md/delivery.md`](./agents-md/delivery.md), and import it from the index.
Adapt it to the project's actual packages and configured workflows; retain the
block even when no packages are publishable. Build and commit the project context:

```bash
zap task context-build
git add context AGENTS.base.md AGENTS.md CLAUDE.md
```

Root `AGENTS.md` and `CLAUDE.md` are committed generated outputs and must not be
gitignored. Keep them in sync with `AGENTS.base.md` when project instructions
change. `AGENTS.local.md` and `AGENTS_WORKTREE.md` remain ignored for local
instructions. A developer can run `zap task context-copy` to restore the
committed base context. If they run `zap task context-build -- ~/some/global.md`
to append private context, the resulting changes to the tracked agent files
are local only and must not be committed.

## Validate

Confirm the target has root `audit.md`, a README/context pointer to it, a
tracked `docs/README.md` and `AGENTS.md`/`CLAUDE.md`, and a root `/tmp/` ignore
rule. Setup installs the audit process; it does not run an audit of the newly
created project.

Run validation after all selected apps and packages exist:

```bash
zap task setup
zap up
```

Then run `pnpm modules:map` to refresh the root `module-map.json` for the assembled
workspace. Run the standard checks — `pnpm typecheck`, `pnpm lint`, `pnpm test`,
`pnpm build` — and confirm the dev server serves. See the AGENTS.md for
project-specific validation.

## Extensions

After the base project validates, apply any selected extensions from the extension docs.

For each extension slug, read the matching doc from `docs/extensions/<slug>.md` and apply it as a follow-up layer. Extensions are allowed to require project-specific judgment; keep the base setup complete and committed before taking responsibility for extension-specific behavior.

Commit:

```bash
git add .
git commit -m init
```
