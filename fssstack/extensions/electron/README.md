# Electron desktop extension

Use this when a desktop window should load the same hosted frontend as the browser and call the same API. The extension supplies complete, flat file templates—not a nested shell or a code-insertion script. Copy each file to the target path below; whole-file copies are appropriate only when that target path is new. If an app already has an Electron package, read the template and adapt it instead of overwriting files.

| Extension file | Copy to target project | Purpose |
| --- | --- | --- |
| [`desktop-main.ts`](templates/desktop-main.ts) | `apps/desktop/src/main.ts` | Electron main process and hosted-app navigation rules. |
| [`desktop-package.json`](templates/desktop-package.json) | `apps/desktop/package.json` | Package metadata, scripts, dependencies, and electron-builder configuration. |
| [`desktop-tsconfig.json`](templates/desktop-tsconfig.json) | `apps/desktop/tsconfig.json` | CommonJS/Node overrides extending the target’s shared FSS Stack config. |
| [`desktop-tsup.config.ts`](templates/desktop-tsup.config.ts) | `apps/desktop/tsup.config.ts` | Main-process build configuration. |

When a Stackforge checkout is unavailable, download a template from its raw GitHub URL. For example:

```sh
mkdir -p apps/desktop/src
curl --fail --location --output apps/desktop/src/main.ts https://raw.githubusercontent.com/mp-lb/stackforge/main/fssstack/extensions/electron/templates/desktop-main.ts
```

Edit the copied files for the project: set the package name, `build.appId`, `build.productName`, and the hosted HTTPS URL in `desktop-main.ts`. Add a macOS icon and set `build.mac.icon` before a public release. Before installing, approve the copied package's native install scripts in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  electron: true
  electron-winstaller: true
  esbuild: true
```

Merge these entries with existing `allowBuilds`; do not replace other approvals. Run `pnpm install`, then **verify the Electron binary** with `pnpm --filter <desktop-package> exec electron --version` before enabling the desktop Zap profile. Typecheck and build the desktop package too. A TypeScript build alone does not prove that Electron downloaded its binary. Set `DESKTOP_DEV_URL` when running against a local frontend; do not assume a port.

If the version check reports “Electron failed to install correctly,” inspect the installed Electron package's `path.txt` and `dist` directory. A previously blocked postinstall can leave a package without a usable binary, but we have also seen an approved fresh install leave a partial macOS extraction. `pnpm install` and `pnpm rebuild` did not repair that case. On macOS, if Electron's cached ZIP passes `unzip -t` but `dist` is incomplete, extract that archive into the installed package's `dist` directory and write the executable path from Electron's own `install.js` to its `path.txt`; then rerun `electron --version`. This is a local dependency repair, not project source code. Only start Zap after the version check passes. Confirm with `zap status` and `zap logs desktop --no-follow` that the desktop service remains running.

For Zapper development, keep the browser services in the default profile and add a `desktop` profile with those same services plus a native `desktop` service. Make that service depend on the frontend, run the desktop package's `dev` script, and set `DESKTOP_DEV_URL=http://localhost:${WEB_PORT}` through the project's non-secret environment configuration. Put the project's env files in each profile, as Zap requires. Then `zap profile set desktop` opens the window and `zap profile set default` returns to browser-only development. Adapt the service names and port variable to the project; this is project-specific YAML, not a file to overwrite blindly.

## Local packaging and icons

Keep Electron's default logo in local development. On macOS, the packaged app uses the embedded bundle icon; do not call `app.dock.setIcon()` to replace it at runtime. A raw Icon Composer PNG used through that API can appear oversized. Verify the packaged result before changing artwork or adding padding; PNG-to-ICNS conversion alone does not guarantee different margins.

Place project-specific artwork in `apps/desktop/assets/` (the template’s `buildResources` directory). For a PNG export, use a square 1024×1024 `assets/icon.png` and set `build.mac.icon` to `assets/icon.png`; electron-builder converts it to the bundle format. An existing `.icns` can be used instead. Commit the source icon, not generated bundles. The generic templates intentionally include no project branding.

Add this task to the target project's existing `zap.yaml`, replacing the package name:

```yaml
tasks:
  desktop-package:
    cmds:
      - pnpm --filter @example/desktop package:local
```

`zap task desktop-package` compiles the desktop entry point and creates an unsigned local `.app` without notarizing or publishing. It uses the host architecture: `apps/desktop/out/mac-arm64/<ProductName>.app` on Apple Silicon or `out/mac/<ProductName>.app` on Intel. The FSS Stack shell ignores `out/` in Git. Rebuilding replaces the app at that path, so quit it first. It is not installed in Applications or opened automatically. The regular workspace build only updates compiled `dist/` files and does not refresh the packaged app. Distribution and release automation are configured separately.

The packaged app loads its configured hosted production URL. For a project that has only local services, retain the explicit `DESKTOP_DEV_URL` requirement in packaged mode too, and add a project-specific `desktop-open` Zap task that passes the resolved URL via `open --env DESKTOP_DEV_URL=... <app-path>`. Resolve the app path from the product name and host architecture. Do not bake a checkout's port into the bundle or introduce a default port. Such a bundle is a local preview and must not be published as a standalone app.

The base extension ends with a working Electron app and local packaging. Signing credentials, release hosting, download landing pages, and automatic updates belong to the consuming project’s distribution setup.

The main-process template has Node integration off, context isolation and sandboxing on. Desktop auth, deep links, offline behavior, auto-update UI, and Windows/Linux releases require project-specific design. Make those changes by following the project architecture, not by blindly inserting source text.

## Install agent context

After applying and validating this capability, install its context payloads. For existing files, compare and merge instead of overwriting project-specific instructions. These commands are for a first install from the target repository root:

```sh
set -e
mkdir -p context
fm read extensions/electron/context/electron.md --store mp-lb/fssstack > context/electron.md
grep -qxF '@electron.md' context/index.md || printf '\n@electron.md\n' >> context/index.md
```

Adapt the blocks to the installed package paths, services, tasks and configuration. Remove assumptions that do not apply. Then run `zap task context-build` and commit the source blocks and both generated agent files.
