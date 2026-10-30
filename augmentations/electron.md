# Electron augmentation

## When to use

Apply this MAP Lab augmentation after the [FSS Stack Electron extension](../fssstack/extensions/electron/README.md) has added an Electron shell. Adapt these instructions to the application's existing desktop package and frontend; do not replace their main process or preload wholesale. The base extension remains usable without this augmentation.

## Signing credentials

Use `@mp-lb/code-signing` for macOS signing validation. Use Forum and ArcNet only to retrieve credentials and provision repository access. The public signing package has no knowledge of our stores, paths, accounts, or deployment setup. The base Electron extension supplies the app and local packaging. This augmentation adds signing, release publishing, downloads, and updates.

1. Complete the shared secrets and variables setup in [ArcNet setup](../arcnet/SETUP.md), using the project slug and repository from `fssstack.yaml`. Minimal ArcNet is sufficient for a desktop-only project; use full ArcNet when also deploying hosted applications.
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
5. Adapt the [release workflow template](electron/desktop-release.yml) to pass the existing source keys, normally `ARCNET_STANDARD_SECRETS_KEY` and `ARCNET_PROJECT_SECRETS_KEY`, from GitHub secrets. Install `@mp-lb/code-signing` as a development dependency. Load and validate credentials with `pnpm exec arcnet env export --consumer desktop | pnpm exec code-signing github-env --stdin`. For local preflight use `pnpm exec arcnet env export --consumer desktop --password | pnpm exec code-signing check --stdin`. The signing package accepts JSON or environment variables from any secret provider; it does not retrieve secrets or publish releases. Use `set -euo pipefail` so decryption failure stops the release. Do not print the exported JSON or duplicate the signing values as individual GitHub secrets.
6. Test an unsigned local package first, then run the signed release workflow. Verify the packaged application with `codesign --verify --deep --strict` and `spctl --assess --type execute`. Publish the DMG, ZIP, and update manifest together. Verify the actual download and update URLs without authentication before exposing them in the landing page or updater. For private source repositories, publish public downloads in a separate public releases repository with appropriately scoped CI write access.

A successful web deployment does not mean a desktop release exists. Missing signing inputs block the signed release; do not silently publish an unsigned build instead.

## Release distribution and landing page

This distribution setup belongs to the augmentation, not the base FSS Stack extension.

1. Choose the GitHub repository that will hold releases. If application source is private, use a separate public `<project>-releases` repository. Give CI write access to that repository; the source repository's default `GITHUB_TOKEN` does not grant cross-repository access.
2. Configure electron-builder's GitHub publish owner/repo to match the releases repository. Enable DMG and ZIP targets, hardened runtime, and notarization for signed macOS releases. Adapt the [release workflow](electron/desktop-release.yml) to the target package, our available runners, the ArcNet credential-loading step above, and the destination repository. Its example trigger is a `desktop-vX.Y.Z` tag matching the desktop package version; use the project's established release trigger when one exists.
3. Publish the signed DMG, ZIP, and update manifest as one release. Keep asset names stable if using `/releases/latest/download/<asset-name>` links. Configure the updater to read from this same public repository.
4. Add a minimal landing page with the app name, icon, and download button. Link directly to the published GitHub asset; a backend is unnecessary for a stable asset name. A Next.js page that needs dynamic asset selection can use the optional [download redirect route](electron/desktop-download-route.ts). Keep GitHub credentials out of public frontend code.
5. Deploy the landing page through full ArcNet. Before showing an enabled download button, verify that its URL downloads the expected signed artifact without authentication. If no release exists, show an unavailable state rather than a broken link. Also verify the ZIP and update manifest URLs, and test update installation from an older installed version when available.

## Install and build

Install `@mp-lb/electron-kit` as a dependency of the desktop package. Install it in the frontend package as well if that package imports the browser, React, or Clerk entry points. Replace the example filters with the target workspace names:

```sh
pnpm --filter <desktop-package> add @mp-lb/electron-kit
pnpm --filter <frontend-package> add @mp-lb/electron-kit
```

The kit is ESM. When the desktop package uses the extension's CommonJS `tsup` build and only `dist/` is packaged, bundle the kit into the desktop output: add `"@mp-lb/electron-kit"` to `noExternal` in `tsup.config.ts`. Keep Electron external. Add the preload entry to `entry` when introducing a preload, and set `webPreferences.preload` to its built path. Retain `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.

Use the dedicated `@mp-lb/electron-kit/preload` entry in a sandboxed preload. Do not import the package root there: the root also exports main-process code that uses Node modules unavailable to a sandboxed preload. Verify the bundled preload only requires modules Electron exposes to sandboxed preloads.

## Loading screen

Apply the [Shad augmentation](shad.md) to the renderer. Re-run its install
command from the frontend package to ensure `FullScreenLoading` and the
standard dot-matrix loader are present, preserving customized files when
prompted. Use `FullScreenLoading` for session readiness before showing browser
sign-in or the signed-in app, and for root Suspense/startup gates.

This presentation belongs to Shad and the renderer, not Electron Kit. The kit
remains headless. Use the same loading screen in desktop and web; do not add a
plain “Loading <app>…” branch. This React loading screen does not replace the
packaged offline fallback described below.

## Window state

After `app.whenReady()`, restore the previous position and dimensions when constructing the main window, then attach persistence immediately:

```ts
import { BrowserWindow } from "electron";
import { getWindowOptionsWithSavedState, rememberWindowState } from "@mp-lb/electron-kit";

const win = new BrowserWindow(getWindowOptionsWithSavedState({
  width: 1280,
  height: 850,
  webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: preloadPath },
}));
rememberWindowState(win);
```

`preloadPath` is the project's built preload path. The helper saves normal bounds and maximized/fullscreen state under Electron's user-data directory, and ignores saved bounds that no longer intersect a display. Use it for the main window; if the app has multiple independently persisted windows, give them separate storage rather than sharing this helper's default file.

## Failed initial load and offline recovery

The hosted frontend may be unavailable when the app opens, especially at computer startup. Create an offline fallback that is packaged locally with the desktop app; a React screen hosted on the network cannot render when its initial load fails. A minimal local HTML page is sufficient. Show a clear connection message and explain that the app retries automatically. If providing a manual retry, expose a narrow preload method and validate that the request came from the intended window and fallback page before calling `retry()`.

Copy the fallback HTML and all of its required assets into the desktop build output and include them in the packaged app. Never depend on a CDN or hosted frontend for the fallback. Replace the example path below with the actual packaged file path:

```ts
import { join } from "node:path";
import { recoverWindowLoad } from "@mp-lb/electron-kit";

const recovery = recoverWindowLoad({
  window: win,
  url: appUrl,
  retryDelayMs: 5_000,
  showFailure: async () => {
    await win.loadFile(join(__dirname, "offline.html"));
  },
  onFailure: ({ error, attempt }) => {
    // Send useful diagnostics to the application's logger.
  },
});
```

`appUrl` is the hosted URL selected by the base extension. `recoverWindowLoad` starts the initial load, retries after failed loads, and stops its timer when the window closes. Use `recovery.retry()` for an authorized manual retry and `recovery.dispose()` if replacing the recovery controller before the window closes. Display diagnostic details only when useful; a secondary **View details** control can reveal them without overwhelming the main message. Do not expose secrets or authentication tickets in diagnostics.

## Top-level errors

Handle failures at both boundaries. In the main process, observe a renderer crash and reload or show a local recovery page:

```ts
import { handleRendererFailure } from "@mp-lb/electron-kit";

const stopObserving = handleRendererFailure({
  window: win,
  onFailure: (details) => {
    // Record details with the app's logger, then recover.
    recovery.retry();
  },
});
win.once("closed", stopObserving);
```

For React rendering failures, wrap the application root in the kit's `AppErrorBoundary` from `@mp-lb/electron-kit/react`. Supply an application-owned fallback with a retry action calling `reset`, and use `onError` to forward the error and component stack to the project's monitoring service. React boundaries do not catch event-handler or asynchronous callback errors; handle those where they occur. Preserve any existing monitoring integration when adopting the boundary.

## Browser sign-in

Use this flow only when the application needs browser-based desktop authentication. The handoff is provider-independent; Clerk is optional. The app's server must authenticate the browser user and issue a short-lived, single-use credential appropriate to its provider. Never pass a long-lived session token or the provider's secret key through the deep link.

1. Choose an app-specific protocol and add it to electron-builder's `build.protocols` configuration. Enforce Electron's single-instance lock before installing the kit's auth handler. If the lock is denied, quit that process and do not create the handler or window.
2. In the main process, before the browser can return, call `createDesktopAuth({ protocol, appUrl, getWindow })`. `getWindow` must return the authorized main window. The kit registers the protocol, opens the browser with a random state, validates callbacks and IPC senders, and focuses the window. After app readiness, pass cold-start command-line arguments to `auth.receive`; call `auth.dispose()` during shutdown. A callback without an active matching sign-in attempt is rejected, including after a cold restart; start sign-in again in that case.
3. In the preload, expose only `createAuthBridge()` from `@mp-lb/electron-kit/preload` via `contextBridge`. Type the bridge on `window`; do not expose `ipcRenderer` itself. In the desktop sign-in screen, call `begin()` from the user's button. Subscribe to `onTicket` before calling `getPending()`, unsubscribe on cleanup, and deduplicate tickets: a ticket sent as an event may also be returned as pending.
4. Serve an authenticated browser page at `/desktop-auth` (or configure `browserPath` in the handler). Preserve its `state` query parameter through browser sign-in. Have it request a one-time ticket from an authenticated server endpoint, then call `createDesktopAuthReturnUrl(protocol, state, ticket)` from `@mp-lb/electron-kit/browser` and navigate to that URL. Provide a retry button: the browser cannot confirm whether the desktop app opened.
5. Consume the ticket in the desktop renderer using the auth provider's supported flow. For Clerk's **legacy** sign-in API, `consumeClerkTicket` from `@mp-lb/electron-kit/clerk` accepts the ticket, `signIn`, and `setActive`; use the Clerk SDK entry and provider appropriate to the app's installed version. A server using Clerk can mint a short-lived sign-in token for the authenticated user with its server-side Clerk client. Keep its secret key on the server. The core Electron kit does not require Clerk.

A minimal main-process and preload integration looks like this. Adapt the existing app lifecycle and preload rather than adding a second single-instance lock or a second `exposeInMainWorld` for the same name:

```ts
// main process: initialize only in the process that owns the lock
import { createDesktopAuth } from "@mp-lb/electron-kit";

const auth = createDesktopAuth({
  protocol: "example",
  appUrl,
  getWindow: () => mainWindow,
});
// Once ready, also check the initial arguments. The handler already listens
// for macOS open-url and subsequent launches.
process.argv.forEach(auth.receive);
app.once("will-quit", auth.dispose);
```

```ts
// preload: add auth to the project's existing contextBridge object
import { contextBridge } from "electron";
import { createAuthBridge } from "@mp-lb/electron-kit/preload";

contextBridge.exposeInMainWorld("desktop", { auth: createAuthBridge() });
```

```ts
// browser return page, after the authenticated server has issued a ticket
import { createDesktopAuthReturnUrl } from "@mp-lb/electron-kit/browser";

const state = new URLSearchParams(window.location.search).get("state");
if (!state) throw new Error("Start sign-in from the desktop app.");
// Get this short-lived ticket from the authenticated application server.
window.location.href = createDesktopAuthReturnUrl("example", state, ticket);
```

Register `example` consistently in the builder protocol configuration and both code paths; use the project's actual scheme and validated URL instead of the placeholder. The browser server endpoint and ticket consumption are application/provider-specific.

For a hosted frontend that also serves older installed desktop versions, preserve compatibility with their existing preload and handoff until those desktop versions have updated. Verify both paths before deploying the frontend.

## Optional presentation

The kit is headless. Supply application-owned screens, or install the Shad registry's generic component from the frontend package:

```sh
pnpm dlx shadcn@latest add https://shad.mp-lb.dev/r/full-screen-state.json
```

`FullScreenState` accepts application-provided icon, title, description, actions, and children; it does not supply copy or behavior. Pass multiple buttons in `actions`. For expandable diagnostics, put a **View details** button in `actions`, manage the disclosure state in the application, and connect it to the details panel with `aria-expanded` and `aria-controls`. Suitable copy includes “Could not connect” with automatic-retry guidance, “Sign in” with a browser action, and “Something went wrong” with a retry action; adapt it to the application.

This React component works only where its renderer and assets are available. To use it for a failed initial load, build it as a separate local renderer entry, package its HTML, JavaScript, and CSS, and load that local file from `showFailure`. Otherwise use a local HTML fallback; do not make offline recovery depend on installing the Shad component.

## Offline renderer build safety

Vite library mode preserves `process.env.NODE_ENV` in dependencies such as React.
A sandboxed Electron renderer has no `process` global: the fallback itself can
crash to a white screen even while main-process retries keep working.

Use `offlineRenderer()` from `@mp-lb/electron-kit/vite` in the offline Vite
configuration once the installed kit exposes that entry. Install the kit in the
frontend package that owns the config and retain its existing React/CSS plugins:

```ts
import { offlineRenderer } from "@mp-lb/electron-kit/vite";

// Within the existing offline config:
// plugins: [offlineRenderer(), react(), tailwindcss(), ...]
```

The plugin replaces the environment check at build time and rejects emitted
JavaScript that retains it. For an older kit without this entry, explicitly set
`define: { "process.env.NODE_ENV": JSON.stringify("production") }` in the offline
config. Never expose Node globals or disable sandboxing to fix the fallback.
See [Vite library-mode environment behavior](https://vite.dev/guide/build#library-mode).

Keep a regression test that builds the renderer and executes the resulting
JavaScript without Node globals; a component test alone will not catch this
bundling failure. Verify all fallback assets exist in the packaged archive and
exercise offline startup and recovery. A source or web deployment cannot fix an
already installed desktop bundle: rebuild and distribute a new desktop version.

## Verify

Run the target project's lint, typecheck, tests, and desktop build through its normal task runner. Verify the packaged app, not just the TypeScript build:

- Move, resize, maximize, and reopen the window; also check recovery after a monitor is disconnected.
- Start with the hosted frontend unreachable, confirm the local fallback appears, then restore connectivity and confirm the app loads. Exercise manual retry if provided.
- Trigger a React error and a renderer failure and check that recovery and reporting work.
- If auth is enabled, verify browser sign-in, callback state validation, one-time ticket consumption, repeat attempts, and delivery while the renderer is still starting. Exercise the installed protocol on each supported OS.
- If releasing macOS builds, verify signing and notarization using the project's release workflow.

## Agent context

Merge the recurring instructions from `context/electron.md` in this store into the project’s existing `context/electron.md`. Preserve local rules and include only installed behavior. Do not create a separate MAP Lab-prefixed block. Run `zap task context-build` and commit source and generated files together.
