# fssstack Setup

Run this from a folder containing only the setup inputs (`fssstack.yaml` and `doctrine.yaml`). If other project files already exist, stop and ask the user for an empty folder or git repo.

## Project configuration

Read project values, apps, packages, and extensions from `fssstack.yaml`. Use `name`, `emoji`, and `description` for project metadata; `projectSlug` and `packagePrefix` for package naming; and `shadcnPreset` for frontend scaffolding. Each `frontends` entry provides the frontend slug in `name` and its framework in `type`. `backends` and `libs` contain backend and library slugs. Apply the selected `extensions` after the base project validates.

## Shell

Fetch the shell project files with the one-off CLI, install Forum CLI as a local workspace dev dependency, then fetch the helper scripts with the local CLI:

```bash
npx -y @mp-lb/forum-cli pull --direct --store mp-lb/fssstack --path shell --target .
pnpm add -Dw --save-exact @mp-lb/forum-cli
pnpm exec fm pull --direct --store mp-lb/fssstack --path scripts --target scripts
```

Use `pnpm exec fm` for subsequent Forum CLI commands from the project root.

The shell is a working monorepo: the root workspace config, the shared
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

The **`scripts/` directory** holds the one remaining helper, `augment-docs-site.mjs`
(used only when a library ships a docs site). It lives at the store's **top
level, not inside `shell/`**, so the `shell` pull does not bring it — it needs
its own pull (above). Everything else below is done by copying a shell example
and editing it by hand.

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

**No backend at all?** The `core` / `server` / `trpc` packages exist to support tRPC backends. A project with no backend should remove `packages/server` and `packages/trpc` (and `packages/core` if nothing else uses it) so it carries no unused infra.

## Vite Frontends

For each React/Vite frontend client, generate the frontend with the shadcn CLI, then apply the narrow fssstack frontend wiring by hand:

```bash
mkdir -p apps
CI=1 npx shadcn@latest init --preset <shadcnPreset> --template vite --cwd apps --name <frontend slug>
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
CI=1 npx shadcn@latest init --preset <shadcnPreset> --template next --cwd apps --name <frontend slug> --no-monorepo --base radix --yes
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
docs/examples/frontend/web-request.md
docs/examples/frontend/logging.md
```

## Docs Sites

For a library that publishes a documentation site, scaffold a **Fumadocs** app on
**React Router**, run the augment script, then finish the small bit of wiring it
deliberately leaves to you:

```bash
mkdir -p apps
(cd apps && CI=1 npm create fumadocs-app@latest <docs slug> --template react-router --search orama --pm pnpm --no-git)
node scripts/augment-docs-site.mjs . "<docs slug>"
```

Fumadocs owns the generic React Router + MDX + search scaffold (the
`fumadocs-core` / `fumadocs-mdx` / `fumadocs-ui` stack with Orama local search),
prerendering every page to static HTML under `build/client`.

**`CI=1` is required, and run it from inside `apps/`.** `create-fumadocs-app`
prompts interactively (a linter `select`) even with flags passed, so `CI=1` makes
it take defaults and run unattended; it also ignores `--cwd` (it scaffolds into
`./<docs slug>` in the current directory), so run it from `apps/`.

`augment-docs-site.mjs <target> [docs slug]` does **only** this:

- rewrites `package.json` scripts so `dev` / `start` read the Zapper-injected
  `${<DOCS_SLUG>_PORT}` (with a `4315` fallback), and adds `typecheck`;
- adds the `serve` devDependency and writes `serve.json`, so `start` (static
  serve of `build/client`) works out of the box;
- writes `tsconfig.json` extending the shared `etc/tsconfig.frontend.json`
  (creating that base if missing);
- pins dependency ranges.

It does **not** rename the package or touch `zap.yaml` — finish those by hand:

- **Package name** — set `apps/<docs slug>/package.json` `name` to
  `<package-scope>/<project-slug>-<docs slug>`, collapsing to
  `<package-scope>/<project-slug>` when the docs slug equals the project slug
  (see Package naming).
- **Zap service** — add `<DOCS_SLUG>_PORT` to `ports:` and a native service
  (`cmd: pnpm --filter <package-name> dev`, `env: "*"`); a `homepage:` pointing at
  `http://localhost:${<DOCS_SLUG>_PORT}/docs` is handy.
- **Cleanup** — the scaffolded sample pages under `content/docs/` are disposable.

A docs site renders the library's published `docs/public/` — the generated API
reference plus hand-written guides. Bringing a docs site up to internal house
style (shared theme, generated-reference wiring) is a separate augmented flow,
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
- update release docs if package names changed.

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

Create the project's `agents-md/` source blocks and `agents-md/index.md`, then
build the committed base context:

```bash
zap task context-build
git add agents-md AGENTS.base.md
```

`AGENTS.md` and `CLAUDE.md` are local generated files and stay gitignored. After
cloning, a developer who does not need private context can run
`zap task context-copy`; a developer who wants extra context can run
`zap task context-build -- ~/some/global.md`.

## Validate

Run validation after all selected apps and packages exist:

```bash
zap task setup
zap up
```

Then run the standard checks — `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` — and confirm the dev server serves. See the AGENTS.md for project-specific validation.

## Extensions

After the base project validates, apply any selected extensions from the extension docs.

For each extension slug, read the matching doc from `docs/extensions/<slug>.md` and apply it as a follow-up layer. Extensions are allowed to require project-specific judgment; keep the base setup complete and committed before taking responsibility for extension-specific behavior.

Commit:

```bash
git add .
git commit -m init
```
