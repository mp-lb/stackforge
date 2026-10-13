# Electron desktop extension

Use this when a desktop window should load the same hosted frontend as the browser and call the same API. The [StackForge Electron shell](https://github.com/mp-lb/stackforge/tree/main/guides/electron/shell) is a set of complete files, not a code-insertion script. Copy the `apps/desktop` directory into a pnpm workspace that includes `apps/*`. The files can be downloaded individually from GitHub's raw view when a StackForge checkout is unavailable. For example:

```sh
mkdir -p apps/desktop/src
curl --fail --location --output apps/desktop/src/main.ts https://raw.githubusercontent.com/mp-lb/stackforge/main/guides/electron/shell/apps/desktop/src/main.ts
```

Copy the remaining [desktop package files](https://github.com/mp-lb/stackforge/tree/main/guides/electron/shell/apps/desktop) to the same relative paths: `package.json`, `tsconfig.json`, `tsup.config.ts`, and `.gitignore`. Whole-file copies are appropriate only when those paths are new. If an app already has an Electron package, read the examples and adapt it instead of overwriting files.

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

For macOS GitHub Releases, copy the [release workflow](https://raw.githubusercontent.com/mp-lb/stackforge/main/guides/electron/shell/.github/workflows/release-desktop.yml) to `.github/workflows/release-desktop.yml`. Set its pnpm version to the target repo's `packageManager` and replace the example package filter. Review it against the project's release process. Configure `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` as GitHub Actions secrets. Set the desktop package version and push a matching `desktop-vX.Y.Z` tag; CI signs, notarizes, and publishes DMG, ZIP, and update metadata.

If the landing page is Next.js App Router and Releases are public, optionally copy this [download route](https://raw.githubusercontent.com/mp-lb/stackforge/main/guides/electron/shell/apps/landing-page/src/app/download/desktop/route.ts) into the matching route path, set the GitHub owner/repo, and link a button to `/download/desktop`. Other landing-page frameworks should expose a small server endpoint for release metadata. A shared `useDesktopReleases()` hook can consume that endpoint; keep GitHub credentials server-side. Private Releases require an authenticated download flow.

The shell has Node integration off, context isolation and sandboxing on. Desktop auth, deep links, offline behavior, auto-update UI, and Windows/Linux releases require project-specific design. Make those changes by following the project architecture, not by blindly inserting source text.
