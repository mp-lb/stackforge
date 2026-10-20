# Electron desktop extension

Use this when a desktop window should load the same hosted frontend as the browser and call the same API. The [Electron extension shell](https://github.com/mp-lb/stackforge/tree/main/fssstack/extensions/electron/shell) is a set of complete files, not a code-insertion script. Copy the `apps/desktop` directory into a pnpm workspace that includes `apps/*`. The files can be downloaded individually from GitHub's raw view when a StackForge checkout is unavailable. For example:

```sh
mkdir -p apps/desktop/src
curl --fail --location --output apps/desktop/src/main.ts https://raw.githubusercontent.com/mp-lb/stackforge/main/fssstack/extensions/electron/shell/apps/desktop/src/main.ts
```

Copy the remaining [desktop package files](https://github.com/mp-lb/stackforge/tree/main/fssstack/extensions/electron/shell/apps/desktop) to the same relative paths: `package.json`, `tsconfig.json`, `tsup.config.ts`, and `.gitignore`. Whole-file copies are appropriate only when those paths are new. If an app already has an Electron package, read the examples and adapt it instead of overwriting files.

Edit the copied files for the project: set the package name, `build.appId`, `build.productName`, GitHub publish owner/repo, and the hosted HTTPS URL in `src/main.ts`. Add a macOS icon and set `build.mac.icon` before a public release. Before installing, approve the copied package's native install scripts in `pnpm-workspace.yaml`:

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

Place project-specific artwork in `apps/desktop/assets/` (the shell's `buildResources` directory). For a PNG export, use a square 1024×1024 `assets/icon.png` and set `build.mac.icon` to `assets/icon.png`; electron-builder converts it to the bundle format. An existing `.icns` can be used instead. Commit the source icon, not generated bundles. The generic shell intentionally includes no project branding.

Add this task to the target project's existing `zap.yaml`, replacing the package name:

```yaml
tasks:
  desktop-package:
    cmds:
      - pnpm --filter @example/desktop package:local
```

`zap task desktop-package` compiles the desktop entry point and creates an unsigned local `.app` without notarizing or publishing. It uses the host architecture: `apps/desktop/out/mac-arm64/<ProductName>.app` on Apple Silicon or `out/mac/<ProductName>.app` on Intel. The shell ignores `out/` in Git. Rebuilding replaces the app at that path, so quit it first. It is not installed in Applications or opened automatically. The regular workspace build only updates compiled `dist/` files and does not refresh the packaged app. The existing `package` script and release workflow retain signed release packaging.

The shell's packaged app loads its configured hosted production URL. For a project that has only local services, retain the explicit `DESKTOP_DEV_URL` requirement in packaged mode too, and add a project-specific `desktop-open` Zap task that passes the resolved URL via `open --env DESKTOP_DEV_URL=... <app-path>`. Resolve the app path from the product name and host architecture. Do not bake a checkout's port into the bundle or introduce a default port. Such a bundle is a local preview and must not be published as a standalone app.

For macOS GitHub Releases, copy the [release workflow](https://raw.githubusercontent.com/mp-lb/stackforge/main/fssstack/extensions/electron/shell/.github/workflows/release-desktop.yml) to `.github/workflows/release-desktop.yml`. Set its pnpm version to the target repo's `packageManager` and replace the example package filter. Review it against the project's release process. Configure `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` as GitHub Actions secrets. Set the desktop package version and push a matching `desktop-vX.Y.Z` tag; CI signs, notarizes, and publishes DMG, ZIP, and update metadata.

If the landing page is Next.js App Router and Releases are public, optionally copy this [download route](https://raw.githubusercontent.com/mp-lb/stackforge/main/fssstack/extensions/electron/shell/apps/landing-page/src/app/download/desktop/route.ts) into the matching route path, set the GitHub owner/repo, and link a button to `/download/desktop`. Other landing-page frameworks should expose a small server endpoint for release metadata. A shared `useDesktopReleases()` hook can consume that endpoint; keep GitHub credentials server-side. Private Releases require an authenticated download flow.

The shell has Node integration off, context isolation and sandboxing on. Desktop auth, deep links, offline behavior, auto-update UI, and Windows/Linux releases require project-specific design. Make those changes by following the project architecture, not by blindly inserting source text.
