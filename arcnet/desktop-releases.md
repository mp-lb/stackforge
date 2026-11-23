# Desktop releases

Desktop release support is a standard ArcNet capability. Installing ArcNet makes the tooling and workflow template available; it does not install Electron, create signing consumers or add release CI to projects without a desktop app. No hosting services or cloud foundation are required for desktop delivery.

## Activate when Electron is added

When adding the FSS Stack Electron extension to a project that uses ArcNet, complete this guide as part of that setup. When adding ArcNet to a project that already has Electron, do the same. Use the existing package and app configuration; preserve custom workflows, release holds, repository destinations and supported platforms.

1. Confirm the Electron package path/name, application ID, product/executable names, app slug, supported platforms, and release repository. Reuse existing values; resolve missing values during extension setup.
2. Complete the shared secrets setup below and check the required signing and release-token consumers. Reuse shared credentials where available; missing credentials are a concrete prerequisite, not a reason to install dormant CI everywhere.
3. Adapt the bundled `node_modules/@mp-lb/arcnet/templates/desktop-release.yaml` into `.github/workflows/desktop-release.yaml` only when the app exists. Replace every example package filter, artifact path, product/executable name, app slug and repository. Preserve an existing custom workflow instead of installing a competing publisher. Select only supported jobs and align the publish job’s dependencies/assets and verification flags.
4. Configure the builder, feed and download page below, and follow the [Electron integration guide](../fssstack/extensions/electron/integration.md) for the app-side updater and recovery behavior.
5. Run the selected-platform verification below before reporting desktop delivery ready. Adding a dependency alone does not configure or publish a release.

## Signing credentials

Use `@mp-lb/code-signing` for macOS signing validation. Use Forum and ArcNet only to retrieve credentials and provision repository access. The public signing package has no knowledge of our stores, paths, accounts, or deployment setup. The base Electron extension supplies the app and local packaging. ArcNet owns signing, release publishing, downloads, and update distribution.

1. Complete the shared secrets and variables setup in [ArcNet setup](SETUP.md), using the project slug and repository from `fssstack.yaml`. Minimal ArcNet is sufficient for a desktop-only project; use full ArcNet when also deploying hosted applications.
2. Store reusable company signing credentials in `/admin/standard-secrets.json.enc` in `mp-lb/mp-lb`. Use `/projects/<project-slug>/secrets.json.enc` for project-specific credentials or overrides. Preserve existing values and recipients when editing encrypted files. Do not assume the shared file already contains the signing credentials; if they are missing, have the operator supply them before attempting a signed release.

| Input | Value |
| --- | --- |
| `CSC_LINK` | Base64-encoded Developer ID Application `.p12` certificate, including its private key. |
| `CSC_KEY_PASSWORD` | Password used to export the `.p12` certificate. |
| `APPLE_ID` | Apple account used for notarization. |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for that Apple account. |
| `APPLE_TEAM_ID` | Apple Developer team that owns the signing certificate. |

The reusable signing credentials are in `mp-lb/mp-lb:/admin/standard-secrets.json.enc`. They were copied once from `/projects/forum/secrets.json.enc`; new projects consume the shared source and do not repeat that transfer. The notarization account is `hi@felixsebastian.dev`, team `CWZKS7THVN`. Certificate backups live under `mp-lb/mp-lb:/admin/certs`; they are encrypted base64 files, not ArcNet JSON secret sources. Reuse the existing Developer ID Application identity rather than creating one per app.

3. Add a `desktop` consumer to the existing `.arcnet/arcnet.yaml`, preserving the other consumers:

   ```yaml
   secrets:
     # Retain the sources provisioned by ArcNet setup.
     consumers:
       desktop:
         CSC_LINK: CSC_LINK
         CSC_KEY_PASSWORD: CSC_KEY_PASSWORD
         APPLE_ID: APPLE_ID
         APPLE_APP_SPECIFIC_PASSWORD: APPLE_APP_SPECIFIC_PASSWORD
         APPLE_TEAM_ID: APPLE_TEAM_ID
   ```

4. Run `pnpm exec arcnet secrets sync` and commit the refreshed encrypted snapshots. Provisioning a new repository recipient changes the encrypted file, so sync again after provisioning its GitHub key. Validate with `pnpm exec arcnet env check --consumer desktop --password` locally, or with the provisioned source keys in CI. Never commit plaintext credentials.
5. Adapt the [release workflow template](https://github.com/mp-lb/tools/blob/main/packages/arcnet/templates/desktop-release.yaml) to pass the existing source keys, normally `ARCNET_STANDARD_SECRETS_KEY` and `ARCNET_PROJECT_SECRETS_KEY`, from GitHub secrets. Install `@mp-lb/code-signing` as a development dependency. Load and validate credentials with `pnpm exec arcnet env export --consumer desktop | pnpm exec code-signing github-env --stdin`. For local preflight use `pnpm exec arcnet env export --consumer desktop --password | pnpm exec code-signing check --stdin`. The signing package accepts JSON or environment variables from any secret provider; it does not retrieve secrets or publish releases. Use `set -euo pipefail` so decryption failure stops the release. Do not print the exported JSON or duplicate the signing values as individual GitHub secrets.
6. Test an unsigned local package first, then run the signed release workflow. Verify the packaged application with `codesign --verify --deep --strict` and `spctl --assess --type execute`. Publish the DMG, ZIP, and update manifest together. Verify the actual download and update URLs without authentication before exposing them in the landing page or updater. For private source repositories, publish public downloads in a separate public releases repository with appropriately scoped CI write access.

A successful web deployment does not mean a desktop release exists. Missing signing inputs block the signed release; do not silently publish an unsigned build instead.

## Release distribution and landing page

ArcNet owns distribution; the FSS Stack Electron extension owns application integration.

1. Publish installers to the public `mp-lb/releases` repository. Use an app slug and tag `<app>-desktop-v<version>`, for example `forum-desktop-v1.1.25`. The shared `DESKTOP_RELEASES_GITHUB_TOKEN` must have Contents write on the releases repository. Sync the ArcNet snapshot and map that secret to `GH_TOKEN` in a dedicated `desktopRelease` consumer. GitHub repository secrets hold the source decryption keys.
2. Configure electron-builder's GitHub publish owner and repo. Adapt the [release workflow](https://github.com/mp-lb/tools/blob/main/packages/arcnet/templates/desktop-release.yaml), replacing the example package filter, product, executable, and repository names. The baseline builds signed and notarized Apple Silicon DMG and ZIP artifacts, x86-64 Linux DEB and RPM packages, and an unsigned x86-64 Windows NSIS installer on native runners. Windows builds with Bash-based workspace scripts use the runner's Git Bash.
3. Package DEB and RPM in separate output directories so each archive carries its own `resources/package-type`. Use ArcNet 0.7.22 or later and run `arcnet desktop linux-manifest` to verify the generated hashes and combine the two `latest-linux.yml` files. Check the embedded marker in each extracted package. Upload all installers and both platform manifests to a draft, then publish it and dispatch the shared feed workflow. The workflow writes the app’s release index and manifests under `feeds/<app>/`. Preserve macOS signing and notarization checks.
4. Build the landing page from the app’s public `feeds/<app>/release.json` index. Offer only uploaded assets with stable, allowlisted filenames and link to the specific release tag checked at build time. Keep the web app link available if there is no desktop release. Use [Shad’s Desktop Download](https://shad.mp-lb.dev/docs/components/desktop-download) to recommend the OS package and expose all available formats in a dropdown. The widget supports a React component or static HTML and browser enhancement. Mobile and unknown browsers get the full list. Linux browsers frequently omit their distro, so label DEB and RPM clearly. The optional [Next.js redirect route](templates/desktop-download-route.ts) serves an explicitly requested installer format.
5. Refresh the landing page after publishing. Run `pnpm exec arcnet desktop verify --repository mp-lb/releases --tag <app>-desktop-v<version> --linux --windows`, then exercise the homepage links anonymously. Test the installed desktop on the target OS as well as the build artifacts.

## Verification and context

Validate an unsigned local package first, then the configured release workflow. Verify macOS signing/notarization where selected, Linux package markers and manifests, public installer URLs and the feed, and an installed app update on the supported OS. A source build or web deployment does not verify desktop delivery. Report any platform check that could not run.

Record package paths, platforms, repository, feed URL and release tasks in project context, without credentials. Context recompilation is optional for existing projects. Keep the shared ArcNet context import: it already points to this capability, including for projects that may add Electron later.
