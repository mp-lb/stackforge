# Electron desktop extension

Use this when a desktop window should load the same hosted frontend as the browser and call the same API. The [StackForge Electron shell](https://github.com/mp-lb/stackforge/tree/main/guides/electron/shell) is a set of complete files, not a code-insertion script. Copy the `apps/desktop` directory into a pnpm workspace that includes `apps/*`. The files can be downloaded individually from GitHub's raw view when a StackForge checkout is unavailable. For example:

```sh
mkdir -p apps/desktop/src
curl --fail --location --output apps/desktop/src/main.ts https://raw.githubusercontent.com/mp-lb/stackforge/main/guides/electron/shell/apps/desktop/src/main.ts
```

Copy the remaining [desktop package files](https://github.com/mp-lb/stackforge/tree/main/guides/electron/shell/apps/desktop) to the same relative paths: `package.json`, `tsconfig.json`, `tsup.config.ts`, and `.gitignore`. Whole-file copies are appropriate only when those paths are new. If an app already has an Electron package, read the examples and adapt it instead of overwriting files.

Edit the copied files for the project: set the package name, `build.appId`, `build.productName`, GitHub publish owner/repo, and the hosted HTTPS URL in `src/main.ts`. Add a macOS icon and set `build.mac.icon` before a public release. If pnpm blocks Electron or esbuild install scripts, add their build approvals to `pnpm-workspace.yaml`. Run `pnpm install`, then typecheck and build the desktop package. Set `DESKTOP_DEV_URL` when running against a local frontend; do not assume a port.

For macOS GitHub Releases, copy the [release workflow](https://raw.githubusercontent.com/mp-lb/stackforge/main/guides/electron/shell/.github/workflows/release-desktop.yml) to `.github/workflows/release-desktop.yml`. Set its pnpm version to the target repo's `packageManager` and replace the example package filter. Review it against the project's release process. Configure `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` as GitHub Actions secrets. Set the desktop package version and push a matching `desktop-vX.Y.Z` tag; CI signs, notarizes, and publishes DMG, ZIP, and update metadata.

If the landing page is Next.js App Router and Releases are public, optionally copy this [download route](https://raw.githubusercontent.com/mp-lb/stackforge/main/guides/electron/shell/apps/landing-page/src/app/download/desktop/route.ts) into the matching route path, set the GitHub owner/repo, and link a button to `/download/desktop`. Other landing-page frameworks should expose a small server endpoint for release metadata. A shared `useDesktopReleases()` hook can consume that endpoint; keep GitHub credentials server-side. Private Releases require an authenticated download flow.

The shell has Node integration off, context isolation and sandboxing on. Desktop auth, deep links, offline behavior, auto-update UI, and Windows/Linux releases require project-specific design. Make those changes by following the project architecture, not by blindly inserting source text.
